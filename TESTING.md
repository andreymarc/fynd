# Testing Guide - Messaging & Profiles

## Prerequisites

1. **Run Migrations** (if not already done):
   - Go to Supabase Dashboard → SQL Editor
   - Run `migrations/add_profiles.sql`
   - Run `migrations/add_notifications.sql`
   - Run `migrations/add_messaging.sql`

2. **Start the App**:
   ```bash
   npm run dev
   ```

## Testing User Profiles

### 1. Check Profile Creation
- **Sign up** with a new account (or use existing)
- Profile should be **automatically created** on signup
- Go to `/profile` or click the **profile icon** in the navbar
- You should see:
  - Your email/name
  - Stats showing 0 items posted, 0 resolved, etc.
  - Edit button

### 2. Edit Profile
- Click the **Edit** button (pencil icon)
- Fill in:
  - Full Name
  - Bio
  - Phone
  - Location
- Click **Save**
- Profile should update immediately

### 3. Check Profile Stats
- Post a few items (go to `/post`)
- Claim some items from another account
- Go back to `/profile`
- Stats should update:
  - Items Posted
  - Items Resolved
  - Items Found
  - Claims Made
  - Success Rate (%)

## Testing Messaging

### Setup: Two User Accounts Needed

You'll need **two different accounts** to test messaging:

1. **Account 1** (Owner): Post an item
2. **Account 2** (Claimer): Claim the item

### Test Flow:

#### Step 1: Owner Posts Item
1. Login as **Account 1**
2. Go to `/post`
3. Post a "Found" item (e.g., "Lost iPhone")
4. Note the item ID from the URL

#### Step 2: Claimer Claims Item
1. **Logout** and login as **Account 2**
2. Go to the item detail page (`/item/[id]`)
3. Click **"Claim This Item"**
4. Add an optional message
5. Click **"Submit Claim"**
6. ✅ **Owner should receive a notification** (bell icon)

#### Step 3: Owner Views Claim & Messages
1. **Logout** and login back as **Account 1** (owner)
2. Go to the item detail page
3. You should see:
   - The claim in the "Claims" section
   - A **"Message"** button next to Approve/Reject
4. Click **"Message"** button
5. Messaging interface should appear

#### Step 4: Test Messaging
1. **Owner** sends a message: "Hi, can you describe the item?"
2. **Logout** and login as **Account 2** (claimer)
3. Go to the item detail page
4. Click **"Message Owner"** button
5. You should see:
   - The message from the owner
   - Unread indicator (blue dot)
   - Reply input field
6. **Claimer** replies: "Yes, it's a black iPhone 13"
7. **Logout** and login as **Owner**
8. Go to item detail → Open messaging
9. You should see both messages in the conversation

#### Step 5: Test Notifications
1. When **Claimer** sends a message, **Owner** should get a notification
2. Check the **bell icon** in navbar
3. Click the bell → Should see "New Message" notification
4. Click the notification → Should navigate to item detail page
5. Notification should be marked as read

## Testing Notifications

### Notification Types to Test:

1. **Claim Notification**:
   - Claimer claims item → Owner gets notification ✅

2. **Claim Approved**:
   - Owner approves claim → Claimer gets notification ✅

3. **Claim Rejected**:
   - Owner rejects claim → Claimer gets notification ✅

4. **New Message**:
   - User sends message → Receiver gets notification ✅

5. **Item Resolved**:
   - Owner marks item as resolved → Approved claimers get notification ✅

### Check Notification Center:
- Click **bell icon** in navbar
- Should see dropdown with notifications
- Unread count badge should show number
- Click "Mark all read" to clear all
- Notifications should have icons and time stamps

## Quick Test Checklist

- [ ] Profile page loads (`/profile`)
- [ ] Profile stats show correct numbers
- [ ] Can edit profile info
- [ ] Profile saves successfully
- [ ] Can claim an item
- [ ] Owner sees claim notification
- [ ] Can open messaging interface
- [ ] Can send messages
- [ ] Messages appear in real-time (within 5 seconds)
- [ ] Message notifications appear
- [ ] Notification center shows unread count
- [ ] Can mark notifications as read
- [ ] Can approve/reject claims
- [ ] Claimer gets approval/rejection notification

## Troubleshooting

### Profile Not Showing:
- Check if `profiles` table exists in Supabase
- Check if trigger `on_auth_user_created` exists
- Manually create profile: Insert into `profiles` table with your user ID

### Messages Not Sending:
- Check if `messages` table exists
- Check RLS policies are set correctly
- Check browser console for errors

### Notifications Not Appearing:
- Check if `notifications` table exists
- Check RLS policies
- Check browser console for errors
- Notifications poll every 10 seconds, wait a bit

### Can't See Other User's Profile:
- Profiles are public, should be visible
- Check RLS policy: "Anyone can view profiles"

## Database Queries for Debugging

Run these in Supabase SQL Editor to check:

```sql
-- Check profiles
SELECT * FROM profiles LIMIT 10;

-- Check messages
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;

-- Check notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Check claims
SELECT * FROM claims ORDER BY created_at DESC LIMIT 10;
```

## Expected Behavior

✅ **Profiles**: Auto-created on signup, editable, shows stats  
✅ **Messaging**: Works between owners and claimers, real-time updates  
✅ **Notifications**: Appear for all important events, clickable links  
✅ **Mobile**: All features work on mobile devices  

