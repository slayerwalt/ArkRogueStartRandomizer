<script setup lang="ts">
import { computed } from 'vue';
import { squadIcon } from '../lib/themes';
import type { Squad } from '../lib/types';
import AppIcon from './AppIcon.vue';
const props = defineProps<{ squad: Squad; disabled: boolean }>();
const emit = defineEmits<{ reroll: [] }>();
const icon = computed(() => squadIcon(props.squad.id));
</script>
<template>
  <section class="context-card squad-card">
    <div class="section-top">
      <span class="eyebrow">开局分队</span>
      <button class="text-button" :disabled="disabled" @click="emit('reroll')">
        <AppIcon name="shuffle" />
        重抽分队
      </button>
    </div>
    <div class="squad-heading">
      <span v-if="icon" class="squad-icon-frame">
        <img :src="icon" alt="" width="48" height="48" />
      </span>
      <h3>{{ squad.name }}</h3>
    </div>
    <p>{{ squad.desc }}</p>
    <details v-if="squad.unlockCond">
      <summary>游戏内解锁条件</summary>
      <p>{{ squad.unlockCond }}</p>
    </details>
  </section>
</template>
