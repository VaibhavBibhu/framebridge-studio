import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { User, Content, PaymentConfig } from './models.js';

const email = (process.env.ADMIN_EMAIL || 'earnaster@gmail.com').toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 16) throw new Error('Set a strong 16+ character ADMIN_PASSWORD before seeding');

const existing = await User.findOne({ email }).select('+password');
if (existing) {
  existing.name = 'FrameBridge Studio Admin';
  existing.role = 'admin';
  existing.status = 'approved';
  existing.password = await bcrypt.hash(password, 12);
  await existing.save();
} else {
  await User.create({ name: 'FrameBridge Studio Admin', email, role: 'admin', status: 'approved', password: await bcrypt.hash(password, 12) });
}
await Content.findOneAndUpdate({ key: 'initialVideo' }, { $setOnInsert: { value: { url: '', note: 'Replace with the supplied video URL' } } }, { upsert: true, new: true });
await PaymentConfig.findOneAndUpdate({ key: 'default' }, { $setOnInsert: { upiId: 'earnaster@okicici', payeeName: 'FrameBridge Studio' } }, { upsert: true, new: true });
console.log(`Admin ready: ${email}`);
