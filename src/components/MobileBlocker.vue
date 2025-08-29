<!--
src/components/MobileBlocker.vue
Component hiển thị thông báo không tương thích cho thiết bị mobile
Logic:
- Hiển thị full screen overlay khi detect mobile
- Thông báo thiết bị không phù hợp
- Responsive design phù hợp với mobile screen
- Block tất cả interactions với app
-->
<template>
  <div v-if="showBlocker" class="mobile-blocker">
    <div class="blocker-content">
      <!-- Mobile Icon -->
      <div class="mobile-icon">
        📱
      </div>
      
      <!-- Main Message -->
      <h1 class="blocker-title">
        {{ getText('deviceNotSupported') }}
      </h1>
      
      <!-- Description -->
      <p class="blocker-description">
        {{ getText('mobileNotSupportedDesc') }}
      </p>
      
      <!-- Device Info - REMOVED -->
      <!-- <div v-if="showDeviceInfo" class="device-info">
        <h3>{{ getText('deviceInfo') }}:</h3>
        <ul>
          <li><strong>{{ getText('detectionMethod') }}:</strong> {{ deviceInfo.detectionMethod }}</li>
          <li>{{ getText('screenSize') }}: {{ deviceInfo.screenWidth }}x{{ deviceInfo.screenHeight }}</li>
          <li>{{ getText('isMobile') }}: {{ deviceInfo.isMobile ? getText('yes') : getText('no') }}</li>
          <li>{{ getText('hasTouch') }}: {{ deviceInfo.hasTouch ? getText('yes') : getText('no') }}</li>
          <li>{{ getText('maxTouchPoints') }}: {{ deviceInfo.maxTouchPoints }}</li>
          <li>{{ getText('devicePixelRatio') }}: {{ deviceInfo.devicePixelRatio }}</li>
          <li>{{ getText('platform') }}: {{ deviceInfo.platform }}</li>
          <li>{{ getText('orientation') }}: {{ deviceInfo.orientation }}</li>
          <li><strong>CSS Media:</strong> Mobile={{ deviceInfo.cssMediaQueries.mobile ? 'Yes' : 'No' }}, Touch={{ deviceInfo.cssMediaQueries.touch ? 'Yes' : 'No' }}</li>
        </ul>
        <div class="user-agent">
          <strong>User Agent:</strong><br>
          <span style="font-size: 0.6rem; word-break: break-all;">{{ deviceInfo.userAgent }}</span>
        </div>
      </div> -->
      
      <!-- Footer -->
      <div class="blocker-footer">
        <p class="footer-text">
          {{ getText('useDesktopForBestExperience') }}
        </p>
      </div>
    </div>
    
    <!-- Background Pattern -->
    <div class="background-pattern"></div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { useMobileDetector } from '@/composables/useMobileDetector'

export default {
  name: 'MobileBlocker',
  props: {
    // Force show blocker (for testing)
    forceShow: {
      type: Boolean,
      default: false
    }
    // Removed showDeviceInfo prop
  },
  setup(props) {
    const { getText } = useLanguage()
    const { isMobile, recheckMobile, getDeviceInfo, detectionMethod } = useMobileDetector()
    
    // Show blocker when mobile detected or forced
    const showBlocker = computed(() => {
      return props.forceShow || isMobile.value
    })
    
    // Removed deviceInfo computed and device info functions
    
    return {
      showBlocker,
      getText
      // Removed: deviceInfo, detectionMethod, handleRefresh, handleRequestDesktop
    }
  }
}
</script>

<style scoped>
.mobile-blocker {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  overflow: auto;
  padding: 1rem;
}

.blocker-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 2;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.mobile-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.8;
}

.blocker-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 1rem;
  line-height: 1.3;
}

.blocker-description {
  font-size: 1rem;
  color: #4a5568;
  margin-bottom: 2rem;
  line-height: 1.5;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* REMOVED - Device info styles not needed anymore */

.blocker-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 1rem;
  margin-top: 2rem;
}

.footer-text {
  font-size: 0.75rem;
  color: #718096;
  margin: 0;
  line-height: 1.4;
}

.background-pattern {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.1;
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.2) 2px, transparent 2px),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.2) 2px, transparent 2px);
  background-size: 50px 50px;
  z-index: 1;
}

/* Responsive adjustments for very small screens */
@media (max-width: 320px) {
  .blocker-content {
    padding: 1.5rem;
  }
  
  .blocker-title {
    font-size: 1.25rem;
  }
  
  .blocker-description {
    font-size: 0.875rem;
  }
  
  .mobile-icon {
    font-size: 3rem;
  }
}

/* Landscape orientation adjustments */
@media (orientation: landscape) and (max-height: 500px) {
  .blocker-content {
    max-height: 95vh;
    padding: 1rem;
  }
  
  .mobile-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }
  
  .blocker-title {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }
  
  .blocker-description {
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }
  
  .blocker-footer {
    margin-top: 1rem;
  }
}
</style>