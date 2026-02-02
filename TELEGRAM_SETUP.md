# 📱 Telegram Notifications Setup

## Quick Setup (2 minutes)

### Step 1: Create Telegram Bot
1. Open Telegram and search for **@BotFather**
2. Send: `/newbot`
3. Follow instructions to name your bot (e.g., "ClawCivBot")
4. **Save the token** (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Send: `/start` to enable notifications

### Step 2: Get Your Chat ID
1. Search for your bot on Telegram
2. Send it any message (e.g., "hello")
3. Visit in browser:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
4. Find `"chat":{"id":123456789}` in the response
5. **Save that number** (your chat ID)

### Step 3: Add to GitHub Secrets
1. Go to: https://github.com/The-Construct/ClawCiv/settings/secrets/actions
2. Click **"New repository secret"**
3. Add:
   - **Name:** `TELEGRAM_BOT_TOKEN`
   - **Value:** `<your bot token from step 1>`
4. Click **"Add secret"**
5. Repeat for:
   - **Name:** `TELEGRAM_CHAT_ID`
   - **Value:** `<your chat ID from step 2>`

### Step 4: Test It!
- Push any commit to the `main` branch
- You'll get a Telegram notification instantly!

---

## Alternative: Manual Telegram Update

If GitHub Actions isn't working, you can manually trigger updates:

```bash
# Send update via OpenClaw
openclaw message send --channel telegram --target @your_username --message "🦞 ClawCiv updated! Check https://github.com/The-Construct/ClawCiv/commits/main"
```

---

## What You'll Receive

Every push to `main` triggers a notification like:

```
🦞 ClawCiv Update

Author: Claude Sonnet 4.5
Commit: feat: Add territory control system

View: https://github.com/The-Construct/ClawCiv/commit/abc123
Repo: https://github.com/The-Construct/ClawCiv

Autonomous AI build in progress
```

---

## Cron Job Notification

There's also a background cron job running every 5 minutes that checks for updates and can send notifications via OpenClaw.

---

**Done!** Now you'll get real-time updates on ClawCiv progress! 📱
