# Firebase Storage Service Account Fix - URGENT

## Problem
Error 412: "A required service account is missing necessary permissions" - Firebase Storage service account needs to be re-linked.

## IMMEDIATE SOLUTION

### Step 1: Re-link Firebase Storage Bucket
1. **Go to Firebase Console**: https://console.firebase.google.com/project/weddingpix-744e5/storage
2. **Look for a yellow warning banner** at the top of the Storage page saying "Storage bucket needs to be re-linked"
3. **Click "Re-link bucket"** or **"Fix permissions"** button
4. **Follow the prompts** to restore service account permissions

## CRITICAL: If you see "Bucket not found" error:
The bucket `weddingpix-744e5.firebasestorage.app` may need to be recreated. This happens when buckets get corrupted.

### Step 2: Alternative - Manual Bucket Re-link:
1. **Go to Storage Settings**: https://console.firebase.google.com/project/weddingpix-744e5/storage/weddingpix-744e5.firebasestorage.app/settings  
2. **Click "Link bucket"** or **"Reconnect"** if available
3. **Confirm the bucket linking**

## Step 2B: If still having issues - Service Account Fix:
1. **Go to IAM & Admin**: https://console.firebase.google.com/project/weddingpix-744e5/iam-admin/iam
2. **Find the Firebase service account** (ends with @appspot.gserviceaccount.com)
3. **Click Edit** and ensure it has "Storage Object Admin" role
4. **Save changes**

### Step 3: Update Storage Rules (after re-linking)
1. **Go to Rules**: https://console.firebase.google.com/project/weddingpix-744e5/storage/weddingpix-744e5.firebasestorage.app/rules
2. **Replace with these rules**:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow everyone to read/write all files (for wedding gallery)  
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```
3. **Click "Publish"**

## Why This Fixes Your Media Display Issue
- Service account permissions were disconnected/expired
- Re-linking restores Firebase Storage API access
- Your existing photos/videos will become accessible again
- New uploads will work normally

## After Fixing
- Wait 2-3 minutes for permissions to propagate
- Refresh your wedding gallery page
- All media should display properly

**This service account issue is common after Firebase project changes and is easily fixable in the console.**