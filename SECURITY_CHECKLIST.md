# 🔒 Security Features Setup Checklist

## ✅ What's Been Added

### Rate Limiting
- [x] Client-side rate limiter implemented
- [x] 5 attempts per 15 minutes
- [x] 30-minute lockout after max attempts
- [x] Visual warnings for users
- [x] Failed login logging

### reCAPTCHA v3
- [x] reCAPTCHA provider component
- [x] Integration with login form
- [x] Invisible bot protection
- [ ] **YOU NEED TO:** Get reCAPTCHA keys (see below)

## 🎯 Quick Setup (5 minutes)

### Step 1: Get reCAPTCHA Keys
1. Go to: https://www.google.com/recaptcha/admin
2. Click "Create" or "+"
3. Settings:
   - Label: `AI for IA Event Dashboard`
   - reCAPTCHA type: **v3**
   - Domains:
     - `localhost`
     - `aiforia.vercel.app`
4. Accept terms and Submit
5. Copy your keys:
   - Site Key (starts with 6L...)
   - Secret Key (starts with 6L...)

### Step 2: Add to .env.local
```bash
# Add these lines to your .env.local file
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

### Step 3: Add to Vercel (for production)
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add both variables:
   - Name: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - Value: (paste site key)
   - Check all environments
   
   - Name: `RECAPTCHA_SECRET_KEY`
   - Value: (paste secret key)
   - Check all environments
5. Redeploy your app

### Step 4: Test
1. Restart your dev server: `npm run dev`
2. Try logging in
3. Open DevTools → Console
4. Should NOT see "reCAPTCHA site key not configured" warning
5. Try 3 wrong passwords → should see warning
6. Try 5 wrong passwords → should be locked out

## 🎉 Done!

Your system now has:
- ✅ Rate limiting (5 attempts per 15 min)
- ✅ 30-minute lockout after max attempts  
- ✅ reCAPTCHA bot protection
- ✅ Failed login tracking
- ✅ Visual security warnings

## 📊 What This Protects Against

| Attack Type | Protected | How |
|------------|-----------|-----|
| Brute Force | ✅ Yes | Rate limiting + lockout |
| Bot Attacks | ✅ Yes | reCAPTCHA v3 |
| Credential Stuffing | ✅ Yes | Rate limiting + reCAPTCHA |
| Password Spraying | ✅ Partial | Rate limiting helps |
| DDoS | ⚠️ Partial | Firebase has built-in limits |

## 🔍 Monitoring

Check failed logins:
1. Firebase Console
2. Firestore Database
3. `loginlogs` collection
4. Filter: `success == false`

## 🆘 If You Get Locked Out

**Development:**
- Restart the dev server (clears rate limits)
- OR wait 30 minutes

**Production:**
- Wait 30 minutes
- OR have admin clear your entry from rate limiter

## 📚 More Info

See `SECURITY_SETUP.md` for:
- Detailed configuration
- Advanced security features
- Monitoring and alerts
- Incident response
- Best practices

---

**Quick Start:** Just add reCAPTCHA keys and you're protected! 🛡️
