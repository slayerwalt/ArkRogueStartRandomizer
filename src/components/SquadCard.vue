<script setup lang="ts">
import { computed } from 'vue';
import { squadIcon } from '../lib/themes';
import type { Squad } from '../lib/types';

const props = defineProps<{ squad: Squad }>();
const emit = defineEmits<{ reroll: [] }>();

/** 分队图标随重摇结果变化，需保持响应式 */
const icon = computed(() => squadIcon(props.squad.id));
</script>

<template>
  <div class="card squad-card">
    <div class="card-title">
      <span class="label">分队</span>
      <button class="reroll" aria-label="重摇分队" title="重摇分队" @click="emit('reroll')">↻</button>
    </div>
    <div class="squad-head">
      <img v-if="icon" class="squad-icon" :src="icon" :alt="squad.name" />
      <div class="squad-name">{{ squad.name }}</div>
    </div>
    <div class="squad-desc">{{ squad.desc }}</div>
    <div v-if="squad.unlockCond" class="unlock">游戏内解锁条件：{{ squad.unlockCond }}</div>
  </div>
</template>
