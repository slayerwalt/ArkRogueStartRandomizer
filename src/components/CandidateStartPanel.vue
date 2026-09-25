<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type { CandidateStartController } from '../composables/useCandidateStart';
import { CLASS_CN } from '../lib/constants';
import { CANDIDATES_PER_SLOT, START_PROFESSION_SLOTS } from '../lib/candidate-start';
import AppIcon from './AppIcon.vue';
import OperatorPortrait from './OperatorPortrait.vue';
import SquadCard from './SquadCard.vue';

const props = defineProps<{ controller: CandidateStartController; registered: boolean }>();
defineEmits<{ settings: []; chooseSquad: []; confirm: [] }>();
const { professions, squad, squadRandomized, draw, chosen, confirmed, blockReason, canDraw,
  addProfession, removeProfession, clearProfessions, rollCandidates, selectCandidate,
  backToCandidates, editProfessions, rollSquad } = props.controller;
const stageHeading = ref<HTMLElement>();
const announcement = ref('');
const step = computed(() => confirmed.value ? 3 : draw.value ? 2 : 1);
const professionSummary = computed(() => [...new Set(professions.value)]
  .map((id) => `${CLASS_CN[id]} × ${professions.value.filter((item) => item === id).length}`).join(' · '));
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
        <span>{{ i + 1 }}</span>{{ label }}
      </li>
    </ol>
    <h3 ref="stageHeading" tabindex="-1" class="candidate-heading">
      {{ confirmed ? '已确定起手干员' : draw ? '选择 1 名六星干员' : '填写游戏给出的三张券' }}
    </h3>

    <template v-if="!draw">
      <p class="candidate-hint">按券面选择职业，重复职业可多次填写。每张券抽 {{ CANDIDATES_PER_SLOT }} 名六星。</p>
      <div class="profession-options" role="group" aria-label="填写招募券职业">
        <button v-for="(label, id) in CLASS_CN" :key="id" class="profession-option"
          :disabled="professions.length >= START_PROFESSION_SLOTS"
          :aria-label="`填写${label}招募券，已填 ${professions.filter((item) => item === id).length} 张`"
          @click="addProfession(id)">
          <span>{{ label }}<span v-if="professions.includes(id)" class="profession-count">×{{ professions.filter((item) => item === id).length }}</span></span>
        </button>
      </div>
      <div class="profession-slots" aria-label="已填招募券">
        <template v-for="i in START_PROFESSION_SLOTS" :key="i">
          <button v-if="professions[i - 1]" class="profession-slot filled"
            :aria-label="`移除第 ${i} 张招募券：${CLASS_CN[professions[i - 1]]}`" @click="removeProfession(i - 1)">
            {{ CLASS_CN[professions[i - 1]] }}<AppIcon name="close" />
          </button>
          <span v-else class="profession-slot">第 {{ i }} 张券</span>
        </template>
      </div>
      <div class="candidate-setup-actions">
        <span class="candidate-hint" role="status">{{ professions.length === START_PROFESSION_SLOTS ? '已填写 3 张招募券' : `还需填写 ${START_PROFESSION_SLOTS - professions.length} 张招募券` }}</span>
        <button v-if="professions.length" class="text-button" @click="clearProfessions">清空招募券</button>
      </div>
    </template>

    <div v-if="blockReason" class="inline-warning warning-action" role="status">
      <span>{{ blockReason }}</span>
      <button class="text-button" @click="$emit('settings')">调整范围<AppIcon name="chevron" /></button>
    </div>

    <template v-if="draw && !confirmed">
      <p class="candidate-hint">{{ professionSummary }} · 本轮 {{ draw.candidates.length }} 名候选</p>
      <p v-if="draw.shortages.length" class="inline-warning" role="status">候选不足：{{ shortageText }}。本轮按实际人数提供候选。</p>
      <div class="candidate-grid" role="group" aria-label="六星候选干员">
        <button v-for="operator in draw.candidates" :key="operator.id" class="operator-tile"
          :class="{ selected: chosen?.id === operator.id }" :aria-pressed="chosen?.id === operator.id"
          :aria-label="`选择${operator.name}，${CLASS_CN[operator.profession]}，六星`" @click="selectCandidate(operator.id)">
          <OperatorPortrait :operator="operator" :selected="chosen?.id === operator.id" />
        </button>
      </div>
      <div class="candidate-confirm">
        <span role="status">{{ chosen ? `已选：${chosen.name}` : '请选择一名干员' }}</span>
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
      <button :class="['button', draw ? 'secondary' : 'primary']" :disabled="!canDraw" @click="move(rollCandidates)">
        <AppIcon name="shuffle" />{{ draw ? '重新抽取候选' : '抽取六星候选' }}
      </button>
      <button v-if="draw" class="text-button" @click="move(editProfessions)">重新填写招募券</button>
    </div>
    <p class="result-footnote">{{ draw ? '重新抽取或填写招募券会清空本次选择。' : '最多提供 9 名不重复候选，人数不足时按实际数量抽取。' }}调整范围仅影响后续抽取。</p>
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.candidate-hint { color: var(--muted); font-size: 13px; }
.candidate-squad { margin-block: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--line); }
.candidate-steps { display: flex; gap: 16px; list-style: none; margin: 0 0 24px; padding: 0; color: var(--muted); font-size: 12px; }
.candidate-steps li { display: flex; align-items: center; gap: 6px; }
.candidate-steps li > span { display: grid; place-items: center; width: 23px; height: 23px; border-radius: 50%; background: var(--background); }
.candidate-steps .active { color: var(--primary); font-weight: 600; }
.candidate-steps .active > span { background: var(--primary-soft); }
.candidate-heading { font-size: 17px; margin-bottom: 8px; }
.profession-options { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-block: 18px; }
.profession-option { display: grid; place-items: center; min-height: 44px; padding: 12px 4px; border: 1px solid var(--line); border-radius: var(--radius-small); background: var(--surface); }
.profession-option:hover:not(:disabled) { border-color: var(--primary); background: var(--primary-soft); }
.profession-count { margin-left: 4px; color: var(--primary); font-size: 12px; }
.profession-slots { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.profession-slot { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 8px; border: 1px dashed var(--line); border-radius: var(--radius-small); color: var(--muted); font-size: 13px; }
.profession-slot.filled { border-style: solid; border-color: var(--primary); background: var(--primary-soft); color: var(--primary); }
.profession-slot .icon { width: 16px; height: 16px; }
.candidate-setup-actions { display: flex; align-items: center; justify-content: space-between; min-height: 44px; margin-block: 8px; }
.candidate-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-block: 20px; max-width: 480px; margin-inline: auto; }
.candidate-confirm { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 0; border-block: 1px solid var(--line); }
.candidate-confirm > span { min-width: 0; overflow-wrap: anywhere; }
.candidate-confirm .button { flex-shrink: 0; }
.confirmed-start { display: grid; justify-items: center; gap: 8px; margin-top: 20px; }
.candidate-bottom-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-top: 20px; }
.candidate-start .text-button { min-height: 44px; }
@media (max-width: 480px) {
  .candidate-steps { gap: 10px; font-size: 11px; }
  .candidate-steps li { gap: 4px; }
  .candidate-grid { gap: 8px; }
  .candidate-bottom-actions > .button { flex: 1; }
}
</style>
