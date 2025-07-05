// Simple Firebase connectivity test
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB5kbpgei7k133J-2qyQ4XWg_b1BNf5M0c",
  authDomain: "weddingpix-744e5.firebaseapp.com",
  projectId: "weddingpix-744e5",
  storageBucket: "weddingpix-744e5.firebasestorage.app",
  messagingSenderId: "490398482579",
  appId: "1:490398482579:web:47e1b0bd6bb0a329944d66"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test basic connectivity
async function testFirebase() {
  try {
    console.log('Testing Firebase connection...');
    const testDoc = await getDoc(doc(db, 'test', 'connection'));
    console.log('Firebase connection successful');
    console.log('Document exists:', testDoc.exists());
  } catch (error) {
    console.error('Firebase error:', error.code, error.message);
  }
}

testFirebase();