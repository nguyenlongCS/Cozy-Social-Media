// Firebase configuration và authentication setup
// Cấu hình Firebase Auth cho Google, Facebook login và email registration
// Cấu hình Firestore để lưu posts và Storage để upload media

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyAr4nGRhlqXyoHG7dZtqcbj-IN2Xcr0LqM",
  authDomain: "fir-auth-cozy.firebaseapp.com",
  projectId: "fir-auth-cozy",
  storageBucket: "fir-auth-cozy.firebasestorage.app",
  messagingSenderId: "306302302026",
  appId: "1:306302302026:web:63ffe859d4cbbeda6073b3",
  measurementId: "G-SSWWQ42BLN"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Firestore Database
export const db = getFirestore(app)

// Initialize Firebase Storage
export const storage = getStorage(app)

// Đảm bảo auth domain được cấu hình đúng
export default app