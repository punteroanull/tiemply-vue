console.log("main.ts - starting application...")

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './assets/main.css'
import { setupOfflineListeners } from './utils/offlineManager'
import { setupPwaUpdates } from "./services/pwaUpdate"
import { vClickOutside } from './directives/clickOutside'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(Toast, {
  transition: "Vue-Toastification__bounce",
  maxToasts: 3,
  newestOnTop: true,
  position: "top-right",
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
  rtl: false
})

// Configurar listeners para modo offline
setupOfflineListeners()

// Registrar el service worker y vigilar si hay una version nueva
setupPwaUpdates()

app.directive('click-outside', vClickOutside)

app.mount('#app')