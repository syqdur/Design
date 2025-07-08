import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCqDlIxPDp-QU6mzthkWnmzM6rZ8rnJdiI",
  authDomain: "dev1-b3973.firebaseapp.com",
  projectId: "dev1-b3973",
  storageBucket: "dev1-b3973.firebasestorage.app",
  messagingSenderId: "658150387877",
  appId: "1:658150387877:web:ac90e7b1597a45258f5d4c",
  measurementId: "G-7W2BNH8MQ7"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
export default app;