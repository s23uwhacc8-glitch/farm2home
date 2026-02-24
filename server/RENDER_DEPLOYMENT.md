# Render Deployment Guide with Auto-Seed

## 🚀 Quick Start - Deploy to Render with Auto-Seed

Follow these steps to deploy Farm2Home to Render.com with automatic database seeding.

---

## Prerequisites

- GitHub account with your Farm2Home code
- MongoDB Atlas account (or MongoDB instance)
- Cloudinary account (for image hosting)

---

## Step 1: Prepare MongoDB

### Using MongoDB Atlas (Recommended)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user
4. Whitelist all IPs: `0.0.0.0/0` (for Render access)
5. Get your connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/farm2home?retryWrites=true&w=majority
   ```

---

## Step 2: Prepare Cloudinary

1. Go to https://cloudinary.com
2. Sign up for free account
3. Get your credentials from dashboard:
   - Cloud Name
   - API Key
   - API Secret

---

## Step 3: Create Web Service on Render

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** farm2home-api
   - **Environment:** Node
   - **Region:** Choose closest to you
   - **Branch:** main
   - **Root Directory:** (leave empty if server is in root, or set to `server`)
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Instance Type:** Free (for testing)

---

## Step 4: Set Environment Variables

Click "Advanced" → "Add Environment Variable" and add these:

### Required Variables

```env
# MongoDB
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/farm2home?retryWrites=true&w=majority

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-here-change-this

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Environment
NODE_ENV=production

# Auto-Seed (IMPORTANT!)
AUTO_SEED=true

# CORS (your frontend URL - set after deploying frontend)
CORS_ORIGIN=https://your-frontend-app.onrender.com
```

### Optional Variables

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_MAX=20

# Port (Render sets this automatically)
PORT=10000
```

---

## Step 5: Deploy!

1. Click "Create Web Service"
2. Wait for deployment (2-5 minutes)
3. Watch the logs for:

```
✅ MongoDB Connected Successfully
🌱 Checking if database needs seeding...
═══════════════════════════════════════════
🌱 AUTO-SEEDING DATABASE
═══════════════════════════════════════════
✅ AUTO-SEED COMPLETED SUCCESSFULLY
═══════════════════════════════════════════
```

4. Your API is now live! 🎉

---

## Step 6: Test Your Deployment

### Check API Health

Visit: `https://your-app.onrender.com/health`

Should return:
```json
{
  "success": true,
  "status": "ok",
  "message": "Farm2Home API is running",
  "environment": "production"
}
```

### Test Login

**POST** `https://your-app.onrender.com/api/auth/login`

Body:
```json
{
  "email": "admin@farm2home.com",
  "password": "admin123"
}
```

Should return authentication token ✅

---

## Step 7: Deploy Frontend

### Option A: Deploy on Render

1. Create another web service for frontend
2. Use: `npm run build` as build command
3. Use: `npm run preview` as start command
4. Set environment variable:
   ```
   VITE_API_URL=https://your-backend-app.onrender.com
   ```

### Option B: Deploy on Netlify/Vercel

1. Connect GitHub repo
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-app.onrender.com
   ```

---

## 🔐 Default Credentials (Demo Data)

After auto-seed completes:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@farm2home.com | admin123 |
| **Customer** | arjun@customer.com | customer123 |
| **Farmer** | rajan@farmer.com | farmer123 |
| **Delivery** | suresh@delivery.com | delivery123 |

**⚠️ Change these in production!**

---

## 🔍 Troubleshooting

### Deployment Failed

Check logs for errors:
- MongoDB connection issues?
- Environment variables correct?
- Build command succeeded?

### Auto-Seed Not Running

Verify:
- ✅ `AUTO_SEED=true` is set
- ✅ MongoDB connected successfully
- ✅ Check logs for seed messages

### CORS Errors from Frontend

Update `CORS_ORIGIN` in environment variables:
```
CORS_ORIGIN=https://your-frontend.onrender.com
```

### Free Tier Sleeps After Inactivity

Render's free tier spins down after 15 minutes of inactivity.
- First request after sleep takes ~30 seconds
- Consider upgrading for production use

---

## 📊 Monitoring Your Deployment

### Render Dashboard

View:
- Deployment logs
- Service metrics
- Environment variables
- Custom domains
- SSL certificates

### MongoDB Atlas

Monitor:
- Database size
- Connection count
- Query performance
- Storage usage

---

## 🔄 Updating Your Deployment

### Update Code

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Render auto-deploys on push!

### Update Environment Variables

1. Go to Render dashboard
2. Click your service
3. Go to "Environment"
4. Update variables
5. Save changes (triggers redeploy)

---

## 🎯 Next Steps

### 1. Disable Auto-Seed (After First Deploy)

After successful first deployment:
1. Go to Environment variables
2. Change `AUTO_SEED=false` (or remove it)
3. Save changes

This prevents re-seeding on future deployments.

### 2. Change Default Passwords

Log in as admin and:
1. Go to user management
2. Update admin password
3. Delete or update demo accounts

### 3. Set Up Custom Domain (Optional)

In Render:
1. Go to "Settings"
2. Add custom domain
3. Configure DNS records
4. SSL auto-configured!

### 4. Monitor & Scale

- Check logs regularly
- Monitor error rates
- Upgrade plan if needed
- Set up alerts

---

## 💰 Cost Considerations

### Free Tier Includes:
- ✅ 750 hours/month (enough for 1 service)
- ✅ Automatic SSL
- ✅ Automatic deployments
- ✅ Custom domains
- ❌ Service spins down after 15 min inactivity

### Paid Plans Start at $7/month:
- ✅ No spin down
- ✅ More memory/CPU
- ✅ Faster deployments
- ✅ Better support

---

## 📚 Useful Links

- **Render Docs:** https://render.com/docs
- **MongoDB Atlas:** https://www.mongodb.com/docs/atlas/
- **Cloudinary:** https://cloudinary.com/documentation
- **Farm2Home Guide:** See AUTO_SEED_GUIDE.md

---

## 🆘 Common Issues & Solutions

### Issue: "Module not found" errors

**Solution:**
```bash
# In your package.json, ensure all dependencies are listed
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Issue: MongoDB connection timeout

**Solution:**
- Check MongoDB Atlas whitelist includes `0.0.0.0/0`
- Verify connection string is correct
- Check MongoDB cluster is running

### Issue: Environment variables not loading

**Solution:**
- Ensure no typos in variable names
- Restart service after adding variables
- Check for quotes (Render handles these automatically)

### Issue: Port binding errors

**Solution:**
- Don't set PORT manually
- Render sets this automatically
- Use: `const port = process.env.PORT || 5000;`

---

## ✅ Deployment Checklist

Before going live:

- [ ] MongoDB Atlas configured
- [ ] Cloudinary configured
- [ ] All environment variables set
- [ ] AUTO_SEED=true for first deploy
- [ ] Code pushed to GitHub
- [ ] Web service created on Render
- [ ] Deployment successful
- [ ] Auto-seed completed (check logs)
- [ ] API health check passes
- [ ] Test login works
- [ ] Frontend deployed
- [ ] CORS configured
- [ ] Default passwords changed
- [ ] AUTO_SEED disabled after first deploy

---

**Congratulations! Your Farm2Home app is now live! 🎉**

Need help? Check the logs, review this guide, or consult the AUTO_SEED_GUIDE.md
