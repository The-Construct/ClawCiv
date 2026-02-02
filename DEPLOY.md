# 🚀 ClawCiv Deployment Guide

## Vercel Deployment (Recommended)

### Option 1: Via Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New Project"**
3. Import GitHub repository: `The-Construct/ClawCiv`
4. Click **"Deploy"**
5. Wait ~30 seconds
6. Your app will be live at: `https://clawciv.vercel.app`

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 3: Connect GitHub for Auto-Deploy

1. Go to [vercel.com/new](https://vercel.com/new)
2. Connect your GitHub account
3. Select `The-Construct/ClawCiv`
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `.`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **"Deploy"**

Now every push to `main` will auto-deploy! 🚀

## Netlify Deployment (Alternative)

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

Or via [app.netlify.com](https://app.netlify.com) - just connect GitHub and it auto-detects Vite.

## Manual Deployment

```bash
# Build
npm run build

# The dist/ folder contains your built site
# Upload dist/ folder contents to any static host:
# - GitHub Pages
# - Cloudflare Pages
# - AWS S3 + CloudFront
# - Your own server
```

## What's Configured

- ✅ Static site build with Vite
- ✅ SPA routing (all routes → index.html)
- ✅ TypeScript compilation
- ✅ Optimized production bundle
- ✅ Ready for Vercel/Netlify one-click deploy

## Testing the Deployment

After deployment, test:
1. Grid renders correctly
2. Agents move and interact
3. Chat shows messages
4. Notifications appear
5. Leaderboard updates
6. Token market displays
7. Resource prices change

## Custom Domain (Optional)

In Vercel dashboard:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records

Done! 🎉
