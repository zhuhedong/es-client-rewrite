import { createRouter, createWebHistory } from 'vue-router'
import Connections from './views/Connections.vue'
import Dashboard from './views/Dashboard.vue'
import Indices from './views/Indices.vue'
import Search from './views/Search.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/connections'
    },
    {
      path: '/connections',
      name: 'connections',
      component: Connections
    },
    {
      path: '/dashboard',
      name: 'dashboard', 
      component: Dashboard
    },
    {
      path: '/indices',
      name: 'indices',
      component: Indices
    },
    {
      path: '/search',
      name: 'search',
      component: Search
    }
  ]
})

export default router