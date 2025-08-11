import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NodeInfo, NodeStats } from '../types'
import { Api } from '../api'
import { Message } from '@arco-design/web-vue'

export const useNodeStore = defineStore('node', () => {
  const nodesInfo = ref<NodeInfo[]>([])
  const nodesStats = ref<NodeStats[]>([])
  const selectedNodeId = ref<string>('')
  const loading = ref(false)
  const autoRefresh = ref(false)
  const refreshInterval = ref(5000) // 5秒
  let refreshTimer: number | null = null

  // 获取所有节点信息
  const fetchNodesInfo = async (connectionId: string) => {
    if (!connectionId) return

    try {
      loading.value = true
      nodesInfo.value = await Api.getNodesInfo(connectionId)
    } catch (error) {
      console.error('Failed to fetch nodes info:', error)
      Message.error('获取节点信息失败')
    } finally {
      loading.value = false
    }
  }

  // 获取所有节点统计信息
  const fetchNodesStats = async (connectionId: string) => {
    if (!connectionId) return

    try {
      nodesStats.value = await Api.getNodesStats(connectionId)
    } catch (error) {
      console.error('Failed to fetch nodes stats:', error)
      Message.error('获取节点统计信息失败')
    }
  }

  // 获取特定节点信息
  const fetchNodeInfo = async (connectionId: string, nodeId: string) => {
    if (!connectionId || !nodeId) return null

    try {
      return await Api.getNodeInfo(connectionId, nodeId)
    } catch (error) {
      console.error('Failed to fetch node info:', error)
      Message.error('获取节点信息失败')
      return null
    }
  }

  // 获取特定节点统计信息
  const fetchNodeStats = async (connectionId: string, nodeId: string) => {
    if (!connectionId || !nodeId) return null

    try {
      return await Api.getNodeStats(connectionId, nodeId)
    } catch (error) {
      console.error('Failed to fetch node stats:', error)
      Message.error('获取节点统计信息失败')
      return null
    }
  }

  // 刷新所有节点信息和统计
  const refreshAllNodes = async (connectionId: string) => {
    await Promise.all([
      fetchNodesInfo(connectionId),
      fetchNodesStats(connectionId)
    ])
  }

  // 启动自动刷新
  const startAutoRefresh = (connectionId: string) => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }
    
    autoRefresh.value = true
    refreshTimer = setInterval(() => {
      refreshAllNodes(connectionId)
    }, refreshInterval.value) as unknown as number
  }

  // 停止自动刷新
  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    autoRefresh.value = false
  }

  // 格式化字节数
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化时间（毫秒转换为可读格式）
  const formatDuration = (millis: number) => {
    const seconds = Math.floor(millis / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}天 ${hours % 24}小时`
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`
    } else {
      return `${seconds}秒`
    }
  }

  // 获取节点角色的显示文本
  const getNodeRoleText = (roles: string[]) => {
    const roleMap: Record<string, string> = {
      master: '主节点',
      data: '数据节点',
      ingest: '摄取节点',
      ml: '机器学习',
      remote_cluster_client: '远程集群客户端',
      transform: '转换节点'
    }
    
    return roles.map(role => roleMap[role] || role).join(', ')
  }

  // 获取健康状态颜色
  const getHealthStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'green':
        return '#52c41a'
      case 'yellow':
        return '#faad14'
      case 'red':
        return '#f5222d'
      default:
        return '#d9d9d9'
    }
  }

  // 计算节点的性能指标
  const calculateNodeMetrics = (stats: NodeStats) => {
    const metrics = {
      cpuUsage: stats.os?.cpu?.percent || 0,
      memoryUsage: stats.os?.mem?.used_percent || 0,
      heapUsage: stats.jvm?.mem?.heap_used_percent || 0,
      diskUsage: 0,
      searchRate: 0,
      indexingRate: 0
    }

    // 计算磁盘使用率
    if (stats.fs?.total) {
      const total = stats.fs.total.total_in_bytes
      const available = stats.fs.total.available_in_bytes
      metrics.diskUsage = ((total - available) / total) * 100
    }

    return metrics
  }

  return {
    nodesInfo,
    nodesStats,
    selectedNodeId,
    loading,
    autoRefresh,
    refreshInterval,
    fetchNodesInfo,
    fetchNodesStats,
    fetchNodeInfo,
    fetchNodeStats,
    refreshAllNodes,
    startAutoRefresh,
    stopAutoRefresh,
    formatBytes,
    formatDuration,
    getNodeRoleText,
    getHealthStatusColor,
    calculateNodeMetrics
  }
})