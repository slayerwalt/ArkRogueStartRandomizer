<script setup lang="ts">
import { ref, watch } from 'vue';
import { CLASS_CN } from '../lib/constants';
import type { SlotResult } from '../lib/types';
import AppIcon from './AppIcon.vue';
import OperatorAvatar from './OperatorAvatar.vue';
const props = defineProps<{
  slot: SlotResult;
  index: number;
  disabled: boolean;
}>();
const emit = defineEmits<{ reroll: []; settings: [] }>();
const content = ref<HTMLElement>();
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
  <article class="recruit-card" :class="`rarity-${slot.operator?.rarity ?? 0}`">
    <header class="recruit-header">
      <span class="ticket-number">0{{ index + 1 }}</span>
      <span>
        {{ slot.slot.classes.map((c) => CLASS_CN[c] ?? c).join(' / ') }}券
        <span v-if="slot.slot.rarityCap !== null" class="cap-label">
          最高 {{ slot.slot.rarityCap }} 星
        </span>
      </span>
    </header>
    <div ref="content" class="recruit-content">
      <template v-if="slot.operator">
        <OperatorAvatar :id="slot.operator.id" :name="slot.operator.name" />
        <div class="operator-details">
          <span class="rarity-text">{{ slot.operator.rarity }} 星干员</span>
          <h3>{{ slot.operator.name }}</h3>
          <span class="profession-label">
            {{ CLASS_CN[slot.operator.profession] ?? slot.operator.profession }}
          </span>
        </div>
        <div class="operator-cost">
          <span>招募消耗</span>
          <strong>
            {{ slot.hopeCost }}
            <small>希望</small>
          </strong>
        </div>
      </template>
      <div v-else class="slot-empty">
        <AppIcon name="search" />
        <h3>暂无可选干员</h3>
        <p>当前范围与希望预算下，没有符合此券位的干员。</p>
        <button class="text-button" @click="emit('settings')">
          调整随机范围
        </button>
      </div>
    </div>
    <button
      class="slot-reroll"
      :disabled="disabled"
      :aria-label="`重抽第 ${index + 1} 个券位`"
      @click="emit('reroll')"
    >
      <AppIcon name="shuffle" />
      重抽此券
    </button>
  </article>
</template>
