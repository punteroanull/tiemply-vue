# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tiemply is an employee time management PWA built with Vue 3 + TypeScript + Vite. It handles work hours tracking (with geolocation-based check-in/out), absences, overtime, incidents, schedules, and department management. The backend is a Laravel API.

## Commands

```bash
npm run dev              # Start dev server (Vite)
npm run build            # TypeScript check + production build
npm run test             # Run Vitest tests (watch mode)
npm run test -- --run    # Run tests once without watch
npm run test -- src/test/stores/auth.spec.ts  # Run a single test file
npm run test:coverage    # Generate coverage report
```

## Architecture

### Tech Stack
- **Vue 3.4** with Composition API (`<script setup>`)
- **Pinia** for state management
- **Vue Router** with role-based route guards
- **Axios** with interceptors (auto snake_case→camelCase on responses)
- **Vue i18n** for EN/ES translations
- **TailwindCSS** with custom color palette
- **date-fns** for date formatting/manipulation
- **vue-toastification** for toast notifications
- **VitePWA** for service worker and offline caching
- **Vitest + Vue Test Utils + MSW** for testing (jsdom environment)

### Directory Structure
```
src/
├── components/    # Reusable UI components
├── views/         # Page components (routed)
├── stores/        # Pinia stores (auth, workStatus, workLogs, absences, etc.)
├── services/      # API client (api.ts) with interceptors
├── i18n/locales/  # Translation files (en.ts, es.ts)
├── utils/         # Helpers (geolocation, offlineManager, caseConverter)
├── types/         # TypeScript interfaces (index.ts)
├── layouts/       # AppLayout (authenticated), AuthLayout (login/register)
└── test/          # Test setup, mocks, and spec files
```

Path alias: `@/` maps to `src/` (e.g., `import api from '@/services/api'`).

### API Integration

**Critical pattern**: The Axios response interceptor converts response keys from snake_case to camelCase automatically, but request bodies are NOT auto-converted. You must send request data in snake_case to match the Laravel API.

```typescript
// Response data arrives in camelCase (auto-converted)
const response = await api.get('/employees/123/company-settings')
// response.data = { success: true, data: { geolocationEnabled: true, ... } }

// Request data must be sent in snake_case
await api.post('/worklogs/check-in', {
  employee_id: employeeId,  // snake_case for Laravel
  category: 'shift_start',
  location: { latitude: 40.41, longitude: -3.70 }
})
```

**API response unwrapping**: The backend wraps responses in `{ success, message, data }`. Access the actual payload via `response.data.data`:

```typescript
const response = await api.get<ApiResponse<DataType>>('/endpoint')
const actualData = response.data.data  // The real data payload
```

Stores consistently check for this wrapping pattern:
```typescript
if (response.data && typeof response.data === 'object' && 'data' in response.data) {
  data = response.data.data;
} else {
  data = response.data;
}
```

### State Management (Pinia Stores)

All stores use Composition API style (`defineStore('name', () => { ... })`).

- `auth` - User session, token (localStorage), role checks (`isAdmin`, `isManager`, `isSupervisor`), current employee/company, locale management
- `workStatus` - Check-in/out state machine (`WorkState`: not_working → working → on_break/offsite), geolocation, duration tracking with intervals
- `workLogs` - Daily/weekly/monthly work reports
- `absences` - Absence records and requests (create, approve, reject)
- `departments` - Department data and supervisor status
- `schedules`, `overtime`, `incidents` - Feature-specific stores

### Routing & Access Control

Route meta properties control access:
- `requiresAuth` - Redirects unauthenticated users to login
- `guest` - Redirects authenticated users to dashboard
- `public` - No auth check (e.g., invitation page)
- `requiresManager` - Manager, admin, or supervisor role required
- `requiresSupervisor` - Supervisor or admin role required

The `beforeEach` guard in `src/router/index.ts` also checks `departmentsStore.isSupervisor` for department-level supervisor roles.

### Type Conventions

Types in `src/types/index.ts` have mixed casing due to the auto-conversion:
- Fields from API responses that get auto-converted appear as camelCase in `Employee` (e.g., `companyId`, `contractStartTime`)
- Some types mirror the raw API schema and keep snake_case (e.g., `WorkLog.employee_id`, `AbsenceType.requires_approval`)
- When in doubt, check the existing type definitions before adding new ones

### Internationalization
- Translations in `src/i18n/locales/{en,es}.ts`
- Use `const { t } = useI18n()` in components, `{{ $t('key.subkey') }}` in templates
- All user-facing strings must use translation keys

### Styling (TailwindCSS)
Custom colors defined in `tailwind.config.js`:
- `primary-{50-900}` (blue #2563eb), `secondary-{50-900}` (green), `accent-{50-900}` (orange), `neutral-{50-900}`
- Utility classes: `success` (#10b981), `warning` (#f59e0b), `error` (#ef4444)
- Font: Inter

Mobile responsiveness patterns:
- Tables: Desktop (`hidden md:block`) + Mobile cards (`md:hidden`)
- Stack layouts: `flex flex-col sm:flex-row`

### Testing

Tests live in `src/test/` mirroring the src structure (`stores/`, `components/`, `utils/`).

Setup (`src/test/setup.ts`):
- Global API mock via `src/test/mocks/api.ts` - exports `mockApi` with vi.fn() for get/post/put/delete
- vue-toastification mocked globally
- localStorage mocked and cleared before each test

To mock API responses in tests:
```typescript
import { mockApi } from '../mocks/api'
mockApi.get.mockResolvedValue({ data: { success: true, data: { ... } } })
```

## Reference Documentation

- `API_ENDPOINTS.md` - Full Laravel API endpoint documentation (routes, request/response schemas)
- `DATA_MODEL.md` - Database entities, relationships, and business rules
- `I18N_EXAMPLES.md` - Translation usage examples

## Environment Variables
```
VITE_API_URL=http://localhost:8000/api
```
