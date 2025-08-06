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
  background: #001529;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  border-bottom: 1px solid #333;
}

.header {
  background: white;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.connection-info {
  color: #666;
  font-size: 14px;
}

.content {
  margin: 24px;
  padding: 24px;
  background: white;
  border-radius: 8px;
  overflow: auto;
}
</style>