// Test Firebase Storage connectivity
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB5kbpgei7k133J-2qyQ4XWg_b1BNf5M0c",
  authDomain: "weddingpix-744e5.firebaseapp.com",
  projectId: "weddingpix-744e5",
  storageBucket: "weddingpix-744e5.firebasestorage.app",
  messagingSenderId: "490398482579",
  appId: "1:490398482579:web:47e1b0bd6bb0a329944d66"
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