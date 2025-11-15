# PWA Setup Guide

Your Fynd app is now a Progressive Web App (PWA)! 🎉

## What's Been Configured

✅ **Service Worker** - Automatically caches assets for offline use
✅ **Web App Manifest** - Defines app name, icons, and display mode
✅ **Apple iOS Support** - Optimized for iPhone/iPad
✅ **Android Support** - Works on Android devices
✅ **Offline Caching** - Caches Supabase API calls, map tiles, and geocoding

## Adding App Icons

The app will work without custom icons, but for the best experience, add icons:

### Option 1: Online Tool (Easiest)
1. Visit https://realfavicongenerator.net/
2. Upload your `public/logo.jpg`
3. Download the generated icons
4. Extract and place PNG files in `public/icons/` with these names:
   - `icon-72x72.png`
   - `icon-96x96.png`
   - `icon-128x128.png`
   - `icon-144x144.png`
   - `icon-152x152.png`
   - `icon-192x192.png`
   - `icon-384x384.png`
   - `icon-512x512.png`

### Option 2: Using Sharp (Node.js)
```bash
npm install -D sharp
node scripts/generate-icons.js public/logo.jpg public/icons
```

### Option 3: Manual
Use any image editor to resize `logo.jpg` to each size and save as PNG files.

## Testing PWA Installation

### On iPhone/iPad:
1. Open Safari (not Chrome)
2. Visit your deployed site
3. Tap the Share button (square with arrow)
4. Scroll down and tap "Add to Home Screen"
5. Tap "Add"
6. Open from home screen - it should launch full-screen!

### On Android:
1. Open Chrome
2. Visit your deployed site
3. You may see an "Install App" banner - tap it
4. Or tap the menu (3 dots) → "Install app"
5. Confirm installation
6. App icon appears on home screen

### On Desktop (Chrome/Edge):
1. Visit your site
2. Look for install icon in address bar
3. Click "Install"
4. App opens in its own window

## Offline Testing

1. Install the app on your device
2. Open the installed app
3. Browse some items (let them cache)
4. Turn off Wi-Fi and mobile data
5. The app should still work! (cached content)

## What Gets Cached

- ✅ All app files (HTML, CSS, JS)
- ✅ Images and assets
- ✅ Supabase API responses (24 hours)
- ✅ Map tiles (30 days)
- ✅ Geocoding results (7 days)

## Updating the App

The service worker automatically updates when you deploy new code. Users will get the update on their next visit.

## Troubleshooting

**Icons not showing?**
- Make sure icons are in `public/icons/` directory
- Rebuild: `npm run build`
- Clear browser cache

**Can't install on iPhone?**
- Must use Safari (not Chrome)
- Site must be HTTPS (works on localhost for testing)
- Check Apple meta tags in `index.html`

**Service worker not working?**
- Check browser console for errors
- Ensure site is served over HTTPS (or localhost)
- Clear site data and reload

## Next Steps

1. ✅ Add custom icons (see above)
2. ✅ Deploy to production (Netlify)
3. ✅ Test installation on real devices
4. ✅ Share with users!

Your PWA is ready! 🚀

