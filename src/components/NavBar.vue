<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

defineProps({
  username: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["toggle-sidebar", "logout"]);

const isProfileMenuOpen = ref(false);
const currentTime = ref(new Date());
const intervalId = ref<number | null>(null);

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toggleProfileMenu() {
  isProfileMenuOpen.value = !isProfileMenuOpen.value;
}

function toggleSidebar() {
  emit("toggle-sidebar");
}

function logout() {
  emit("logout");
}

onMounted(() => {
  // Update time every minute
  intervalId.value = window.setInterval(() => {
    currentTime.value = new Date();
  }, 60000);
});

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }
});
</script>

<template>
  <nav class="bg-white shadow-subtle fixed top-0 left-0 right-0 z-40">
    <div class="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <button
            @click="toggleSidebar"
            class="p-2 rounded-md text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div class="ml-4 flex items-center">
            <span class="text-xl font-semibold text-primary-600">Tiemply</span>
          </div>
        </div>

        <div class="flex items-center">
          <div class="hidden md:flex flex-col items-end mr-6">
            <span class="text-sm text-neutral-600">{{
              formatDate(currentTime)
            }}</span>
            <span class="text-lg font-medium text-neutral-800">{{
              formatTime(currentTime)
            }}</span>
          </div>

          <div class="relative">
            <button
              @click="toggleProfileMenu"
              class="flex items-center max-w-xs text-sm rounded-full focus:outline-none border border-neutral-200 bg-white px-3 py-2"
            >
              <span class="sr-only">Open user menu</span>
              <span class="inline-flex items-center">
                <span
                  class="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white mr-2"
                >
                  {{ username.charAt(0).toUpperCase() }}
                </span>
                <span class="hidden md:block">{{ username }}</span>
                <svg
                  class="ml-2 w-4 h-4 text-neutral-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
            </button>

            <div
              v-if="isProfileMenuOpen"
              class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50"
            >
              <router-link
                to="/profile"
                class="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                @click="isProfileMenuOpen = false"
              >
                Your Profile
              </router-link>

              <button
                @click="logout"
                class="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
