<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { IN_RUN_TICKETS } from '../lib/in-run';
import { CLASS_CN } from '../lib/constants';
import type { InRunController } from '../composables/useInRunRecruitment';
import OperatorPortrait from './OperatorPortrait.vue';

const props = defineProps<{ controller: InRunController }>();
const { active, draw, candidates, chosen, message,
  drawTicket, selectCandidate, confirmRecruit, discardDraw } = props.controller;
const ticketGroups = ['单职业券', '双职业券', '定向券', '任意券'].map((name) => ({
  name, tickets: IN_RUN_TICKETS.filter((ticket) => ticket.category === name),
}));
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
defineExpose({ focusHeading });
</script>

<template>
  <section id="in-run-panel" class="feature-section" aria-labelledby="in-run-title" tabindex="-1">
    <h2 id="in-run-title" ref="heading" class="feature-title in-run-focus-heading" tabindex="-1">随机抽取干员</h2>
    <p v-if="!active" class="feature-description">当前肉鸽暂未开放随机抽取干员。</p>
    <template v-else>
      <div v-if="message" class="run-feedback">
        <p class="run-status" role="status" aria-live="polite">{{ message }}</p>
      </div>
      <div v-if="draw" class="in-run-draw">
        <div class="feature-subheading in-run-result-heading">
          <h3 ref="candidatesHeading" class="in-run-focus-heading" tabindex="-1">可选结果</h3>
          <span class="current-ticket">{{ draw.ticket.name }}{{ draw.ticket.id === 'any' ? '券' : '招募券' }}</span>
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
        <div v-for="group in ticketGroups" :key="group.name" class="ticket-group">
          <h3>{{ group.name }}</h3>
          <div class="ticket-options" role="group" :aria-label="group.name">
            <button v-for="ticket in group.tickets" :key="ticket.id" class="button secondary"
              :class="{ 'current-ticket-option': draw?.ticket.id === ticket.id }" :aria-pressed="draw?.ticket.id === ticket.id"
              :aria-label="`使用${ticket.name}${ticket.id === 'any' ? '券' : '招募券'}抽取干员`" @click="chooseTicket(ticket.id)">{{ ticket.name }}</button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.in-run-focus-heading { scroll-margin-top: 16px; }
.in-run-draw { container-type: inline-size; }
.in-run-result-heading { justify-content: flex-start; }
.current-ticket { padding: 2px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--background); font-size: 12px; white-space: nowrap; }
.in-run-result-count { margin-left: auto; white-space: nowrap; }
.in-run-ticket-picker.compact { margin-top: 8px; padding: 2px 10px 10px; border: 1px solid var(--line); border-radius: 8px; }
.in-run-ticket-picker.compact .ticket-group { margin-top: 8px; }
.current-ticket-option { border-color: var(--primary); background: var(--primary-soft); }
.in-run-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
.in-run-actions > button { min-height: 44px; justify-content: center; white-space: nowrap; }
.in-run-discard { padding-inline: 12px; color: var(--muted); font-size: 13px; }
.in-run-discard:hover { color: var(--ink); }
.run-feedback { display: flex; align-items: center; gap: 8px; min-height: 36px; margin-top: 8px; padding: 2px 10px; background: var(--primary-soft); border-radius: 8px; }
.run-feedback .run-status { flex: 1; margin: 0; color: var(--ink); overflow-wrap: anywhere; }
@container (max-width: 420px) {
  .in-run-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 760px) {
  .in-run-ticket-picker { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; margin-top: 12px; }
  .in-run-ticket-picker .ticket-group, .in-run-ticket-picker.compact .ticket-group { margin-top: 0; }
  .in-run-ticket-picker .ticket-group:not(:first-child) .ticket-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
