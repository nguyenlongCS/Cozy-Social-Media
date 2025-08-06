/*
src/composables/useDataSync.js - Refactored
Data synchronization system cho user info across collections
Logic: Batch sync user avatar và username khi profile update
*/
import { ref } from 'vue'
import { 
  getFirestore, 
  collection, 
  query,
  where,
  getDocs,
  writeBatch,
  doc
} from 'firebase/firestore'
import app from '@/firebase/config'

const db = getFirestore(app, 'social-media-db')

export function useDataSync() {
  const isSyncing = ref(false)
  const syncProgress = ref(0)

  const BATCH_SIZE = 500

  // Main sync function
  const syncUserDataAcrossCollections = async (userId, updatedUserData) => {
    if (!userId || !updatedUserData) {
      throw new Error('MISSING_USER_OR_DATA')
    }

    isSyncing.value = true
    syncProgress.value = 0

    try {
      // Extract syncable data
      const syncData = {}
      if (updatedUserData.UserName) syncData.UserName = updatedUserData.UserName
      if (updatedUserData.Avatar !== undefined) syncData.Avatar = updatedUserData.Avatar

      if (Object.keys(syncData).length === 0) {
        return { success: true, message: 'NO_DATA_TO_SYNC' }
      }

      // Collections to sync
      const collections = [
        { name: 'posts', field: 'UserID' },
        { name: 'comments', field: 'UserID' },
        { name: 'likes', field: 'UserID' }
      ]

      let totalDocs = 0
      let completedDocs = 0

      // Count total documents
      for (const collectionInfo of collections) {
        const count = await getDocumentCount(collectionInfo.name, collectionInfo.field, userId)
        totalDocs += count
      }

      if (totalDocs === 0) {
        return { success: true, message: 'NO_DOCUMENTS_TO_SYNC' }
      }

      // Sync each collection
      for (const collectionInfo of collections) {
        await syncCollection(
          collectionInfo.name,
          collectionInfo.field,
          userId,
          syncData,
          (progress) => {
            completedDocs += progress
            syncProgress.value = Math.round((completedDocs / totalDocs) * 100)
          }
        )
      }

      syncProgress.value = 100
      return { 
        success: true, 
        message: 'SYNC_COMPLETED',
        totalDocs,
        syncedData: syncData
      }

    } catch (error) {
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  // Helper functions
  const getDocumentCount = async (collectionName, userIdField, userId) => {
    try {
      const collectionRef = collection(db, collectionName)
      const q = query(collectionRef, where(userIdField, '==', userId))
      const querySnapshot = await getDocs(q)
      return querySnapshot.size
    } catch (error) {
      return 0
    }
  }

  const syncCollection = async (collectionName, userIdField, userId, syncData, progressCallback) => {
    try {
      const collectionRef = collection(db, collectionName)
      const q = query(collectionRef, where(userIdField, '==', userId))
      const querySnapshot = await getDocs(q)
      
      const documents = querySnapshot.docs
      if (documents.length === 0) return

      // Process in batches
      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = writeBatch(db)
        const batchDocs = documents.slice(i, i + BATCH_SIZE)

        batchDocs.forEach(docSnapshot => {
          const docRef = doc(db, collectionName, docSnapshot.id)
          batch.update(docRef, syncData)
        })

        await batch.commit()
        
        if (progressCallback) {
          progressCallback(batchDocs.length)
        }
      }

    } catch (error) {
      throw error
    }
  }

  // Specific sync methods
  const syncUserAvatar = async (userId, newAvatarUrl) => {
    return await syncUserDataAcrossCollections(userId, { Avatar: newAvatarUrl })
  }

  const syncUserName = async (userId, newUserName) => {
    return await syncUserDataAcrossCollections(userId, { UserName: newUserName })
  }

  return {
    isSyncing,
    syncProgress,
    syncUserDataAcrossCollections,
    syncUserAvatar,
    syncUserName
  }
}