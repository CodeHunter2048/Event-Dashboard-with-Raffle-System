# Security Setup Guide

This guide covers the security features implemented in your Event Dashboard system.

## 🔒 Security Features Implemented

### 1. Rate Limiting
Protects against brute force attacks by limiting login attempts.

**Configuration:**
- Max attempts: 5 failed logins
- Time window: 15 minutes
- Lockout duration: 30 minutes after max attempts
- Automatic cleanup: Every 5 minutes

**How it works:**
- Tracks failed login attempts per email address
- After 5 failed attempts in 15 minutes, account is locked for 30 minutes
- Shows warning after 3 failed attempts
- Automatically clears on successful login

### 2. reCAPTCHA v3
Invisible bot protection that runs in the background.

**Setup Instructions:**

1. **Get reCAPTCHA Keys:**
   - Go to https://www.google.com/recaptcha/admin
   - Click "Create" or "+"
   - Choose **reCAPTCHA v3**
   - Add your domains:
     - `localhost` (for development)
     - `aiforia.vercel.app` (for production)
     - Any other domains you use

2. **Add Keys to Environment:**
   ```bash
   # In your .env.local file
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
   RECAPTCHA_SECRET_KEY=your_secret_key_here
   ```

3. **For Vercel Deployment:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add both variables:
     - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
     - `RECAPTCHA_SECRET_KEY`
   - Select "Production", "Preview", and "Development"
   - Save and redeploy

**Testing reCAPTCHA:**
- The system works without reCAPTCHA (shows warning in console)
- With keys configured, it runs invisibly on every login
- Check browser console for any reCAPTCHA errors

## 🛡️ Additional Security Recommendations

### Already Implemented:
✅ Firebase Authentication (built-in security)
✅ Firestore Security Rules (role-based access)
✅ Login event logging
✅ Client-side rate limiting
✅ reCAPTCHA v3 integration

### Recommended Next Steps:

#### 1. Enable Firebase App Check (High Priority)
Protects your Firebase backend from abuse.

**Setup:**
1. Go to Firebase Console → App Check
2. Enable App Check for your app
3. Choose reCAPTCHA v3 as provider
4. Update your Firebase initialization to include App Check

#### 2. Add Server-Side reCAPTCHA Verification (Recommended)
For stronger security, verify reCAPTCHA tokens on the server.

**Implementation:**
- Create a Next.js API route (`/api/verify-recaptcha`)
- Verify token with Google's API before allowing login
- Return verification result to client

#### 3. Implement Account Recovery (Important)
- Add "Forgot Password" flow
- Use Firebase's `sendPasswordResetEmail()`
- Add email verification for new accounts

#### 4. Add Multi-Factor Authentication (For Admin Accounts)
- Use Firebase's built-in MFA
- Require for admin and organizer accounts
- SMS or authenticator app options

#### 5. Monitor and Alert (Important)
Set up monitoring for:
- Multiple failed login attempts from same IP
- Unusual login patterns
- Successful logins from new locations
- Rate limit triggers

**Tools:**
- Firebase Extensions: "Trigger Email from Firestore"
- Cloud Functions for custom alerts
- Google Cloud Monitoring

#### 6. IP-Based Rate Limiting (Advanced)
Current rate limiting is per-email. Consider adding:
- Per-IP rate limiting
- Requires server-side implementation
- Use Vercel Edge Functions or Cloud Functions

## 📊 Security Monitoring

### Check Failed Login Attempts:
1. Go to Firebase Console
2. Navigate to Firestore Database
3. View `loginlogs` collection
4. Filter by `success: false`

### Analyze Patterns:
Look for:
- Multiple failed attempts on same email
- Failed attempts from unusual times
- Patterns suggesting automated attacks

## 🔍 Testing Security Features

### Test Rate Limiting:
1. Try logging in with wrong password 3 times
2. You should see a warning: "2 attempts remaining"
3. After 5 failed attempts, account locks for 30 minutes
4. Wait 30 minutes OR restart the app to clear (development only)

### Test reCAPTCHA:
1. Open browser DevTools → Network tab
2. Attempt login
3. Look for requests to `google.com/recaptcha/`
4. Should see reCAPTCHA token generation

### Test Account Lockout:
1. Fail 5 login attempts
2. Try to login again
3. Should see: "Too many failed login attempts. Please try again in X minutes."
4. Form should be disabled

## 🚨 Security Incident Response

If you suspect a security breach:

1. **Immediate Actions:**
   - Change all admin passwords
   - Review recent login logs in Firebase
   - Check for unauthorized data changes

2. **Investigation:**
   - Export loginlogs collection
   - Analyze failed login patterns
   - Check Firebase Authentication logs

3. **Prevention:**
   - Enable MFA for all admin accounts
   - Rotate Firebase API keys if compromised
   - Update Firestore security rules

## 📝 Best Practices

### For Administrators:
- Use strong, unique passwords (12+ characters)
- Enable MFA on Firebase accounts
- Don't share credentials
- Log out when done
- Review login logs regularly

### For Deployment:
- Never commit `.env.local` to Git
- Use Vercel environment variables for production
- Rotate keys periodically
- Keep Firebase SDK updated
- Monitor for security advisories

## 🔗 Resources

- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/best-practices)
- [reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Firebase App Check](https://firebase.google.com/docs/app-check)

## 📞 Support

For security concerns:
1. Check Firebase Console logs
2. Review this documentation
3. Contact your system administrator
4. For critical issues, contact Firebase Support

---

**Last Updated:** November 3, 2025
**Version:** 1.0
