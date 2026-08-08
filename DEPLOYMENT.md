# FrameBridge Studio deployment

The repository includes a Render Blueprint in `render.yaml`. It builds the React client, starts the Express and Socket.IO server, runs `/api/health` checks, generates the JWT secret, and seeds the initial administrator after the first successful deployment.

## Required Render secrets

Enter these values when Render creates the Blueprint:

- `MONGODB_URI`: MongoDB Atlas Node.js connection string ending in `/framebridge`.
- `ADMIN_PASSWORD`: a unique production password of at least 16 characters.
- `CLOUDINARY_CLOUD_NAME`: Cloudinary product-environment cloud name.
- `CLOUDINARY_API_KEY`: Cloudinary server API key.
- `CLOUDINARY_API_SECRET`: Cloudinary server API secret.

Never commit these values to Git. Render generates `JWT_SECRET` automatically.

## After the first deployment

1. Confirm `https://framebridge-studio.onrender.com/api/health` returns an `ok` response.
2. Sign in as `earnaster@gmail.com` with the production `ADMIN_PASSWORD`.
3. Test client registration, project submission, the 30% UPI payment, proof upload, and manual approval.
4. Add the purchased domain under Render **Settings → Custom Domains**.
5. Change `CLIENT_URL` to the final HTTPS domain and redeploy.

If the desired Render service name is unavailable, update both the service `name` and `CLIENT_URL` in `render.yaml` before creating the Blueprint.
