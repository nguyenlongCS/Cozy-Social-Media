/*
Firebase Admin SDK integration để sync user deletions
Thêm vào backend server để handle Firebase Auth events
File: server/firebaseAdmin.js
*/
const admin = require('firebase-admin')

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  try {
    // Sử dụng service account key hoặc default credentials
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      })
    }
    console.log('Firebase Admin SDK initialized')
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error)
  }
}

// Verify Firebase ID Token (để bảo mật API calls)
const verifyFirebaseToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    return { success: true, uid: decodedToken.uid, user: decodedToken }
  } catch (error) {
    console.error('Token verification failed:', error)
    return { success: false, error: error.message }
  }
}

// Sync deleted users từ Firebase (nhận pool từ index.js)
const syncDeletedUsers = async (pool) => {
  try {
    console.log('Starting Firebase user sync...')
    
    // Get all active users từ MySQL
    const [mysqlUsers] = await pool.execute(`
      SELECT MaND FROM NGUOIDUNG 
      WHERE TrangThai = 'Active'
    `)

    let deletedCount = 0
    
    // Check từng user có còn tồn tại trên Firebase không
    for (const mysqlUser of mysqlUsers) {
      try {
        await admin.auth().getUser(mysqlUser.MaND)
        // User vẫn tồn tại trên Firebase - OK
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // User đã bị xóa trên Firebase → Update MySQL
          await pool.execute(`
            UPDATE NGUOIDUNG 
            SET TrangThai = 'Deleted', NgayCapNhat = NOW()
            WHERE MaND = ?
          `, [mysqlUser.MaND])
          
          console.log(`Marked user as deleted: ${mysqlUser.MaND}`)
          deletedCount++
        }
      }
    }
    
    console.log(`Sync completed. ${deletedCount} users marked as deleted.`)
    return { success: true, deletedCount }
    
  } catch (error) {
    console.error('User sync failed:', error)
    return { success: false, error: error.message }
  }
}

// Batch check multiple users
const checkUsersExist = async (uids) => {
  try {
    const results = await Promise.allSettled(
      uids.map(uid => admin.auth().getUser(uid))
    )
    
    const existingUsers = []
    const deletedUsers = []
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        existingUsers.push(uids[index])
      } else {
        deletedUsers.push(uids[index])
      }
    })
    
    return { existingUsers, deletedUsers }
  } catch (error) {
    console.error('Batch check failed:', error)
    return { existingUsers: [], deletedUsers: [] }
  }
}

module.exports = {
  initializeFirebaseAdmin,
  verifyFirebaseToken,
  syncDeletedUsers,
  checkUsersExist
}