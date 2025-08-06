import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ClusterHealth } from '../types'
import { Api } from '../api'
import { Message } from '@arco-design/web-vue'

export const useDashboardStore = defineStore('dashboard', () => {
  const clusterHealth = ref<ClusterHealth | null>(null)
  const loading = ref(false)

  // 获取集群健康状态
  const fetchClusterHealth = async (connectionId: string) => {
    if (!connectionId) return

    try {
      loading.value = true
      clusterHealth.value = await Api.getClusterHealth(connectionId)
    } catch (error) {
      console.error('Failed to fetch cluster health:', error)
      Message.error('获取集群健康状态失败')
    } finally {
      loading.value = false
    }
  }

  return {
    clusterHealth,
    loading,
    fetchClusterHealth
  }
})