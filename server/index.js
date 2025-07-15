/*
Express.js backend server để xử lý database operations
Tách riêng backend logic để tránh conflict với browser environment
File: server/index.js (tạo thư mục riêng cho backend)
*/
const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')
const cron = require('node-cron')
const { initializeFirebaseAdmin, syncDeletedUsers } = require('./firebaseAdmin')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'MangXaHoi',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
  charset: 'utf8mb4'
}

// Create connection pool
const pool = mysql.createPool(dbConfig)

// Test database connection
app.get('/api/test-connection', async (req, res) => {
  try {
    const connection = await pool.getConnection()
    console.log('Database connected successfully')
    connection.release()
    res.json({ success: true, message: 'Database connected' })
  } catch (error) {
    console.error('Database connection failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Sync user endpoint
app.post('/api/sync-user', async (req, res) => {
  try {
    const { uid, displayName, email, photoURL, provider } = req.body

    if (!uid || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'UID and email are required' 
      })
    }

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM NGUOIDUNG WHERE MaND = ?',
      [uid]
    )

    let result
    if (existingUsers.length > 0) {
      // Update existing user
      result = await pool.execute(`
        UPDATE NGUOIDUNG 
        SET 
          TenND = ?,
          Email = ?,
          AnhDaiDien = ?,
          LanDangNhapCuoi = NOW(),
          NgayCapNhat = NOW()
        WHERE MaND = ?
      `, [displayName, email, photoURL, uid])
      
      console.log('User updated:', uid)
    } else {
      // Create new user
      result = await pool.execute(`
        INSERT INTO NGUOIDUNG (
          MaND, TenND, Email, AnhDaiDien, 
          LoginProvider, NgayTao, LanDangNhapCuoi, TrangThai
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 'Active')
      `, [uid, displayName, email, photoURL, provider])
      
      console.log('User created:', uid)
    }

    res.json({ success: true, data: result })

  } catch (error) {
    console.error('Sync user failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get user by UID
app.get('/api/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params
    
    const [users] = await pool.execute(
      'SELECT * FROM NGUOIDUNG WHERE MaND = ?',
      [uid]
    )

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      })
    }

    res.json({ success: true, data: users[0] })

  } catch (error) {
    console.error('Get user failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get user statistics
app.get('/api/user-stats', async (req, res) => {
  try {
    // Total active users
    const [totalResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM NGUOIDUNG WHERE TrangThai = "Active"'
    )

    // Users by provider
    const [providerResult] = await pool.execute(`
      SELECT LoginProvider, COUNT(*) as count 
      FROM NGUOIDUNG 
      WHERE TrangThai = "Active" 
      GROUP BY LoginProvider
    `)

    // Recent users (last 7 days)
    const [recentResult] = await pool.execute(`
      SELECT COUNT(*) as recent 
      FROM NGUOIDUNG 
      WHERE NgayTao >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND TrangThai = "Active"
    `)

    const stats = {
      total: totalResult[0].total,
      byProvider: providerResult,
      recent: recentResult[0].recent
    }

    res.json({ success: true, data: stats })

  } catch (error) {
    console.error('Get stats failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Deactivate user
app.put('/api/user/:uid/deactivate', async (req, res) => {
  try {
    const { uid } = req.params
    
    const result = await pool.execute(`
      UPDATE NGUOIDUNG 
      SET TrangThai = 'Deleted', NgayCapNhat = NOW()
      WHERE MaND = ?
    `, [uid])

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      })
    }

    res.json({ success: true, message: 'User deactivated' })

  } catch (error) {
    console.error('Deactivate user failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Initialize Firebase Admin SDK
initializeFirebaseAdmin()

// Cron job để sync deleted users (chạy mỗi 6 giờ)
cron.schedule('0 */6 * * *', async () => {
  console.log('Running scheduled user sync...')
  await syncDeletedUsers(pool)
})

// Manual sync endpoint (cho admin)
app.post('/api/admin/sync-deleted-users', async (req, res) => {
  try {
    const result = await syncDeletedUsers(pool)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get sync status
app.get('/api/admin/sync-status', async (req, res) => {
  try {
    const [totalUsers] = await pool.execute(
      'SELECT COUNT(*) as total FROM NGUOIDUNG WHERE TrangThai = "Active"'
    )
    
    const [deletedUsers] = await pool.execute(
      'SELECT COUNT(*) as deleted FROM NGUOIDUNG WHERE TrangThai = "Deleted"'
    )
    
    res.json({
      success: true,
      stats: {
        activeUsers: totalUsers[0].total,
        deletedUsers: deletedUsers[0].deleted,
        lastSync: new Date().toISOString()
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`API base: http://localhost:${PORT}/api`)
  console.log(`Admin sync: http://localhost:${PORT}/api/admin/sync-deleted-users`)
})

module.exports = app