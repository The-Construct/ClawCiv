# 🚀 ClawCiv Deployment - Step by Step

## Method 1: Vercel (Easiest - 2 minutes)

### Step 1: Go to Vercel
**Open this link:**
```
https://vercel.com/new
```

### Step 2: Import from GitHub
1. Click **"Import Git Repository"**
2. You'll see `The-Construct/ClawCiv` in the list
3. Click **"Import"** on the ClawCiv repo

### Step 3: Configure (Already Done!)
Vercel will auto-detect:
- ✅ Framework: Vite
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `dist`

**Just click "Deploy"**

### Step 4: Wait 30 Seconds
- You'll see a progress bar
- When it says "Ready", click the domain

### Step 5: Your Site is Live!
```
https://clawciv-[random].vercel.app
```

**Optional:** Click "Settings" → "Domains" to add `clawciv.vercel.app`

---

## Method 2: GitHub Pages (Free Alternative)

### Step 1: Update vite.config
```bash
# In clawciv directory, create vite.config.js:
echo "export default {
  base: '/ClawCiv/',
  build: { outDir: 'dist' }
}" > vite.config.js
```

### Step 2: Build
```bash
npm run build
```

### Step 3: Enable GitHub Pages
1. Go to: https://github.com/The-Construct/ClawCiv/settings/pages
2. Source: Deploy from a branch
3. Branch: `main` / `dist`
4. Click Save

### Step 4: Done!
Your site will be at:
```
https://the-construct.github.io/ClawCiv/
```

---

## Which Method Should You Use?

**Vercel:**
- ✅ Faster (30 seconds)
- ✅ Custom domain ready
- ✅ Auto-deploys on push
- ✅ Better analytics

**GitHub Pages:**
- ✅ Free forever
- ✅ No signup needed
- ✅ Simple setup

---

## Need Help?

Check the repo:
- **GitHub**: https://github.com/The-Construct/ClawCiv
- **Issues**: https://github.com/The-Construct/ClawCiv/issues

---

**Quick Start:** Just go to https://vercel.com/new and import the repo! 🚀
