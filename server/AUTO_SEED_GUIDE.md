# Auto-Seed Configuration Guide

## Overview
The Farm2Home application now supports **automatic database seeding** on first deployment. This eliminates the need for shell access or manual seeding commands on platforms like Render.

---

## 🚀 How It Works

### Automatic Detection
The system automatically detects if the database needs seeding by checking:
1. **SeedFlag document** - Tracks if seeding has already occurred
2. **Existing data** - Checks if any users, categories, or products exist
3. **Environment variable** - Respects the `AUTO_SEED` configuration

### Smart Behavior
- ✅ Seeds database **only once** on first deployment
- ✅ Skips seeding if data already exists
- ✅ Creates a flag to prevent re-seeding
- ✅ Non-blocking - server starts even if seeding fails
- ✅ Works on **any deployment platform** (Render, Heroku, Railway, etc.)

---

## 🔧 Setup Instructions

### Step 1: Set Environment Variable

Add this to your deployment environment variables:

```env
AUTO_SEED=true
```

#### On Render.com:
1. Go to your web service dashboard
2. Click "Environment" in the left sidebar
3. Click "Add Environment Variable"
4. Key: `AUTO_SEED`
5. Value: `true`
6. Click "Save Changes"

#### On Heroku:
```bash
heroku config:set AUTO_SEED=true
```

#### On Railway:
1. Go to your project
2. Click "Variables"
3. Add: `AUTO_SEED=true`

### Step 2: Deploy

The next time you deploy, the database will be automatically seeded!

---

## 📊 What Gets Seeded

When auto-seed runs, it creates:

### Users
- **1 Admin** - Full system access
- **3 Customers** - For testing orders
- **10 Farmers** - Across 4 trust tiers (Platinum/Gold/Silver/Bronze)
- **2 Delivery Agents** - For delivery management

### Products
- **5 Categories** - Vegetables, Fruits, Dairy, Grains, Spices
- **30+ Products** - With images, prices, reviews, and ratings
- **Multiple sellers** - Same products from different farmers

### Sample Data
- Product reviews and ratings
- Price history (6 months)
- Featured products
- Organic certifications

---

## 🔐 Default Login Credentials

After seeding, you can log in with these accounts:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@farm2home.com | admin123 |
| **Customer** | arjun@customer.com | customer123 |
| **Farmer** | rajan@farmer.com | farmer123 |
| **Delivery** | suresh@delivery.com | delivery123 |

⚠️ **Important:** Change these passwords in production!

---

## 📝 Deployment Logs

### Successful Seed
```
✅ MongoDB Connected Successfully
🏗️  Modular Architecture Loaded
🌱 Checking if database needs seeding...
═══════════════════════════════════════════
🌱 AUTO-SEEDING DATABASE
═══════════════════════════════════════════
🔌 Using existing MongoDB connection
🗑  Cleared existing data
✅ Customers created
✅ Delivery agents created
✅ Farmers created (10)
✅ Categories created
✅ Products created (30)
═══════════════════════════════════════════
✅ AUTO-SEED COMPLETED SUCCESSFULLY
═══════════════════════════════════════════
🔐 Login credentials:
   Admin:    admin@farm2home.com / admin123
   Customer: arjun@customer.com / customer123
   Farmer:   rajan@farmer.com / farmer123
   Delivery: suresh@delivery.com / delivery123
═══════════════════════════════════════════
```

### Skipped (Already Seeded)
```
✅ MongoDB Connected Successfully
🌱 Checking if database needs seeding...
ℹ️  Database already seeded (skipping)
```

### Disabled
```
✅ MongoDB Connected Successfully
🌱 Checking if database needs seeding...
ℹ️  Auto-seed disabled (set AUTO_SEED=true to enable)
```

---

## 🛠️ Advanced Configuration

### Disable Auto-Seed
Set `AUTO_SEED=false` or remove the variable entirely.

### Force Re-Seed
To re-seed the database:

1. **Delete the SeedFlag document** from your database:
   ```javascript
   // In MongoDB shell or Atlas
   db.seedflags.deleteMany({})
   ```

