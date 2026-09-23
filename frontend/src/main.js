import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import twemoji from './directives/twemoji'

const app = createApp(App)

app.use(router)

app.directive('twemoji', twemoji)

app.mount('#app')
