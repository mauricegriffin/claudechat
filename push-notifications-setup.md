# Push Notifications Setup Guide

## Prerequisites

1. **Generate VAPID Keys** (if you haven't already):
   ```bash
   npm install -g web-push
   web-push generate-vapid-keys
   ```
   Save both the public and private keys.

2. **Install Supabase CLI** (if you haven't already):
   ```bash
   npm install -g supabase
   ```

## Setup Steps

### 1. Database Setup
Run the SQL script in your Supabase dashboard:
```bash
# Copy the contents of database-push-notifications.sql and run in Supabase SQL Editor
```

### 2. Configure Environment Variables
In your Supabase dashboard, go to **Project Settings > Edge Functions** and add:
- `VAPID_PUBLIC_KEY`: Your VAPID public key
- `VAPID_PRIVATE_KEY`: Your VAPID private key  
- `VAPID_EMAIL`: Your contact email (e.g., admin@yourapp.com)

### 3. Update Frontend Configuration
In `src/services/pushService.js`, replace:
```javascript
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE'
```
With your actual VAPID public key.

### 4. Deploy Edge Function
```bash
# Login to Supabase (if not already)
supabase login

# Link to your project
supabase link --project-ref ecjwszfrantxpvuzfvwl

# Deploy the edge function
supabase functions deploy send-push-notification
```

### 5. Test the Implementation

1. **Deploy your app** to make sure service worker updates
2. **Open the app in two browser windows/devices**
3. **Login as different users**
4. **Go to Settings and enable notifications** in both windows
5. **Send a message from one user**
6. **You should see a push notification** on the other device

## Troubleshooting

### Common Issues:

1. **"Permission denied" error**:
   - Make sure HTTPS is enabled (required for push notifications)
   - Check if user clicked "Block" on permission prompt

2. **Service worker not updating**:
   - Hard refresh the page (Ctrl/Cmd + Shift + R)
   - Check browser dev tools > Application > Service Workers

3. **VAPID key errors**:
   - Ensure VAPID keys are correctly set in Supabase environment variables
   - Make sure public key in frontend matches the one in backend

4. **Edge function errors**:
   - Check Supabase function logs in dashboard
   - Ensure `user_profiles` table exists with username field

### Testing Push Notifications:

**Local Testing:**
- Push notifications require HTTPS
- Use `npm run build && npm run preview` to test with production build
- Or deploy to a staging environment

**Browser Support:**
- ✅ Chrome (Desktop & Android)
- ✅ Firefox (Desktop & Android)  
- ✅ Safari (macOS & iOS 16.4+)
- ✅ Edge (Desktop)

**Platform Behavior:**
- **Desktop**: Notifications show in system notification center
- **Android**: Works in browser and when PWA is installed
- **iOS**: Requires PWA to be "Add to Home Screen" for background notifications

## Cost Estimation

**Supabase Edge Functions Pricing:**
- Free tier: 500K function invocations/month
- Pro tier ($25/month): 2M function invocations/month  
- Additional: $2 per 1M invocations

**Example usage:**
- 100 users × 50 messages/day = 5K notifications/day = 150K/month = **FREE**
- 1000 users × 50 messages/day = 50K notifications/day = 1.5M/month = **$25/month**

## Security Notes

- VAPID keys should be kept secure
- Push subscriptions are tied to specific users
- Invalid subscriptions are automatically cleaned up
- All notifications go through your own Supabase function (no third-party service)

## Production Checklist

- [ ] VAPID keys generated and configured
- [ ] Database table created with proper RLS policies
- [ ] Edge function deployed and tested
- [ ] Frontend configured with correct VAPID public key
- [ ] HTTPS enabled on your domain
- [ ] Service worker properly registered
- [ ] Push notifications tested on multiple devices/browsers
- [ ] Error handling implemented for failed notifications