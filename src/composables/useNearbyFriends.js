/*
src/composables/useNearbyFriends.js - Updated để tìm TẤT CẢ users xung quanh
Composable quản lý tính năng tìm người dùng xung quanh với Mapbox và Geolocation
UPDATED: Thay đổi từ tìm friends thành tìm tất cả users xung quanh
Logic:
- Lấy vị trí hiện tại của user qua Geolocation API
- Lưu và lấy vị trí users từ Firestore
- Tính khoảng cách giữa các users
- Tìm TẤT CẢ users trong bán kính nhất định (không cần là friends)
- Integrate với Mapbox để hiển thị map và markers
*/

import { ref, computed } from 'vue'
import { 
  getFirestore, 
  collection, 
  doc,
  setDoc,
  getDocs,
  query,
  limit
} from 'firebase/firestore'
import app from '@/firebase/config'
import { useAuth } from './useAuth'
import { useUsers } from './useUsers'

const db = getFirestore(app, 'social-media-db')

export function useNearbyFriends() {
  const { user } = useAuth()
  const { getUserById } = useUsers()

  // Reactive state
  const isLoading = ref(false)
  const currentLocation = ref(null)
  const nearbyFriends = ref([]) // Tên giữ nguyên cho compatibility, nhưng thực tế là nearbyUsers
  const mapInstance = ref(null)
  const userMarkers = ref(new Map())

  // Constants cho location
  const SEARCH_RADIUS_KM = 1000 // Bán kính tìm kiếm 1000km
  const LOCATION_TIMEOUT = 10000 // 10 giây timeout
  const MAPBOX_TOKEN = 'pk.eyJ1IjoibG9uZ25ndXllbjIwMDQiLCJhIjoiY21leHo0dTZ5MTlwZjJtbXdvdjlpbm5vNSJ9.HrXVxi7vT0CIJKkVqwtTIQ' // Public token demo

  // Computed properties
  const hasLocation = computed(() => currentLocation.value !== null)
  const nearbyCount = computed(() => nearbyFriends.value.length)

  // =============================================================================
  // GEOLOCATION FUNCTIONS
  // =============================================================================

  /**
   * Lấy vị trí hiện tại của user
   */
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation không được hỗ trợ trên trình duyệt này')
    }

    isLoading.value = true

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: LOCATION_TIMEOUT,
            maximumAge: 300000 // 5 phút cache
          }
        )
      })

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      }

      currentLocation.value = location
      
      // Lưu vị trí vào Firestore
      if (user.value) {
        await saveUserLocation(location)
      }

      return location
    } catch (error) {
      let errorMessage = 'Không thể lấy vị trí hiện tại'
      
      if (error.code === 1) {
        errorMessage = 'Người dùng từ chối chia sẻ vị trí'
      } else if (error.code === 2) {
        errorMessage = 'Vị trí không khả dụng'
      } else if (error.code === 3) {
        errorMessage = 'Hết thời gian chờ lấy vị trí'
      }

      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Lưu vị trí user vào Firestore
   */
  const saveUserLocation = async (location) => {
    if (!user.value || !location) return

    try {
      const locationData = {
        userId: user.value.uid,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        updatedAt: new Date(),
        timestamp: location.timestamp
      }

      const locationRef = doc(db, 'userLocations', user.value.uid)
      await setDoc(locationRef, locationData)
    } catch (error) {
      // Silent fail - không ảnh hưởng đến flow chính
      console.warn('Failed to save user location:', error)
    }
  }

  // =============================================================================
  // DISTANCE CALCULATION
  // =============================================================================

  /**
   * Tính khoảng cách giữa 2 điểm (Haversine formula)
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Bán kính Trái Đất (km)
    const dLat = toRadians(lat2 - lat1)
    const dLon = toRadians(lon2 - lon1)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const toRadians = (degrees) => degrees * (Math.PI / 180)

  // =============================================================================
  // NEARBY USERS SEARCH - UPDATED để tìm tất cả users
  // =============================================================================

  /**
   * UPDATED: Tìm TẤT CẢ users xung quanh trong bán kính nhất định (không chỉ friends)
   */
  const findNearbyFriends = async () => {
    if (!user.value || !currentLocation.value) {
      throw new Error('Cần đăng nhập và có vị trí để tìm người dùng xung quanh')
    }

    isLoading.value = true

    try {
      // UPDATED: Lấy TẤT CẢ locations từ userLocations collection
      const locationsQuery = query(
        collection(db, 'userLocations'),
        limit(200) // Tăng limit để lấy nhiều users hơn
      )
      
      const locationsSnapshot = await getDocs(locationsQuery)
      
      if (locationsSnapshot.empty) {
        nearbyFriends.value = []
        return []
      }

      // UPDATED: Tìm TẤT CẢ users có vị trí và trong bán kính (trừ chính mình)
      const nearbyResults = []

      for (const doc of locationsSnapshot.docs) {
        const locationData = doc.data()
        
        // Bỏ qua chính user hiện tại
        if (locationData.userId === user.value.uid) {
          continue
        }

        const distance = calculateDistance(
          currentLocation.value.latitude,
          currentLocation.value.longitude,
          locationData.latitude,
          locationData.longitude
        )

        // UPDATED: Tìm TẤT CẢ users trong bán kính (không cần kiểm tra friendship)
        if (distance <= SEARCH_RADIUS_KM) {
          try {
            // Lấy thông tin user
            const userInfo = await getUserById(locationData.userId)
            
            if (userInfo) {
              nearbyResults.push({
                userId: locationData.userId,
                userInfo,
                location: locationData,
                distance: Math.round(distance * 100) / 100 // Làm tròn 2 số thập phân
              })
            }
          } catch (error) {
            // Bỏ qua user nếu không lấy được thông tin
            continue
          }
        }
      }

      // Sắp xếp theo khoảng cách
      nearbyResults.sort((a, b) => a.distance - b.distance)
      
      nearbyFriends.value = nearbyResults
      return nearbyResults

    } catch (error) {
      nearbyFriends.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // =============================================================================
  // MAPBOX INTEGRATION
  // =============================================================================

  /**
   * Khởi tạo Mapbox map
   */
  const initializeMap = (containerId) => {
    if (!window.mapboxgl || !currentLocation.value) {
      throw new Error('Mapbox chưa được load hoặc không có vị trí')
    }

    // Cấu hình Mapbox token
    window.mapboxgl.accessToken = MAPBOX_TOKEN

    // Tạo map instance
    const map = new window.mapboxgl.Map({
      container: containerId,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [currentLocation.value.longitude, currentLocation.value.latitude],
      zoom: 12
    })

    mapInstance.value = map

    // Add current user marker
    addCurrentUserMarker(map)

    // Add nearby users markers - UPDATED
    addNearbyUsersMarkers(map)

    return map
  }

  /**
   * Thêm marker cho user hiện tại
   */
  const addCurrentUserMarker = (map) => {
    if (!currentLocation.value) return

    // Tạo custom marker cho current user
    const currentUserEl = document.createElement('div')
    currentUserEl.className = 'current-user-marker'
    currentUserEl.style.backgroundImage = user.value.photoURL ? `url(${user.value.photoURL})` : 'none'
    currentUserEl.style.width = '40px'
    currentUserEl.style.height = '40px'
    currentUserEl.style.borderRadius = '50%'
    currentUserEl.style.border = '3px solid #6495ED'
    currentUserEl.style.backgroundSize = 'cover'
    currentUserEl.style.backgroundPosition = 'center'
    currentUserEl.style.backgroundColor = '#6495ED'

    new window.mapboxgl.Marker(currentUserEl)
      .setLngLat([currentLocation.value.longitude, currentLocation.value.latitude])
      .setPopup(new window.mapboxgl.Popup().setHTML(`
        <div style="text-align: center; padding: 5px;">
          <strong>Vị trí của bạn</strong><br>
          <small>Độ chính xác: ${Math.round(currentLocation.value.accuracy)}m</small>
        </div>
      `))
      .addTo(map)
  }

  /**
   * UPDATED: Thêm markers cho TẤT CẢ nearby users (không chỉ friends)
   */
  const addNearbyUsersMarkers = (map) => {
    // Xóa markers cũ
    userMarkers.value.forEach(marker => marker.remove())
    userMarkers.value.clear()

    nearbyFriends.value.forEach(nearbyUser => {
      // Tạo marker element - UPDATED với styling cho users thông thường
      const markerEl = document.createElement('div')
      markerEl.className = 'nearby-user-marker'
      markerEl.style.backgroundImage = nearbyUser.userInfo?.Avatar ? `url(${nearbyUser.userInfo.Avatar})` : 'none'
      markerEl.style.width = '35px'
      markerEl.style.height = '35px'
      markerEl.style.borderRadius = '50%'
      markerEl.style.border = '2px solid #FFA500' // Màu cam cho users thông thường
      markerEl.style.backgroundSize = 'cover'
      markerEl.style.backgroundPosition = 'center'
      markerEl.style.backgroundColor = '#FFA500'
      markerEl.style.cursor = 'pointer'

      // Tạo marker
      const marker = new window.mapboxgl.Marker(markerEl)
        .setLngLat([nearbyUser.location.longitude, nearbyUser.location.latitude])
        .setPopup(new window.mapboxgl.Popup().setHTML(`
          <div style="text-align: center; padding: 8px;">
            <img src="${nearbyUser.userInfo?.Avatar || ''}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'">
            <div><strong>${nearbyUser.userInfo?.UserName || 'Unknown'}</strong></div>
            <div style="color: #666; font-size: 12px;">Cách ${nearbyUser.distance}km</div>
          </div>
        `))
        .addTo(map)

      userMarkers.value.set(nearbyUser.userId, marker)
    })
  }

  /**
   * Load Mapbox script với proper error handling
   */
  const loadMapboxScript = () => {
    return new Promise((resolve, reject) => {
      if (window.mapboxgl) {
        resolve()
        return
      }

      // Load CSS first
      const cssLink = document.createElement('link')
      cssLink.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
      cssLink.rel = 'stylesheet'
      cssLink.onload = () => {
        // Load JS after CSS
        const script = document.createElement('script')
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
        script.onload = () => {
          // Ensure mapboxgl is available
          if (window.mapboxgl) {
            resolve()
          } else {
            reject(new Error('Mapbox GL JS failed to load'))
          }
        }
        script.onerror = () => reject(new Error('Failed to load Mapbox GL JS'))
        document.head.appendChild(script)
      }
      cssLink.onerror = () => reject(new Error('Failed to load Mapbox GL CSS'))
      document.head.appendChild(cssLink)
    })
  }

  // =============================================================================
  // MAIN FUNCTIONS
  // =============================================================================

  /**
   * Khởi tạo tính năng nearby users với improved error handling
   */
  const initializeNearbyFriends = async () => {
    try {
      // Load Mapbox với timeout
      await Promise.race([
        loadMapboxScript(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Mapbox loading timeout')), 10000)
        )
      ])
      
      // Lấy vị trí hiện tại
      await getCurrentLocation()
      
      // Tìm users xung quanh
      await findNearbyFriends()

      return true
    } catch (error) {
      console.error('Initialize nearby friends error:', error)
      throw error
    }
  }

  /**
   * Refresh nearby users data
   */
  const refreshNearbyFriends = async () => {
    if (!currentLocation.value) {
      await getCurrentLocation()
    }
    
    await findNearbyFriends()
    
    // Update map nếu đã khởi tạo
    if (mapInstance.value) {
      addNearbyUsersMarkers(mapInstance.value)
    }
  }

  /**
   * Cleanup function
   */
  const cleanup = () => {
    if (mapInstance.value) {
      mapInstance.value.remove()
      mapInstance.value = null
    }
    
    userMarkers.value.forEach(marker => marker.remove())
    userMarkers.value.clear()
    
    nearbyFriends.value = []
    currentLocation.value = null
  }

  return {
    // State
    isLoading,
    currentLocation,
    nearbyFriends, // Tên giữ nguyên cho compatibility
    mapInstance,
    
    // Computed
    hasLocation,
    nearbyCount,
    
    // Methods
    getCurrentLocation,
    findNearbyFriends,
    initializeNearbyFriends,
    initializeMap,
    refreshNearbyFriends,
    loadMapboxScript,
    cleanup,
    
    // Constants
    SEARCH_RADIUS_KM
  }
}