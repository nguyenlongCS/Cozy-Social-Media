<!--
src/components/ProfileHomeRight.vue
Component sidebar bên phải cho trang profile
Logic:
- Hiển thị nội dung quan tâm với button thêm tags
- Popup chọn tags từ 19 danh mục có sẵn
- Lưu user interests vào Firestore
- Danh sách bài viết (placeholder)
- Danh sách bạn bè (placeholder)
- Responsive design consistent với HomeRight
-->
<template>
  <div class="profile-right">
    <!-- Interests Section -->
    <div class="interests-section">
      <div class="section-header">
        <h3 class="section-title">{{ getText('interests') }}</h3>
        <button 
          class="add-interest-btn"
          @click="toggleInterestSelector"
          :disabled="isLoading"
        >
          <div class="plus-icon"></div>
        </button>
      </div>

      <!-- User Selected Interests -->
      <div class="interests-container">
        <div v-if="userInterests.length === 0" class="no-interests">
          {{ getText('noInterestsSelected') }}
        </div>
        <div 
          v-else
          v-for="interest in userInterests" 
          :key="interest"
          class="interest-pill"
        >
          {{ interest }}
          <button 
            class="remove-interest"
            @click="removeInterest(interest)"
          >
            ×
          </button>
        </div>
      </div>

    </div>

    <!-- Interest Selector Popup - MOVED OUTSIDE of interests-section -->
    <div v-if="showInterestSelector" class="interest-selector-overlay" @click="closeInterestSelector">
      <div class="interest-selector" @click.stop>
        <div class="selector-header">
          <h4>{{ getText('selectInterests') }}</h4>
          <button class="close-btn" @click="closeInterestSelector">×</button>
        </div>
        
        <div class="categories-grid">
          <button
            v-for="category in availableCategories"
            :key="category"
            class="category-option"
            :class="{ 
              selected: selectedCategories.includes(category),
              disabled: userInterests.includes(category)
            }"
            @click="toggleCategory(category)"
            :disabled="userInterests.includes(category)"
          >
            {{ category }}
          </button>
        </div>
        
        <div class="selector-actions">
          <button 
            class="cancel-btn btn"
            @click="closeInterestSelector"
          >
            {{ getText('cancel') }}
          </button>
          <button 
            class="save-btn btn"
            @click="saveSelectedInterests"
            :disabled="selectedCategories.length === 0 || isLoading"
          >
            {{ isLoading ? getText('saving') : getText('save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Posts Section -->
    <div class="posts-section">
      <h3 class="section-title">{{ getText('posts') }}</h3>
      <div class="placeholder-content">
        <div class="placeholder-icon"></div>
        <p class="placeholder-text">{{ getText('postsComingSoon') }}</p>
      </div>
    </div>

    <!-- Friends Section -->
    <div class="friends-section">
      <h3 class="section-title">{{ getText('friends') }}</h3>
      <div class="placeholder-content">
        <div class="placeholder-icon"></div>
        <p class="placeholder-text">{{ getText('friendsComingSoon') }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { usePostClassification } from '@/composables/usePostClassification'
import { 
  getFirestore, 
  doc, 
  getDoc,
  setDoc 
} from 'firebase/firestore'
import app from '@/firebase/config'

// Initialize Firestore
const db = getFirestore(app, 'social-media-db')

export default {
  name: 'ProfileHomeRight',
  setup() {
    const { user } = useAuth()
    const { getText } = useLanguage()
    const { showError, showSuccess } = useErrorHandler()
    const { CATEGORIES } = usePostClassification()

    // Reactive data
    const userInterests = ref([])
    const showInterestSelector = ref(false)
    const selectedCategories = ref([])
    const isLoading = ref(false)

    // Available categories from classification system
    const availableCategories = computed(() => CATEGORIES)

    // Methods
    const loadUserInterests = async () => {
      if (!user.value) {
        userInterests.value = []
        return
      }

      try {
        const userInterestsRef = doc(db, 'userInterests', user.value.uid)
        const userInterestsDoc = await getDoc(userInterestsRef)

        if (userInterestsDoc.exists()) {
          const data = userInterestsDoc.data()
          userInterests.value = data.interests || []
          console.log('User interests loaded:', userInterests.value)
        } else {
          userInterests.value = []
        }
      } catch (error) {
        console.error('Error loading user interests:', error)
        userInterests.value = []
      }
    }

    const toggleInterestSelector = () => {
      console.log('Toggle interest selector clicked') // Debug log
      showInterestSelector.value = true
      selectedCategories.value = []
      console.log('showInterestSelector:', showInterestSelector.value) // Debug log
    }

    const closeInterestSelector = () => {
      console.log('Close interest selector') // Debug log
      showInterestSelector.value = false
      selectedCategories.value = []
    }

    const toggleCategory = (category) => {
      // Không cho phép select nếu đã có trong userInterests
      if (userInterests.value.includes(category)) {
        return
      }

      const index = selectedCategories.value.indexOf(category)
      if (index === -1) {
        selectedCategories.value.push(category)
      } else {
        selectedCategories.value.splice(index, 1)
      }
    }

    const saveSelectedInterests = async () => {
      if (!user.value || selectedCategories.value.length === 0) {
        return
      }

      isLoading.value = true

      try {
        // Merge new interests với existing interests
        const newInterests = [...userInterests.value, ...selectedCategories.value]
        const uniqueInterests = [...new Set(newInterests)] // Remove duplicates

        // Save to Firestore
        const userInterestsRef = doc(db, 'userInterests', user.value.uid)
        await setDoc(userInterestsRef, {
          userId: user.value.uid,
          interests: uniqueInterests,
          updatedAt: new Date()
        })

        // Update local state
        userInterests.value = uniqueInterests
        
        console.log('User interests saved:', uniqueInterests)
        showSuccess('profile')
        closeInterestSelector()

      } catch (error) {
        console.error('Error saving user interests:', error)
        showError(error, 'profile')
      } finally {
        isLoading.value = false
      }
    }

    const removeInterest = async (interest) => {
      if (!user.value) return

      try {
        const updatedInterests = userInterests.value.filter(item => item !== interest)
        
        // Save to Firestore
        const userInterestsRef = doc(db, 'userInterests', user.value.uid)
        await setDoc(userInterestsRef, {
          userId: user.value.uid,
          interests: updatedInterests,
          updatedAt: new Date()
        })

        // Update local state
        userInterests.value = updatedInterests
        
        console.log('Interest removed:', interest)

      } catch (error) {
        console.error('Error removing interest:', error)
        showError(error, 'profile')
      }
    }

    // Close selector when clicking outside - UPDATED
    const handleClickOutside = (event) => {
      // Remove this auto-close functionality to debug
      console.log('Click outside detected')
    }

    // Watchers
    watch(user, (newUser) => {
      if (newUser) {
        loadUserInterests()
      } else {
        userInterests.value = []
      }
    }, { immediate: true })

    // Lifecycle - SIMPLIFIED for debugging
    onMounted(() => {
      console.log('ProfileHomeRight mounted')
      console.log('Available categories:', availableCategories.value)
      // Temporarily remove click outside listener for debugging
      // document.addEventListener('click', handleClickOutside)
    })

    return {
      userInterests,
      showInterestSelector,
      selectedCategories,
      isLoading,
      availableCategories,
      getText,
      toggleInterestSelector,
      closeInterestSelector,
      toggleCategory,
      saveSelectedInterests,
      removeInterest
    }
  }
}
</script>

<style scoped>
.profile-right {
  width: 22.13%;
  height: 100%; /* FIXED: Set height to 100% để match với HomeRight */
  background: #2B2D42;
  display: flex;
  flex-direction: column;
  color: var(--theme-color);
  font-size: 0.875rem;
  overflow: hidden; /* FIXED: Prevent overflow để maintain consistent height */
  padding: 1rem;
  gap: 1rem; /* Reduced gap để fit better */
}

/* Interests Section - FIXED height management */
.interests-section {
  border-bottom: 1px solid rgba(255, 235, 124, 0.2);
  padding-bottom: 0.75rem;
  flex-shrink: 0; /* Prevent shrinking */
  max-height: 40%; /* Limit max height */
  overflow-y: auto; /* Allow scrolling if needed */
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--theme-color);
  margin: 0;
}

.add-interest-btn {
  width: 1.5rem;
  height: 1.5rem;
  background: rgba(255, 235, 124, 0.1);
  border: 1px solid rgba(255, 235, 124, 0.3);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.add-interest-btn:hover:not(:disabled) {
  background: rgba(255, 235, 124, 0.2);
  transform: scale(1.1);
}

.add-interest-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.plus-icon {
  width: 0.75rem;
  height: 0.75rem;
  background: url('@/icons/plus.png') center/cover;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
}

.interests-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.no-interests {
  color: rgba(255, 235, 124, 0.6);
  font-size: 0.75rem;
  font-style: italic;
  text-align: center;
  padding: 1rem 0;
}

.interest-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 235, 124, 0.15);
  border: 1px solid rgba(255, 235, 124, 0.4);
  border-radius: 1rem;
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--theme-color);
  white-space: nowrap;
  transition: all 0.2s ease;
}

.interest-pill:hover {
  background: rgba(255, 235, 124, 0.25);
}

.remove-interest {
  background: none;
  border: none;
  color: rgba(255, 235, 124, 0.8);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  padding: 0;
  margin-left: 0.125rem;
  transition: color 0.2s ease;
}

.remove-interest:hover {
  color: #ff6b6b;
}

/* Interest Selector Popup - UPDATED with higher z-index and better positioning */
.interest-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999; /* Increased z-index */
  backdrop-filter: blur(2px); /* Added blur effect */
}

