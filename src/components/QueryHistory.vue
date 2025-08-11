<template>
  <div class="query-history">
    <a-tabs default-active-key="history" :animation="false">
      <a-tab-pane key="history" title="查询历史">
        <div class="history-header">
          <a-input-search
            v-model:model-value="searchKeyword"
            placeholder="搜索历史记录..."
            style="width: 240px"
            @search="handleSearch"
          />
          <a-button @click="clearAllHistory" type="text" status="danger" size="small">
            <template #icon><icon-delete /></template>
            清空历史
          </a-button>
        </div>

        <div class="history-list">
          <div
            v-for="item in filteredHistory"
            :key="item.id"
            class="history-item"
            @click="$emit('select-query', item)"
          >
            <div class="history-item-header">
              <span class="timestamp">
                {{ new Date(item.timestamp).toLocaleString() }}
              </span>
              <div class="actions">
                <a-button @click.stop="addToFavorites(item)" type="text" size="mini">
                  <template #icon><icon-heart /></template>
                </a-button>
                <a-button @click.stop="removeHistory(item.id)" type="text" size="mini" status="danger">
                  <template #icon><icon-delete /></template>
                </a-button>
              </div>
            </div>
            
            <div class="query-content">
              <pre>{{ JSON.stringify(item.query.query, null, 2) }}</pre>
            </div>
            
            <div class="metadata">
              <a-tag size="small">索引: {{ item.query.index }}</a-tag>
              <a-tag v-if="item.executionTime" size="small" color="blue">
                {{ item.executionTime }}ms
              </a-tag>
              <a-tag v-if="item.resultCount !== undefined" size="small" color="green">
                {{ item.resultCount }} 条结果
              </a-tag>
            </div>
          </div>
          
          <a-empty v-if="filteredHistory.length === 0" description="暂无历史记录" />
        </div>
      </a-tab-pane>

      <a-tab-pane key="favorites" title="收藏查询">
        <div class="favorites-list">
          <div
            v-for="item in favorites"
            :key="item.id"
            class="history-item favorite-item"
            @click="$emit('select-query', item)"
          >
            <div class="history-item-header">
              <a-input
                v-if="editingFavorite === item.id"
                v-model:model-value="editingName"
                size="small"
                @blur="saveEditingName(item.id)"
                @keyup.enter="saveEditingName(item.id)"
                @click.stop
              />
              <span v-else class="favorite-name" @dblclick="startEditing(item)">
                {{ item.name || '未命名查询' }}
              </span>
              
              <div class="actions">
                <a-button @click.stop="startEditing(item)" type="text" size="mini">
                  <template #icon><icon-edit /></template>
                </a-button>
                <a-button @click.stop="removeFavorite(item.id)" type="text" size="mini" status="danger">
                  <template #icon><icon-delete /></template>
                </a-button>
              </div>
            </div>
            
            <div class="query-content">
              <pre>{{ JSON.stringify(item.query.query, null, 2) }}</pre>
            </div>
            
            <div class="metadata">
              <a-tag size="small">索引: {{ item.query.index }}</a-tag>
              <a-tag size="small" color="purple">
                {{ new Date(item.timestamp).toLocaleDateString() }}
              </a-tag>
            </div>
          </div>
          
          <a-empty v-if="favorites.length === 0" description="暂无收藏查询" />
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQueryHistoryStore, type QueryHistoryItem } from '../stores/queryHistory'
import { Modal, Message } from '@arco-design/web-vue'
import { IconDelete, IconHeart, IconEdit } from '@arco-design/web-vue/es/icon'

const emit = defineEmits<{
  'select-query': [item: QueryHistoryItem]
}>()

const queryHistoryStore = useQueryHistoryStore()
const searchKeyword = ref('')
const editingFavorite = ref<string | null>(null)
const editingName = ref('')

const filteredHistory = computed(() => {
  if (!searchKeyword.value) {
    return queryHistoryStore.history
  }
  return queryHistoryStore.searchHistory(searchKeyword.value)
})

const favorites = computed(() => queryHistoryStore.favorites)

const handleSearch = () => {
  // 搜索逻辑已在computed中处理
}

const clearAllHistory = () => {
  Modal.confirm({
    title: '确认清空',
    content: '确定要清空所有查询历史吗？此操作无法撤销。',
    onOk: () => {
      queryHistoryStore.clearHistory()
      Message.success('历史记录已清空')
    }
  })
}

const removeHistory = (id: string) => {
  queryHistoryStore.removeHistoryItem(id)
  Message.success('已删除历史记录')
}

const addToFavorites = (item: QueryHistoryItem) => {
  const name = `查询 ${new Date(item.timestamp).toLocaleString()}`
  queryHistoryStore.addToFavorites(item, name)
  Message.success('已添加到收藏')
}

const removeFavorite = (id: string) => {
  queryHistoryStore.removeFromFavorites(id)
  Message.success('已移除收藏')
}

const startEditing = (item: QueryHistoryItem) => {
  editingFavorite.value = item.id
  editingName.value = item.name || ''
}

const saveEditingName = (id: string) => {
  if (editingName.value.trim()) {
    queryHistoryStore.updateFavoriteName(id, editingName.value.trim())
    Message.success('名称已更新')
  }
  editingFavorite.value = null
  editingName.value = ''
}
</script>

<style scoped>
.query-history {
  height: 100%;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.history-list, .favorites-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  margin-bottom: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: var(--color-primary);
  background-color: var(--color-fill-1);
}

.favorite-item {
  border-left: 3px solid var(--color-primary);
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timestamp, .favorite-name {
  font-size: 12px;
  color: var(--color-text-2);
  font-weight: 500;
}

.favorite-name {
  cursor: text;
}

.actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.history-item:hover .actions {
  opacity: 1;
}

.query-content {
  background-color: var(--color-fill-2);
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
  max-height: 120px;
  overflow-y: auto;
}

.query-content pre {
  font-size: 11px;
  line-height: 1.4;
  margin: 0;
  color: var(--color-text-1);
  font-family: 'Monaco', 'Consolas', monospace;
}

.metadata {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
</style>