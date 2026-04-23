import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBmQDNSeVC7UJEi6vpVJSnTSvKjjdgBv5U",
  authDomain: "votingdapp-114d1.firebaseapp.com",
  projectId: "votingdapp-114d1",
  storageBucket: "votingdapp-114d1.firebasestorage.app",
  messagingSenderId: "637243972825",
  appId: "1:637243972825:web:a09b82aa629bf6319bb2c8",
  measurementId: "G-X37YRL1ZB6",
};

const app = initializeApp(firebaseConfig);

// PHẢI CÓ CHỮ EXPORT Ở ĐÂY
export const auth = getAuth(app);
