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

// Only the mobile drawer opens and closes; from `md` up the sidebar is always there.
const isSidebarOpen = ref(false)

// Stops the timers the work-status store starts for the signed-in person.
let stopWorkStatus: (() => void) | null = null
let sessionRun = 0

function endSession() {
  sessionRun++
  stopWorkStatus?.()
  stopWorkStatus = null
}

/**
 * Load what the shell needs for whoever is signed in. Runs again when the identity
 * changes without a page load (entering or leaving an impersonation), which resets every
 * store and used to leave company settings, the department and the status timers empty
 * until the next reload.
 */
async function startSession() {
  endSession()
  const run = sessionRun

  hourPoolStore.fetchCompanySettings()
  // Fetch department data so the sidebar can determine if the user is a supervisor
  if (authStore.currentDepartmentId) {
    departmentsStore.fetchDepartment()
  }

  const stop = await workStatusStore.initialize()
  if (run === sessionRun) {
    stopWorkStatus = stop
  } else {
    // The identity changed again (or the layout went away) while this was loading.
    stop?.()
  }
}

watch(
  () => authStore.user?.id,
  (id, previous) => {
    if (id && id !== previous) startSession()
  },
  { immediate: true }
)

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeSidebar() {
  isSidebarOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isSidebarOpen.value) closeSidebar()
}

async function handleLogout() {
  // While impersonating, "log out" means handing the session back to the administrator,
  // not destroying it.
  if (authStore.isImpersonating) {
    await authStore.stopImpersonation()
    return
  }

  await authStore.logout()
  router.replace({ name: 'login' })
}

// The NavBar and SideBar are fixed, so the banner would sit on top of them. A body class
// keeps the offset in one place instead of threading a prop through both.
watch(
  () => authStore.isImpersonating,
  (active) => document.body.classList.toggle('has-impersonation-banner', active),
  { immediate: true }
)

onMounted(() => window.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.classList.remove('has-impersonation-banner')
  endSession()
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex flex-col">
    <ImpersonationBanner />

    <NavBar
      :username="authStore.user?.name || ''"
      :sidebar-open="isSidebarOpen"
      @toggle-sidebar="toggleSidebar"
      @logout="handleLogout"
    />

    <div class="app-content flex flex-1 pt-16">
      <SideBar
        :is-open="isSidebarOpen"
        :username="authStore.user?.name || ''"
        @close="closeSidebar"
      />

      <!-- pb-24 keeps the last row clear of the floating clock-in button. -->
      <main class="flex-1 min-w-0 overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-24 md:p-8 md:pb-24 md:ml-64">
        <router-view />

        <div class="fixed bottom-6 right-6 z-50">
          <CheckInOutButton />
        </div>
      </main>
    </div>
  </div>
</template>

<style>
/* Push the fixed chrome down while the impersonation banner (2.5rem tall) is on screen:
   the navbar sits right under it, and the sidebar and the content under the navbar. */
body.has-impersonation-banner .app-navbar {
  top: 2.5rem;
}

body.has-impersonation-banner .app-sidebar {
  top: 6.5rem;
}

body.has-impersonation-banner .app-content {
  padding-top: 6.5rem;
}
</style>
