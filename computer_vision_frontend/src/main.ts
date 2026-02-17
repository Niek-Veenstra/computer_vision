import PrimeVue from 'primevue/config'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style/App.css'
import { Noir } from './style/preset'
import 'primeicons/primeicons.css'
import Tooltip from 'primevue/tooltip'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.directive('tooltip', Tooltip)
app.use(PrimeVue, {
  theme: {
    preset: Noir,
    options: {
      darkModeSelector: false || 'none',
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue',
      },
    },
  },
})

app.mount('#app')
