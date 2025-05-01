<template>
  <span>
    <template v-if="highlightedText">
      <span v-for="(part, index) in highlightedText" :key="index">
        <span v-if="part.highlight" class="text-red-500 font-medium">{{ part.text }}</span>
        <span v-else>{{ part.text }}</span>
      </span>
    </template>
    <template v-else>
      {{ text }}
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  text: string;
  searchQuery: string;
}>();

// 将文本分割成高亮和非高亮部分
const highlightedText = computed(() => {
  if (!props.text || !props.searchQuery || props.searchQuery.trim() === '') {
    return null;
  }

  const query = props.searchQuery.toLowerCase();
  const textLower = props.text.toLowerCase();
  const parts: { text: string; highlight: boolean }[] = [];
  
  let lastIndex = 0;
  let index = textLower.indexOf(query);
  
  // 如果没有匹配项，返回原始文本
  if (index === -1) {
    return null;
  }
  
  while (index !== -1) {
    // 添加匹配前的文本
    if (index > lastIndex) {
      parts.push({
        text: props.text.substring(lastIndex, index),
        highlight: false
      });
    }
    
    // 添加匹配的文本
    parts.push({
      text: props.text.substring(index, index + query.length),
      highlight: true
    });
    
    // 更新索引
    lastIndex = index + query.length;
    index = textLower.indexOf(query, lastIndex);
  }
  
  // 添加剩余的文本
  if (lastIndex < props.text.length) {
    parts.push({
      text: props.text.substring(lastIndex),
      highlight: false
    });
  }
  
  return parts;
});
</script>
