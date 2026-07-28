import { createRouter, createWebHistory } from 'vue-router'
import Home from '../Home.vue';
import Room from '../Room.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Home },
    { path: '/:id', component: Room }
  ],
})

export default router
