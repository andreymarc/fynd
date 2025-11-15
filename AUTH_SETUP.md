# Supabase Authentication Setup Guide

This guide will help you configure Supabase authentication for production use before publishing to your neighborhood Facebook group.

## Step 1: Configure Supabase Authentication Settings

### 1.1 Enable Email Authentication

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Make sure **Email** provider is enabled
4. Configure the following settings:

#### Email Settings:

- **Enable email confirmations**:
  - **For production**: Recommended to enable (requires users to verify email)
  - **For testing**: You can disable temporarily
- **Secure email change**: Enable this for better security

- **Double opt-in**: Optional, but recommended for production

### 1.2 Configure Email Templates

1. Go to **Authentication** → **Email Templates**

2. **Confirm signup** template:

   - This is sent when users sign up
   - Make sure the redirect URL is set to: `{{ .SiteURL }}/`
   - Customize the email content if desired

3. **Reset password** template:
   - This is sent when users request password reset
   - Make sure the redirect URL is set to: `{{ .SiteURL }}/?type=recovery&token=reset`
   - Customize the email content if desired

### 1.3 Configure Site URL

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain: `https://fyndit.netlify.app`
3. Add your production domain to **Redirect URLs**:
   - `https://fyndit.netlify.app/**`
   - `https://fyndit.netlify.app/?type=recovery&token=reset`
   - `https://fyndit.netlify.app/`

### 1.4 Password Requirements (Optional)

1. Go to **Authentication** → **Policies**
2. Configure password requirements:
   - Minimum length: 6 characters (default)
   - You can add more requirements if needed

## Step 2: Test Authentication Locally

### 2.1 Create `.env` file

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2.2 Test Sign Up Flow

1. Run `npm run dev`
2. Go to `/login` page
3. Click "Sign up"
4. Enter email and password
5. Check your email for confirmation link (if email confirmation is enabled)
6. Click the confirmation link
7. You should be automatically logged in

### 2.3 Test Sign In Flow

1. Use the credentials you just created
2. Sign in
3. You should be redirected to the home page

### 2.4 Test Password Reset Flow

1. Click "Forgot password?"
2. Enter your email
3. Check your email for reset link
4. Click the reset link
5. You'll be redirected back to the app

## Step 3: Production Deployment

### 3.1 Set Environment Variables in Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

### 3.2 Update Supabase Redirect URLs

1. In Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Add your Netlify domain to **Redirect URLs**:
   ```
   https://fyndit.netlify.app/**
   https://fyndit.netlify.app/?type=recovery&token=reset
   https://fyndit.netlify.app/
   ```

### 3.3 Update Site URL

Set the **Site URL** in Supabase to your production domain:

```
https://fyndit.netlify.app
```

**Note:** See `EMAIL_TEMPLATES_SETUP.md` for detailed email template configuration instructions.

## Step 4: Security Best Practices

### 4.1 Enable Row Level Security (RLS)

Make sure RLS is enabled on all your database tables. Check your migrations in the `migrations/` folder.

### 4.2 Email Confirmation

For production, **strongly recommend** enabling email confirmation:

- Prevents fake accounts
- Ensures valid email addresses
- Better security

### 4.3 Rate Limiting

Supabase has built-in rate limiting, but you can configure additional limits in:

- **Authentication** → **Rate Limits**

## Step 5: Troubleshooting

### Users Can't Sign Up

- Check if email confirmation is enabled (users need to click email link)
- Check Supabase logs: **Logs** → **Auth Logs**
- Verify Site URL is set correctly

### Password Reset Not Working

- Check redirect URL in email template
- Verify redirect URL is in allowed list
- Check email spam folder

### Email Not Sending

- Check Supabase email settings
- Verify SMTP is configured (Supabase uses default SMTP)
- Check spam folder
- For production, consider setting up custom SMTP

## Step 6: Custom SMTP (Optional, for Production)

For better email deliverability:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Configure your SMTP provider (SendGrid, Mailgun, etc.)
3. This ensures emails don't go to spam

## Quick Checklist Before Launch

- [ ] Email authentication enabled
- [ ] Site URL set to production domain
- [ ] Redirect URLs configured
- [ ] Email templates customized (optional)
- [ ] Environment variables set in Netlify
- [ ] Tested sign up flow
- [ ] Tested sign in flow
- [ ] Tested password reset flow
- [ ] Email confirmation working (if enabled)
- [ ] RLS policies in place
- [ ] Custom SMTP configured (optional)

## Support

- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Supabase Community: https://github.com/supabase/supabase/discussions
