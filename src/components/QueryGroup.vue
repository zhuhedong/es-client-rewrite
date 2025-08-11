<template>
  <div class="query-group" :class="{ 'nested-group': level > 0 }">
    <div class="group-header">
      <a-select 
        :model-value="group.operator" 
        @update:model-value="updateOperator"
        size="small"
        style="width: 100px"
      >
        <a-option value="must">必须</a-option>
        <a-option value="should">应该</a-option>
        <a-option value="must_not">必须不</a-option>
        <a-option value="filter">过滤</a-option>
      </a-select>

      <div class="group-actions">
        <a-button size="small" @click="addCondition" type="outline">
          <template #icon>
            <icon-plus />
          </template>
          条件
        </a-button>
        <a-button size="small" @click="addGroup" type="outline">
          <template #icon>
            <icon-folder-add />
          </template>
          分组
        </a-button>
        <a-button 
          v-if="level > 0 || canRemove" 
          size="small" 
          @click="removeGroup" 
          type="outline" 
          status="danger"
        >
          <template #icon>
            <icon-delete />
          </template>
          删除组
        </a-button>
      </div>
    </div>

    <div class="group-content">
      <!-- 查询条件 -->
      <div v-if="group.conditions.length > 0" class="conditions-section">
        <QueryCondition
          v-for="condition in group.conditions"
          :key="condition.id"
          :condition="condition"
          :fields="fields"
          @update="updateCondition"
          @remove="removeCondition"
        />
      </div>

      <!-- 嵌套查询组 -->
      <div v-if="group.groups.length > 0" class="nested-groups">
        <QueryGroup
          v-for="nestedGroup in group.groups"
          :key="nestedGroup.id"
          :group="nestedGroup"
          :fields="fields"
          :level="level + 1"
          @add-group="$emit('add-group', nestedGroup.id)"
          @add-condition="$emit('add-condition', nestedGroup.id)"
          @remove-group="$emit('remove-group', nestedGroup.id)"
          @remove-condition="$emit('remove-condition', nestedGroup.id, $event)"
          @update-group="$emit('update-group', nestedGroup.id, $event)"
          @update-condition="(conditionId: string, updates: any) => $emit('update-condition', nestedGroup.id, conditionId, updates)"
        />
      </div>

      <!-- 空状态 -->
      <div 
        v-if="group.conditions.length === 0 && group.groups.length === 0" 
        class="empty-group"
      >
        <a-empty description="暂无条件" :image-style="{ height: '60px' }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { QueryGroup as QueryGroupType, FieldInfo } from '../types'
import QueryCondition from './QueryCondition.vue'
import {
  IconPlus,
  IconFolderAdd,
  IconDelete
} from '@arco-design/web-vue/es/icon'

interface Props {
  group: QueryGroupType
  fields: FieldInfo[]
  level: number
}

interface Emits {
  (e: 'add-group', groupId: string): void
  (e: 'add-condition', groupId: string): void
  (e: 'remove-group', groupId: string): void
  (e: 'remove-condition', groupId: string, conditionId: string): void
  (e: 'update-group', groupId: string, updates: any): void
  (e: 'update-condition', groupId: string, conditionId: string, updates: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const canRemove = computed(() => {
  // 根级组如果有多个可以删除，或者有内容的组可以删除
  return props.level === 0 ? false : true
})

const updateOperator = (operator: string) => {
  emit('update-group', props.group.id, { operator })
}

const addCondition = () => {
  emit('add-condition', props.group.id)
}

const addGroup = () => {
  emit('add-group', props.group.id)
}

const removeGroup = () => {
  emit('remove-group', props.group.id)
}

const updateCondition = (conditionId: string, updates: any) => {
  emit('update-condition', props.group.id, conditionId, { id: conditionId, ...updates })
}

const removeCondition = (conditionId: string) => {
  emit('remove-condition', props.group.id, conditionId)
}
</script>

<style scoped>
.query-group {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: white;
  margin-bottom: 1rem;
}

.nested-group {
  margin-left: 1rem;
  border-left: 3px solid var(--primary-color);
  background: var(--gray-50);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--gray-100);
  border-bottom: 1px solid var(--gray-200);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.nested-group .group-header {
  background: var(--primary-color-light);
}

.group-actions {
  display: flex;
  gap: 0.5rem;
}

.group-content {
  padding: 1rem;
}

.conditions-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.nested-groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-group {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-md);
  background: var(--gray-50);
}

:deep(.arco-empty-image) {
  margin-bottom: 0.5rem;
}

:deep(.arco-empty-description) {
  color: var(--gray-500);
  font-size: 0.875rem;
}
</style>