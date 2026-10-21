<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue';
import type { Operator } from '../../lib/types';
import OperatorAvatar from '../OperatorAvatar.vue';

const props = defineProps<{ operators: readonly Operator[]; selectedId: string | null }>();
defineEmits<{ inspect: [id: string] }>();
const roster = useTemplateRef<HTMLUListElement>('roster');
watch(() => props.operators.map((operator) => operator.id), async (ids, previous) => {
  const added = [...ids].reverse().find((id) => !previous.includes(id));
  if (!added) return;
  await nextTick();
  const button = Array.from(roster.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    .find((element) => element.dataset.operatorId === added);
  const list = roster.value;
  if (!button || !list) return;
  const itemBox = button.getBoundingClientRect();
  const listBox = list.getBoundingClientRect();
  if (itemBox.right > listBox.right) list.scrollLeft += itemBox.right - listBox.right + 4;
  else if (itemBox.left < listBox.left) list.scrollLeft += itemBox.left - listBox.left - 4;
});
function scroll(event: WheelEvent) {
  const list = roster.value;
  if (!list || event.ctrlKey || list.scrollWidth <= list.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
  event.preventDefault();
  list.scrollLeft += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? list.clientWidth : 1);
}
</script>

<template>
  <ul v-if="operators.length" ref="roster" class="mini-roster" aria-label="已选六星干员" @wheel="scroll">
    <li v-for="operator in operators" :key="operator.id" class="mini-roster-item">
      <button class="mini-portrait" :aria-label="`管理已选干员${operator.name}`" :title="operator.name"
        :aria-pressed="selectedId === operator.id" :data-operator-id="operator.id" @click="$emit('inspect', operator.id)">
        <OperatorAvatar :id="operator.id" :name="operator.name" />
        <span class="mini-name">{{ operator.name }}</span>
      </button>
    </li>
  </ul>
  <div v-else class="mini-empty" aria-hidden="true"></div>
</template>

<style scoped>
.mini-roster { display: flex; flex: 1; align-items: center; gap: 6px; min-width: 0; height: 72px; margin: 0; padding: 4px 2px; overflow-x: auto; overflow-y: hidden; list-style: none; overscroll-behavior-x: contain; scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
.mini-roster-item { flex: 0 0 56px; }
.mini-portrait { position: relative; display: block; width: 56px; height: 56px; padding: 0; overflow: hidden; border: 2px solid var(--r6); border-radius: 8px; cursor: pointer; background: var(--background); }
.mini-portrait:hover, .mini-portrait[aria-pressed='true'] { border-color: var(--primary); }
.mini-portrait :deep(.avatar-frame) { width: 100%; height: 100%; border-radius: 5px; }
.mini-name { position: absolute; inset: auto 0 0; padding: 3px 2px 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 600; line-height: 16px; color: #fff; text-shadow: -1px -1px 0 #000, 0 -1px 0 #000, 1px -1px 0 #000, -1px 0 0 #000, 1px 0 0 #000, -1px 1px 0 #000, 0 1px 0 #000, 1px 1px 0 #000; }
.mini-empty { flex: 1; min-width: 0; }
</style>
