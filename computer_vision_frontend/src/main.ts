import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './ui/style/App.css'
import 'primeicons/primeicons.css'
import { useTokenStore } from './stores/token'

const app = createApp(App)

app.use(createPinia())
app.use(router)

const tokenStore = useTokenStore()
tokenStore.loadTokenFromStorage()

app.mount('#app')
