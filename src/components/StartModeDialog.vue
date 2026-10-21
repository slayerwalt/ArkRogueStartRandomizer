<script setup lang="ts">
import { ref } from 'vue';
import type { StartMode } from '../composables/useStartMode';
import AppIcon from './AppIcon.vue';
import BaseDialog from './BaseDialog.vue';

defineProps<{ resetting: boolean; hasConfirmed: boolean }>();
const emit = defineEmits<{ confirm: [mode: StartMode]; close: [] }>();
const selected = ref<StartMode | null>(null);
const options: { id: StartMode; name: string; detail: string }[] = [
  { id: 'candidates', name: '随心所欲开局', detail: '对应游戏的随心所欲开，选择游戏给出的三张券，随机生成干员' },
  { id: 'quick', name: '全随机开局', detail: '分队和开局干员全自动随机生成（考虑希望减免）' },
];
</script>

<template>
  <BaseDialog :title="resetting ? '重置开局方式' : '选择开局方式'" @close="emit('close')">
    <div class="start-mode-options" role="group" aria-label="开局方式">
      <button v-for="option in options" :key="option.id" class="start-mode-option"
        :aria-pressed="selected === option.id" @click="selected = option.id">
        <span><strong>{{ option.name }}</strong><span>{{ option.detail }}</span></span>
        <AppIcon v-if="selected === option.id" name="check" />
      </button>
    </div>
    <p v-if="resetting" class="mode-reset-note">
      将清空当前开局的选择与结果。<template v-if="hasConfirmed">已选干员会保留，后续随机会继续排除。</template>
    </p>
    <template #footer>
      <button class="button secondary" @click="emit('close')">取消</button>
      <button class="button primary" :disabled="!selected" @click="selected && emit('confirm', selected)">
        {{ resetting ? '重置并使用此方式' : '确认开局方式' }}
      </button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.start-mode-options { display: grid; gap: 12px; }
.start-mode-option { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; min-height: 96px; padding: 18px 20px; border: 1px solid var(--line); border-radius: var(--radius-small); background: var(--surface); color: var(--ink); text-align: left; transition: background .15s, border-color .15s; }
.start-mode-option > span { display: grid; gap: 8px; min-width: 0; }
.start-mode-option strong { font-size: 16px; }
.start-mode-option span > span { color: var(--muted); font-size: 13px; font-weight: 400; }
.start-mode-option:hover, .start-mode-option[aria-pressed='true'] { border-color: var(--primary); background: var(--primary-soft); }
.start-mode-option > .icon { flex-shrink: 0; color: var(--primary); }
.mode-reset-note { margin-top: 18px; color: var(--muted); font-size: 13px; }
@media (max-width: 480px) { .start-mode-option { padding: 16px; } }
</style>
