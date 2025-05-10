<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["close"]);

const router = useRouter();
const route = useRoute();

const navigationItems = [
  { name: "Dashboard", path: "/", icon: "home" },
  { name: "Work Logs", path: "/work-logs", icon: "clock" },
  { name: "Absences", path: "/absences", icon: "calendar" },
  { name: "Requests", path: "/requests", icon: "document" },
  { name: "Profile", path: "/profile", icon: "user" },
];

const isActive = (path: string) => {
  return route.path === path;
};

function closeSidebar() {
  emit("close");
}

const sidebarClasses = computed(() => {
  return {
    "translate-x-0": props.isOpen,
    "-translate-x-full": !props.isOpen,
    "md:translate-x-0": props.isOpen,
  };
});

// Icons as SVG strings
const icons = {
  home: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>`,

  clock: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>`,

  calendar: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>`,

  document: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>`,

  user: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>`,
};
</script>

<template>
  <aside
    class="bg-white w-64 fixed top-16 bottom-0 left-0 z-30 transform transition-transform duration-300 ease-in-out shadow-subtle overflow-y-auto"
    :class="sidebarClasses"
  >
    <div class="flex flex-col h-full">
      <!-- Close button for mobile only -->
      <button
        @click="closeSidebar"
        class="md:hidden absolute top-2 right-2 p-2 rounded-md text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 focus:outline-none"
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div class="p-4 border-b border-neutral-200">
        <div class="flex items-center">
          <div
            class="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white"
          >
            {{ username.charAt(0).toUpperCase() }}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-neutral-800">{{ username }}</p>
            <p class="text-xs text-neutral-500">Employee</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 px-2 py-4 space-y-1">
        <router-link
          v-for="item in navigationItems"
          :key="item.path"
          :to="item.path"
          :class="[
            isActive(item.path)
              ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800',
            'group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors duration-150',
          ]"
          @click="closeSidebar"
        >
          <div
            v-html="icons[item.icon as keyof typeof icons]"
            :class="[
              isActive(item.path)
                ? 'text-primary-600'
                : 'text-neutral-400 group-hover:text-neutral-500',
              'mr-3 flex-shrink-0',
            ]"
          ></div>
          {{ item.name }}
        </router-link>
      </nav>

      <div
        class="p-4 text-center text-xs text-neutral-500 border-t border-neutral-200"
      >
        <p>Tiemply v1.0.0</p>
        <p>© 2025 All rights reserved</p>
      </div>
    </div>
  </aside>

  <!-- Backdrop overlay for mobile -->
  <div
    v-if="isOpen"
    @click="closeSidebar"
    class="md:hidden fixed inset-0 bg-neutral-800 bg-opacity-50 z-20 transition-opacity duration-300 ease-in-out"
  ></div>
</template>
