<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { IN_RUN_TICKETS } from '../lib/in-run';
import { CLASS_CN } from '../lib/constants';
import { RECRUIT_TICKET_IMAGES } from '../lib/recruit-ticket-images';
import type { InRunController } from '../composables/useInRunRecruitment';
import AppIcon from './AppIcon.vue';
import OperatorPortrait from './OperatorPortrait.vue';
import RecruitCountSettingsDialog from './RecruitCountSettingsDialog.vue';
import type { RecruitCounts } from '../lib/recruit-counts';

const props = defineProps<{ controller: InRunController }>();
const { active, draw, candidates, chosen, message,
  drawTicket, selectCandidate, confirmRecruit, discardDraw } = props.controller;
const { counts, storageNotice, updateCounts } = props.controller.countSettings;
const countSettingsOpen = ref(false);
const heading = ref<HTMLHeadingElement>();
const candidatesHeading = ref<HTMLHeadingElement>();
const ticketPickerOpen = ref(false);
const drawVersion = ref(0);
watch(draw, () => { drawVersion.value += 1; }, { flush: 'sync' });
function focusHeading() {
  heading.value?.focus();
}
async function chooseTicket(id: string) {
  if (!drawTicket(id)) return;
  ticketPickerOpen.value = false;
  await nextTick();
  candidatesHeading.value?.focus();
}
async function confirmSelected() {
  if (!confirmRecruit()) return;
  ticketPickerOpen.value = false;
  await nextTick();
  focusHeading();
}
async function discardCurrentDraw() {
  discardDraw();
  await nextTick();
  focusHeading();
}
function saveCounts(next: RecruitCounts) {
  if (updateCounts(next)) countSettingsOpen.value = false;
}
defineExpose({ focusHeading });
</script>

<template>
  <section id="in-run-panel" class="feature-section" aria-labelledby="in-run-title" tabindex="-1">
    <div class="in-run-heading">
      <h2 id="in-run-title" ref="heading" class="feature-title in-run-focus-heading" tabindex="-1">随机抽取干员</h2>
      <button v-if="active" class="button secondary count-settings-button" aria-haspopup="dialog" @click="countSettingsOpen = true">
        <AppIcon name="sliders" />数量设置
      </button>
    </div>
    <p v-if="!active" class="feature-description">当前肉鸽暂未开放随机抽取干员。</p>
    <template v-else>
      <p class="feature-description count-summary">{{ draw ? '下次抽取' : '抽取数量' }}：六星 {{ counts.six }} 名 · 五星 {{ counts.five }} 名</p>
      <p v-if="storageNotice" class="feature-description" role="status">{{ storageNotice }}</p>
      <div v-if="message" class="run-feedback">
        <p class="run-status" role="status" aria-live="polite">{{ message }}</p>
      </div>
      <div v-if="draw" class="in-run-draw">
        <div class="feature-subheading in-run-result-heading">
          <h3 ref="candidatesHeading" class="in-run-focus-heading" tabindex="-1">可选结果</h3>
          <span class="current-ticket">{{ draw.ticket.name }}招募券</span>
          <span class="in-run-result-count">{{ candidates.length }} 名干员</span>
        </div>
        <p v-if="candidates.length < draw.expectedCount" class="inline-warning" role="status">
          {{ candidates.length ? `可选干员不足：当前 ${candidates.length} / ${draw.expectedCount} 名。` : '当前招募券暂无可抽取干员。' }}
        </p>
        <div :key="drawVersion" class="in-run-candidates draw-reveal" role="group" aria-label="可选结果">
          <button v-for="operator in candidates" :key="operator.id" class="operator-tile"
            :class="{ selected: chosen?.id === operator.id }" :aria-pressed="chosen?.id === operator.id"
            :aria-label="`选择${operator.name}，${operator.rarity}星${CLASS_CN[operator.profession]}`" @click="selectCandidate(operator.id)">
            <OperatorPortrait :operator="operator" :selected="chosen?.id === operator.id" />
          </button>
        </div>
        <div class="in-run-actions" role="group" aria-label="干员抽取操作">
          <button class="button secondary" :aria-expanded="ticketPickerOpen" aria-controls="in-run-tickets"
            @click="ticketPickerOpen = !ticketPickerOpen">{{ ticketPickerOpen ? '收起招募券' : '更换招募券' }}</button>
          <button class="button secondary" @click="chooseTicket(draw.ticket.id)">重新抽取</button>
          <button class="button primary" :disabled="!chosen" @click="confirmSelected">确认招募</button>
          <button class="text-button in-run-discard" @click="discardCurrentDraw">放弃本次</button>
        </div>
      </div>
      <div id="in-run-tickets" v-show="!draw || ticketPickerOpen" class="in-run-ticket-picker" :class="{ compact: draw }">
        <div class="recruit-ticket-options" role="group" aria-label="选择招募券">
          <button v-for="ticket in IN_RUN_TICKETS" :key="ticket.id" class="recruit-ticket-option" type="button"
            :class="{ 'current-ticket-option': draw?.ticket.id === ticket.id }" :aria-pressed="draw?.ticket.id === ticket.id"
            :aria-label="`使用${ticket.name}招募券抽取干员`" @click="chooseTicket(ticket.id)">
            <img :src="RECRUIT_TICKET_IMAGES[ticket.id]" alt="" width="138" height="178" loading="lazy" decoding="async" class="recruit-ticket-image" />
            <span class="recruit-ticket-name">{{ ticket.name }}</span>
            <span v-if="draw?.ticket.id === ticket.id" class="recruit-ticket-check"><AppIcon name="check" /></span>
          </button>
        </div>
      </div>
    </template>
    <RecruitCountSettingsDialog v-if="active && countSettingsOpen" :counts="counts" @save="saveCounts" @close="countSettingsOpen = false" />
  </section>
