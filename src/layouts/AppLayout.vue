<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkStatusStore } from '../stores/workStatus'
import { useDepartmentsStore } from '../stores/departments'
import { useHourPoolStore } from '../stores/hourPool'
import NavBar from '../components/NavBar.vue'
import SideBar from '../components/SideBar.vue'
import CheckInOutButton from '../components/CheckInOutButton.vue'
import ImpersonationBanner from '../components/ImpersonationBanner.vue'

const authStore = useAuthStore()
const workStatusStore = useWorkStatusStore()
const departmentsStore = useDepartmentsStore()
const hourPoolStore = useHourPoolStore()
const router = useRouter()

const isSidebarOpen = ref(false)

onMounted(() => {
  workStatusStore.initialize()
  hourPoolStore.fetchCompanySettings()
  // Fetch department data so the sidebar can determine if the user is a supervisor
  if (authStore.currentDepartmentId) {
    departmentsStore.fetchDepartment()
  }
})

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeSidebar() {
  isSidebarOpen.value = false
}

async function handleLogout() {
  // While impersonating, "log out" means handing the session back to the administrator,
  // not destroying it.
  if (authStore.isImpersonating) {
    await authStore.stopImpersonation()
    return
  }

  await authStore.logout()
  router.push('/login')
}

// The NavBar is fixed at top-0, so the banner would sit on top of it. A body class keeps
// the offset in one place instead of threading a prop through NavBar and SideBar.
watch(
  () => authStore.isImpersonating,
  (active) => document.body.classList.toggle('has-impersonation-banner', active),
  { immediate: true }
)

onBeforeUnmount(() => document.body.classList.remove('has-impersonation-banner'))
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex flex-col">
    <ImpersonationBanner />

    <NavBar 
      :username="authStore.user?.name || ''" 
      @toggle-sidebar="toggleSidebar"
      @logout="handleLogout"
    />
    
    <div class="flex flex-1 pt-16" :class="{ 'pt-26': authStore.isImpersonating }">
      <SideBar 
        :is-open="isSidebarOpen" 
        :username="authStore.user?.name || ''"
        @close="closeSidebar"
      />
      
      <main class="flex-1 p-4 sm:p-6 md:p-8 transition-all duration-300 overflow-x-hidden min-w-0"
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
<style>
/* Push the fixed chrome down while the impersonation banner is on screen. */
body.has-impersonation-banner nav.fixed,
body.has-impersonation-banner aside.fixed {
  top: 2.5rem;
}
</style>
