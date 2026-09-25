<script setup lang="ts">
import type { Operator } from '../lib/types';
import OperatorPortrait from './OperatorPortrait.vue';

defineProps<{ operators: readonly Operator[]; confirmed: boolean }>();
</script>

<template>
  <section class="recruited-section" aria-labelledby="recruited-title">
    <div class="recruited-heading">
      <h2 id="recruited-title">已招募干员</h2>
      <span>六星 {{ operators.length }} 名</span>
    </div>
    <ul v-if="operators.length" class="recruited-list" aria-label="已招募六星干员">
      <li v-for="operator in operators" :key="operator.id" class="operator-tile">
        <OperatorPortrait :operator="operator" />
      </li>
    </ul>
    <p v-else class="recruited-empty">
      {{ confirmed ? '本次确认的开局没有六星干员。' : '确认开局后，六星干员会显示在这里。' }}
    </p>
  </section>
</template>
