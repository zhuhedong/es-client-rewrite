<template>
  <div class="app">
    <a-layout class="layout">
      <a-layout-sider 
        :width="250" 
        :collapsed="collapsed"
        :collapsible="true"
        @collapse="onCollapse"
        class="sider"
      >
        <div class="logo">
          <h3 v-if="!collapsed">ES Client</h3>
          <span v-else>ES</span>
        </div>
        
        <a-menu 
          :selected-keys="selectedKeys"
          :default-selected-keys="['connections']"
          mode="inline"
          @menu-item-click="onMenuClick"
        >
          <a-menu-item key="connections">
            <template #icon>
              <icon-link />
            </template>
            连接管理
          </a-menu-item>
          
          <a-menu-item key="dashboard" :disabled="!currentConnection">
            <template #icon>
              <icon-dashboard />
            </template>
            仪表板
          </a-menu-item>
          
          <a-menu-item key="indices" :disabled="!currentConnection">
            <template #icon>
              <icon-list />
            </template>
            索引管理
          </a-menu-item>
          
          <a-menu-item key="search" :disabled="!currentConnection">
            <template #icon>
              <icon-search />
            </template>
            数据查询
          </a-menu-item>
        </a-menu>
      </a-layout-sider>
      
      <a-layout>
        <a-layout-header class="header">
          <div class="header-content">
            <h2>{{ pageTitle }}</h2>
            <div v-if="currentConnection" class="connection-info">
              连接: {{ currentConnection.name }}
            </div>
          </div>
        </a-layout-header>
        
        <a-layout-content class="content">
          <router-view />
        </a-layout-content>
      </a-layout>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from './stores/connection'
import { 
  IconLink, 
  IconDashboard, 
  IconList, 
  IconSearch 
} from '@arco-design/web-vue/es/icon'

const router = useRouter()
const connectionStore = useConnectionStore()

const collapsed = ref(false)
const selectedKeys = ref(['connections'])

const currentConnection = computed(() => connectionStore.currentConnection)

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    connections: '连接管理',
    dashboard: '仪表板',
    indices: '索引管理',
    search: '数据查询'
  }
  return titles[selectedKeys.value[0]] || 'ES Client'
})

const onCollapse = (collapsed: boolean) => {
  collapsed = collapsed
}

const onMenuClick = (key: string) => {
  selectedKeys.value = [key]
  router.push(`/${key}`)
}
</script>

<style scoped>
.app {
  height: 100vh;
}

.layout {
  height: 100%;
}

.sider {
  background: linear-gradient(180deg, var(--gray-900) 0%, var(--gray-800) 100%) !important;
  border-right: 1px solid var(--gray-200) !important;
}

.logo {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  margin: 12px;
  border-radius: var(--radius-lg);
  transition: all 0.3s ease;
}

.logo:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.header {
  background: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(20px) !important;
  border-bottom: 1px solid var(--gray-200) !important;
  padding: 0 2rem;
  box-shadow: var(--shadow-sm) !important;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-content h2 {
  color: var(--gray-800);
  font-weight: 600;
  font-size: 1.375rem;
  margin: 0;
}

.connection-info {
  color: var(--gray-600);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  background: var(--gray-100);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-info::before {
  content: "🔗";
  font-size: 0.75rem;
}

.content {
  margin: 1.5rem;
  padding: 2rem;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  overflow: auto;
  border: 1px solid var(--gray-200);
  transition: all 0.2s ease;
}

.content:hover {
  box-shadow: var(--shadow-md);
}

/* 侧边栏菜单样式重写 */
:deep(.arco-menu-inline) {
  padding: 1rem 0.75rem;
}

:deep(.arco-menu-item) {
  border-radius: var(--radius-lg) !important;
  margin: 0.25rem 0;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
}

:deep(.arco-menu-item:hover) {
  background-color: rgba(255, 255, 255, 0.1) !important;
  transform: translateX(4px);
}

:deep(.arco-menu-item.arco-menu-selected) {
  background-color: rgba(59, 130, 246, 0.2) !important;
  color: #60a5fa !important;
}

:deep(.arco-menu-item.arco-menu-selected::before) {
  display: none !important;
}

:deep(.arco-menu-item-disabled) {
  opacity: 0.5 !important;
}

:deep(.arco-menu-icon) {
  margin-right: 0.75rem !important;
}
</style>