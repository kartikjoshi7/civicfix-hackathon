import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDF2qv5eSX1EjRWVo-5mj4eZ4S8CWjMR4M",
  authDomain: "civicfix-hackfest-b6776.firebaseapp.com",
  projectId: "civicfix-hackfest-b6776",
  storageBucket: "civicfix-hackfest-b6776.firebasestorage.app",
  messagingSenderId: "547899970808",
  appId: "1:547899970808:web:f33cbf7892c21d5bc9570d",
  measurementId: "G-FZGCJMBG8Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;