<template>
  <div class="flex flex-col h-full bg-card">
    <div class="flex flex-col p-4 border-b border-border gap-3">
      <div class="flex items-center">
        <h3 class="text-xl font-semibold text-foreground m-0">规则列表</h3>
        <Badge variant="outline" class="ml-2" v-if="config">
          {{ filteredItems.length }} 项
        </Badge>
      </div>
      <div>
        <Input
          v-model="searchQuery"
          placeholder="搜索规则..."
          class="w-full"
        />
      </div>
      <div class="flex justify-end gap-2">
        <Button @click="addNewRule" size="sm">
          <PlusIcon class="h-4 w-4 mr-1" />
          添加规则
        </Button>
        <Button variant="outline" @click="addNewGroup" size="sm">
          <PlusIcon class="h-4 w-4 mr-1" />
          添加分组
        </Button>
      </div>
    </div>

    <div class="p-3 bg-muted" v-if="filterTags && filterTags.length > 0">
      <div class="flex items-center flex-wrap gap-2">
        <div class="text-xs font-medium text-muted-foreground">已筛选:</div>
        <div class="flex flex-wrap gap-1">
          <Badge
            v-for="tag in filterTags"
            :key="tag"
            variant="secondary"
            class="flex items-center gap-1"
          >
            {{ tag }}
            <button
              class="inline-flex items-center justify-center rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-4 w-4"
              @click="removeTagFilter(tag)"
            >
              <span class="sr-only">Remove</span>
              <XIcon class="h-3 w-3" />
            </button>
          </Badge>
        </div>
        <Button variant="ghost" size="sm" class="h-6 text-xs" @click="clearFilters">
          清除全部
        </Button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="loading" class="flex flex-col justify-center items-center h-full gap-4">
        <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <div class="text-primary font-medium">加载中...</div>
      </div>
      <div v-else-if="!config" class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8">
        <FolderIcon class="h-12 w-12 mb-4" />
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">未加载配置</h4>
        <p class="mb-6 text-muted-foreground max-w-md">请点击顶部的"打开配置"按钮加载Espanso配置文件</p>
      </div>
      <div v-else-if="store.getAllMatchesFromTree().length === 0 && store.getAllGroupsFromTree().length === 0" class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8">
        <FileTextIcon class="h-12 w-12 mb-4" />
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">没有规则</h4>
        <p class="mb-6 text-muted-foreground max-w-md">点击"添加规则"按钮创建第一条规则</p>
        <Button @click="addNewRule">添加规则</Button>
      </div>
      <div v-else-if="filteredItems.length === 0" class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8">
        <SearchIcon class="h-12 w-12 mb-4" />
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">未找到匹配项</h4>
        <p class="mb-6 text-muted-foreground max-w-md">尝试使用不同的搜索词或标签过滤器</p>
        <Button variant="outline" @click="clearFilters">清除过滤器</Button>
      </div>
      <div v-else class="flex flex-col gap-3">
        <!-- 这里将来会使用vue-draggable-next实现拖拽排序 -->
        <Card
          v-for="item in filteredItems"
          :key="item.id"
          :class="{ 'border-primary shadow-[0_0_0_1px] shadow-primary': selectedItemId === item.id }"
          class="cursor-pointer transition-all hover:translate-y-[-2px] hover:shadow-md"
          @click="selectItem(item.id)"
        >
          <CardContent class="p-4">
            <div v-if="item.type === 'match'">
              <div class="flex justify-between items-start">
                <span class="font-semibold text-foreground">{{ (item as Match).trigger }}</span>
                <div class="flex flex-wrap gap-1" v-if="(item as Match).tags && (item as Match).tags.length > 0">
                  <Badge
                    v-for="tag in (item as Match).tags"
                    :key="tag"
                    @click.stop="addTagFilter(tag)"
                  >
                    {{ tag }}
                  </Badge>
                </div>
              </div>
              <div class="text-sm text-muted-foreground my-1 whitespace-pre-line">{{ getContentPreview(item as Match) }}</div>
              <div class="flex justify-between text-xs text-muted-foreground mt-1">
                <Badge variant="outline" class="bg-muted">{{ getContentTypeLabel((item as Match).contentType) }}</Badge>
                <span v-if="(item as Match).updatedAt">{{ formatDate((item as Match).updatedAt) }}</span>
              </div>
            </div>
            <div v-else-if="item.type === 'group'">
              <div class="flex justify-between items-start">
                <span class="font-semibold text-foreground">{{ (item as Group).name }}</span>
                <Badge variant="secondary" v-if="(item as Group).matches">{{ (item as Group).matches?.length || 0 }} 项</Badge>
              </div>
              <div class="flex justify-between text-xs text-muted-foreground mt-1">
                <Badge variant="outline" class="bg-muted">分组</Badge>
                <span v-if="(item as Group).updatedAt">{{ formatDate((item as Group).updatedAt) }}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useEspansoStore } from '../../store/useEspansoStore'
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'
import Badge from '@/components/ui/badge.vue'
import Card from '@/components/ui/card.vue'
import CardContent from '@/components/ui/card-content.vue'
import {
  SearchIcon,
  FolderIcon,
  FileTextIcon,
  PlusIcon,
  XIcon,
} from 'lucide-vue-next'
import { nanoid } from 'nanoid'
import { Match, Group } from '../../types/espanso'

