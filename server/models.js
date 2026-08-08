import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required');

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

class Id extends String {
  equals(other) { return String(this) === String(other?._id ?? other); }
  toJSON() { return String(this); }
}

const id = value => value == null ? value : new Id(String(value));
const revive = value => {
  if (value && value.type === 'Buffer' && Array.isArray(value.data)) return Buffer.from(value.data);
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, revive(v)]));
  return value;
};
const clean = value => JSON.parse(JSON.stringify(value, (_key, current) => current === undefined ? null : current));
const get = (obj, path) => path.split('.').reduce((value, key) => value?.[key], obj);
const same = (left, right) => {
  if (right === null) return left == null;
  if (right && typeof right === 'object' && '$in' in right) return right.$in.some(value => same(left, value));
  return String(left?._id ?? left) === String(right?._id ?? right);
};
const matches = (doc, filter = {}) => Object.entries(filter).every(([key, value]) => same(key === '_id' ? doc._id : get(doc, key), value));
const defaults = {
  users: data => ({ role: 'client', status: 'approved', skills: [], portfolioLinks: [], completedProjects: 0, ...data, email: String(data.email || '').toLowerCase() }),
  projects: data => ({ status: 'submitted', progress: 0, files: [], quote: {}, payment: { advance: 0, balance: 0, advancePaid: false, balancePaid: false, status: 'pending_payment' }, commission: {}, ...data }),
  works: data => ({ status: 'pending', ...data }),
  messages: data => data,
  notifications: data => data,
  content: data => data,
  support_tickets: data => ({ status: 'open', ...data }),
  payment_transactions: data => ({ status: 'under_verification', ...data }),
  payment_config: data => ({ key: 'default', upiId: 'earnaster@okicici', payeeName: 'FrameBridge Studio', ...data })
};
const hidden = { users: ['password'], payment_transactions: ['proofData'], payment_config: ['qrImageData'] };

class Document {
  constructor(collection, row) {
    Object.defineProperty(this, '_collection', { value: collection, enumerable: false });
    Object.assign(this, revive(row.data || {}));
    this._id = id(row.id);
    this.createdAt = row.created_at;
    this.updatedAt = row.updated_at;
    for (const field of ['client','editor','project','sender','recipient','user','verifiedBy','updatedBy','assignedTo']) {
      if (this[field] && typeof this[field] !== 'object') this[field] = id(this[field]);
    }
  }
  async save() {
    const payload = this.toObject({ includeHidden: true });
    delete payload._id; delete payload.createdAt; delete payload.updatedAt;
    const { data, error } = await db.from('framebridge_documents').update({ data: clean(payload), updated_at: new Date().toISOString() }).eq('id', String(this._id)).select().single();
    if (error) throw error;
    Object.assign(this, new Document(this._collection, data));
    return this;
  }
  toObject({ includeHidden = false } = {}) {
    const output = {};
    for (const [key, value] of Object.entries(this)) output[key] = value;
    if (!includeHidden) for (const field of hidden[this._collection] || []) delete output[field];
    return output;
  }
  toJSON() { return this.toObject(); }
  public() { return this.toObject(); }
}

async function rows(collection) {
  const { data, error } = await db.from('framebridge_documents').select('*').eq('collection', collection).limit(1000);
  if (error) throw error;
  return data.map(row => new Document(collection, row));
}

class Query {
  constructor(model, filter = {}, one = false) { this.model = model; this.filter = filter; this.one = one; this.sortBy = null; this.max = null; this.projection = ''; this.populates = []; this.asLean = false; }
  select(value) { this.projection = value || ''; return this; }
  sort(value) { this.sortBy = value; return this; }
  limit(value) { this.max = value; return this; }
  lean() { this.asLean = true; return this; }
  populate(path, fields = '') { for (const item of String(path).split(/\s+/).filter(Boolean)) this.populates.push([item, fields]); return this; }
  async execute() {
    let found = (await rows(this.model.collection)).filter(doc => matches(doc, this.filter));
    if (this.sortBy) {
      const desc = String(this.sortBy).startsWith('-'), field = String(this.sortBy).replace(/^-/, '');
      found.sort((a, b) => (new Date(get(a, field) || 0) - new Date(get(b, field) || 0)) * (desc ? -1 : 1));
    }
    if (this.max != null) found = found.slice(0, this.max);
    for (const doc of found) for (const [path, fields] of this.populates) {
      const value = doc[path];
      if (!value) continue;
      const refModel = ['client','editor','sender','recipient','user','verifiedBy','updatedBy','assignedTo'].includes(path) ? User : path === 'project' ? Project : null;
      if (!refModel) continue;
      const populated = await refModel.findById(String(value)).select(fields);
      if (populated) doc[path] = populated;
    }
    const project = doc => {
      const output = this.asLean ? doc.toObject({ includeHidden: this.projection.includes('+') }) : doc;
      const excluded = this.projection.split(/\s+/).filter(field => field.startsWith('-')).map(field => field.slice(1));
      for (const field of excluded) delete output[field];
      return output;
    };
    return this.one ? (found[0] ? project(found[0]) : null) : found.map(project);
  }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
}

class Model {
  constructor(collection) { this.collection = collection; }
  find(filter = {}) { return new Query(this, filter); }
  findOne(filter = {}) { return new Query(this, filter, true); }
  findById(value) { return this.findOne({ _id: value }); }
  async create(data) {
    if (this.collection === 'users' && await this.exists({ email: String(data.email).toLowerCase() })) { const error = new Error('Already exists'); error.code = 11000; throw error; }
    if (this.collection === 'payment_transactions' && await this.exists({ transactionId: data.transactionId })) { const error = new Error('Already exists'); error.code = 11000; throw error; }
    const value = defaults[this.collection](data);
    const { data: row, error } = await db.from('framebridge_documents').insert({ collection: this.collection, data: clean(value) }).select().single();
    if (error) throw error;
    return new Document(this.collection, row);
  }
  async exists(filter) { return Boolean(await this.findOne(filter)); }
  async countDocuments(filter = {}) { return (await this.find(filter)).length; }
  async findOneAndUpdate(filter, update, options = {}) {
    let doc = await this.findOne(filter).select('+password +proofData +qrImageData');
    if (!doc && options.upsert) return this.create({ ...filter, ...(update.$setOnInsert || {}), ...Object.fromEntries(Object.entries(update).filter(([key]) => !key.startsWith('$'))) });
    if (!doc) return null;
    Object.assign(doc, update.$setOnInsert ? {} : update);
    return doc.save();
  }
  async findByIdAndUpdate(value, update, options = {}) { return this.findOneAndUpdate({ _id: value }, update, options); }
  async updateMany(filter, update) { const docs = await this.find(filter); await Promise.all(docs.map(doc => Object.assign(doc, update).save())); return { modifiedCount: docs.length }; }
  async aggregate(pipeline) {
    const match = pipeline.find(stage => stage.$match)?.$match || {};
    const docs = await this.find(match);
    return docs.length ? [{ _id: null, total: docs.reduce((sum, doc) => sum + Number(get(doc, 'commission.amount') || 0), 0) }] : [];
  }
}

export const User = new Model('users');
export const Project = new Model('projects');
export const Work = new Model('works');
export const Message = new Model('messages');
export const Notification = new Model('notifications');
export const Content = new Model('content');
export const SupportTicket = new Model('support_tickets');
export const PaymentTransaction = new Model('payment_transactions');
export const PaymentConfig = new Model('payment_config');
export { db };
