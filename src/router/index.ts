import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Views
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/auth/LoginView.vue'
import RegisterView from '../views/auth/RegisterView.vue'
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
import NotFoundView from '../views/NotFoundView.vue'

// Department Views
import DepartmentView from '../views/DepartmentView.vue'
import DepartmentAbsencesView from '../views/DepartmentAbsencesView.vue'
import DepartmentRequestsView from '../views/DepartmentRequestsView.vue'
import DepartmentWorkLogsView from '../views/DepartmentWorkLogsView.vue'
import DepartmentNewAbsenceView from '../views/DepartmentNewAbsenceView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guest: true }
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { guest: true }
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

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
  } else if (to.meta.requiresManager && !authStore.isManager && !authStore.isAdmin) {
    next({ name: 'dashboard' })
  } else if (to.meta.requiresSupervisor && !authStore.isSupervisor && !authStore.isAdmin) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router