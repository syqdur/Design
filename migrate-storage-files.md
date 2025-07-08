# Migrate Existing Firebase Storage Files

## Current Status
- Updated Firebase config to use: `weddingpix-744e5.appspot.com`
- Previous files are in: `weddingpix-744e5.firebasestorage.app`

## Option 1: Copy Files to New Bucket Location
If you have access to gsutil, run this command to copy all files:

```bash
gsutil -m cp -r gs://weddingpix-744e5.firebasestorage.app/* gs://weddingpix-744e5.appspot.com/
```

## Option 2: Update Storage Rules on Current Bucket
1. Go to: https://console.firebase.google.com/project/weddingpix-744e5/storage/weddingpix-744e5.appspot.com/rules
2. Set rules to:
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

## Option 3: Revert to Original Config
If you prefer to keep using the original bucket, change firebase.ts back to:
```javascript
storageBucket: "weddingpix-744e5.firebasestorage.app",
```

## Testing
After choosing an option, test by:
1. Refresh your wedding gallery
2. Try uploading a new photo
3. Check if existing media displays properly