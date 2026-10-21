<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue';
import { DEFAULT_RECRUIT_COUNTS, isRecruitCounts, MAX_RECRUIT_COUNT, type RecruitCounts } from '../lib/recruit-counts';
import BaseDialog from './BaseDialog.vue';

const props = defineProps<{ counts: Readonly<RecruitCounts> }>();
const emit = defineEmits<{ save: [counts: RecruitCounts]; close: [] }>();
const formId = useId();
const six = ref<number | string>(props.counts.six);
const five = ref<number | string>(props.counts.five);
const touched = reactive({ six: false, five: false });
const draft = computed(() => ({ six: six.value, five: five.value }));
const valid = computed(() => isRecruitCounts(draft.value));
function fieldError(value: number | string): string {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_RECRUIT_COUNT
    ? '' : `请输入 0 至 ${MAX_RECRUIT_COUNT} 的整数。`;
}
const sixError = computed(() => fieldError(six.value));
const fiveError = computed(() => fieldError(five.value));
const emptyError = computed(() => six.value === 0 && five.value === 0);
function resetCounts() {
  six.value = DEFAULT_RECRUIT_COUNTS.six;
  five.value = DEFAULT_RECRUIT_COUNTS.five;
  touched.six = false;
  touched.five = false;
}
function save() {
  touched.six = true;
  touched.five = true;
  if (isRecruitCounts(draft.value)) emit('save', { ...draft.value });
}
</script>

<template>
  <BaseDialog title="抽取数量设置" @close="emit('close')">
    <form :id="formId" class="recruit-count-form" novalidate @submit.prevent="save">
      <p class="count-intro">所有招募券共用以下数量，按每次抽取的总人数计算。</p>
      <div class="count-fields">
        <div class="count-field">
          <label :for="`${formId}-six`">六星干员</label>
          <div class="count-input-wrap">
            <input :id="`${formId}-six`" v-model.number="six" name="six" type="number" inputmode="numeric"
              min="0" :max="MAX_RECRUIT_COUNT" step="1" required
              :aria-invalid="touched.six && Boolean(sixError)"
              :aria-describedby="`${formId}-hint ${formId}-six-error`" @blur="touched.six = true" />
            <span aria-hidden="true">名</span>
          </div>
          <p :id="`${formId}-six-error`" class="count-error" aria-live="polite">{{ touched.six ? sixError : '' }}</p>
        </div>
        <div class="count-field">
          <label :for="`${formId}-five`">五星干员</label>
          <div class="count-input-wrap">
            <input :id="`${formId}-five`" v-model.number="five" name="five" type="number" inputmode="numeric"
              min="0" :max="MAX_RECRUIT_COUNT" step="1" required
              :aria-invalid="touched.five && Boolean(fiveError)"
              :aria-describedby="`${formId}-hint ${formId}-five-error`" @blur="touched.five = true" />
            <span aria-hidden="true">名</span>
          </div>
          <p :id="`${formId}-five-error`" class="count-error" aria-live="polite">{{ touched.five ? fiveError : '' }}</p>
        </div>
      </div>
      <p :id="`${formId}-hint`" class="count-hint">每种星级可设为 0–{{ MAX_RECRUIT_COUNT }} 名，0 表示不抽取该星级，合计至少 1 名。</p>
      <p v-if="emptyError" class="count-error" role="alert">六星和五星不能同时为 0。</p>
      <p class="count-note">保存后从下一次抽取生效，并在当前浏览器中记住。仍遵循干员随机范围及已选干员的排除规则，人数不足时按实际可用人数展示。</p>
    </form>
    <template #footer>
      <div class="count-footer">
        <button type="button" class="text-button count-reset" @click="resetCounts">恢复默认</button>
        <div class="count-save-actions">
          <button type="button" class="button secondary" @click="emit('close')">取消</button>
          <button type="submit" :form="formId" class="button primary" :disabled="!valid">保存设置</button>
        </div>
      </div>
    </template>
  </BaseDialog>
</template>

<style scoped>
.recruit-count-form { font-size: 13px; }
.count-intro { color: var(--muted); }
.count-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
.count-field label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
.count-input-wrap { display: flex; align-items: center; gap: 10px; }
.count-input-wrap input { min-width: 0; width: 100%; min-height: 48px; padding: 8px 12px; border: 1px solid var(--line); border-radius: var(--radius-small); color: var(--ink); background: var(--surface); font-size: 18px; font-weight: 600; }
.count-input-wrap input[aria-invalid='true'] { border-color: #b42318; }
.count-input-wrap > span { color: var(--muted); }
.count-hint { margin-top: 16px; color: var(--muted); }
.count-note { margin-top: 16px; padding: 12px; border-radius: var(--radius-small); background: var(--background); color: var(--muted); line-height: 1.7; }
.count-error { color: #b42318; font-size: 12px; margin-top: 6px; }
.count-error:empty { display: none; }
.count-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; width: 100%; }
.count-reset { min-height: 44px; padding-inline: 0; font-size: 13px; }
.count-save-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
@media (max-width: 400px) {
  .count-fields { gap: 12px; }
  .count-input-wrap { gap: 6px; }
  .count-input-wrap input { padding-inline: 8px; }
}
</style>
