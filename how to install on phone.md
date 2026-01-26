# Installing ToothAid on Android Phone - Step by Step Guide

This guide will walk you through installing the ToothAid PWA (Progressive Web App) on your Android phone.

## 📱 Prerequisites

Before you begin, make sure you have:
- ✅ An Android phone (Android 5.0 or higher)
- ✅ Chrome browser installed on your Android phone
- ✅ A computer to build and deploy the app
- ✅ The app built and accessible via a URL (see deployment options below)

## 🚀 Step 1: Build the App for Production

First, you need to build the app on your computer:

1. **Open terminal/command prompt** on your computer
2. **Navigate to the client directory:**
   ```bash
   cd /path/to/toothaid/client
   ```
   (Replace `/path/to/toothaid` with your actual project path)

3. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

4. **Build the app:**
   ```bash
   npm run build
   ```

5. **Wait for build to complete** - You should see:
   ```
   ✓ built in X.XXs
   ```

6. **The built files are now in `client/dist/` directory**

## 🌐 Step 2: Deploy the App (Choose One Option)

You need to make the app accessible via a URL. Choose one of these options:

### Option A: Deploy to a Web Server (Recommended for Production)

#### Using Netlify (Free & Easy)

1. **Sign up** at [netlify.com](https://www.netlify.com) (free account)

2. **Install Netlify CLI** (optional, or use web interface):
   ```bash
   npm install -g netlify-cli
   ```

3. **Deploy:**
   ```bash
   cd client
   netlify deploy --prod --dir=dist
   ```
   - Follow prompts to login/create account
   - Your app will be live at `https://your-app-name.netlify.app`

#### Using Vercel (Free & Easy)

1. **Sign up** at [vercel.com](https://www.vercel.com) (free account)

2. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

3. **Deploy:**
   ```bash
   cd client
   vercel --prod
   ```
   - Follow prompts
   - Your app will be live at `https://your-app-name.vercel.app`

#### Using GitHub Pages

1. **Create a GitHub repository** and push your code

2. **Install gh-pages:**
   ```bash
   cd client
   npm install --save-dev gh-pages
   ```

3. **Add to `package.json`:**
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages** in repository settings
   - Your app will be at `https://your-username.github.io/toothaid`

### Option B: Use ngrok for Local Testing (Temporary URL)

**Note:** This is only for testing. The URL changes each time you restart ngrok.

1. **Sign up** at [ngrok.com](https://ngrok.com) (free account)

2. **Download ngrok** and install

3. **Start your local server:**
   ```bash
   cd client
   npm run preview
   ```
   (This serves the built app from `dist/` folder)

4. **In another terminal, start ngrok:**
   ```bash
   ngrok http 4173
   ```
   (4173 is the default port for `npm run preview`)

5. **Copy the HTTPS URL** from ngrok (looks like `https://xxxxx.ngrok.io`)

### Option C: Use Your Own Server

If you have your own web server:

1. **Upload the `dist/` folder** to your web server
2. **Configure your server** to serve the files
3. **Ensure HTTPS is enabled** (required for PWA)
4. **Access via your domain** (e.g., `https://yourdomain.com`)

## 📲 Step 3: Install on Android Phone

Now that your app is accessible via a URL, install it on your Android phone:

### Method 1: Install via Chrome (Recommended)

1. **Open Chrome browser** on your Android phone

2. **Navigate to your app URL:**
   - Type the URL in the address bar
   - Or scan a QR code if you're using ngrok
   - Example: `https://your-app-name.netlify.app`

3. **Wait for the app to load**

4. **Look for the install prompt:**
   - Chrome may show a banner: "Add ToothAid to Home screen"
   - Or a popup: "Install app"

5. **If you don't see the prompt:**
   - Tap the **three-dot menu** (⋮) in Chrome
   - Select **"Add to Home screen"** or **"Install app"**

6. **Customize the app name** (optional):
   - You can change the name before installing
   - Default will be "ToothAid"

7. **Tap "Add" or "Install"**

8. **The app icon will appear on your home screen!**

### Method 2: Manual Installation

If the automatic prompt doesn't appear:

1. **Open Chrome** and navigate to your app URL

2. **Tap the three-dot menu** (⋮) in the top right

3. **Scroll down** and tap **"Add to Home screen"**

4. **Confirm installation** by tapping "Add"

5. **The app is now installed!**

## ✅ Step 4: Verify Installation

1. **Look for the ToothAid icon** on your home screen

2. **Tap the icon** - it should open like a native app (no browser UI)

3. **Test offline functionality:**
   - Open the app
   - Turn on Airplane Mode
   - The app should still work (shows "Offline Mode" banner)
   - You can still register children and add visits

4. **Test sync:**
   - Turn off Airplane Mode
   - Go to Sync page
   - Click "Sync Now"
   - Verify data syncs successfully

## 🔧 Troubleshooting

### App Won't Install

**Problem:** No "Add to Home screen" option appears

**Solutions:**
- Make sure you're using **Chrome browser** (not Samsung Internet or Firefox)
- Ensure the site is served over **HTTPS** (required for PWA)
- Check that the app has loaded completely
- Try clearing Chrome cache: Settings → Privacy → Clear browsing data

### App Opens in Browser Instead of Standalone

**Problem:** App opens with browser UI instead of fullscreen

**Solutions:**
- Uninstall and reinstall the app
- Make sure you're accessing via HTTPS
- Check that `manifest.webmanifest` is properly configured

### Offline Mode Not Working

**Problem:** App doesn't work when offline

**Solutions:**
- Make sure you've visited the app at least once while online
- Check that service worker is registered (Chrome DevTools → Application → Service Workers)
- Clear cache and reload: Settings → Site settings → Clear & reset

### Can't Access the App URL

**Problem:** Phone can't reach the app URL

**Solutions:**
- **If using ngrok:** Make sure ngrok is still running on your computer
- **If using local network:** Ensure phone and computer are on same Wi-Fi
- **If using deployed URL:** Check that deployment was successful
- Try accessing the URL in a regular browser first to verify it works

### Sync Not Working

**Problem:** Data won't sync to server

**Solutions:**
- Check that phone has internet connection
- Verify server is running and accessible
- Check server URL in app configuration
- Look at browser console for errors (Chrome → Menu → More tools → Developer tools)

## 📝 Additional Notes

### For Development/Testing

If you're testing locally and want to access from your phone:

1. **Find your computer's local IP address:**
   - **Mac/Linux:** Run `ifconfig` or `ip addr`
   - **Windows:** Run `ipconfig`
   - Look for something like `192.168.1.xxx`

2. **Start the dev server:**
   ```bash
   cd client
   npm run dev
   ```

3. **Note the port** (usually 5173)

4. **On your phone, connect to same Wi-Fi** and navigate to:
   ```
   http://YOUR-COMPUTER-IP:5173
   ```
   Example: `http://192.168.1.100:5173`

5. **Install as PWA** (but note: HTTP may not work for all PWA features)

### For Production

- Always use **HTTPS** for production deployments
- Test on multiple Android devices if possible
- Consider adding app icons for better appearance
- Update `manifest.webmanifest` with your app details

## 🎯 Quick Checklist

Before installing on Android:

- [ ] App is built (`npm run build` completed successfully)
- [ ] App is deployed and accessible via HTTPS URL
- [ ] You can access the URL in a browser
- [ ] Server is running and accessible
- [ ] You have Chrome browser on Android phone
- [ ] Phone has internet connection (for first load)

After installation:

- [ ] App icon appears on home screen
- [ ] App opens in standalone mode (no browser UI)
- [ ] App works offline
- [ ] Sync functionality works
- [ ] All features are accessible

## 📞 Need Help?

If you encounter issues:

1. Check browser console for errors (Chrome DevTools)
2. Verify server is running and accessible
3. Check network connectivity
4. Ensure you're using HTTPS (for production)
5. Review the main README.md for setup instructions

## 🔄 Updating the App

When you update the app:

1. **Rebuild:**
   ```bash
   cd client
   npm run build
   ```

2. **Redeploy** to your hosting service

3. **On your phone:**
   - Open the installed app
   - It should automatically update
   - Or uninstall and reinstall if needed

---

**Congratulations!** Your ToothAid app is now installed on your Android phone and ready to use! 🎉
