<script setup lang="ts">
import { computed, ref } from 'vue';
import { CLASS_CN } from '../lib/constants';
import type { Operator } from '../lib/types';
import type { RegistrationKind } from '../composables/useInRunRecruitment';
import BaseDialog from './BaseDialog.vue';
import AppIcon from './AppIcon.vue';
import OperatorAvatar from './OperatorAvatar.vue';

const props = defineProps<{ operators: readonly Operator[]; kind: RegistrationKind }>();
defineEmits<{ close: []; select: [id: string] }>();
const titles = { manual: '补录已招募干员', temporary: '登记临时招募', emergency: '登记应急助力' };
const query = ref('');
const profession = ref('');
const filtered = computed(() => props.operators.filter((operator) =>
  operator.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()) &&
  (!profession.value || operator.profession === profession.value)));
</script>

<template>
  <BaseDialog :title="titles[kind]" @close="$emit('close')">
    <p class="settings-intro">
      {{ kind === 'emergency' ? '选择应急助力干员，在列期间不参与随机；用完后可移除。' : '选择已实际招募的干员，登记后不再参与局内随机。有候选时，登记会结束本次招募。' }}
    </p>
    <div class="filter-row">
      <label class="search-field">
        <AppIcon name="search" />
        <input v-model="query" type="search" aria-label="搜索登记干员" placeholder="搜索干员名称" />
      </label>
      <select v-model="profession" aria-label="登记干员职业">
        <option value="">全部职业</option>
        <option v-for="(name, id) in CLASS_CN" :key="id" :value="id">{{ name }}</option>
      </select>
    </div>
    <div v-if="filtered.length" class="operator-grid registration-grid">
      <button v-for="operator in filtered" :key="operator.id" class="operator-option"
        :aria-label="`登记${operator.name}，${operator.rarity}星${CLASS_CN[operator.profession]}`"
        @click="$emit('select', operator.id)">
        <OperatorAvatar :id="operator.id" :name="operator.name" lazy />
        <span class="operator-option-name">{{ operator.name }}</span>
      </button>
    </div>
    <p v-else class="filter-empty">没有符合条件的可登记干员。</p>
    <template #footer><button class="button secondary" @click="$emit('close')">取消</button></template>
  </BaseDialog>
</template>