2. **Clear existing data** (optional):
   ```javascript
   db.users.deleteMany({})
   db.categories.deleteMany({})
   db.products.deleteMany({})
   ```

3. **Redeploy** or restart your server

### Manual Seeding (Alternative)
If you prefer manual control:

```bash
# On your local machine or with shell access
npm run seed
```

---

## 🔍 Troubleshooting

### Issue: Seeding doesn't run

**Check these:**
1. ✅ `AUTO_SEED=true` is set in environment variables
2. ✅ MongoDB connection is successful
3. ✅ Database is empty (no existing data)
4. ✅ Check deployment logs for errors

### Issue: Server starts but no seed logs

**Possible causes:**
- `AUTO_SEED` not set to `true`
- Database already has data
- SeedFlag exists from previous deployment

**Solution:** Check logs for:
```
ℹ️  Database already seeded (skipping)
```
or
```
ℹ️  Auto-seed disabled (set AUTO_SEED=true to enable)
```

### Issue: Seeding fails with errors

The server will still start! Check logs for:
```
❌ AUTO-SEED FAILED
Error: [error message]
⚠️  Server will continue without seed data
💡 You can manually seed by running: npm run seed
```

**Common fixes:**
- Check MongoDB connection string
- Verify database permissions
- Ensure models are correctly defined
- Check for duplicate key errors

---

## 📚 Technical Details

### How It Works Internally

1. **Server starts** → MongoDB connects
2. **Auto-seeder runs** → Checks `AUTO_SEED` env variable
3. **Checks SeedFlag** → Has database been seeded before?
4. **Checks data count** → Any existing users/products?
5. **Runs seed.js** → If checks pass
6. **Creates SeedFlag** → Prevents future re-seeding
7. **Logs completion** → Shows credentials
8. **Server ready** → Accepts requests

### Prevents Re-Seeding

The system uses multiple safeguards:

1. **SeedFlag Model** - Database document tracking seed status
2. **Data Count Check** - Verifies no existing data
3. **Environment Control** - Respects AUTO_SEED setting

### Non-Blocking Design

If seeding fails:
- ✅ Server continues to start
- ✅ Error is logged but not fatal
- ✅ Application remains accessible
- ✅ You can seed manually later

---

## 🎯 Best Practices

### For Development
```env
AUTO_SEED=false  # Seed manually with npm run seed
```

### For Staging/Demo
```env
AUTO_SEED=true   # Auto-seed on first deployment
```

### For Production
```env
AUTO_SEED=false  # Never auto-seed production!
# Or set to true ONLY for initial deployment
# Then set to false after first deploy
```

---

## 🔄 Workflow Example

### Initial Deployment
```bash
# 1. Set environment variable on Render
AUTO_SEED=true

# 2. Deploy
git push origin main
# or trigger deployment on Render

# 3. Check logs - should see seed completion
# 4. Verify data in database
# 5. Test login with demo credentials
```

### Subsequent Deployments
```bash
# Auto-seed is skipped automatically
# Logs will show: "Database already seeded (skipping)"
# Your data remains intact
```

---

## ⚠️ Important Notes

1. **One-Time Operation** - Seeding happens only once
2. **Clears Existing Data** - If forced to re-seed, all data is wiped
3. **Use in Demo Only** - Not recommended for production deployments
4. **Change Passwords** - Update default credentials after seeding
5. **Backup First** - Before forcing re-seed on staging/production

---

## 📧 Support

If you encounter issues:

1. Check deployment logs
2. Verify environment variables
3. Review troubleshooting section
4. Check MongoDB Atlas (if using) for connection issues

---

## 🎉 Success Indicators

You'll know auto-seed worked when you see:

✅ Logs show "AUTO-SEED COMPLETED SUCCESSFULLY"
✅ Can log in with demo credentials
✅ Products appear on the website
✅ Categories are populated
✅ Farmers have profiles
✅ Sample reviews exist

---

**Last Updated:** February 24, 2026
**Version:** 2.0.0
**Feature:** Auto-Seed on Deployment
