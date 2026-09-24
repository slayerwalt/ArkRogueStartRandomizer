<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CLASS_CN } from '../lib/constants';
import type { SlotResult } from '../lib/types';
import AppIcon from './AppIcon.vue';
import OperatorPortrait from './OperatorPortrait.vue';
const props = defineProps<{
  slot: SlotResult;
  index: number;
  disabled: boolean;
}>();
const emit = defineEmits<{ reroll: []; settings: [] }>();
const content = ref<HTMLElement>();
const ticketLabel = computed(
  () => `${props.slot.slot.classes.map((c) => CLASS_CN[c] ?? c).join(' / ')}招募券${props.slot.slot.rarityCap === null ? '' : `，最高 ${props.slot.slot.rarityCap} 星`}`,
);
watch(
  () => props.slot,
  () => {
    if (
      !content.value ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    content.value.getAnimations().forEach((animation) => animation.cancel());
    content.value.animate(
      [
        { opacity: 0.4, transform: 'translateY(5px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 180, easing: 'ease-out' },
    );
  },
  { flush: 'post' },
);
</script>
<template>
  <article class="recruit-slot" :class="{ empty: !slot.operator }" :aria-label="`第 ${index + 1} 个券位：${ticketLabel}`">
    <button v-if="slot.operator" ref="content" class="operator-tile"
      :disabled="disabled" :title="`${ticketLabel} · 点击重抽`"
      :aria-label="`重抽第 ${index + 1} 个券位，当前为${slot.operator.name}，${slot.operator.rarity}星`"
      @click="emit('reroll')">
      <OperatorPortrait :operator="slot.operator" />
    </button>
    <div v-else ref="content" class="slot-empty">
      <AppIcon name="search" />
      <h3>暂无可选干员</h3>
      <p>当前范围内，没有符合此券位招募条件的干员。</p>
      <button class="text-button" @click="emit('settings')">调整随机范围</button>
      <button class="text-button" :disabled="disabled" @click="emit('reroll')">重抽此券位</button>
    </div>
  </article>
</template>
