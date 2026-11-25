<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";
import { useDepartmentsStore } from "../stores/departments";
import { useHourPoolStore } from "../stores/hourPool";

const { t } = useI18n();
const authStore = useAuthStore();
const departmentsStore = useDepartmentsStore();
const hourPoolStore = useHourPoolStore();

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

const route = useRoute();

const navigationItems = computed(() => {
  const items = [
    { name: t("nav.dashboard"), path: "/", icon: "home" },
    { name: t("nav.workLogs"), path: "/work-logs", icon: "clock" },
  ];

  // Sections outside the company plan are left out: they would only show a notice.
  if (authStore.hasFeature("employee_schedules")) {
    items.push({ name: t("nav.schedule"), path: "/schedule", icon: "schedule" });
  }

  if (authStore.hasFeature("overtime")) {
    items.push({ name: t("nav.overtime"), path: "/overtime", icon: "overtime" });
  }

  if (hourPoolStore.canViewHourPool && authStore.hasFeature("overtime")) {
    items.push({ name: t("nav.hourPool"), path: "/hour-pool", icon: "hourPool" });
  }

  items.push(
    { name: t("nav.incidents"), path: "/incidents", icon: "alert" },
    { name: t("nav.absences"), path: "/absences", icon: "calendar" },
    { name: t("nav.requests"), path: "/requests", icon: "document" },
    { name: t("nav.profile"), path: "/profile", icon: "user" },
  );

  return items;
});

// Manager/Admin navigation - only show if user is manager or admin
const isManagerOrAdmin = computed(() =>
  authStore.isManager ||
  authStore.isAdmin ||
  authStore.supervisesAnyDepartment ||
  departmentsStore.isSupervisor
);

const managerItems = computed(() => {
  if (!isManagerOrAdmin.value) return [];

  const items = [
    { name: t("teamRequests.title"), path: "/team-requests", icon: "users" },
  ];

  // The API only serves the company-wide summary to managers and administrators; a
  // department supervisor would land on an error.
  if ((authStore.isManager || authStore.isAdmin) && authStore.hasFeature("overtime")) {
    items.push({ name: t("hourPool.companySummary.title"), path: "/hour-pool/summary", icon: "hourPool" });
  }

  return items;
});

// What the person is in this company, shown under their name.
const roleLabel = computed(() => {
  if (authStore.isAdmin) return t("nav.roleAdmin");
  if (authStore.isManager) return t("nav.roleManager");
  if (authStore.supervisesAnyDepartment || departmentsStore.isSupervisor) return t("nav.roleSupervisor");
  return t("nav.employee");
});

// Department navigation - only show if user has a department
const hasDepartment = computed(() => !!authStore.currentDepartmentId);
const canManageDepartment = computed(() => departmentsStore.canManageDepartment || authStore.isSupervisor);

const departmentItems = computed(() => {
  const items = [
    { name: t("department.myDepartment"), path: "/department", icon: "building" },
  ];

  // Supervisor-only items, all behind the advanced departments feature of the plan
  if (canManageDepartment.value && authStore.hasFeature("departments_advanced")) {
    items.push(
      { name: t("department.absences"), path: "/department/absences", icon: "calendar" },
      { name: t("department.requests"), path: "/department/requests", icon: "document" },
      { name: t("department.workLogs"), path: "/department/work-logs", icon: "clock" }
    );
  }

  return items;
});

const isActive = (path: string) => {
  return route.path === path;
};

function closeSidebar() {
  emit("close");
}

// Company logo
const companyName = computed(() => authStore.currentCompany?.name || "");
const companyLogoUrl = computed(() => authStore.companyLogoUrl);
const companyInitials = computed(() => authStore.getCompanyInitials());
const logoError = ref(false);

function handleLogoError() {
  logoError.value = true;
}

// From `md` up the sidebar is a permanent column; below that it is a drawer that `isOpen`
// slides in over the page.
const sidebarClasses = computed(() => {
  return {
    "translate-x-0": props.isOpen,
    "-translate-x-full": !props.isOpen,
  };
});

const isDesktop = ref(true);
let desktopQuery: MediaQueryList | null = null;

function syncDesktop() {
  isDesktop.value = desktopQuery ? desktopQuery.matches : true;
}

