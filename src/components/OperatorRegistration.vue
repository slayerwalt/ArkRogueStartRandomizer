<script setup lang="ts">
import type { Operator } from '../lib/types';
import BaseDialog from './BaseDialog.vue';
import OperatorPicker from './OperatorPicker.vue';

defineProps<{ operators: readonly Operator[] }>();
defineEmits<{ close: []; select: [id: string] }>();
</script>

<template>
  <BaseDialog title="手动添加六星干员" @close="$emit('close')">
    <p class="feature-description">添加游戏中的应急助力或想使用的六星干员。加入后，所有后续随机都会排除该干员。</p>
    <OperatorPicker :operators="operators" @select="$emit('select', $event)" />
    <template #footer><button class="button secondary" @click="$emit('close')">取消</button></template>
  </BaseDialog>
</template>
