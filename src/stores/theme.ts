import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'auto'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<Theme>('auto')
  const isDark = ref(false)

  // 从 localStorage 加载主题设置
  const loadTheme = () => {
    const saved = localStorage.getItem('es-client-theme')
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      currentTheme.value = saved as Theme
    }
  }

  // 保存主题设置到 localStorage
  const saveTheme = () => {
    localStorage.setItem('es-client-theme', currentTheme.value)
  }

  // 检测系统主题
  const detectSystemTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  // 应用主题
  const applyTheme = (theme: Theme) => {
    let shouldBeDark = false

    switch (theme) {
      case 'light':
        shouldBeDark = false
        break
      case 'dark':
        shouldBeDark = true
        break
      case 'auto':
        shouldBeDark = detectSystemTheme()
        break
    }

    isDark.value = shouldBeDark

    // 更新 DOM
    if (shouldBeDark) {
      document.body.setAttribute('arco-theme', 'dark')
      document.documentElement.classList.add('dark')
    } else {
      document.body.removeAttribute('arco-theme')
      document.documentElement.classList.remove('dark')
    }
  }

  // 切换主题
  const setTheme = (theme: Theme) => {
    currentTheme.value = theme
    applyTheme(theme)
    saveTheme()
  }

  // 切换到下一个主题
  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'auto']
    const currentIndex = themes.indexOf(currentTheme.value)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  // 监听系统主题变化
  const setupSystemThemeListener = () => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      if (currentTheme.value === 'auto') {
        applyTheme('auto')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }

  // 监听主题变化
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme)
  }, { immediate: false })

  // 初始化
  loadTheme()
  applyTheme(currentTheme.value)
  const cleanupSystemListener = setupSystemThemeListener()

  // 获取主题图标
  const getThemeIcon = (theme?: Theme) => {
    const targetTheme = theme || currentTheme.value
    switch (targetTheme) {
      case 'light':
        return 'icon-sun'
      case 'dark':
        return 'icon-moon'
      case 'auto':
        return 'icon-computer'
      default:
        return 'icon-computer'
    }
  }

  // 获取主题文本
  const getThemeText = (theme?: Theme) => {
    const targetTheme = theme || currentTheme.value
    switch (targetTheme) {
      case 'light':
        return '浅色主题'
      case 'dark':
        return '深色主题'
      case 'auto':
        return '跟随系统'
      default:
        return '跟随系统'
    }
  }

  return {
    currentTheme,
    isDark,
    setTheme,
    toggleTheme,
    getThemeIcon,
    getThemeText,
    cleanup: cleanupSystemListener
  }
})