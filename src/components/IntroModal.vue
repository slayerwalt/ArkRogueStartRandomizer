<script setup lang="ts">
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="settings-overlay" @click.self="emit('close')">
    <div class="settings-modal intro-modal" role="dialog" aria-modal="true" aria-label="用法介绍">
      <div class="settings-modal-head">
        <span class="settings-modal-title">用法介绍</span>
        <button class="settings-close" aria-label="关闭" @click="emit('close')">×</button>
      </div>
      <div class="settings-modal-body">
        <ul class="intro-list">
          <li>
            <strong>选择肉鸽主题</strong>：页面右上角的下拉框可以选择要随机开局的集成战略主题（目前仅开放「沉沦者的黑流树海」）。
          </li>
          <li>
            <strong>设置干员范围</strong>：页面左上角的「设置」可以调整随机干员范围。默认已勾选常见的开局干员，避免随机到冷门干员难以开局，可按需自行勾选。
          </li>
          <li>
            <strong>开始随机</strong>：点击下方「开始随机」生成开局；分队、招募组合、单个券位都可以单独重摇，不满意就点「重roll！」。
          </li>
        </ul>
        <button class="roll-button intro-ok" @click="emit('close')">知道了</button>
      </div>
    </div>
  </div>
</template>
