import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDepartmentsStore } from '../stores/departments'
import i18n from '../i18n'

// Views
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/auth/LoginView.vue'
import ForgotPasswordView from '../views/auth/ForgotPasswordView.vue'
import ResetPasswordView from '../views/auth/ResetPasswordView.vue'
import InvitationView from '../views/auth/InvitationView.vue'
import ProfileView from '../views/ProfileView.vue'
import WorkLogsView from '../views/WorkLogsView.vue'
import ScheduleView from '../views/ScheduleView.vue'
import OvertimeView from '../views/OvertimeView.vue'
import IncidentsView from '../views/IncidentsView.vue'
import AbsencesView from '../views/AbsencesView.vue'
import RequestsView from '../views/RequestsView.vue'
import NewRequestView from '../views/NewRequestView.vue'
import EditRequestView from '../views/EditRequestView.vue'
import TeamRequestsView from '../views/TeamRequestsView.vue'
import HourPoolView from '../views/HourPoolView.vue'
import HourPoolSummaryView from '../views/HourPoolSummaryView.vue'
import NotFoundView from '../views/NotFoundView.vue'

// Department Views
import DepartmentView from '../views/DepartmentView.vue'
import DepartmentAbsencesView from '../views/DepartmentAbsencesView.vue'
import DepartmentRequestsView from '../views/DepartmentRequestsView.vue'
import DepartmentWorkLogsView from '../views/DepartmentWorkLogsView.vue'
import DepartmentNewAbsenceView from '../views/DepartmentNewAbsenceView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // Each page starts at the top; back/forward restore where the reader was.
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      // Landing for the admin panel handoff. Deliberately neither guest nor auth
      // protected: the visitor may arrive with a stale session of their own.
      path: '/impersonate',
      name: 'impersonate',
      component: () => import('../views/auth/ImpersonateLandingView.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guest: true }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordView,
      meta: { guest: true }
    },
    {
      // Target of the link in the reset email. Open to everyone: someone still signed in
      // on this device may be resetting the password too.
      path: '/reset-password',
      name: 'reset-password',
      component: ResetPasswordView,
      meta: { public: true }
    },
    {
      path: '/invitation/:token',
      name: 'invitation',
      component: InvitationView,
      meta: { public: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true }
    },
    {
      path: '/work-logs',
      name: 'work-logs',
      component: WorkLogsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/schedule',
      name: 'schedule',
      component: ScheduleView,
      meta: { requiresAuth: true }
    },
    {
      path: '/overtime',
      name: 'overtime',
      component: OvertimeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/incidents',
      name: 'incidents',
      component: IncidentsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/absences',
      name: 'absences',
      component: AbsencesView,
      meta: { requiresAuth: true }
    },
    {
      path: '/requests',
      name: 'requests',
      component: RequestsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/requests/new',
      name: 'new-request',
      component: NewRequestView,
      meta: { requiresAuth: true }
    },
    {
      path: '/requests/:id/edit',
      name: 'edit-request',
      component: EditRequestView,
      meta: { requiresAuth: true }
    },
    {
      path: '/hour-pool',
      name: 'hour-pool',
      component: HourPoolView,
      meta: { requiresAuth: true }
    },
    {
      path: '/hour-pool/summary',
      name: 'hour-pool-summary',
      component: HourPoolSummaryView,
      meta: { requiresAuth: true, requiresManager: true, companyManagerOnly: true }
    },
    {
      path: '/team-requests',
      name: 'team-requests',
      component: TeamRequestsView,
      meta: { requiresAuth: true, requiresManager: true }
    },
    // Department routes
    {
      path: '/department',
      name: 'department',
      component: DepartmentView,
      meta: { requiresAuth: true }
    },
    {
      path: '/department/absences',
      name: 'department-absences',
      component: DepartmentAbsencesView,
      meta: { requiresAuth: true, requiresSupervisor: true }
    },
    {
      path: '/department/absences/new',
      name: 'department-new-absence',
      component: DepartmentNewAbsenceView,
      meta: { requiresAuth: true, requiresSupervisor: true }
    },
    {
      path: '/department/requests',
      name: 'department-requests',
      component: DepartmentRequestsView,
      meta: { requiresAuth: true, requiresSupervisor: true }
    },
    {
      path: '/department/work-logs',
      name: 'department-work-logs',
      component: DepartmentWorkLogsView,
      meta: { requiresAuth: true, requiresSupervisor: true }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const departmentsStore = useDepartmentsStore()

  // Before anything else: the handoff code lives for 60 seconds and the guest branch
  // below would bounce a visitor who still has a session to the dashboard.
  if (to.name === 'impersonate') {
    return next()
  }

  // On a hard reload / deep link the token is restored from localStorage but the
  // user (and therefore the role flags) is not loaded yet. Load it before
  // evaluating role-based guards, otherwise every manager/supervisor route
  // redirects to the dashboard.
  if (authStore.token && !authStore.user && !authStore.userLoadFailed) {
    await authStore.fetchCurrentUser()
  }

  // Unknown address and nobody signed in: there is nothing to show but the login page.
  if (to.name === 'not-found' && !authStore.isAuthenticated) {
    return next({ name: 'login' })
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login' })
  }

  if (to.meta.guest && authStore.isAuthenticated) {
    return next({ name: 'dashboard' })
  }

  // The session is there but the profile could not be loaded (offline, server error).
  // The roles are unknown, so keep the address: the shell shows a retry screen and the
  // page opens where the user wanted once the profile loads.
  if (authStore.isAuthenticated && !authStore.user) {
    return next()
  }

  const managesCompany = authStore.isManager || authStore.isAdmin
  const supervises = authStore.isSupervisor || departmentsStore.isSupervisor
  // Reviewing team requests is open to whoever supervises any department, not only their own.
  const supervisesAny = supervises || authStore.supervisesAnyDepartment

  // Company-wide screens the API only serves to managers and administrators.
  if (to.meta.companyManagerOnly && !managesCompany) {
    return next({ name: 'dashboard' })
  }

  if (to.meta.requiresManager && !managesCompany && !supervisesAny) {
    return next({ name: 'dashboard' })
  }

  if (to.meta.requiresSupervisor && !managesCompany && !supervises) {
    return next({ name: 'dashboard' })
  }

  next()
})

// Tab / task-switcher title per page, in the app language.
const PAGE_TITLES: Record<string, string> = {
  dashboard: 'nav.dashboard',
  profile: 'nav.profile',
  'work-logs': 'nav.workLogs',
  schedule: 'nav.schedule',
  overtime: 'nav.overtime',
  incidents: 'nav.incidents',
  absences: 'nav.absences',
  requests: 'nav.requests',
  'new-request': 'nav.requests',
  'edit-request': 'nav.requests',
  'hour-pool': 'nav.hourPool',
  'hour-pool-summary': 'nav.hourPool',
  login: 'auth.login',
  'forgot-password': 'auth.reset.title',
  'reset-password': 'auth.reset.newPasswordTitle',
}

router.afterEach((to) => {
  const key = PAGE_TITLES[to.name as string]
  document.title = key ? `${i18n.global.t(key)} · Tiemply` : 'Tiemply'
})

export default router
