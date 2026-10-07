<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { CandidateStartController } from '../composables/useCandidateStart';
import { CLASS_CN } from '../lib/constants';
import { START_PROFESSION_SLOTS } from '../lib/candidate-start';
import AppIcon from './AppIcon.vue';
import OperatorPortrait from './OperatorPortrait.vue';
import SquadCard from './SquadCard.vue';

const props = defineProps<{ controller: CandidateStartController; registered: boolean }>();
defineEmits<{ settings: []; chooseSquad: []; confirm: [] }>();
const { professions, professionSlot, squad, squadRandomized, draw, chosen, confirmed, blockReason, canDraw,
  fillProfession, selectProfessionSlot, removeProfession, clearProfessions, rollCandidates, selectCandidate,
  backToCandidates, editProfessions, rollSquad } = props.controller;
const stageHeading = ref<HTMLElement>();
const professionButtons = ref<HTMLButtonElement[]>([]);
const professionSlotButtons = ref<HTMLButtonElement[]>([]);
const drawButton = ref<HTMLButtonElement>();
const announcement = ref('');
const drawVersion = ref(0);
watch(draw, () => { drawVersion.value += 1; });
const editingProfession = computed(() => professionSlot.value !== null && professionSlot.value < professions.value.length);
const step = computed(() => confirmed.value ? 3 : draw.value ? 2 : 1);
const professionCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const id of professions.value) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
});
const professionOptions = computed(() => Object.entries(CLASS_CN)
  .map(([id, label]) => ({ id, label, count: professionCounts.value.get(id) ?? 0 })));
const professionSummary = computed(() => [...professionCounts.value]
  .map(([id, count]) => `${CLASS_CN[id]} × ${count}`).join(' · '));
const shortageText = computed(() => draw.value?.shortages
  .map((item) => `${CLASS_CN[item.profession]}需 ${item.requested} 名，可抽 ${item.actual} 名`).join('；'));
async function move(action: () => void) {
  action();
  await nextTick();
  stageHeading.value?.focus();
}
function randomSquad() {
  rollSquad();
  announcement.value = `开局分队：${squad.value?.name}`;
}
async function editProfessionSlot(index: number) {
  selectProfessionSlot(index);
  if (professionSlot.value !== index) return;
  await nextTick();
  professionButtons.value.find((button) => button.value === professions.value[index])?.focus();
}
async function chooseProfession(profession: string) {
  const index = professionSlot.value;
  const replacing = editingProfession.value;
  fillProfession(profession);
  await nextTick();
  if (replacing) {
    professionSlotButtons.value.find((button) => button.value === String(index))?.focus();
  } else if (professions.value.length === START_PROFESSION_SLOTS && canDraw.value) {
    drawButton.value?.focus();
  }
}
async function cancelProfessionEdit() {
  if (!editingProfession.value || professionSlot.value === null) return;
  const index = professionSlot.value;
  selectProfessionSlot(index);
  await nextTick();
  professionSlotButtons.value.find((button) => button.value === String(index))?.focus();
}
</script>

