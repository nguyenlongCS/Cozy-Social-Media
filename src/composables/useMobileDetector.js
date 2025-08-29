/*
src/composables/useMobileDetector.js
Composable phát hiện thiết bị mobile với improved detection cho real devices
Logic:
- Ưu tiên CSS media queries detection
- Enhanced User Agent detection với more patterns
- Real device testing optimized
- Multiple fallback detection methods
*/
import { ref, onMounted, onUnmounted } from 'vue'

export function useMobileDetector() {
  const isMobile = ref(false)
  const screenWidth = ref(0)
  const screenHeight = ref(0)
  const detectionMethod = ref('')

  // Method 1: CSS Media Query Detection (most reliable)
  const detectViaCSSMediaQuery = () => {
    // Check if device matches mobile media query
    const mobileQuery = window.matchMedia('(max-width: 768px), (max-height: 768px)')
    const touchQuery = window.matchMedia('(pointer: coarse)')
    const hoverQuery = window.matchMedia('(hover: none)')
    
    return mobileQuery.matches && (touchQuery.matches || hoverQuery.matches)
  }

  // Method 2: Enhanced User Agent Detection
  const detectMobileUserAgent = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera || ''
    
    // Comprehensive mobile detection patterns
    const mobilePatterns = [
      /Android/i,
      /webOS/i,
      /iPhone/i,
      /iPad/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i,
      /Opera Mini/i,
      /IEMobile/i,
      /Mobile/i,
      /mobile/i,
      /CriOS/i,
      /FxiOS/i,
      /EdgiOS/i,
      /Samsung/i,
      /Galaxy/i,
      /SM-/i, // Samsung model codes
      /GT-/i, // Samsung Galaxy Tab codes
      /SAMSUNG/i,
      /SHV-/i, // Samsung Korean models
      /SPH-/i, // Samsung Sprint models
      /SCH-/i, // Samsung Verizon models
      /Pixel/i, // Google Pixel
      /Nexus/i, // Google Nexus
      /OnePlus/i,
      /Xiaomi/i,
      /Redmi/i,
      /MIUI/i,
      /HTC/i,
      /LG-/i,
      /Motorola/i,
      /Moto/i,
      /Sony/i,
      /Xperia/i,
      /Huawei/i,
      /Honor/i,
      /OPPO/i,
      /Vivo/i,
      /Realme/i,
      /Nokia/i
    ]
    
    return mobilePatterns.some(pattern => pattern.test(userAgent))
  }

  // Method 3: Screen Size + Touch Detection
  const detectMobileScreen = () => {
    const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
    const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
    
    // Update screen dimensions
    screenWidth.value = width
    screenHeight.value = height
    
    // Consider mobile if:
    // - Width <= 768px OR height <= 768px (covers landscape)
    // - AND has touch capability
    const isSmallScreen = width <= 768 || height <= 768
    const hasTouch = 'ontouchstart' in window || 
                     'ontouchend' in document || 
                     navigator.maxTouchPoints > 0 || 
                     navigator.msMaxTouchPoints > 0
    
    return isSmallScreen && hasTouch
  }

  // Method 4: Device Pixel Ratio Detection
  const detectMobilePixelRatio = () => {
    const pixelRatio = window.devicePixelRatio || 1
    const width = window.innerWidth
    
    // High pixel ratio + small screen often indicates mobile
    return pixelRatio > 1 && width <= 768
  }

  // Method 5: Platform Detection
  const detectMobilePlatform = () => {
    const platform = navigator.platform || ''
    const mobilePlatforms = ['iPhone', 'iPad', 'iPod', 'Android', 'Linux armv', 'BlackBerry', 'Mobile', 'mobile']
    
    return mobilePlatforms.some(p => platform.includes(p))
  }

  // Main detection function with multiple methods
  const detectMobile = () => {
    let detectedMobile = false
    let method = 'none'
    
    // Method 1: CSS Media Query (highest priority)
    if (detectViaCSSMediaQuery()) {
      detectedMobile = true
      method = 'css-media-query'
    }
    // Method 2: User Agent
    else if (detectMobileUserAgent()) {
      detectedMobile = true
      method = 'user-agent'
    }
    // Method 3: Screen + Touch
    else if (detectMobileScreen()) {
      detectedMobile = true
      method = 'screen-touch'
    }
    // Method 4: Pixel Ratio
    else if (detectMobilePixelRatio()) {
      detectedMobile = true
      method = 'pixel-ratio'
    }
    // Method 5: Platform
    else if (detectMobilePlatform()) {
      detectedMobile = true
      method = 'platform'
    }
    
    // Force mobile for very specific cases
    if (!detectedMobile) {
      const userAgent = navigator.userAgent
      // Samsung Galaxy Fold specifically
      if (userAgent.includes('SM-F') || userAgent.includes('Galaxy') && userAgent.includes('Fold')) {
        detectedMobile = true
        method = 'samsung-fold-specific'
      }
    }
    
    isMobile.value = detectedMobile
    detectionMethod.value = method
    
    return detectedMobile
  }

  // Handle window resize with debounce
  let resizeTimeout
  const handleResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      detectMobile()
    }, 100)
  }

  // Handle orientation change
  const handleOrientationChange = () => {
    // Longer delay for orientation to complete
    setTimeout(() => {
      detectMobile()
    }, 300)
  }

  // Initialize detection
  const initMobileDetection = () => {
    detectMobile()
    
    // Add event listeners
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    
    // Also add load event to ensure all APIs are available
    window.addEventListener('load', detectMobile)
    
    // Listen for first touch to ensure touch detection
    const handleFirstTouch = () => {
      if (screenWidth.value <= 768 || screenHeight.value <= 768) {
        isMobile.value = true
        detectionMethod.value = 'first-touch'
      }
    }
    
    window.addEventListener('touchstart', handleFirstTouch, { 
      once: true, 
      passive: true 
    })
  }

  // Cleanup listeners
  const cleanupMobileDetection = () => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('orientationchange', handleOrientationChange)
    window.removeEventListener('load', detectMobile)
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }
  }

  // Force recheck with all methods
  const recheckMobile = () => {
    return detectMobile()
  }

  // Get comprehensive device info for debugging
  const getDeviceInfo = () => {
    return {
      isMobile: isMobile.value,
      detectionMethod: detectionMethod.value,
      screenWidth: screenWidth.value,
      screenHeight: screenHeight.value,
      userAgent: navigator.userAgent,
      platform: navigator.platform || 'unknown',
      hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: screen.orientation?.type || 'unknown',
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      cssMediaQueries: {
        mobile: window.matchMedia('(max-width: 768px)').matches,
        touch: window.matchMedia('(pointer: coarse)').matches,
        noHover: window.matchMedia('(hover: none)').matches
      }
    }
  }

  // Lifecycle hooks
  onMounted(() => {
    // Small delay to ensure all APIs are ready
    setTimeout(() => {
      initMobileDetection()
    }, 50)
  })

  onUnmounted(() => {
    cleanupMobileDetection()
  })

  return {
    // State
    isMobile,
    screenWidth, 
    screenHeight,
    detectionMethod,
    
    // Methods
    detectMobile,
    recheckMobile,
    getDeviceInfo,
    
    // Manual control
    initMobileDetection,
    cleanupMobileDetection
  }
}