<script setup lang="ts">
import { computed, ref } from 'vue';
import { COMMON_OPERATORS } from '../lib/common-operators';
import { operatorAvatarUrl } from '../lib/constants';
import { applyPreset, detectPreset, type PoolPreset } from '../lib/pool';
import { POOL_RARITIES, type Operator, type RollSettings } from '../lib/types';

const props = defineProps<{
  modelValue: RollSettings;
  operators: Operator[];
}>();
const emit = defineEmits<{ 'update:modelValue': [value: RollSettings] }>();

/** 头像加载失败的干员 id，失败后降级为纯文字展示 */
const brokenAvatars = ref(new Set<string>());

function onAvatarError(id: string) {
  brokenAvatars.value = new Set(brokenAvatars.value).add(id);
}

/** 干员头像地址；加载失败或资源缺失时返回 undefined，降级为纯文字 */
function avatarUrl(id: string): string | undefined {
  if (brokenAvatars.value.has(id)) return undefined;
  return operatorAvatarUrl(id);
}

function update(patch: Partial<RollSettings>) {
  emit('update:modelValue', { ...props.modelValue, ...patch });
}

/** 各星级的干员列表（按名称排序，用于勾选） */
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

/** 点击「常见」：勾选应用常见名单，取消勾选则清空该星级范围 */
function onCommon(rarity: number, checked: boolean) {
  const all = (operatorsByRarity.value.get(rarity) ?? []).map((o) => o.id);
  const next = checked ? applyPreset('common', all, COMMON_OPERATORS[rarity] ?? []) : [];
  update({ pool: { ...props.modelValue.pool, [rarity]: next } });
}

/** 点击「全选」：勾选应用全部，取消勾选则清空该星级范围 */
function onAll(rarity: number, checked: boolean) {
  const all = (operatorsByRarity.value.get(rarity) ?? []).map((o) => o.id);
  const next = checked ? applyPreset('all', all, COMMON_OPERATORS[rarity] ?? []) : [];
  update({ pool: { ...props.modelValue.pool, [rarity]: next } });
}

function toggleOperator(rarity: number, id: string, checked: boolean) {
  const sel = new Set(selectedOf(rarity));
  if (checked) sel.add(id);
  else sel.delete(id);
  update({ pool: { ...props.modelValue.pool, [rarity]: [...sel] } });
}
</script>

<template>
  <p class="pool-desc">说明：为了防止随机到冷门干员难以开局，内置了一个对常见干员的筛选。</p>
  <div v-for="r in POOL_RARITIES" :key="r" class="rarity-group">
    <div class="rarity-head">
      <span class="rarity-title" :class="`rarity-${r}`">{{ r }}星</span>
      <span class="rarity-count">
        已选 {{ selectedSets.get(r)?.size ?? 0 }}/{{ operatorsByRarity.get(r)?.length ?? 0 }}
      </span>
      <label class="preset-check">
        <input
          type="checkbox"
          :checked="presetOf(r) === 'common'"
          @change="onCommon(r, ($event.target as HTMLInputElement).checked)"
        />
        常见
      </label>
      <label class="preset-check">
        <input
          type="checkbox"
          :checked="presetOf(r) === 'all'"
          @change="onAll(r, ($event.target as HTMLInputElement).checked)"
        />
        全选
      </label>
    </div>
    <div class="operator-grid">
      <label v-for="o in operatorsByRarity.get(r)" :key="o.id" class="operator-item">
        <input
          type="checkbox"
          :checked="selectedSets.get(r)?.has(o.id)"
          @change="toggleOperator(r, o.id, ($event.target as HTMLInputElement).checked)"
        />
        <img
          v-if="avatarUrl(o.id)"
          class="operator-avatar"
          :src="avatarUrl(o.id)"
          :alt="o.name"
          loading="lazy"
          @error="onAvatarError(o.id)"
        />
        <span class="operator-name">{{ o.name }}</span>
      </label>
    </div>
  </div>
  <p class="pool-hint">3 星及以下不受范围限制，始终可以随机到。</p>
</template>