.interest-selector {
  background: #2B2D42;
  border: 2px solid var(--theme-color); /* Increased border width */
  border-radius: 0.75rem;
  padding: 1.5rem;
  max-width: 28rem; /* Slightly larger */
  width: 95%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.7); /* Enhanced shadow */
  position: relative;
  z-index: 10000; /* Ensure selector is above overlay */
}

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 235, 124, 0.2);
  padding-bottom: 0.75rem;
}

.selector-header h4 {
  color: var(--theme-color);
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 235, 124, 0.8);
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: bold;
  padding: 0;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #ff6b6b;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  max-height: 20rem;
  overflow-y: auto;
}

.category-option {
  padding: 0.5rem;
  background: rgba(255, 235, 124, 0.1);
  border: 1px solid rgba(255, 235, 124, 0.3);
  border-radius: 0.5rem;
  color: var(--theme-color);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  transition: all 0.2s ease;
}

.category-option:hover:not(:disabled) {
  background: rgba(255, 235, 124, 0.2);
  border-color: rgba(255, 235, 124, 0.6);
}

.category-option.selected {
  background: var(--theme-color);
  color: #2B2D42;
  border-color: var(--theme-color);
}

.category-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(255, 235, 124, 0.05);
}

.selector-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.cancel-btn, .save-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: rgba(255, 235, 124, 0.1);
  border: 1px solid rgba(255, 235, 124, 0.3);
  color: var(--theme-color);
}

