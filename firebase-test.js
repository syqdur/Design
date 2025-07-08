// Simple Firebase connectivity test
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCqDlIxPDp-QU6mzthkWnmzM6rZ8rnJdiI",
  authDomain: "dev1-b3973.firebaseapp.com",
  projectId: "dev1-b3973",
  storageBucket: "dev1-b3973.firebasestorage.app",
  messagingSenderId: "658150387877",
  appId: "1:658150387877:web:ac90e7b1597a45258f5d4c"
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