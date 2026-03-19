/* global __firebase_config, __app_id */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const localFirebaseConfig = {
  apiKey: "AIzaSyAoCTTBL4BnQCKYKvsoAI1Ok4eEsrMeqXg",
  authDomain: "weapon-game-4c382.firebaseapp.com",
  projectId: "weapon-game-4c382",
  storageBucket: "weapon-game-4c382.firebasestorage.app",
  messagingSenderId: "40692170716",
  appId: "1:40692170716:web:7bb9a609c9ccfc634d9919",
  measurementId: "G-C1GVWLZJMW"
};

export const firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config 
  ? JSON.parse(__firebase_config) 
  : localFirebaseConfig;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'jiny-weapon-soul-v4';
