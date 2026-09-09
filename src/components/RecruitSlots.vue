<script setup lang="ts">
import type { SlotResult } from '../lib/types';
import RecruitSlotCard from './RecruitSlotCard.vue';
defineProps<{ slots: SlotResult[]; disabled: boolean }>();
const emit = defineEmits<{ rerollSlot: [index: number]; settings: [] }>();
</script>
<template>
  <div class="recruit-grid">
    <RecruitSlotCard
      v-for="(slot, i) in slots"
      :key="i"
      :slot="slot"
      :index="i"
      :disabled="disabled"
      @reroll="emit('rerollSlot', i)"
      @settings="emit('settings')"
    />
  </div>
</template>