onMounted(() => {
  if (typeof window.matchMedia !== "function") return;
  desktopQuery = window.matchMedia("(min-width: 768px)");
  syncDesktop();
  desktopQuery.addEventListener("change", syncDesktop);
});

onBeforeUnmount(() => desktopQuery?.removeEventListener("change", syncDesktop));

// A closed drawer is off screen but its links would still take keyboard focus and be
// read out; `inert` takes the whole subtree out of both.
const hiddenAttrs = computed(() =>
  !isDesktop.value && !props.isOpen ? { inert: true, "aria-hidden": true } : {}
);

const currentYear = new Date().getFullYear();

// Icons as SVG strings
const icons = {
  home: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>`,

  clock: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>`,

  calendar: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>`,

  document: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>`,

  user: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>`,

  building: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>`,

  users: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>`,

  schedule: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>`,

  overtime: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v2" />
  </svg>`,

  alert: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>`,

  hourPool: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
  </svg>`,
};
</script>

<template>
  <aside
    id="app-sidebar"
    class="app-sidebar bg-white w-64 fixed top-16 bottom-0 left-0 z-30 transform transition-transform duration-300 ease-in-out shadow-subtle overflow-y-auto md:translate-x-0"
    :class="sidebarClasses"
    v-bind="hiddenAttrs"
  >
    <div class="flex flex-col h-full">
      <!-- Close button for mobile only -->
      <button
        type="button"
        @click="closeSidebar"
        class="md:hidden absolute top-2 right-2 p-2 rounded-md text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        :aria-label="t('nav.closeMenu')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <!-- Company Logo Section -->
      <div class="p-4 border-b border-neutral-200 flex flex-col items-center">
        <!-- Logo o Iniciales -->
        <div v-if="companyLogoUrl && !logoError" class="mb-2">
          <img
            :src="companyLogoUrl"
            :alt="companyName"
            class="h-16 w-16 rounded-lg object-contain"
            @error="handleLogoError"
          />
        </div>
        <div
          v-else
          class="h-16 w-16 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xl mb-2"
        >
          {{ companyInitials }}
        </div>
        <!-- Nombre de empresa -->
        <p class="text-sm font-medium text-neutral-800 text-center">{{ companyName }}</p>
      </div>

      <div class="p-4 border-b border-neutral-200">
        <div class="flex items-center">
          <div
            class="h-10 w-10 flex-shrink-0 rounded-full bg-primary-600 flex items-center justify-center text-white"
            aria-hidden="true"
          >
            {{ username.charAt(0).toUpperCase() }}
          </div>
          <div class="ml-3 min-w-0">
            <p class="text-sm font-medium text-neutral-800 truncate">{{ username }}</p>
            <p class="text-xs text-neutral-500">{{ roleLabel }}</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 px-2 py-4 space-y-1" :aria-label="t('nav.mainNavigation')">
        <router-link
          v-for="item in navigationItems"
          :key="item.path"
          :to="item.path"
          :class="[
            isActive(item.path)
              ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800',
            'group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
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

        <!-- Manager Section -->
        <div v-if="isManagerOrAdmin" class="pt-4 mt-4 border-t border-neutral-200">
          <p class="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            {{ t('nav.management') }}
          </p>
          <router-link
            v-for="item in managerItems"
            :key="item.path"
            :to="item.path"
            :class="[
              isActive(item.path)
                ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800',
              'group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
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
        </div>

        <!-- Department Section -->
        <div v-if="hasDepartment" class="pt-4 mt-4 border-t border-neutral-200">
          <p class="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            {{ t('department.section') }}
          </p>
          <router-link
            v-for="item in departmentItems"
            :key="item.path"
            :to="item.path"
            :class="[
              isActive(item.path)
                ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800',
              'group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
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
        </div>
      </nav>

      <div
        class="p-4 text-center text-xs text-neutral-500 border-t border-neutral-200"
      >
        <p>Tiemply</p>
        <p>© {{ currentYear }} {{ t('common.allRightsReserved') }}</p>
      </div>
    </div>
  </aside>

  <!-- Backdrop overlay for mobile -->
  <div
    v-if="isOpen"
    @click="closeSidebar"
    class="md:hidden fixed inset-0 bg-neutral-800 bg-opacity-50 z-20 transition-opacity duration-300 ease-in-out"
    aria-hidden="true"
  ></div>
</template>