<template>
  <div class="candidate-start">
    <div class="candidate-squad">
      <SquadCard :squad="squad" :disabled="false" :randomized="squadRandomized"
        @choose="$emit('chooseSquad')" @reroll="randomSquad" />
    </div>
    <ol class="candidate-steps" aria-label="开局步骤">
      <li v-for="(label, i) in ['填写招募券', '选择干员', '确认起手']" :key="label"
        :class="{ active: step === i + 1 }" :aria-current="step === i + 1 ? 'step' : undefined">
        <span class="candidate-step-number">{{ i + 1 }}</span><span>{{ label }}</span>
      </li>
    </ol>
    <h3 ref="stageHeading" tabindex="-1" class="candidate-heading">
      {{ confirmed ? '已确定起手干员' : draw ? '六星候选干员' : '开局招募券' }}
    </h3>

    <template v-if="!draw">
      <div class="profession-options" role="group" aria-label="填写招募券职业" @keydown.esc.stop.prevent="cancelProfessionEdit">
        <button v-for="{ id, label, count } in professionOptions" :key="id" ref="professionButtons" :value="id" class="profession-option"
          :class="{ current: editingProfession && professions[professionSlot!] === id }"
          :disabled="professionSlot === null"
          :aria-label="`${editingProfession ? '替换为' : '填写'}${label}招募券，已填 ${count} 张`"
          @click="chooseProfession(id)">
          <span>{{ label }}<span v-if="count" class="profession-count">×{{ count }}</span></span>
        </button>
      </div>
      <div class="profession-slots" role="group" aria-label="已填招募券">
        <template v-for="i in START_PROFESSION_SLOTS" :key="i">
          <div v-if="professions[i - 1]" class="profession-slot filled" :class="{ active: professionSlot === i - 1 }">
            <button ref="professionSlotButtons" :value="i - 1" class="profession-slot-choice" :aria-pressed="professionSlot === i - 1"
              :aria-label="`替换第 ${i} 张招募券：${CLASS_CN[professions[i - 1]]}`" @click="editProfessionSlot(i - 1)">
              {{ CLASS_CN[professions[i - 1]] }}
            </button>
            <button class="profession-slot-remove" :aria-label="`移除第 ${i} 张招募券：${CLASS_CN[professions[i - 1]]}`"
              @click="removeProfession(i - 1)"><AppIcon name="close" /></button>
          </div>
          <span v-else class="profession-slot" :class="{ active: professionSlot === i - 1 }">
            {{ professionSlot === i - 1 ? '待填写' : `第 ${i} 张券` }}
          </span>
        </template>
      </div>
      <div class="candidate-setup-actions">
        <span class="candidate-hint" role="status">{{ editingProfession ? `替换第 ${professionSlot! + 1} 张券` : professions.length === START_PROFESSION_SLOTS ? '已填写 3 张招募券' : `还需填写 ${START_PROFESSION_SLOTS - professions.length} 张招募券` }}</span>
        <button v-if="professions.length" class="text-button" @click="clearProfessions">清空招募券</button>
      </div>
    </template>

    <div v-if="blockReason" class="inline-warning warning-action" role="status">
      <span>{{ blockReason }}</span>
      <button class="text-button" @click="$emit('settings')">调整范围<AppIcon name="chevron" /></button>
    </div>

    <template v-if="draw && !confirmed">
      <p class="candidate-hint candidate-summary"><span>{{ professionSummary }}</span><span>本轮 {{ draw.candidates.length }} 名候选</span></p>
      <p v-if="draw.shortages.length" class="inline-warning" role="status">候选不足：{{ shortageText }}。</p>
      <div :key="drawVersion" class="candidate-grid" role="group" aria-label="六星候选干员">
        <button v-for="(operator, index) in draw.candidates" :key="operator.id" class="operator-tile draw-reveal"
          :style="{ '--reveal-delay': `${index * 24}ms` }"
          :class="{ selected: chosen?.id === operator.id }" :aria-pressed="chosen?.id === operator.id"
          :aria-label="`选择${operator.name}，${CLASS_CN[operator.profession]}，六星`" @click="selectCandidate(operator.id)">
          <OperatorPortrait :operator="operator" :selected="chosen?.id === operator.id" />
        </button>
      </div>
      <div class="candidate-confirm selection-bar" :class="{ 'has-selection': chosen }">
        <span role="status"><template v-if="chosen"><small>已选</small><strong>{{ chosen.name }}</strong></template><template v-else>尚未选择干员</template></span>
        <button class="button primary" :disabled="!chosen" @click="$emit('confirm')">确认起手</button>
      </div>
    </template>

    <div v-if="confirmed && chosen" class="confirmed-start">
      <article class="operator-tile" :aria-label="`起手干员：${chosen.name}，六星`">
        <OperatorPortrait :operator="chosen" />
      </article>
      <button class="button primary" :disabled="registered" @click="$emit('confirm')">
        {{ registered ? '已确认开局' : '确认开局' }}
      </button>
      <button class="text-button" @click="move(backToCandidates)">返回本轮候选</button>
    </div>

    <div class="candidate-bottom-actions">
      <button ref="drawButton" :class="['button', draw ? 'secondary' : 'primary']" :disabled="!canDraw" @click="move(rollCandidates)">
        <AppIcon name="shuffle" />{{ draw ? '重新抽取候选' : '抽取六星候选' }}
      </button>
      <button v-if="draw" class="text-button" @click="move(editProfessions)">重新填写招募券</button>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.candidate-hint { color: var(--muted); font-size: 12px; }
