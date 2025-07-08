# Create New Firebase Storage Bucket

## Step 1: Create New Firebase Project (Recommended)
1. Go to Firebase Console: https://console.firebase.google.com/
2. Click "Add project"
3. Name: `weddingpix-2025` (or any name you prefer)
4. Continue through setup (disable Google Analytics if you want)
5. Create project

## Step 2: Enable Storage in New Project
1. In your new Firebase project, go to "Storage" in left menu
2. Click "Get started"
3. Choose "Start in test mode" (we'll secure it later)
4. Select location: `us-central1` (or closest to your location)
5. Click "Done"

## Step 3: Get New Configuration
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" → Web app (</>) 
4. App nickname: `Wedding Gallery`
5. Click "Register app"
6. Copy the firebaseConfig object

## Step 4: Update Storage Rules
1. Go to Storage → Rules
2. Replace with:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```
3. Click "Publish"

## Step 5: Alternative - Fix Current Bucket
If you want to keep current project instead:
1. Go to Storage in current project
2. Look for yellow warning banner
3. Click "Re-link bucket" 
4. Follow prompts to restore permissions

## Configuration Update
After creating new bucket, replace the configuration in `client/src/config/firebase.ts`