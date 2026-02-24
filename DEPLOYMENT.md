# Farm2Home — Production Deployment Guide
## Railway / Render + Cloudinary + MongoDB Atlas

---

## Overview

| Service | Provider | Cost |
|---------|----------|------|
| Backend API | Railway or Render | Free tier available |
| Frontend | Railway or Render | Free tier available |
| Database | MongoDB Atlas | Free M0 (512 MB) |
| Image storage | Cloudinary | Free (25 GB / 25 GB bandwidth) |
| Email | Gmail SMTP | Free |

---

## Step 1 — MongoDB Atlas

1. Go to https://cloud.mongodb.com and create a free account
2. Create a new **M0 (free) cluster** — pick Mumbai region for India
3. Under **Database Access** → Add a database user with a strong password
4. Under **Network Access** → Add `0.0.0.0/0` (allow all IPs — needed because Railway/Render IPs rotate)
5. Click **Connect → Drivers** → copy the connection string:

```
mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/farm2home?retryWrites=true&w=majority
```

Save this — it becomes your `MONGO_URI` environment variable.

---

## Step 2 — Cloudinary Setup

1. Go to https://cloudinary.com → Sign up free
2. After login, open your **Dashboard**
3. Copy these three values:
   - Cloud name (e.g. `dxyz1234`)
   - API Key (e.g. `123456789012345`)
   - API Secret (e.g. `abcdefghijklmnop...`)

These become `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

**Optional but recommended:** In the Cloudinary dashboard, go to **Settings → Upload** and create an upload preset named `farm2home` with:
- Signing mode: Signed
- Folder: `farm2home`
- Allowed formats: jpg, png, webp

---

## Step 3 — Deploy on Railway (recommended)

Railway is the simplest option — one repo, two services.

### 3a. Push your code to GitHub

```bash
cd farm2home-fixed
git init
git add .
git commit -m "Initial production deployment"
git remote add origin https://github.com/YOUR_USERNAME/farm2home.git
git push -u origin main
```

### 3b. Create Railway project

1. Go to https://railway.app → Login with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your `farm2home` repository
4. Railway will detect it as a monorepo

### 3c. Add Backend service

1. In Railway, click **Add Service → GitHub Repo** → select your repo
2. Set **Root Directory** to `server`
3. Build command: `npm install`
4. Start command: `node index.js`

Set these **Environment Variables** in the Railway dashboard:

```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://...  (from Step 1)
JWT_SECRET=generate-a-random-64-char-string-here
JWT_EXPIRY=7d
CORS_ORIGIN=https://your-frontend-domain.up.railway.app
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_gmail_app_password
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourStrongAdminPassword123!
```

**Generating a strong JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3d. Add Frontend service

1. In Railway, click **Add Service → GitHub Repo** again
2. Set **Root Directory** to `client`
3. Build command: `npm install && npm run build`
4. Set output directory to `dist`

Set this environment variable:
```
VITE_API_URL=https://your-backend-domain.up.railway.app
```

Check your `client/src/core/config/axios.js` (or similar) to make sure it reads `VITE_API_URL` for the base URL in production.

### 3e. Run the seed script (one time only)

After deploying, run the seed to create the default admin account. In Railway, open your backend service shell:

```bash
node seed.js
```

---

## Step 4 — Deploy on Render (alternative)

A `render.yaml` is included in the repo root. Render will auto-detect it.

1. Go to https://render.com → Login with GitHub
2. Click **New → Blueprint**
3. Select your repository — Render reads `render.yaml` automatically
4. Set all environment variables marked `sync: false` in the Render dashboard

---

## Step 5 — Gmail SMTP Setup

To send verification emails and password resets:

1. Enable **2-Step Verification** on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an App Password for "Mail"
4. Use that 16-character password as `SMTP_PASS`

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourapp@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  (the 16-char app password, spaces optional)
```

---

## Step 6 — Frontend API URL

Make sure your frontend Vite config uses the environment variable. Check `client/src/core/config/axios.js`:

```js
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

And your `client/.env` for local development:
```
VITE_API_URL=http://localhost:5000
```

Production (Railway/Render): set `VITE_API_URL` to your deployed backend URL in the dashboard.

---

## Environment Variables Checklist

### Backend (server/)
| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | `5000` |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | 64+ char random string |
| `CORS_ORIGIN` | Yes | Your frontend URL (no trailing slash) |
| `CLOUDINARY_CLOUD_NAME` | Yes | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Yes | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Yes | From Cloudinary dashboard |
| `SMTP_HOST` | Yes | `smtp.gmail.com` |
| `SMTP_PORT` | Yes | `587` |
| `SMTP_USER` | Yes | Your email |
| `SMTP_PASS` | Yes | Gmail app password |
| `ADMIN_EMAIL` | Yes | Admin login email |
| `ADMIN_PASSWORD` | Yes | Admin login password |
| `ANTHROPIC_API_KEY` | No | Only for AI price advisor feature |

### Frontend (client/)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL |

---

## Cloudinary Storage Layout

Images are automatically organised in Cloudinary under these folders:

```
farm2home/
├── profiles/          ← Profile photos (400x400, auto-optimised)
├── verification/
│   ├── <userId>/      ← Farmer/delivery verification docs per user
│   └── ...
└── payments/          ← Payment proof screenshots
```

---

## Common Issues

**CORS error after deployment**
Make sure `CORS_ORIGIN` exactly matches your frontend URL, no trailing slash:
- Correct: `https://farm2home.up.railway.app`
- Wrong: `https://farm2home.up.railway.app/`

**Images not uploading**
Check server logs for `Cloudinary not configured` warning. Verify all three Cloudinary env vars are set correctly.

**MongoDB connection refused**
Make sure `0.0.0.0/0` is in MongoDB Atlas Network Access. Atlas free tier sometimes takes a few minutes to propagate network changes.

**Emails not sending**
Confirm you're using a Gmail App Password (not your regular password) and 2FA is enabled on the Gmail account.