.candidate-summary { display: flex; flex-wrap: wrap; gap: 4px 8px; }
.candidate-summary > span { white-space: nowrap; }
.candidate-squad { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
.candidate-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; list-style: none; margin: 0 0 14px; padding: 0; color: var(--muted); font-size: 12px; }
.candidate-steps li { display: flex; align-items: center; gap: 6px; min-width: 0; padding-bottom: 6px; border-bottom: 2px solid var(--line); }
.candidate-step-number { display: grid; place-items: center; flex: 0 0 22px; width: 22px; height: 22px; border-radius: 50%; background: var(--background); font-variant-numeric: tabular-nums; }
.candidate-steps .active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }
.candidate-steps .active > .candidate-step-number { background: var(--primary-soft); }
.candidate-heading { font-size: 15px; margin-bottom: 6px; }
.profession-options { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-block: 12px; }
.profession-option { display: grid; place-items: center; min-width: 0; min-height: 44px; padding: 8px 4px; border: 1px solid var(--line); border-radius: var(--radius-small); background: var(--surface); font-size: 13px; }
.profession-option > span { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; }
.profession-option:hover:not(:disabled) { border-color: var(--primary); background: var(--primary-soft); }
.profession-option.current { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); }
.profession-count { margin-left: 4px; color: var(--primary); font-size: 12px; }
.profession-slots { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.profession-slot { display: flex; align-items: center; justify-content: center; min-width: 0; min-height: 44px; padding: 8px; border: 1px dashed var(--line); border-radius: var(--radius-small); color: var(--muted); font-size: 13px; transition: border-color 160ms, background 160ms, box-shadow 160ms; }
.profession-slot.filled { padding: 0; border-style: solid; background: var(--primary-soft); color: var(--primary); }
.profession-slot.active { border-color: var(--primary); background: var(--primary-soft); box-shadow: 0 0 0 2px var(--primary-soft); }
.profession-slot-choice,
.profession-slot-remove { appearance: none; border: 0; background: transparent; border-radius: inherit; }
.profession-slot-choice { flex: 1; min-width: 44px; min-height: 44px; padding: 8px 4px; color: inherit; }
.profession-slot-choice:hover { background: var(--surface); }
.profession-slot-remove { display: grid; place-items: center; flex-shrink: 0; width: 44px; min-height: 44px; color: var(--muted); }
.profession-slot-remove:hover { color: var(--ink); background: var(--background); }
.profession-slot .icon { width: 16px; height: 16px; }
.candidate-setup-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 8px; min-height: 44px; margin-block: 4px; }
.candidate-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(72px, 1fr)); gap: 8px; margin: 14px auto; max-width: 540px; }
.candidate-grid .operator-tile { width: 100%; min-height: 88px; scroll-margin-block-end: 104px; }
.candidate-confirm > span { min-width: 0; overflow-wrap: anywhere; }
.candidate-confirm small { margin-right: 8px; color: var(--muted); font-size: 12px; }
.candidate-confirm strong { color: var(--ink); }
.candidate-confirm .button { flex-shrink: 0; }
.confirmed-start { display: grid; justify-items: center; gap: 8px; margin-top: 14px; }
.candidate-bottom-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 12px; }
.candidate-start .text-button { min-height: 44px; }
@media (prefers-reduced-motion: reduce) {
  .profession-slot { transition: none; }
}
@media (max-width: 480px) {
  .candidate-steps { gap: 8px; }
  .candidate-steps li { flex-direction: column; align-items: flex-start; gap: 6px; }
  .candidate-grid { gap: 8px; }
  .candidate-bottom-actions > .button { flex: 1; }
}
@media (max-width: 360px) {
  .profession-slots { grid-template-columns: minmax(0, 1fr); }
  .profession-slot { justify-content: flex-start; padding-inline: 12px; }
  .profession-slot-choice { text-align: left; padding-inline: 12px; }
}
</style>
