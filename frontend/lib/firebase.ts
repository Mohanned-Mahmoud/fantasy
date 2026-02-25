import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA9yg1wtZDZ0ciOoVXo5X7f6sOrSP5XNv8",
  authDomain: "fantazy-5.firebaseapp.com",
  projectId: "fantazy-5",
  storageBucket: "fantazy-5.firebasestorage.app",
  messagingSenderId: "330403539938",
  appId: "1:330403539938:web:0ecbd00e7e933bb70ba7bb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();