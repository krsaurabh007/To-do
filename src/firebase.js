// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔹 Replace these values with your Firebase config from the console
const firebaseConfig = {
    apiKey: "AIzaSyCk7HVomWhoylsABEqTuLu8nu971UfWJ-s",
    authDomain: "to-do-29d46.firebaseapp.com",
    projectId: "to-do-29d46",
    storageBucket: "to-do-29d46.firebasestorage.app",
    messagingSenderId: "280923206132",
    appId: "1:280923206132:web:40f309eb808fc4ef0409a1",
    measurementId: "G-7Q84XXGRLJ"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
