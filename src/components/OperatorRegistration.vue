<script setup lang="ts">
import { computed, ref } from 'vue';
import { CLASS_CN } from '../lib/constants';
import type { Operator } from '../lib/types';
import BaseDialog from './BaseDialog.vue';
import AppIcon from './AppIcon.vue';
import OperatorAvatar from './OperatorAvatar.vue';

const props = defineProps<{ operators: readonly Operator[] }>();
defineEmits<{ close: []; select: [id: string] }>();
const query = ref('');
const profession = ref('');
const filtered = computed(() => props.operators.filter((operator) =>
  operator.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()) &&
  (!profession.value || operator.profession === profession.value)));
</script>

<template>
  <BaseDialog title="手动添加六星干员" @close="$emit('close')">
    <p class="feature-description">添加游戏中的应急助力或想使用的六星干员。加入后，所有后续随机都会排除该干员。</p>
    <div class="filter-row">
      <label class="search-field">
        <AppIcon name="search" />
        <input v-model="query" type="search" aria-label="搜索要添加的干员" placeholder="搜索干员名称" />
      </label>
      <select v-model="profession" aria-label="筛选干员职业">
        <option value="">全部职业</option>
        <option v-for="(name, id) in CLASS_CN" :key="id" :value="id">{{ name }}</option>
      </select>
    </div>
    <div v-if="filtered.length" class="operator-grid registration-grid">
      <button v-for="operator in filtered" :key="operator.id" class="operator-option"
        :aria-label="`添加${operator.name}，${operator.rarity}星${CLASS_CN[operator.profession]}`"
        @click="$emit('select', operator.id)">
        <OperatorAvatar :id="operator.id" :name="operator.name" lazy />
        <span class="operator-option-name">{{ operator.name }}</span>
      </button>
    </div>
    <p v-else class="filter-empty">没有符合条件的可添加六星干员。</p>
    <template #footer><button class="button secondary" @click="$emit('close')">取消</button></template>
  </BaseDialog>
</template>