const store = useEspansoStore()
const searchQuery = ref('')

// 使用计算属性直接从store获取数据
const config = computed(() => store.state.config)
const selectedItemId = computed(() => store.state.selectedItemId)
const filterTags = computed(() => store.state.selectedTags)
const loading = computed(() => store.state.config === null)

// 过滤和排序项目
const filteredItems = computed(() => {
  if (!config.value) {
    return []
  }

  // 从树结构中获取所有匹配项和分组
  const matches = store.getAllMatchesFromTree ? store.getAllMatchesFromTree() : []
  const groups = store.getAllGroupsFromTree ? store.getAllGroupsFromTree() : []

  // 合并所有项目
  let allItems: (Match | Group)[] = [...matches, ...groups]

  // 先按搜索过滤
  let filtered = allItems
  if (searchQuery.value && searchQuery.value.trim() !== '') {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(item => {
      if (item.type === 'match') {
        const match = item as Match
        return (
          match.trigger?.toLowerCase().includes(query) ||
          match.replace?.toLowerCase().includes(query)
        )
      } else if (item.type === 'group') {
        const group = item as Group
        return group.name?.toLowerCase().includes(query)
      }
      return false
    })
  }

  // 按标签过滤
  if (filterTags.value && filterTags.value.length > 0) {
    filtered = filtered.filter(item => {
      if (item.type === 'match') {
        const match = item as Match
        return match.tags && filterTags.value.every(tag => match.tags.includes(tag))
      }
      return false
    })
  }

  // 按最后更新日期排序（最新的在前面）
  filtered.sort((a, b) => {
    const dateA = a.type === 'match'
      ? (a as Match).updatedAt ? new Date((a as Match).updatedAt).getTime() : 0
      : (a as Group).updatedAt ? new Date((a as Group).updatedAt).getTime() : 0
    const dateB = b.type === 'match'
      ? (b as Match).updatedAt ? new Date((b as Match).updatedAt).getTime() : 0
      : (b as Group).updatedAt ? new Date((b as Group).updatedAt).getTime() : 0
    return dateB - dateA
  })

  return filtered
})

// 内容预览
const getContentPreview = (item: Match) => {
  if (!item || item.type !== 'match') {
    return ''
  }

  if (!item.replace) {
    return ''
  }

  const text = typeof item.replace === 'string'
    ? item.replace
    : JSON.stringify(item.replace)

  return text.length > 100 ? text.substring(0, 100) + '...' : text
}

// 获取内容类型标签
const getContentTypeLabel = (contentType?: string) => {
  if (!contentType) return '纯文本'

  const typeMap: Record<string, string> = {
    'text': '纯文本',
    'html': 'HTML',
    'image': '图片',
    'script': '脚本',
    'keystroke': '按键',
    'form': '表单'
  }

  return typeMap[contentType] || contentType
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 选择项目
const selectItem = (id: string) => {
  store.state.selectedItemId = id
}

// 标签筛选
const addTagFilter = (tag: string) => {
  if (filterTags.value && !filterTags.value.includes(tag)) {
    store.state.selectedTags = [...filterTags.value, tag]
  }
}

const removeTagFilter = (tag: string) => {
  if (filterTags.value) {
    store.state.selectedTags = filterTags.value.filter(t => t !== tag)
  }
}

const clearFilters = () => {
  store.state.selectedTags = []
  searchQuery.value = ''
}

// 添加新规则
const addNewRule = () => {
  if (!config.value) return

  const newMatch: Match = {
    id: nanoid(),
    type: 'match',
    trigger: 'new_trigger',
    replace: '替换内容',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  store.addItem(newMatch)

  // 选择新添加的规则并等待DOM更新后滚动到视图
  nextTick(() => {
    selectItem(newMatch.id)
  })
}

// 添加新分组
const addNewGroup = () => {
  if (!config.value) return

  const newGroup: Group = {
    id: nanoid(),
    type: 'group',
    name: '新分组',
    matches: [],
    groups: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  store.addItem(newGroup)

  // 选择新添加的分组并等待DOM更新后滚动到视图
  nextTick(() => {
    selectItem(newGroup.id)
  })
}
</script>


