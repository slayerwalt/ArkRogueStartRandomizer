<script setup lang="ts">
import type { Operator } from '../lib/types';
import OperatorPortrait from './OperatorPortrait.vue';

defineProps<{ operators: readonly Operator[] }>();
defineEmits<{ remove: [id: string] }>();
</script>

<template>
  <section class="recruited-section" aria-labelledby="recruited-title">
    <h3 id="recruited-title" class="sr-only">已选六星干员</h3>
    <TransitionGroup v-if="operators.length" name="roster" tag="ul" class="recruited-list" aria-label="已选六星干员">
      <li v-for="operator in operators" :key="operator.id" class="operator-tile">
        <OperatorPortrait :operator="operator" compact />
        <button class="text-button remove-selected" :aria-label="`移除已选干员${operator.name}`" @click="$emit('remove', operator.id)">移除</button>
      </li>
    </TransitionGroup>
    <p v-else class="recruited-empty">
      暂无已选六星干员，可手动添加。
    </p>
  </section>
</template>

<style scoped>
.remove-selected { min-height: 44px; width: 100%; justify-content: center; font-size: 12px; }
</style>