</template>

<style scoped>
.in-run-focus-heading { scroll-margin-top: 16px; }
.in-run-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.in-run-heading .count-settings-button { min-height: 44px; padding: 8px 10px; white-space: nowrap; }
.count-settings-button .icon { width: 16px; height: 16px; }
.count-summary { margin-top: 4px; }
.in-run-draw { container-type: inline-size; }
.in-run-result-heading { justify-content: flex-start; }
.current-ticket { padding: 2px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--background); font-size: 12px; white-space: nowrap; }
.in-run-result-count { margin-left: auto; white-space: nowrap; }
.in-run-ticket-picker { container: recruit-tickets / inline-size; margin-top: 12px; }
.in-run-ticket-picker.compact { margin-top: 8px; padding: 10px; border: 1px solid var(--line); border-radius: 8px; }
.recruit-ticket-options { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.recruit-ticket-option { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-width: 0; min-height: 104px; padding: 8px 4px; border: 1px solid var(--line); border-radius: var(--radius-small); background: var(--surface); color: var(--ink); cursor: pointer; transition: border-color 120ms ease, background-color 120ms ease; }
.recruit-ticket-option:hover { border-color: var(--primary); background: var(--primary-soft); }
.recruit-ticket-option.current-ticket-option { border-color: var(--primary); background: var(--primary-soft); box-shadow: inset 0 0 0 1px var(--primary); }
.recruit-ticket-image { display: block; width: 54px; max-width: 100%; height: 70px; object-fit: contain; }
.recruit-ticket-name { font-size: 13px; line-height: 20px; white-space: nowrap; }
.current-ticket-option .recruit-ticket-name { font-weight: 600; }
.recruit-ticket-check { position: absolute; top: 4px; right: 4px; display: grid; place-items: center; width: 18px; height: 18px; border: 2px solid var(--surface); border-radius: 50%; background: var(--primary); color: #fff; }
.recruit-ticket-check .icon { width: 12px; height: 12px; }
.in-run-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
.in-run-actions > button { min-height: 44px; justify-content: center; white-space: nowrap; }
.in-run-discard { padding-inline: 12px; color: var(--muted); font-size: 13px; }
.in-run-discard:hover { color: var(--ink); }
.run-feedback { display: flex; align-items: center; gap: 8px; min-height: 36px; margin-top: 8px; padding: 2px 10px; background: var(--primary-soft); border-radius: 8px; }
.run-feedback .run-status { flex: 1; margin: 0; color: var(--ink); overflow-wrap: anywhere; }
@container (max-width: 420px) {
  .in-run-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container recruit-tickets (min-width: 400px) {
  .recruit-ticket-options { grid-template-columns: repeat(6, minmax(0, 1fr)); }
}
@container recruit-tickets (min-width: 560px) {
  .recruit-ticket-options { grid-template-columns: repeat(8, minmax(0, 1fr)); }
}
</style>
