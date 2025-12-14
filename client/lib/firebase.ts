// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";



const firebaseConfig = {
  apiKey: "AIzaSyDTlW8u5mvMU7HQ7HRyl7gheXrCz9higOw",
  authDomain: "kalabo-boarding-srms.firebaseapp.com",
  projectId: "kalabo-boarding-srms",
  storageBucket: "kalabo-boarding-srms.firebasestorage.app",
  messagingSenderId: "946413758658",
  appId: "1:946413758658:web:3d61b7c9d487c71467735b"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;