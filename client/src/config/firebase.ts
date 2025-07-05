import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB5kbpgei7k133J-2qyQ4XWg_b1BNf5M0c",
  authDomain: "weddingpix-744e5.firebaseapp.com",
  projectId: "weddingpix-744e5",
  storageBucket: "weddingpix-744e5.firebasestorage.app",
  messagingSenderId: "490398482579",
  appId: "1:490398482579:web:47e1b0bd6bb0a329944d66",
  measurementId: "G-DM441C01L2"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
export default app;