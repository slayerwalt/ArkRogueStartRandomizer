<script setup lang="ts">
import { computed } from 'vue';
import { squadIcon } from '../lib/themes';
import type { Squad } from '../lib/types';
const props = defineProps<{ squad: Squad | null; disabled: boolean; randomized: boolean }>();
const emit = defineEmits<{ reroll: []; choose: [] }>();
const icon = computed(() => props.squad ? squadIcon(props.squad.id) : undefined);
</script>
<template>
  <section class="context-card squad-card" aria-label="开局分队">
    <div class="context-main">
      <span class="eyebrow">开局分队</span>
      <div v-if="squad" class="squad-heading">
        <span v-if="icon" class="squad-icon-frame">
          <img :src="icon" alt="" width="24" height="24" />
        </span>
        <h3>{{ squad.name }}</h3>
      </div>
      <p v-else>尚未选择分队</p>
    </div>
    <div class="context-actions">
      <button class="button secondary" :disabled="disabled" aria-haspopup="dialog" @click="emit('choose')">
        选择分队
      </button>
      <button class="button secondary" :disabled="disabled" @click="emit('reroll')">
        {{ randomized ? '重新随机' : '随机分队' }}
      </button>
    </div>
  </section>
</template>
