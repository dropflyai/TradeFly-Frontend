# TradeFly Supabase Setup Guide

## Quick Setup (5 minutes)

### Step 1: Enable Email Authentication
1. Go to: https://supabase.com/dashboard/project/nplgxhthjwwyywbnvxzt/auth/providers
2. Find "Email" in the provider list
3. Click the toggle to turn it **ON**
4. Click "Save"

### Step 2: Disable Email Confirmation (For Development)
1. Go to: https://supabase.com/dashboard/project/nplgxhthjwwyywbnvxzt/auth/users
2. Click "Configuration" or "Settings"
3. Find "Enable email confirmations"
4. Toggle it **OFF** (this allows instant signups)
5. Click "Save"

### Step 3: Run Database Schema
1. Go to: https://supabase.com/dashboard/project/nplgxhthjwwyywbnvxzt/sql/new
2. Copy all contents from `supabase-auth-schema.sql`
3. Paste into the SQL editor
4. Click "Run" or press Cmd/Ctrl + Enter

### Step 4: Configure Site URL
1. Go to: https://supabase.com/dashboard/project/nplgxhthjwwyywbnvxzt/auth/url-configuration
2. Set Site URL to: `https://tradeflyai.com`
3. Add Redirect URLs:
   - `https://tradeflyai.com`
   - `https://tradeflyai.com/login.html`
   - `http://localhost:3000` (for local development)
4. Click "Save"

## Testing

After completing the setup, test the authentication:

1. Go to https://tradeflyai.com/login.html
2. Click "Sign Up" tab
3. Enter:
   - Full Name: Test User
   - Email: test@example.com
   - Password: password123
4. Click "Create Account"
5. You should be logged in instantly (no email confirmation required)

## Troubleshooting

### "Invalid API Key" Error
- **Cause**: Email provider is not enabled in Supabase
- **Fix**: Complete Step 1 above

### "Email not confirmed" Error
- **Cause**: Email confirmation is enabled
- **Fix**: Complete Step 2 above, or check your email for confirmation link

### "Failed to create account" Error
- **Cause**: Database tables don't exist
- **Fix**: Complete Step 3 above

### User created but can't log in
- **Cause**: Row Level Security blocking profile access
- **Fix**: Verify Step 3 was completed correctly

## Production Checklist

Before going fully live:

- [ ] Enable email confirmation (Step 2, toggle ON)
- [ ] Configure custom email templates
- [ ] Set up custom SMTP server (optional)
- [ ] Enable 2FA for admin accounts
- [ ] Review and tighten RLS policies
- [ ] Set up monitoring and alerts

## Current Configuration

- **Supabase URL**: https://nplgxhthjwwyywbnvxzt.supabase.co
- **Project ID**: nplgxhthjwwyywbnvxzt
- **Dashboard**: https://supabase.com/dashboard/project/nplgxhthjwwyywbnvxzt

---

**Need Help?**

If you're still getting errors after following these steps, check the browser console (F12) for detailed error messages.
