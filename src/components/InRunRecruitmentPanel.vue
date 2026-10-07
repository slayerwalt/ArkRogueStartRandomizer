<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { IN_RUN_TICKETS } from '../lib/in-run';
import { CLASS_CN } from '../lib/constants';
import type { InRunController, RegistrationKind, RecruitSource } from '../composables/useInRunRecruitment';
import AppIcon from './AppIcon.vue';
import OperatorPortrait from './OperatorPortrait.vue';
import OperatorRegistration from './OperatorRegistration.vue';

const props = defineProps<{ controller: InRunController }>();
const { active, members, emergency, draw, candidates, chosen, message, canUndoRemoval,
  drawTicket, selectCandidate, confirmRecruit, removeMember, removeEmergency, undoRemoval, discardDraw } = props.controller;
const ticketGroups = ['单职业券', '双职业券', '定向券', '任意券'].map((name) => ({
  name, tickets: IN_RUN_TICKETS.filter((ticket) => ticket.category === name),
}));
const registrationKind = ref<RegistrationKind | null>(null);
const heading = ref<HTMLHeadingElement>();
const candidatesHeading = ref<HTMLHeadingElement>();
const emergencyHeading = ref<HTMLHeadingElement>();
const managementSummary = ref<HTMLElement>();
const undoButton = ref<HTMLButtonElement>();
const feedbackAtList = ref(false);
let removalKind: 'member' | 'emergency' = 'member';
let undoing = false;
const ticketPickerOpen = ref(false);
const drawVersion = ref(0);
const registrationOperators = computed(() => registrationKind.value ? props.controller.registrationOptions(registrationKind.value) : []);
const sourceNames: Record<RecruitSource, string> = { start: '开局', random: '局内', manual: '补录', temporary: '临时' };
watch(draw, () => { drawVersion.value += 1; }, { flush: 'sync' });
watch(canUndoRemoval, (available) => {
  if (!available && !undoing && undoButton.value?.matches(':focus')) nextTick(focusHeading);
});
function focusHeading() {
  heading.value?.focus();
}
async function chooseTicket(id: string) {
  if (!drawTicket(id)) return;
  feedbackAtList.value = false;
  ticketPickerOpen.value = false;
  await nextTick();
  candidatesHeading.value?.focus();
}
async function confirmSelected() {
  if (!confirmRecruit()) return;
  feedbackAtList.value = false;
  ticketPickerOpen.value = false;
  await nextTick();
  focusHeading();
}
async function removeRecord(id: string, kind: 'member' | 'emergency') {
  if (kind === 'member') removeMember(id);
  else removeEmergency(id);
  if (!canUndoRemoval.value) return;
  removalKind = kind;
  feedbackAtList.value = true;
  await nextTick();
  undoButton.value?.focus();
}
async function undoLastRemoval() {
  undoing = true;
  const restored = undoRemoval();
  await nextTick();
  if (restored) {
    const target = removalKind === 'emergency' ? emergencyHeading.value : managementSummary.value;
    (target ?? heading.value)?.focus();
  }
  undoing = false;
}
async function discardCurrentDraw() {
  discardDraw();
  feedbackAtList.value = false;
  await nextTick();
  focusHeading();
}
function register(id: string) {
  if (registrationKind.value && props.controller.register(id, registrationKind.value)) {
    registrationKind.value = null;
    feedbackAtList.value = false;
  }
}
defineExpose({ focusHeading });
</script>

