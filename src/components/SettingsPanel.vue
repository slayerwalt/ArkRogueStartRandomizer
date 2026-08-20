<script setup lang="ts">
import { computed, ref } from 'vue';
import { COMMON_OPERATORS } from '../lib/common-operators';
import { applyPreset, detectPreset, type PoolPreset } from '../lib/pool';
import { POOL_RARITIES, type Operator, type RollSettings } from '../lib/types';

const props = defineProps<{
  modelValue: RollSettings;
  operators: Operator[];
}>();
const emit = defineEmits<{ 'update:modelValue': [value: RollSettings] }>();

const open = ref(false);
/** 当前展开「调整」的星级；null 表示全部收起 */
const tuning = ref<number | null>(null);

function update(patch: Partial<RollSettings>) {
  emit('update:modelValue', { ...props.modelValue, ...patch });
}

/** 各星级的干员列表（按名称排序，用于微调勾选） */
const operatorsByRarity = computed(() => {
  const map = new Map<number, Operator[]>();
  for (const r of POOL_RARITIES) {
    map.set(
      r,
      props.operators
        .filter((o) => o.rarity === r)
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
    );
  }
  return map;
});

const selectedSets = computed(() => {
  const map = new Map<number, Set<string>>();
  for (const r of POOL_RARITIES) map.set(r, new Set(props.modelValue.pool[r] ?? []));
  return map;
});

function selectedOf(rarity: number): string[] {
  return props.modelValue.pool[rarity] ?? [];
}

function presetOf(rarity: number): PoolPreset {
  const all = (operatorsByRarity.value.get(rarity) ?? []).map((o) => o.id);
  return detectPreset(selectedOf(rarity), all, COMMON_OPERATORS[rarity] ?? []);
}

function onPreset(rarity: number, value: string) {
  if (value === 'custom') return;
  const all = (operatorsByRarity.value.get(rarity) ?? []).map((o) => o.id);
  const next = applyPreset(value as Exclude<PoolPreset, 'custom'>, all, COMMON_OPERATORS[rarity] ?? []);
  update({ pool: { ...props.modelValue.pool, [rarity]: next } });
}

function toggleOperator(rarity: number, id: string, checked: boolean) {
  const sel = new Set(selectedOf(rarity));
  if (checked) sel.add(id);
  else sel.delete(id);
  update({ pool: { ...props.modelValue.pool, [rarity]: [...sel] } });
}

const PRESET_LABELS: { value: string; label: string }[] = [
  { value: 'all', label: '全选' },
  { value: 'common', label: '常见' },
  { value: 'none', label: '全不选' },
];
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
      <div class="pool-section">
        <div class="pool-title">随机干员范围（4/5/6 星）：</div>
        <div v-for="r in POOL_RARITIES" :key="r">
          <div class="row pool-row">
            <span class="pool-label">{{ r }}星</span>
            <select
              class="pool-select"
              :value="presetOf(r)"
              :aria-label="`${r}星随机范围`"
              @change="onPreset(r, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="p in PRESET_LABELS" :key="p.value" :value="p.value">{{ p.label }}</option>
              <option v-if="presetOf(r) === 'custom'" value="custom" disabled>自定义</option>
            </select>
            <span class="pool-count">
              已选 {{ selectedSets.get(r)?.size ?? 0 }}/{{ operatorsByRarity.get(r)?.length ?? 0 }}
            </span>
            <button class="pool-tune" @click="tuning = tuning === r ? null : r">
              {{ tuning === r ? '收起' : '调整' }}
            </button>
          </div>
          <div v-if="tuning === r" class="tune-box">
            <label v-for="o in operatorsByRarity.get(r)" :key="o.id" class="tune-item">
              <input
                type="checkbox"
                :checked="selectedSets.get(r)?.has(o.id)"
                @change="toggleOperator(r, o.id, ($event.target as HTMLInputElement).checked)"
              />
              {{ o.name }}
            </label>
          </div>
        </div>
        <div class="pool-hint">3 星及以下不受范围限制，始终可以随机到。</div>
      </div>
    </div>
  </section>
</template>
