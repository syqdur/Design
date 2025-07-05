# Firebase Database Indexes Required

## Notification System Index

The notification system requires a composite index for the `notifications` collection. 

**To create the index:**

1. Go to the Firebase Console: https://console.firebase.google.com/
2. Select your project: `weddingpix-744e5`
3. Navigate to Firestore Database > Indexes
4. Click "Create Index" and use these settings:

**Collection ID:** `notifications`

**Fields to index:**
- `targetUser` (Ascending)
- `targetDeviceId` (Ascending) 
- `createdAt` (Descending)

**Or use this direct link from the error message:**
https://console.firebase.google.com/v1/r/project/weddingpix-744e5/firestore/indexes?create_composite=ClZwcm9qZWN0cy93ZWRkaW5ncGl4LTc0NGU1L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9ub3RpZmljYXRpb25zL2luZGV4ZXMvXxABGhIKDnRhcmdldERldmljZUlkEAEaDgoKdGFyZ2V0VXNlchABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI

This index will enable fast queries for user-specific notifications ordered by creation time.