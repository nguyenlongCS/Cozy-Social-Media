// Firebase configuration và authentication setup
// Cấu hình Firebase Auth cho Google, Facebook login và email registration

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

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

// Đảm bảo auth domain được cấu hình đúng
export default app

/* 
HƯỚNG DẪN CẤU HÌNH FACEBOOK:

1. Tạo Facebook App:
   - Vào https://developers.facebook.com
   - Tạo app mới
   - Thêm Facebook Login product

2. Cấu hình Facebook App:
   - Valid OAuth Redirect URIs: https://your-project.firebaseapp.com/__/auth/handler
   - App Domains: your-project.firebaseapp.com
   - Site URL: https://your-project.firebaseapp.com

3. Cấu hình Firebase:
   - Vào Firebase Console > Authentication > Sign-in method
   - Bật Facebook
   - Nhập App ID và App Secret từ Facebook App
   - Copy OAuth redirect URI vào Facebook App settings

4. Authorized domains trong Firebase:
   - Thêm domain localhost cho development
   - Thêm production domain

5. Kiểm tra:
   - App ID và App Secret đúng
   - OAuth redirect URI khớp
   - App đang ở chế độ Live (không phải Development)
*/