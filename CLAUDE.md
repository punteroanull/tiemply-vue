# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tiemply is an employee time management PWA built with Vue 3 + TypeScript + Vite. It handles work hours tracking, absences, overtime, incidents, and department management with geolocation-based check-in/out.

## Commands

```bash
# Development
npm run dev              # Start dev server (Vite)

# Build
npm run build            # TypeScript check + production build
npm run preview          # Preview production build

# Testing
npm run test             # Run Vitest tests
npm run test:ui          # Run tests with UI dashboard
npm run test:coverage    # Generate coverage report
```

## Architecture

### Tech Stack
- **Vue 3.4** with Composition API (`<script setup>`)
- **Pinia** for state management
- **Vue Router** with role-based guards
- **Axios** for API calls (auto snake_case → camelCase conversion)
- **Vue i18n** for EN/ES translations
- **TailwindCSS** for styling
- **Vitest + Vue Test Utils + MSW** for testing

### Directory Structure
```
src/
├── components/    # Reusable UI components
├── views/         # Page components (routed)
├── stores/        # Pinia stores (auth, workStatus, workLogs, absences, etc.)
├── services/      # API client with interceptors
├── i18n/locales/  # Translation files (en.ts, es.ts)
├── utils/         # Helpers (geolocation, offlineManager, caseConverter)
├── types/         # TypeScript interfaces
└── layouts/       # AppLayout, AuthLayout
```

### API Integration
- Backend: Laravel API at `VITE_API_URL` (default: `http://localhost:8000/api`)
- Request interceptor adds Bearer token and Accept-Language header
- Response interceptor converts snake_case to camelCase automatically
- Standard response format: `{ success: boolean, message: string, data: {...} }`

### State Management (Pinia Stores)
- `auth` - User authentication, roles (manager/supervisor/admin)
- `workStatus` - Check-in/out state, geolocation data
- `workLogs` - Daily/weekly/monthly work reports
- `absences` - Absence requests and approvals
- `schedules`, `overtime`, `incidents`, `departments`

### Routing
Routes use meta properties for access control:
- `requiresAuth` - Authenticated users only
- `guest` - Non-authenticated only
- `requiresManager` - Manager or admin role
- `requiresSupervisor` - Supervisor or admin role

### Internationalization
- Translations in `src/i18n/locales/{en,es}.ts`
- Use `const { t } = useI18n()` in components
- Template: `{{ $t('key.subkey') }}`

### Styling
TailwindCSS with custom colors:
- Primary: `primary-{50-900}` (blue #2563eb)
- Secondary: `secondary-{50-900}` (green)
- Accent: `accent-{50-900}` (orange)
- Neutral: `neutral-{50-900}`

## Key Patterns

### Component Structure
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSomeStore } from '@/stores/someStore'

const { t } = useI18n()
const store = useSomeStore()
</script>

<template>
  <!-- Use t() for translations -->
</template>
```

### API Calls in Stores
```typescript
import api from '@/services/api'

async function fetchData() {
  const response = await api.get<ApiResponse<DataType>>('/endpoint')
  return response.data.data // Already converted to camelCase
}
```

### Mobile Responsiveness
- Tables: Desktop table (`hidden md:block`) + Mobile cards (`md:hidden`)
- Horizontal scrolling: `overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0`
- Stack layouts: `flex flex-col sm:flex-row`

## Environment Variables
```
VITE_API_URL=http://localhost:8000/api
```
