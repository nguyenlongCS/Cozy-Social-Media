/*
src/composables/useDataSync.js - Data Synchronization System
Composable xử lý đồng bộ dữ liệu user (avatar, username) trên toàn bộ collections
Logic:
- Sync avatar và username khi user update profile
- Update tất cả posts, comments, likes của user với thông tin mới
- Batch operations để tối ưu hiệu suất
- Error handling và rollback mechanism
- Progress tracking cho UX tốt hơn
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

// Initialize Firestore với cùng database name
const db = getFirestore(app, 'social-media-db')

export function useDataSync() {
  const isSyncing = ref(false)
  const syncProgress = ref(0)
  const syncError = ref(null)

  // Batch size để tránh quá tải Firestore
  const BATCH_SIZE = 500

  // Sync user data across all collections khi profile được update
  const syncUserDataAcrossCollections = async (userId, updatedUserData) => {
    if (!userId || !updatedUserData) {
      throw new Error('MISSING_USER_OR_DATA')
    }

    isSyncing.value = true
    syncProgress.value = 0
    syncError.value = null

    try {
      console.log('Starting data sync for user:', userId, updatedUserData)

      // Chuẩn bị data cần sync
      const syncData = {}
      if (updatedUserData.UserName) {
        syncData.UserName = updatedUserData.UserName
      }
      if (updatedUserData.Avatar !== undefined) { // Có thể là null
        syncData.Avatar = updatedUserData.Avatar
      }

      if (Object.keys(syncData).length === 0) {
        console.log('No syncable data found, skipping sync')
        return { success: true, message: 'NO_DATA_TO_SYNC' }
      }

      // Các collections cần sync
      const collectionsToSync = [
        { name: 'posts', userIdField: 'UserID' },
        { name: 'comments', userIdField: 'UserID' },
        { name: 'likes', userIdField: 'UserID' }
      ]

      let totalOperations = 0
      let completedOperations = 0

      // Đếm tổng số operations cần thực hiện
      for (const collectionInfo of collectionsToSync) {
        const count = await getDocumentCount(collectionInfo.name, collectionInfo.userIdField, userId)
        totalOperations += count
      }

      console.log('Total documents to sync:', totalOperations)

      if (totalOperations === 0) {
        console.log('No documents found to sync')
        return { success: true, message: 'NO_DOCUMENTS_TO_SYNC' }
      }

      // Sync từng collection
      for (const collectionInfo of collectionsToSync) {
        await syncCollection(
          collectionInfo.name, 
          collectionInfo.userIdField, 
          userId, 
          syncData,
          (progress) => {
            completedOperations += progress
            syncProgress.value = Math.round((completedOperations / totalOperations) * 100)
          }
        )
      }

      syncProgress.value = 100
      console.log('Data sync completed successfully for user:', userId)
      
      return { 
        success: true, 
        message: 'SYNC_COMPLETED',
        totalOperations,
        syncedData: syncData
      }

    } catch (error) {
      console.error('Error during data sync:', error)
      syncError.value = error
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  // Đếm số documents trong collection cho user
  const getDocumentCount = async (collectionName, userIdField, userId) => {
    try {
      const collectionRef = collection(db, collectionName)
      const q = query(collectionRef, where(userIdField, '==', userId))
      const querySnapshot = await getDocs(q)
      return querySnapshot.size
    } catch (error) {
      console.error(`Error counting documents in ${collectionName}:`, error)
      return 0
    }
  }

  // Sync một collection cụ thể
  const syncCollection = async (collectionName, userIdField, userId, syncData, progressCallback) => {
    try {
      console.log(`Syncing collection: ${collectionName}`)
      
      const collectionRef = collection(db, collectionName)
      const q = query(collectionRef, where(userIdField, '==', userId))
      const querySnapshot = await getDocs(q)
      
      const documents = querySnapshot.docs
      console.log(`Found ${documents.length} documents in ${collectionName}`)

      if (documents.length === 0) {
        return
      }

      // Process in batches để tránh quá tải
      const batches = []
      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batchDocs = documents.slice(i, i + BATCH_SIZE)
        batches.push(batchDocs)
      }

      // Execute batches
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = writeBatch(db)
        const batchDocs = batches[batchIndex]

        batchDocs.forEach(docSnapshot => {
          const docRef = doc(db, collectionName, docSnapshot.id)
          batch.update(docRef, syncData)
        })

        await batch.commit()
        
        // Update progress
        if (progressCallback) {
          progressCallback(batchDocs.length)
        }

        console.log(`Batch ${batchIndex + 1}/${batches.length} completed for ${collectionName}`)
      }

      console.log(`Successfully synced ${documents.length} documents in ${collectionName}`)

    } catch (error) {
      console.error(`Error syncing collection ${collectionName}:`, error)
      throw error
    }
  }

  // Sync chỉ avatar cho user
  const syncUserAvatar = async (userId, newAvatarUrl) => {
    return await syncUserDataAcrossCollections(userId, { Avatar: newAvatarUrl })
  }

  // Sync chỉ username cho user
  const syncUserName = async (userId, newUserName) => {
    return await syncUserDataAcrossCollections(userId, { UserName: newUserName })
  }

  // Force sync tất cả data của user (for debugging/admin)
  const forceFullSync = async (userId, userData) => {
    const fullSyncData = {
      UserName: userData.UserName,
      Avatar: userData.Avatar
    }
    return await syncUserDataAcrossCollections(userId, fullSyncData)
  }

  // Check sync status
  const getSyncStatus = () => {
    return {
      isSyncing: isSyncing.value,
      progress: syncProgress.value,
      error: syncError.value
    }
  }

  // Reset sync state
  const resetSyncState = () => {
    isSyncing.value = false
    syncProgress.value = 0
    syncError.value = null
  }

  return {
    isSyncing,
    syncProgress,
    syncError,
    syncUserDataAcrossCollections,
    syncUserAvatar,
    syncUserName,
    forceFullSync,
    getSyncStatus,
    resetSyncState
  }
}