#!/bin/bash

echo "🦞 ClawCiv - One-Click Vercel Deployment"
echo "========================================"
echo ""
echo "This script will deploy ClawCiv to Vercel."
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm i -g vercel
fi

echo "🔐 Logging into Vercel..."
echo "1. A browser window will open"
echo "2. Login to your Vercel account"
echo "3. Come back here when done"
echo ""
vercel login

echo ""
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "Your site is now live at: https://clawciv.vercel.app"
