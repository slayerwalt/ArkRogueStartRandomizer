<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import AppIcon from './AppIcon.vue';
defineProps<{ title: string; drawer?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
let previousFocus: HTMLElement | null = null;
let previousOverflow = '';
onMounted(() => {
  previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  dialog.value?.showModal();
});
onBeforeUnmount(() => {
  dialog.value?.close();
  document.body.style.overflow = previousOverflow;
  previousFocus?.focus({ preventScroll: true });
});
function backdrop(event: MouseEvent) {
  if (!dialog.value || event.target !== dialog.value) return;
  const box = dialog.value.getBoundingClientRect();
  if (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  )
    emit('close');
}

/** 原生模态框隔离背景；显式循环避免 Tab 跳到浏览器工具栏。 */
function trapFocus(event: KeyboardEvent) {
  const controls = Array.from(
    dialog.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex="0"]',
    ) ?? [],
  ).filter((element) => element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>
<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      :class="['dialog', { 'dialog-drawer': drawer }]"
      :aria-label="title"
      @cancel.prevent="emit('close')"
      @keydown.esc.capture.prevent="emit('close')"
      @keydown.tab="trapFocus"
      @click="backdrop"
    >
      <header class="dialog-header">
        <div>
          <span class="eyebrow">开局工作台</span>
          <h2>{{ title }}</h2>
        </div>
        <button
          autofocus
          class="icon-button"
          aria-label="关闭面板"
          @click="emit('close')"
        >
          <AppIcon name="close" />
        </button>
      </header>
      <div class="dialog-body"><slot /></div>
      <footer v-if="$slots.footer" class="dialog-footer">
        <slot name="footer" />
      </footer>
    </dialog>
  </Teleport>
</template>
