<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Operator, RollSettings } from '../lib/types';

const props = defineProps<{
  modelValue: RollSettings;
  operators: Operator[];
}>();
const emit = defineEmits<{ 'update:modelValue': [value: RollSettings] }>();

const open = ref(false);
const keyword = ref('');

function update(patch: Partial<RollSettings>) {
  emit('update:modelValue', { ...props.modelValue, ...patch });
}

const excludeSet = computed(() => new Set(props.modelValue.excludes));
const excludedOperators = computed(() =>
  props.operators.filter((o) => excludeSet.value.has(o.id)),
);
const searchResults = computed(() => {
  const kw = keyword.value.trim();
  if (!kw) return [];
  return props.operators
    .filter((o) => o.name.includes(kw) && !excludeSet.value.has(o.id))
    .slice(0, 10);
});

function addExclude(id: string) {
  update({ excludes: [...props.modelValue.excludes, id] });
  keyword.value = '';
}

function removeExclude(id: string) {
  update({ excludes: props.modelValue.excludes.filter((x) => x !== id) });
}
</script>

<template>
  <section class="settings">
    <button class="settings-toggle" :aria-expanded="open" @click="open = !open">
      ⚙ 随机设置 {{ open ? '▲' : '▼' }}
    </button>
    <div v-if="open" class="settings-body">
      <label class="row">
        <input
          type="checkbox"
          :checked="modelValue.withOperators"
          @change="update({ withOperators: ($event.target as HTMLInputElement).checked })"
        />
        随机具体干员
      </label>
      <div class="row exclude-box">
        <div>排除名单（{{ modelValue.excludes.length }}）：</div>
        <input v-model="keyword" aria-label="搜索干员" placeholder="输入干员名搜索并排除" />
        <ul v-if="searchResults.length" class="search-results">
          <li v-for="o in searchResults" :key="o.id">
            <button @click="addExclude(o.id)">＋ {{ o.name }}（{{ o.rarity }}星）</button>
          </li>
        </ul>
        <div v-if="excludedOperators.length" class="excluded-list">
          <span v-for="o in excludedOperators" :key="o.id" class="excluded-tag">
            {{ o.name }}
            <button :aria-label="`移除 ${o.name}`" @click="removeExclude(o.id)">×</button>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
