import { createRouter, createWebHistory } from 'vue-router'
import Connections from './views/Connections.vue'
import Dashboard from './views/Dashboard.vue'
import Indices from './views/Indices.vue'
import Search from './views/Search.vue'
import Documents from './views/Documents.vue'
import Templates from './views/Templates.vue'
import Import from './views/Import.vue'

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
    },
    {
      path: '/documents',
      name: 'documents',
      component: Documents
    },
    {
      path: '/templates',
      name: 'templates',
      component: Templates
    },
    {
      path: '/import',
      name: 'import',
      component: Import
    },
    // 重定向已删除的路由到统一的查询页面
    {
      path: '/easy-search',
      redirect: '/search'
    },
    {
      path: '/query-builder',
      redirect: '/search'
    }
  ]
})

export default router