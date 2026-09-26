<script setup lang="ts">
import type { Operator } from '../lib/types';
import OperatorPortrait from './OperatorPortrait.vue';

defineProps<{ operators: readonly Operator[] }>();
</script>

<template>
  <section class="recruited-section" aria-labelledby="recruited-title">
    <div class="recruited-heading">
      <h2 id="recruited-title">已招募干员</h2>
      <span>六星 {{ operators.length }} 名</span>
    </div>
    <TransitionGroup v-if="operators.length" name="roster" tag="ul" class="recruited-list" aria-label="已招募六星干员">
      <li v-for="operator in operators" :key="operator.id" class="operator-tile">
        <OperatorPortrait :operator="operator" />
      </li>
    </TransitionGroup>
    <p v-else class="recruited-empty">
      暂无已招募的六星干员。
    </p>
  </section>
</template>
