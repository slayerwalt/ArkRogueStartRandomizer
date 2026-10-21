<script setup lang="ts">
import type { InRunController } from '../../composables/useInRunRecruitment';
import { usePictureInPicture } from '../../composables/usePictureInPicture';
import AppIcon from '../AppIcon.vue';
import BaseDialog from '../BaseDialog.vue';
import MiniWindowPanel from './MiniWindowPanel.vue';

defineProps<{ controller: InRunController }>();
const { desktop, pipWindow, target, opening, error, isOpen, open, close, resize } = usePictureInPicture();
</script>

<template>
  <button v-if="desktop" class="button secondary mini-mode-button" :aria-pressed="isOpen" :disabled="opening"
    :title="isOpen ? '关闭小窗，当前名单和结果会保留' : '将已选干员显示在置顶小窗中'" @click="isOpen ? close() : open()">
    <AppIcon name="pip" />{{ opening ? '打开中' : isOpen ? '关闭小窗' : '小窗模式' }}
  </button>
  <Teleport v-if="target && pipWindow" :to="target">
    <MiniWindowPanel :controller="controller" :pip-window="pipWindow" @resize="resize" />
  </Teleport>
  <BaseDialog v-if="error" title="小窗暂时无法打开" @close="error = ''">
    <p>{{ error }}</p>
    <template #footer><button class="button primary" @click="error = ''">知道了</button></template>
  </BaseDialog>
</template>

<style scoped>
.mini-mode-button { flex-shrink: 0; min-height: 44px; gap: 4px; padding: 8px; font-size: 12px; white-space: nowrap; }
.mini-mode-button .icon { width: 15px; height: 15px; }
.mini-mode-button[aria-pressed='true'] { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); }
</style>
