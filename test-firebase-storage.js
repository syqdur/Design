// Test Firebase Storage connectivity
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCqDlIxPDp-QU6mzthkWnmzM6rZ8rnJdiI",
  authDomain: "dev1-b3973.firebaseapp.com",
  projectId: "dev1-b3973",
  storageBucket: "dev1-b3973.firebasestorage.app",
  messagingSenderId: "658150387877",
  appId: "1:658150387877:web:ac90e7b1597a45258f5d4c"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function testStorage() {
  try {
    console.log('Testing Firebase Storage connection...');
    
    // Create a test file
    const testData = new Blob(['Hello Firebase Storage!'], { type: 'text/plain' });
    const testRef = ref(storage, 'test/connection-test.txt');
    
    console.log('Uploading test file...');
    const uploadResult = await uploadBytes(testRef, testData);
    
    console.log('Upload successful! Getting download URL...');
    const downloadURL = await getDownloadURL(testRef);
    
    console.log('✅ Firebase Storage is working correctly!');
    console.log('Test file URL:', downloadURL);
    
  } catch (error) {
    console.error('❌ Firebase Storage error:', error.code, error.message);
    
    if (error.code === 'storage/unauthorized') {
      console.error('Permission denied - check Firebase Storage rules');
    }
  }
}

testStorage();