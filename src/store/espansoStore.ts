import { reactive } from 'vue'
import { Match, Group } from '../types/espanso'
import { EspansoConfig } from '../types/espanso-config'
import { fileService } from '../services/fileService'

interface EspansoState {
  config: EspansoConfig | null
  configPath: string | null
  selectedItemId: string | null
  selectedTags: string[]
  isLoading: boolean
  error: string | null
}

// 创建初始状态
const state = reactive<EspansoState>({
  config: null,
  configPath: null,
  selectedItemId: null,
  selectedTags: [],
  isLoading: false,
  error: null
})

// 创建 espanso store
export function useEspansoStore() {
  // 加载配置文件
  const loadConfig = async (filePath: string) => {
    try {
      state.isLoading = true
      state.error = null
      state.configPath = filePath
      
      const config = await fileService.readYamlFile(filePath)
      if (!config) {
        throw new Error('无法加载配置文件')
      }
      
      // 确保配置有必要的属性
      if (!config.matches) config.matches = []
      if (!config.groups) config.groups = []
      
      state.config = config
    } catch (error) {
      state.error = error instanceof Error ? error.message : '加载配置时出错'
      console.error('加载配置错误:', error)
    } finally {
      state.isLoading = false
    }
  }

  // 保存配置文件
  const saveConfig = async () => {
    if (!state.config || !state.configPath) {
      state.error = '没有加载配置或未指定配置路径'
      return false
    }

    try {
      state.isLoading = true
      state.error = null
      
      await fileService.writeYamlFile(state.configPath, state.config)
      return true
    } catch (error) {
      state.error = error instanceof Error ? error.message : '保存配置时出错'
      console.error('保存配置错误:', error)
      return false
    } finally {
      state.isLoading = false
    }
  }

  // 添加新项目（匹配项或分组）
  const addItem = (item: Match | Group) => {
    if (!state.config) return

    if (item.type === 'match') {
      if (!state.config.matches) {
        state.config.matches = []
      }
      state.config.matches.push(item as Match)
    } else if (item.type === 'group') {
      if (!state.config.groups) {
        state.config.groups = []
      }
      state.config.groups.push(item as Group)
    }

    state.selectedItemId = item.id
    saveConfig()
  }

  // 更新项目
  const updateItem = (item: Match | Group) => {
    if (!state.config) return false

    if (item.type === 'match') {
      const index = state.config.matches?.findIndex((m: Match) => m.id === item.id) ?? -1
      if (index > -1 && state.config.matches) {
        state.config.matches[index] = {...item as Match, updatedAt: new Date().toISOString()}
        saveConfig()
        return true
      }
    } else if (item.type === 'group') {
      const index = state.config.groups?.findIndex((g: Group) => g.id === item.id) ?? -1
      if (index > -1 && state.config.groups) {
        state.config.groups[index] = {...item as Group, updatedAt: new Date().toISOString()}
        saveConfig()
        return true
      }
    }

    return false
  }

  // 删除项目
  const deleteItem = (id: string) => {
    if (!state.config) return false

    // 查找并删除匹配项
    const matchIndex = state.config.matches?.findIndex((m: Match) => m.id === id) ?? -1
    if (matchIndex > -1 && state.config.matches) {
      state.config.matches.splice(matchIndex, 1)
      if (state.selectedItemId === id) {
        state.selectedItemId = null
      }
      saveConfig()
      return true
    }

    // 查找并删除分组
    const groupIndex = state.config.groups?.findIndex((g: Group) => g.id === id) ?? -1
    if (groupIndex > -1 && state.config.groups) {
      state.config.groups.splice(groupIndex, 1)
      if (state.selectedItemId === id) {
        state.selectedItemId = null
      }
      saveConfig()
      return true
    }

    return false
  }

  // 获取指定ID的项目
  const getItemById = (id: string | null): Match | Group | null => {
    if (!id || !state.config) return null

    // 查找匹配项
    const match = state.config.matches?.find((m: Match) => m.id === id)
    if (match) return match

    // 查找分组
    const group = state.config.groups?.find((g: Group) => g.id === id)
    if (group) return group

    return null
  }

  // 在分组中添加匹配项
  const addMatchToGroup = (matchId: string, groupId: string) => {
    if (!state.config) return false

    const match = state.config.matches?.find((m: Match) => m.id === matchId)
    const groupIndex = state.config.groups?.findIndex((g: Group) => g.id === groupId) ?? -1

    if (match && groupIndex > -1 && state.config.groups) {
      const group = state.config.groups[groupIndex]
      if (!group.matches) {
        group.matches = []
      }
      
      // 确保没有重复添加
      if (!group.matches.includes(matchId)) {
        group.matches.push(matchId)
        group.updatedAt = new Date().toISOString()
        saveConfig()
        return true
      }
    }

    return false
  }

  // 从分组中移除匹配项
  const removeMatchFromGroup = (matchId: string, groupId: string) => {
    if (!state.config) return false

    const groupIndex = state.config.groups?.findIndex((g: Group) => g.id === groupId) ?? -1
    if (groupIndex > -1 && state.config.groups) {
      const group = state.config.groups[groupIndex]
      if (group.matches) {
        const matchIndex = group.matches.indexOf(matchId)
        if (matchIndex > -1) {
          group.matches.splice(matchIndex, 1)
          group.updatedAt = new Date().toISOString()
          saveConfig()
          return true
        }
      }
    }

    return false
  }

  return {
    state,
    loadConfig,
    saveConfig,
    addItem,
    updateItem,
    deleteItem,
    getItemById,
    addMatchToGroup,
    removeMatchFromGroup
  }
}

// 创建全局单例
export const espansoStore = useEspansoStore() 