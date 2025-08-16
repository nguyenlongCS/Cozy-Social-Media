/*
functions/index.js - Auto Post System Removed
Firebase Cloud Functions với auto posting system đã được loại bỏ
Logic: Chỉ giữ lại cấu trúc cơ bản và classification service
*/

const functions = require('firebase-functions')
const admin = require('firebase-admin')

// Import server-side classification service
const { classifyPost } = require('./classificationService')

// Initialize Firebase Admin SDK
admin.initializeApp()

// Firestore database reference
const db = admin.firestore()
db.settings({databaseId: 'social-media-db'})

// =============================================================================
// PLACEHOLDER ENDPOINTS (Auto Post System Removed)
// =============================================================================

// Placeholder endpoint for future features
exports.systemInfo = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  try {
    res.status(200).json({
      success: true,
      message: 'System running normally',
      timestamp: new Date().toISOString(),
      features: {
        autoPosting: false,
        classification: true,
        userManagement: true
      }
    })
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message
    })
  }
})

// Classification endpoint for testing
exports.classifyText = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  try {
    const { text } = req.body
    
    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid text parameter'
      })
      return
    }

    const result = classifyPost(text)
    
    res.status(200).json({
      success: true,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      tags: result,
      tagCount: result.length
    })
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message
    })
  }
})