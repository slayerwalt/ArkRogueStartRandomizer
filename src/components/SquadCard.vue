<script setup lang="ts">
import type { Squad } from '../lib/types';

defineProps<{ squad: Squad }>();
const emit = defineEmits<{ reroll: [] }>();
</script>

<template>
  <div class="card squad-card">
    <div class="card-title">
      <span class="label">分队</span>
      <button class="reroll" aria-label="重摇分队" title="重摇分队" @click="emit('reroll')">↻</button>
    </div>
    <div class="squad-name">{{ squad.name }}</div>
    <div class="squad-desc">{{ squad.desc }}</div>
    <div v-if="squad.unlockCond" class="unlock">游戏内解锁条件：{{ squad.unlockCond }}</div>
  </div>
</template>
