<script setup lang="ts">
import { ref } from 'vue';
import { CLASS_CN, operatorAvatarUrl } from '../lib/constants';
import type { RecruitGroup, SlotResult } from '../lib/types';

defineProps<{
  group: RecruitGroup;
  slots: SlotResult[];
}>();
const emit = defineEmits<{ rerollSlot: [index: number]; rerollGroup: [] }>();

/** 头像加载失败的干员 id，失败后降级为纯文字展示 */
const brokenAvatars = ref(new Set<string>());

function onAvatarError(id: string) {
  brokenAvatars.value = new Set(brokenAvatars.value).add(id);
}

/** 干员头像地址；加载失败或资源缺失时返回 undefined，降级为纯文字 */
function avatarUrl(id: string): string | undefined {
  if (brokenAvatars.value.has(id)) return undefined;
  return operatorAvatarUrl(id);
}

function slotLabel(slot: SlotResult['slot']): string {
  const classes = slot.classes.map((c) => CLASS_CN[c] ?? c).join('、');
  return slot.rarityCap !== null ? `${classes}（最高${slot.rarityCap}星）` : classes;
}
</script>

<template>
  <div class="card group-card">
    <div class="card-title">
      <span class="label">招募组合</span>
      <button class="reroll" aria-label="重摇招募组合" title="重摇招募组合" @click="emit('rerollGroup')">↻</button>
    </div>
    <div class="group-name">{{ group.name }}</div>
    <div class="group-desc">{{ group.desc }}</div>
    <div class="slots">
      <div v-for="(s, i) in slots" :key="i" class="slot">
        <div class="slot-class">
          {{ slotLabel(s.slot) }}
          <button
            class="reroll"
            aria-label="重摇该券位"
            title="重摇该券位"
            @click="emit('rerollSlot', i)"
          >↻</button>
        </div>
        <div v-if="s.empty" class="slot-empty">无可选干员，请调整范围</div>
        <div v-else-if="s.operator" class="slot-operator" :class="`rarity-${s.operator.rarity}`">
          <img
            v-if="avatarUrl(s.operator.id)"
            class="slot-avatar"
            :src="avatarUrl(s.operator.id)"
            :alt="s.operator.name"
            loading="lazy"
            @error="onAvatarError(s.operator.id)"
          />
          <span class="slot-name">{{ s.operator.name }}</span>
          <span class="stars">{{ '★'.repeat(s.operator.rarity) }}</span>
          <span class="hope">{{ s.hopeCost }}希望</span>
        </div>
      </div>
    </div>
  </div>
</template>
