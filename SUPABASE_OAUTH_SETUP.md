# Supabase OAuth Configuration for Local Development

## Problem
When developing locally, Google OAuth redirects to the production URL instead of localhost.

## Solution
You need to add your local development URLs to Supabase's allowed redirect URLs.

### Steps to Fix:

1. **Go to Supabase Dashboard**
   - Visit https://app.supabase.com
   - Select your project

2. **Navigate to Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Click on "URL Configuration"

3. **Add Local Development URLs**
   Add these URLs to the "Redirect URLs" section:
   ```
   http://localhost:5173
   http://localhost:5174
   http://localhost:3000
   http://localhost:8080
   http://127.0.0.1:5173
   http://127.0.0.1:5174
   ```

4. **Save Changes**
   - Click "Save" at the bottom of the page

### Additional Configuration (if needed)

If you're still having issues, also check:

1. **Google OAuth App Settings**
   - Go to Authentication → Providers → Google
   - Make sure your Google OAuth app (in Google Cloud Console) also includes localhost URLs in its authorized redirect URIs

2. **Site URL**
   - In URL Configuration, you can set a "Site URL" for development
   - This is optional but can help with redirects

### Testing

After making these changes:
1. Clear your browser cache/cookies
2. Try signing in with Google again
3. Check the browser console for the redirect URL being used (we added a console.log)

### Production Deployment

Your production URL should already be configured. The code now uses `window.location.origin` which automatically adapts to wherever the app is hosted.