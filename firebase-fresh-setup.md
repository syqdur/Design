# Create Fresh Firebase Project - IMMEDIATE SOLUTION

## Why This Approach
Your current Firebase Storage bucket has corrupted service account permissions that can't be easily fixed. Creating a fresh project will resolve this instantly.

## Step 1: Create New Firebase Project
1. Go to: https://console.firebase.google.com/
2. Click "Add project"
3. Project name: `wedding-gallery-2025`
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Storage
1. In new project, go to "Storage"
2. Click "Get started"
3. Choose "Start in test mode"
4. Select region: "us-central1"
5. Click "Done"

## Step 3: Get Firebase Config
1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click "Add app" → Web (</>) 
4. App nickname: "Wedding Gallery"
5. Click "Register app"
6. Copy the entire firebaseConfig object

## Step 4: Enable Firestore
1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode"
4. Select same region as Storage
5. Click "Done"

## Step 5: Set Storage Rules
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

## Step 6: Set Firestore Rules
1. Go to Firestore → Rules
2. Replace with:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
3. Click "Publish"

## After Setup
Send me the new firebaseConfig and I'll update your app immediately. This will give you a completely fresh, working Firebase setup without any permission issues.