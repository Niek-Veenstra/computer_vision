import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './AppRoot.vue'
import router from './router'
import './ui/style/App.css'
import 'primeicons/primeicons.css'
import { useTokenStore } from './stores/token'
import { saveThemeService } from './services/save-theme'

document.documentElement.classList.toggle('dark', saveThemeService.getTheme() === 'dark')

const app = createApp(App)

app.use(createPinia())
app.use(router)

const tokenStore = useTokenStore()
tokenStore.loadTokenFromStorage()

app.mount('#app')