.save-btn {
  background: var(--theme-color);
  border: 1px solid var(--theme-color);
  color: #2B2D42;
}

.cancel-btn:hover:not(:disabled) {
  background: rgba(255, 235, 124, 0.2);
}

.save-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0.25rem 0.5rem rgba(255, 235, 124, 0.3);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Posts and Friends Sections - FIXED height management */
.posts-section, .friends-section {
  border-bottom: 1px solid rgba(255, 235, 124, 0.2);
  padding-bottom: 0.75rem;
  flex: 1; /* FIXED: Allow sections to expand equally */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent overflow */
  min-height: 0; /* Allow flex shrinking */
}

.friends-section {
  border-bottom: none;
  flex: 1; /* Equal height distribution */
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1; /* FIXED: Fill available space */
  padding: 1rem; /* Reduced padding */
  text-align: center;
  min-height: 0; /* Allow shrinking */
}

.placeholder-icon {
  width: 2.5rem; /* Reduced size */
  height: 2.5rem;
  background: rgba(255, 235, 124, 0.2);
  border-radius: 50%;
  margin-bottom: 0.5rem; /* Reduced margin */
  position: relative;
  flex-shrink: 0; /* Prevent shrinking */
}

.placeholder-icon::after {
  content: "...";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 235, 124, 0.6);
  font-size: 1.25rem; /* Reduced font size */
  font-weight: bold;
}

.placeholder-text {
  color: rgba(255, 235, 124, 0.6);
  font-size: 0.75rem;
  font-style: italic;
  margin: 0;
  flex-shrink: 0; /* Prevent text from shrinking */
}

/* Scrollbar Styling */
.categories-grid::-webkit-scrollbar,
.interest-selector::-webkit-scrollbar {
  width: 0.25rem;
}

.categories-grid::-webkit-scrollbar-track,
.interest-selector::-webkit-scrollbar-track {
  background: rgba(255, 235, 124, 0.1);
  border-radius: 0.125rem;
}

.categories-grid::-webkit-scrollbar-thumb,
.interest-selector::-webkit-scrollbar-thumb {
  background: rgba(255, 235, 124, 0.3);
  border-radius: 0.125rem;
}
</style>