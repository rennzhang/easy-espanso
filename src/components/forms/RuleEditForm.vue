<template>
  <form @submit.prevent="onSubmit" class="rule-form">
    <div class="form-group">
      <label for="trigger">触发词</label>
      <input 
        id="trigger" 
        v-model="formState.trigger" 
        type="text" 
        placeholder="例如: :hello"
        required
      />
    </div>
    
    <div class="form-group">
      <label for="contentType">内容类型</label>
      <select id="contentType" v-model="currentContentType">
        <option value="plain">纯文本</option>
        <option value="rich">富文本</option>
        <option value="html">HTML</option>
        <option value="script">脚本</option>
        <option value="image">图片</option>
        <option value="form">表单</option>
        <option value="clipboard">剪贴板</option>
        <option value="shell">Shell命令</option>
        <option value="key">按键序列</option>
      </select>
    </div>
    
    <div class="form-group">
      <label for="content">内容</label>
      <textarea 
        id="content" 
        v-model="formState.content" 
        rows="5" 
        placeholder="替换内容"
        required
      ></textarea>
    </div>
    
    <div class="form-group">
      <label for="caseSensitive">区分大小写</label>
      <input 
        id="caseSensitive" 
        v-model="formState.caseSensitive" 
        type="checkbox"
      />
    </div>
    
    <div class="form-group">
      <label for="word">整词匹配</label>
      <input 
        id="word" 
        v-model="formState.word" 
        type="checkbox"
      />
    </div>
    
    <div class="form-actions">
      <button type="submit" class="btn-primary">保存</button>
      <button type="button" class="btn-secondary" @click="onCancel">取消</button>
      <button type="button" class="btn-danger" @click="onDelete">删除</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { EspansoRule } from '../../types/espanzo-config';

// 定义props
const props = defineProps<{
  rule: EspansoRule
}>();

// 定义事件
const emit = defineEmits<{
  save: [id: string, updatedRule: Partial<EspansoRule>]
  cancel: []
  delete: [id: string]
}>();

// 表单状态
const formState = ref<Partial<EspansoRule>>({});
const currentContentType = ref<string>('plain');

// 初始化表单
onMounted(() => {
  // 深拷贝props.rule到formState
  formState.value = JSON.parse(JSON.stringify(props.rule));
  currentContentType.value = props.rule.contentType;
});

// 监听props变化
watch(() => props.rule, (newRule) => {
  formState.value = JSON.parse(JSON.stringify(newRule));
  currentContentType.value = newRule.contentType;
}, { deep: true });

// 监听内容类型变化
watch(currentContentType, (newType) => {
  formState.value.contentType = newType;
});

// 提交表单
const onSubmit = () => {
  emit('save', props.rule.id, formState.value);
};

// 取消编辑
const onCancel = () => {
  emit('cancel');
};

// 删除规则
const onDelete = () => {
  if (confirm('确定要删除这个规则吗？')) {
    emit('delete', props.rule.id);
  }
};
</script>

<style>
.rule-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
}

.form-group input[type="text"],
.form-group select,
.form-group textarea {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

.form-group input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.btn-secondary {
  background-color: #9ca3af;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
</style>
