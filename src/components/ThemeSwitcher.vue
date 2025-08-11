<template>
  <a-dropdown @select="handleThemeChange">
    <a-button type="text" size="small">
      <template #icon>
        <icon-sun v-if="currentTheme === 'light'" />
        <icon-moon v-else-if="currentTheme === 'dark'" />
        <icon-computer v-else />
      </template>
      <span v-if="showText">{{ getThemeText() }}</span>
    </a-button>
    <template #content>
      <a-doption value="light">
        <template #icon><icon-sun /></template>
        浅色主题
      </a-doption>
      <a-doption value="dark">
        <template #icon><icon-moon /></template>
        深色主题
      </a-doption>
      <a-doption value="auto">
        <template #icon><icon-computer /></template>
        跟随系统
      </a-doption>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore, type Theme } from '../stores/theme'
import { IconSun, IconMoon, IconComputer } from '@arco-design/web-vue/es/icon'

interface Props {
  showText?: boolean
}

defineProps<Props>()

const themeStore = useThemeStore()

const currentTheme = computed(() => themeStore.currentTheme)

const getThemeText = () => themeStore.getThemeText()

const handleThemeChange = (theme: string | number | Record<string, any> | undefined) => {
  if (typeof theme === 'string') {
    themeStore.setTheme(theme as Theme)
  }
}
</script>

<style scoped>
.arco-btn {
  border: none !important;
}
</style>