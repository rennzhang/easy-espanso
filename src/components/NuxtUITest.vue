<template>
  <div class="card p-4">
    <div class="card-header">
      <h2 class="text-xl font-bold">UI 组件测试</h2>
    </div>

    <div class="card-body space-y-6">
      <!-- 按钮测试 -->
      <div>
        <h3 class="text-lg font-semibold mb-2">按钮</h3>
        <div class="flex flex-wrap gap-2">
          <button class="btn">默认按钮</button>
          <button class="btn btn-primary">主要按钮</button>
          <button class="btn btn-success">成功按钮</button>
          <button class="btn btn-warning">警告按钮</button>
          <button class="btn btn-danger">危险按钮</button>
          <button class="btn btn-info">信息按钮</button>
        </div>
      </div>

      <!-- 输入框测试 -->
      <div>
        <h3 class="text-lg font-semibold mb-2">输入框</h3>
        <input v-model="inputValue" placeholder="请输入内容" class="input w-full max-w-xs" />
        <p class="mt-2">输入的内容: {{ inputValue }}</p>
      </div>

      <!-- 卡片测试 -->
      <div>
        <h3 class="text-lg font-semibold mb-2">卡片</h3>
        <div class="card max-w-md">
          <div class="card-header">
            <div class="font-bold">卡片标题</div>
          </div>
          <div class="card-body">
            <p>这是一个卡片组件，用于测试组件是否正确渲染。</p>
          </div>
          <div class="card-footer">
            <div class="flex justify-end">
              <button class="btn btn-primary">确认</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 选择器测试 -->
      <div>
        <h3 class="text-lg font-semibold mb-2">选择器</h3>
        <select v-model="selectedOption" class="select w-full max-w-xs">
          <option value="" disabled selected>请选择一个选项</option>
          <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <p class="mt-2">选择的选项: {{ selectedOption }}</p>
      </div>

      <!-- 复选框测试 -->
      <div>
        <h3 class="text-lg font-semibold mb-2">复选框</h3>
        <div class="flex items-center">
          <input type="checkbox" v-model="checked" id="terms" class="checkbox mr-2" />
          <label for="terms">我同意条款和条件</label>
        </div>
        <p class="mt-2">复选框状态: {{ checked ? '已选中' : '未选中' }}</p>
      </div>

      <!-- 徽章测试 -->
      <div>
        <h3 class="text-lg font-semibold mb-2">徽章</h3>
        <div class="flex flex-wrap gap-2">
          <span class="badge">默认</span>
          <span class="badge badge-primary">主要</span>
          <span class="badge badge-success">成功</span>
          <span class="badge badge-warning">警告</span>
          <span class="badge badge-danger">错误</span>
        </div>
      </div>

      <!-- 警告提示测试 -->
      <div>
        <h3 class="text-lg font-semibold mb-2">警告提示</h3>
        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-2">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-blue-700">信息提示: 这是一条信息提示</p>
            </div>
          </div>
        </div>
        <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-2">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-green-700">成功提示: 这是一条成功提示</p>
            </div>
          </div>
        </div>
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-2">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-yellow-700">警告提示: 这是一条警告提示</p>
            </div>
          </div>
        </div>
        <div class="bg-red-50 border-l-4 border-red-400 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">错误提示: 这是一条错误提示</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card-footer">
      <div class="flex justify-end">
        <button class="btn btn-primary">确认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const inputValue = ref('')
const selectedOption = ref(null)
const checked = ref(false)
const options = [
  { label: '选项 1', value: 1 },
  { label: '选项 2', value: 2 },
  { label: '选项 3', value: 3 }
]
</script>
