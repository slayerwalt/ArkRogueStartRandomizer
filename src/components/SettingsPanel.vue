<script setup lang="ts">
import { computed, ref } from 'vue';
import { CLASS_CN } from '../lib/constants';
import { applyPreset, detectPreset, type PoolPreset } from '../lib/pool';
import { POOL_RARITIES, type Operator, type RollSettings } from '../lib/types';
import AppIcon from './AppIcon.vue';
import OperatorAvatar from './OperatorAvatar.vue';
const props = defineProps<{
  modelValue: RollSettings;
  operators: Operator[];
}>();
const emit = defineEmits<{ 'update:modelValue': [value: RollSettings] }>();
const rarity = ref<number>(6);
const query = ref('');
const profession = ref('');
const onlySelected = ref(false);
const all = computed(() =>
  props.operators
    .filter((o) => o.rarity === rarity.value)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
);
const selected = computed(
  () => new Set(props.modelValue.pool[rarity.value] ?? []),
);
const preset = computed(() =>
  detectPreset(
    [...selected.value],
    all.value.map((o) => o.id),
  ),
);
const filtered = computed(() =>
  all.value.filter(
    (o) =>
      o.name
        .toLocaleLowerCase()
        .includes(query.value.trim().toLocaleLowerCase()) &&
      (!profession.value || o.profession === profession.value) &&
      (!onlySelected.value || selected.value.has(o.id)),
  ),
);
const groups = computed(() =>
  Object.entries(CLASS_CN)
    .map(([id, name]) => ({
      id,
      name,
      operators: filtered.value.filter((o) => o.profession === id),
    }))
    .filter((group) => group.operators.length > 0),
);
function update(ids: string[]) {
  emit('update:modelValue', {
    pool: { ...props.modelValue.pool, [rarity.value]: ids },
  });
}
function choosePreset(value: Exclude<PoolPreset, 'custom'>) {
  update(
    applyPreset(
      value,
      all.value.map((o) => o.id),
    ),
  );
}
function toggle(id: string) {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  update([...next]);
}
function resetFilters() {
  query.value = '';
  profession.value = '';
  onlySelected.value = false;
}
</script>
<template>
  <div class="rarity-tabs" role="group" aria-label="选择星级">
    <button
      v-for="r in POOL_RARITIES"
      :key="r"
      :aria-pressed="rarity === r"
      :aria-label="`${r} 星，已选 ${modelValue.pool[r]?.length ?? 0} 名`"
      @click="rarity = r"
    >
      {{ r }} 星
      <span>{{ modelValue.pool[r]?.length ?? 0 }}</span>
    </button>
  </div>
  <div class="filter-row">
    <label class="search-field">
      <AppIcon name="search" />
      <input
        v-model="query"
        type="search"
        placeholder="搜索干员名称"
        aria-label="搜索干员名称"
      />
    </label>
    <select v-model="profession" aria-label="筛选职业">
      <option value="">全部职业</option>
      <option v-for="(name, key) in CLASS_CN" :key="key" :value="key">
        {{ name }}
      </option>
    </select>
  </div>
  <div class="selection-toolbar">
    <label class="check-label">
      <input v-model="onlySelected" type="checkbox" />
      仅看已选
    </label>
    <div
      class="preset-actions"
      role="group"
      :aria-label="`${rarity} 星全部干员范围操作`"
    >
      <button :aria-pressed="preset === 'all'" @click="choosePreset('all')">
        全选本星级
      </button>
      <button :aria-pressed="preset === 'none'" @click="choosePreset('none')">
        清空本星级
      </button>
    </div>
  </div>
  <p class="selection-count" role="status">
    {{ rarity }} 星已选 {{ selected.size }} / {{ all.length }} 名 · 当前显示
    {{ filtered.length }} 名
  </p>
  <p v-if="!selected.size" class="inline-warning">
    当前星级范围为空。
  </p>
  <div v-if="filtered.length" class="operator-groups">
    <section
      v-for="group in groups"
      :key="group.id"
      class="operator-group"
      :aria-labelledby="`operator-group-${group.id}`"
    >
      <div class="operator-group-heading">
        <h3 :id="`operator-group-${group.id}`">{{ group.name }}</h3>
        <span>{{ group.operators.length }} 名</span>
      </div>
      <div class="operator-grid">
        <button
          v-for="o in group.operators"
          :key="o.id"
          type="button"
          class="operator-option"
          :aria-pressed="selected.has(o.id)"
          :aria-label="o.name"
          @click="toggle(o.id)"
        >
          <OperatorAvatar :id="o.id" :name="o.name" lazy />
          <span class="operator-option-name">{{ o.name }}</span>
        </button>
      </div>
    </section>
  </div>
  <div v-else class="filter-empty">
    <AppIcon name="search" />
    <p>没有符合筛选条件的干员</p>
    <button class="button secondary" @click="resetFilters">清除筛选条件</button>
  </div>
</template>