<template>
  <section id="in-run-panel" class="feature-section" aria-labelledby="in-run-title" tabindex="-1">
    <h2 id="in-run-title" ref="heading" class="feature-title in-run-focus-heading" tabindex="-1">局内随机干员</h2>
    <p v-if="!active" class="feature-description">确认开局后可使用。</p>
    <template v-else>
      <div v-if="message && !feedbackAtList" class="run-feedback">
        <p class="run-status" role="status" aria-live="polite">{{ message }}</p>
      </div>
      <div v-if="draw" class="in-run-toolbar">
        <span class="current-ticket">{{ draw.ticket.name }}</span>
        <button class="button secondary" :aria-expanded="ticketPickerOpen" aria-controls="in-run-tickets"
          @click="ticketPickerOpen = !ticketPickerOpen">{{ ticketPickerOpen ? '收起券型' : '更换券型' }}</button>
      </div>
      <div id="in-run-tickets" v-show="!draw || ticketPickerOpen" class="in-run-ticket-picker" :class="{ compact: draw }">
        <div v-for="group in ticketGroups" :key="group.name" class="ticket-group">
          <h3>{{ group.name }}</h3>
          <div class="ticket-options" role="group" :aria-label="group.name">
            <button v-for="ticket in group.tickets" :key="ticket.id" class="button secondary"
              :class="{ 'current-ticket-option': draw?.ticket.id === ticket.id }" :aria-pressed="draw?.ticket.id === ticket.id"
              :aria-label="`抽取${ticket.name}${ticket.id === 'any' ? '' : '招募券'}候选`" @click="chooseTicket(ticket.id)">{{ ticket.name }}</button>
          </div>
        </div>
      </div>
      <div v-if="draw" class="in-run-draw">
        <div class="feature-subheading">
          <h3 ref="candidatesHeading" class="in-run-focus-heading" tabindex="-1">招募候选</h3>
          <span>{{ candidates.length }} 名候选</span>
        </div>
        <p v-if="candidates.length < draw.expectedCount" class="inline-warning" role="status">
          {{ candidates.length ? `候选不足：当前 ${candidates.length} / ${draw.expectedCount} 名。` : '当前券型暂无可抽取干员。' }}
        </p>
        <div :key="drawVersion" class="in-run-candidates draw-reveal" role="group" aria-label="局内招募候选">
          <button v-for="operator in candidates" :key="operator.id" class="operator-tile"
            :class="{ selected: chosen?.id === operator.id }" :aria-pressed="chosen?.id === operator.id"
            :aria-label="`选择${operator.name}，${operator.rarity}星${CLASS_CN[operator.profession]}`" @click="selectCandidate(operator.id)">
            <OperatorPortrait :operator="operator" :selected="chosen?.id === operator.id" />
          </button>
        </div>
        <div class="selection-bar">
          <p>{{ chosen ? `已选：${chosen.name}` : '尚未选择干员' }}</p>
          <button class="button primary" :disabled="!chosen" @click="confirmSelected">确认招募</button>
        </div>
        <div class="feature-actions">
          <button class="button secondary" @click="chooseTicket(draw.ticket.id)">重新抽取</button>
          <button class="text-button" @click="discardCurrentDraw">放弃本次</button>
        </div>
      </div>
      <div class="run-registration">
        <div class="feature-actions">
          <button class="button secondary" aria-haspopup="dialog" @click="registrationKind = 'manual'">补录干员</button>
          <button class="button secondary" aria-haspopup="dialog" @click="registrationKind = 'temporary'">临时招募</button>
          <button class="button secondary" aria-haspopup="dialog" @click="registrationKind = 'emergency'">应急助力</button>
        </div>
      </div>
      <div v-if="emergency.length" class="run-emergency">
        <h3 ref="emergencyHeading" class="in-run-focus-heading" tabindex="-1">应急助力</h3>
        <ul class="run-member-list" aria-label="应急助力名单">
          <li v-for="operator in emergency" :key="operator.id" class="run-member">
            <span>{{ operator.name }}</span>
            <button class="text-button" :aria-label="`移除应急助力${operator.name}`" @click="removeRecord(operator.id, 'emergency')"><AppIcon name="close" /></button>
          </li>
        </ul>
      </div>
      <details class="run-management">
        <summary ref="managementSummary">本局招募名单管理</summary>
        <ul v-if="members.length" class="run-member-list" aria-label="本局已招募名单">
          <li v-for="member in members" :key="member.operator.id" class="run-member">
            <span>{{ member.operator.name }}<small>{{ sourceNames[member.source] }}</small></span>
            <button class="text-button" :aria-label="`移除招募记录${member.operator.name}`" @click="removeRecord(member.operator.id, 'member')"><AppIcon name="close" /></button>
          </li>
        </ul>
        <p v-else class="feature-note">本局暂无招募记录。</p>
      </details>
      <div v-if="message && feedbackAtList" class="run-feedback">
        <p class="run-status" role="status" aria-live="polite">{{ message }}</p>
        <button v-if="canUndoRemoval" ref="undoButton" class="text-button" @click="undoLastRemoval">撤销</button>
      </div>
    </template>
  </section>
  <OperatorRegistration v-if="registrationKind && active" :kind="registrationKind" :operators="registrationOperators"
    @select="register" @close="registrationKind = null" />
</template>

<style scoped>
.in-run-focus-heading { scroll-margin-top: 16px; }
.in-run-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; }
.current-ticket { font-size: 13px; font-weight: 600; }
.in-run-toolbar .button { flex-shrink: 0; white-space: nowrap; }
.in-run-ticket-picker.compact { margin-top: 8px; padding: 2px 10px 10px; border: 1px solid var(--line); border-radius: 8px; }
.in-run-ticket-picker.compact .ticket-group { margin-top: 8px; }
.current-ticket-option { border-color: var(--primary); background: var(--primary-soft); }
.in-run-draw > .feature-actions { margin-top: 8px; }
.run-feedback { display: flex; align-items: center; gap: 8px; min-height: 36px; margin-top: 8px; padding: 2px 10px; background: var(--primary-soft); border-radius: 8px; }
.run-feedback .run-status { flex: 1; margin: 0; color: var(--ink); overflow-wrap: anywhere; }
.run-feedback .text-button { flex-shrink: 0; min-height: 44px; }
@media (min-width: 760px) {
  .in-run-ticket-picker { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; margin-top: 12px; }
  .in-run-ticket-picker .ticket-group, .in-run-ticket-picker.compact .ticket-group { margin-top: 0; }
  .in-run-ticket-picker .ticket-group:not(:first-child) .ticket-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
