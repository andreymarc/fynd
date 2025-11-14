# Deployment Guide - Netlify

This guide will help you deploy your Fynd app to Netlify.

## Prerequisites

1. A Netlify account (sign up at https://netlify.com)
2. Your Supabase project URL and anon key
3. Git repository (GitHub, GitLab, or Bitbucket) - recommended

## Method 1: Deploy via Netlify Dashboard (Quick Start)

### Step 1: Build Your App Locally

First, make sure your app builds successfully:

```bash
npm install
npm run build
```

This should create a `dist` folder with your built files.

### Step 2: Deploy to Netlify

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Deploy manually"**
3. Drag and drop your `dist` folder
4. Your site will be live immediately!

### Step 3: Configure Environment Variables

1. Go to **Site settings** → **Environment variables**
2. Add these variables:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

3. Go to **Deploys** → **Trigger deploy** → **Deploy site** to rebuild with env vars

## Method 2: Deploy via Git (Recommended)

### Step 1: Push to Git Repository

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Connect to Netlify

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository
5. Netlify will auto-detect settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: 18

### Step 3: Configure Environment Variables

1. In your site settings, go to **Environment variables**
2. Add:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

### Step 4: Deploy

Netlify will automatically deploy on every push to your main branch!

## Method 3: Deploy via Netlify CLI

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login

```bash
netlify login
```

### Step 3: Initialize and Deploy

```bash
# Build your app
npm run build

# Deploy
netlify deploy --prod
```

### Step 4: Set Environment Variables

```bash
netlify env:set VITE_SUPABASE_URL "your-supabase-url"
netlify env:set VITE_SUPABASE_ANON_KEY "your-supabase-anon-key"
```

Then redeploy:
```bash
netlify deploy --prod
```

## Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Site loads without errors
- [ ] Authentication works
- [ ] Database connection works
- [ ] Images upload correctly
- [ ] All routes work (React Router)

## Troubleshooting

### Build Fails

- Check Node version (should be 18+)
- Run `npm install` locally first
- Check build logs in Netlify dashboard

### Environment Variables Not Working

- Make sure variable names start with `VITE_`
- Redeploy after adding env vars
- Check variable values don't have extra spaces

### 404 Errors on Routes

- The `netlify.toml` file should handle this automatically
- Make sure `netlify.toml` is in your root directory

### CORS Issues with Supabase

- Check your Supabase project settings
- Make sure your Netlify domain is added to allowed origins (if required)

## Custom Domain

1. Go to **Domain settings** → **Add custom domain**
2. Follow Netlify's DNS instructions
3. SSL certificate will be auto-provisioned

## Continuous Deployment

With Git integration, every push to your main branch will automatically trigger a new deployment. You can also:

- Set up branch previews for PRs
- Configure deploy contexts (production, staging, etc.)
- Set up build hooks for manual deployments

## Performance Tips

- Enable **Asset optimization** in Netlify settings
- Enable **Minify** for CSS and JS
- Use **Image optimization** if needed
- Consider enabling **Edge Functions** for API routes

## Support

- Netlify Docs: https://docs.netlify.com
- Netlify Community: https://community.netlify.com

