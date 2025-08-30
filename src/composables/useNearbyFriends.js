/*
src/composables/useNearbyFriends.js
Composable quản lý tính năng tìm bạn bè xung quanh với Mapbox và Geolocation
Logic:
- Lấy vị trí hiện tại của user qua Geolocation API
- Lưu và lấy vị trí users từ Firestore
- Tính khoảng cách giữa các users
- Tìm friends trong bán kính nhất định
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
  where,
  limit
} from 'firebase/firestore'
import app from '@/firebase/config'
import { useAuth } from './useAuth'
import { useUsers } from './useUsers'
import { useFriends } from './useFriends'

const db = getFirestore(app, 'social-media-db')

export function useNearbyFriends() {
  const { user } = useAuth()
  const { getUserById } = useUsers()
  const { getFriends } = useFriends()

  // Reactive state
  const isLoading = ref(false)
  const currentLocation = ref(null)
  const nearbyFriends = ref([])
  const mapInstance = ref(null)
  const userMarkers = ref(new Map())

  // Constants cho location
  const SEARCH_RADIUS_KM = 10 // Bán kính tìm kiếm 10km
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
  // NEARBY FRIENDS SEARCH
  // =============================================================================

  /**
   * Tìm bạn bè xung quanh trong bán kính nhất định
   */
  const findNearbyFriends = async () => {
    if (!user.value || !currentLocation.value) {
      throw new Error('Cần đăng nhập và có vị trí để tìm bạn bè')
    }

    isLoading.value = true

    try {
      // Lấy danh sách bạn bè
      const friendsList = await getFriends(user.value.uid, 100)
      
      if (friendsList.length === 0) {
        nearbyFriends.value = []
        return []
      }

      // Lấy locations của tất cả friends
      const locationsQuery = query(
        collection(db, 'userLocations'),
        limit(100)
      )
      
      const locationsSnapshot = await getDocs(locationsQuery)
      const friendLocations = new Map()

      // Build map of friend locations
      locationsSnapshot.forEach(doc => {
        const locationData = doc.data()
        friendLocations.set(locationData.userId, locationData)
      })

      // Tìm friends có vị trí và trong bán kính
      const nearbyResults = []

      for (const friend of friendsList) {
        const friendLocation = friendLocations.get(friend.friendId)
        
        if (friendLocation) {
          const distance = calculateDistance(
            currentLocation.value.latitude,
            currentLocation.value.longitude,
            friendLocation.latitude,
            friendLocation.longitude
          )

          if (distance <= SEARCH_RADIUS_KM) {
            // Lấy thông tin user
            const userInfo = await getUserById(friend.friendId)
            
            nearbyResults.push({
              ...friend,
              userInfo,
              location: friendLocation,
              distance: Math.round(distance * 100) / 100 // Làm tròn 2 số thập phân
            })
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

    // Add nearby friends markers
    addNearbyFriendsMarkers(map)

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
   * Thêm markers cho nearby friends
   */
  const addNearbyFriendsMarkers = (map) => {
    // Xóa markers cũ
    userMarkers.value.forEach(marker => marker.remove())
    userMarkers.value.clear()

    nearbyFriends.value.forEach(friend => {
      // Tạo marker element
      const markerEl = document.createElement('div')
      markerEl.className = 'friend-marker'
      markerEl.style.backgroundImage = friend.userInfo?.Avatar ? `url(${friend.userInfo.Avatar})` : 'none'
      markerEl.style.width = '35px'
      markerEl.style.height = '35px'
      markerEl.style.borderRadius = '50%'
      markerEl.style.border = '2px solid #32CD32'
      markerEl.style.backgroundSize = 'cover'
      markerEl.style.backgroundPosition = 'center'
      markerEl.style.backgroundColor = '#32CD32'
      markerEl.style.cursor = 'pointer'

      // Tạo marker
      const marker = new window.mapboxgl.Marker(markerEl)
        .setLngLat([friend.location.longitude, friend.location.latitude])
        .setPopup(new window.mapboxgl.Popup().setHTML(`
          <div style="text-align: center; padding: 8px;">
            <img src="${friend.userInfo?.Avatar || ''}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'">
            <div><strong>${friend.userInfo?.UserName || 'Unknown'}</strong></div>
            <div style="color: #666; font-size: 12px;">Cách ${friend.distance}km</div>
          </div>
        `))
        .addTo(map)

      userMarkers.value.set(friend.friendId, marker)
    })
  }

  /**
   * Load Mapbox script
   */
  const loadMapboxScript = () => {
    return new Promise((resolve, reject) => {
      if (window.mapboxgl) {
        resolve()
        return
      }

      // Load CSS
      const cssLink = document.createElement('link')
      cssLink.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
      cssLink.rel = 'stylesheet'
      document.head.appendChild(cssLink)

      // Load JS
      const script = document.createElement('script')
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  // =============================================================================
  // MAIN FUNCTIONS
  // =============================================================================

  /**
   * Khởi tạo tính năng nearby friends
   */
  const initializeNearbyFriends = async () => {
    try {
      // Load Mapbox
      await loadMapboxScript()
      
      // Lấy vị trí hiện tại
      await getCurrentLocation()
      
      // Tìm bạn bè xung quanh
      await findNearbyFriends()

      return true
    } catch (error) {
      throw error
    }
  }

  /**
   * Refresh nearby friends data
   */
  const refreshNearbyFriends = async () => {
    if (!currentLocation.value) {
      await getCurrentLocation()
    }
    
    await findNearbyFriends()
    
    // Update map nếu đã khởi tạo
    if (mapInstance.value) {
      addNearbyFriendsMarkers(mapInstance.value)
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
    nearbyFriends,
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