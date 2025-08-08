/*
src/firebase/config.js
Firebase configuration với Firebase Realtime Database
Cấu hình Firebase Auth, Firestore và Realtime Database
*/

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyAr4nGRhlqXyoHG7dZtqcbj-IN2Xcr0LqM",
  authDomain: "fir-auth-cozy.firebaseapp.com",
  projectId: "fir-auth-cozy",
  storageBucket: "fir-auth-cozy.firebasestorage.app",
  messagingSenderId: "306302302026",
  appId: "1:306302302026:web:63ffe859d4cbbeda6073b3",
  measurementId: "G-SSWWQ42BLN",
  databaseURL: "https://fir-auth-cozy-default-rtdb.asia-southeast1.firebasedatabase.app"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication
export const auth = getAuth(app)

// Initialize Firestore Database (cho các collection khác)
export const db = getFirestore(app)

// Initialize Firebase Storage
export const storage = getStorage(app)

// Initialize Realtime Database (cho messages)
export const rtdb = getDatabase(app)

export default app