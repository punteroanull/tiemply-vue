<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkStatusStore } from '../stores/workStatus'
import NavBar from '../components/NavBar.vue'
import SideBar from '../components/SideBar.vue'
import CheckInOutButton from '../components/CheckInOutButton.vue'

const authStore = useAuthStore()
const workStatusStore = useWorkStatusStore()
const router = useRouter()

const isSidebarOpen = ref(false)

onMounted(() => {
  workStatusStore.initialize()
})

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeSidebar() {
  isSidebarOpen.value = false
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex flex-col">
    <NavBar 
      :username="authStore.user?.name || ''" 
      @toggle-sidebar="toggleSidebar"
      @logout="handleLogout"
    />
    
    <div class="flex flex-1 pt-16">
      <SideBar 
        :is-open="isSidebarOpen" 
        :username="authStore.user?.name || ''"
        @close="closeSidebar"
      />
      
      <main class="flex-1 p-4 sm:p-6 md:p-8 transition-all duration-300" 
        :class="{ 'md:pl-64': isSidebarOpen }">
        <router-view />
        
        <div class="fixed bottom-6 right-6 z-50">
          <CheckInOutButton 
            :is-checked-in="workStatusStore.isCheckedIn"
            :is-loading="workStatusStore.checkingIn || workStatusStore.checkingOut"
            @check-in="workStatusStore.checkIn"
            @check-out="workStatusStore.checkOut"
          />
        </div>
      </main>
    </div>
  </div>
</template>