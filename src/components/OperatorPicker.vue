<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue';
import { CLASS_CN } from '../lib/constants';
import type { Operator } from '../lib/types';
import AppIcon from './AppIcon.vue';
import OperatorAvatar from './OperatorAvatar.vue';

const props = defineProps<{ operators: readonly Operator[]; compact?: boolean }>();
defineEmits<{ select: [id: string] }>();
const query = shallowRef('');
const profession = shallowRef('');
const search = useTemplateRef<HTMLInputElement>('search');
const filtered = computed(() => props.operators.filter((operator) =>
  operator.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()) &&
  (!profession.value || operator.profession === profession.value)));
defineExpose({ focusSearch: () => search.value?.focus({ preventScroll: true }) });
</script>

<template>
  <div class="operator-picker" :class="{ compact }">
    <div class="filter-row">
      <label class="search-field">
        <AppIcon name="search" />
        <input ref="search" v-model="query" type="search" aria-label="搜索要添加的干员" placeholder="搜索干员名称" />
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
  </div>
</template>

<style scoped>
.compact .filter-row { position: sticky; top: 0; z-index: 1; padding-bottom: 8px; background: var(--surface); }
.compact .registration-grid { margin-top: 4px; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; }
.compact .filter-empty { padding: 16px 8px; }
</style>
