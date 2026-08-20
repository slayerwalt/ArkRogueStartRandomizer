<script setup lang="ts">
import { CLASS_CN } from '../lib/constants';
import type { RecruitGroup, SlotResult } from '../lib/types';

defineProps<{
  group: RecruitGroup;
  slots: SlotResult[];
  withOperators: boolean;
}>();
const emit = defineEmits<{ rerollSlot: [index: number] }>();

function slotLabel(slot: SlotResult['slot']): string {
  const classes = slot.classes.map((c) => CLASS_CN[c] ?? c).join('、');
  return slot.rarityCap !== null ? `${classes}（最高${slot.rarityCap}星）` : classes;
}
</script>

<template>
  <div class="card group-card">
    <div class="card-title"><span class="label">招募组合</span></div>
    <div class="group-name">{{ group.name }}</div>
    <div class="group-desc">{{ group.desc }}</div>
    <div class="slots">
      <div v-for="(s, i) in slots" :key="i" class="slot">
        <div class="slot-class">
          {{ slotLabel(s.slot) }}
          <button
            v-if="withOperators"
            class="reroll"
            aria-label="重摇该券位"
            title="重摇该券位"
            @click="emit('rerollSlot', i)"
          >↻</button>
        </div>
        <template v-if="withOperators">
          <div v-if="s.empty" class="slot-empty">池子已空，请放宽筛选</div>
          <div v-else-if="s.operator" class="slot-operator">
            {{ s.operator.name }}
            <span class="stars">{{ '★'.repeat(s.operator.rarity) }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
