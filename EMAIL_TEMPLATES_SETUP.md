# Email Templates Configuration Guide for Fynd

This guide will help you configure Supabase email templates for your site: **https://fyndit.netlify.app/**

## Step-by-Step Instructions

### Step 1: Access Email Templates in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Email Templates** (in the left sidebar)

### Step 2: Configure "Confirm signup" Template

This email is sent when users sign up for your app.

1. Click on **"Confirm signup"** template
2. Find the **Confirmation Link** section
3. Update the redirect URL to:

```
{{ .SiteURL }}/
```

**Important:** The `{{ .SiteURL }}` variable will automatically use your Site URL (which we'll set in Step 4), so this will resolve to `https://fyndit.netlify.app/`

4. **Optional:** Customize the email content. Here's a suggested template:

**Subject:**

```
Confirm your Fynd account
```

**Body (HTML):**

```html
<h2>Welcome to Fynd!</h2>
<p>
  Thanks for signing up. Please confirm your email address by clicking the link
  below:
</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>If you didn't create an account, you can safely ignore this email.</p>
<p>Best regards,<br />The Fynd Team</p>
```

**Body (Plain Text):**

```
Welcome to Fynd!

Thanks for signing up. Please confirm your email address by clicking the link below:

{{ .ConfirmationURL }}

If you didn't create an account, you can safely ignore this email.

Best regards,
The Fynd Team
```

5. Click **Save**

### Step 3: Configure "Reset password" Template

This email is sent when users request a password reset.

1. Click on **"Reset password"** template
2. Find the **Reset Link** section
3. Update the redirect URL to:

```
{{ .SiteURL }}/?type=recovery&token=reset
```

**Important:** This will resolve to `https://fyndit.netlify.app/?type=recovery&token=reset`

4. **Optional:** Customize the email content. Here's a suggested template:

**Subject:**

```
Reset your Fynd password
```

**Body (HTML):**

```html
<h2>Password Reset Request</h2>
<p>You requested to reset your password for your Fynd account.</p>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request a password reset, you can safely ignore this email.</p>
<p>Best regards,<br />The Fynd Team</p>
```

**Body (Plain Text):**

```
Password Reset Request

You requested to reset your password for your Fynd account.

Click the link below to reset your password:

{{ .ConfirmationURL }}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
The Fynd Team
```

5. Click **Save**

### Step 4: Configure Site URL and Redirect URLs

This is **CRITICAL** - without this, the email links won't work!

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to:

   ```
   https://fyndit.netlify.app
   ```

   (No trailing slash)

3. In **Redirect URLs**, add these URLs (one per line):

   ```
   https://fyndit.netlify.app/**
   https://fyndit.netlify.app/?type=recovery&token=reset
   https://fyndit.netlify.app/
   ```

   The `**` wildcard allows all paths under your domain.

4. Click **Save**

### Step 5: Verify Configuration

After saving, verify your settings:

1. **Site URL** should be: `https://fyndit.netlify.app`
2. **Redirect URLs** should include:
   - `https://fyndit.netlify.app/**`
   - `https://fyndit.netlify.app/?type=recovery&token=reset`
   - `https://fyndit.netlify.app/`

### Step 6: Test the Email Templates

1. **Test Sign Up Email:**

   - Go to https://fyndit.netlify.app/login
   - Click "Sign up"
   - Enter a test email address
   - Check your email inbox
   - Click the confirmation link
   - You should be redirected to https://fyndit.netlify.app/ and logged in

2. **Test Password Reset Email:**
   - Go to https://fyndit.netlify.app/login
   - Click "Forgot password?"
   - Enter your email address
   - Check your email inbox
   - Click the reset link
   - You should be redirected to https://fyndit.netlify.app/?type=recovery&token=reset

## Available Template Variables

Supabase provides these variables you can use in your email templates:

- `{{ .SiteURL }}` - Your site URL (https://fyndit.netlify.app)
- `{{ .ConfirmationURL }}` - The full confirmation/reset link
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - The confirmation token (usually in the URL)
- `{{ .TokenHash }}` - Hashed token
- `{{ .RedirectTo }}` - Where to redirect after confirmation

## Troubleshooting

### Email Links Not Working

1. **Check Site URL:**

   - Go to **Authentication** → **URL Configuration**
   - Verify Site URL is exactly: `https://fyndit.netlify.app` (no trailing slash)

2. **Check Redirect URLs:**

   - Make sure `https://fyndit.netlify.app/**` is in the list
   - The `**` wildcard is important for catching all paths

3. **Check Email Template URLs:**
   - Confirm signup template should use: `{{ .SiteURL }}/`
   - Reset password template should use: `{{ .SiteURL }}/?type=recovery&token=reset`

### Emails Going to Spam

1. **Set up Custom SMTP** (recommended for production):

   - Go to **Project Settings** → **Auth** → **SMTP Settings**
   - Configure with a service like SendGrid, Mailgun, or AWS SES
   - This improves deliverability significantly

2. **Add SPF/DKIM records** (if using custom domain):
   - Follow your SMTP provider's instructions
   - Add DNS records to your domain

### Email Not Sending

1. Check **Authentication** → **Providers** → **Email** is enabled
2. Check Supabase logs: **Logs** → **Auth Logs**
3. Verify your email address isn't blocked
4. Check spam folder

## Quick Reference

**Your Site:** https://fyndit.netlify.app/

**Site URL in Supabase:**

```
https://fyndit.netlify.app
```

**Redirect URLs in Supabase:**

```
https://fyndit.netlify.app/**
https://fyndit.netlify.app/?type=recovery&token=reset
https://fyndit.netlify.app/
```

**Confirm Signup Template Redirect:**

```
{{ .SiteURL }}/
```

**Reset Password Template Redirect:**

```
{{ .SiteURL }}/?type=recovery&token=reset
```

## Next Steps

After configuring email templates:

1. ✅ Test sign up flow
2. ✅ Test password reset flow
3. ✅ Consider setting up custom SMTP for better deliverability
4. ✅ Monitor email delivery in Supabase logs
5. ✅ Add your app's branding to email templates (optional)

## Support

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase URL Configuration](https://supabase.com/docs/guides/auth/auth-deep-links)
