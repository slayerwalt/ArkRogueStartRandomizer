<script setup lang="ts">
import { computed, ref } from 'vue';
import { IN_RUN_TICKETS } from '../lib/in-run';
import { CLASS_CN } from '../lib/constants';
import type { InRunController, RegistrationKind, RecruitSource } from '../composables/useInRunRecruitment';
import AppIcon from './AppIcon.vue';
import OperatorPortrait from './OperatorPortrait.vue';
import OperatorRegistration from './OperatorRegistration.vue';

const props = defineProps<{ controller: InRunController }>();
const { active, members, emergency, draw, candidates, chosen, message,
  drawTicket, selectCandidate, confirmRecruit, removeMember, removeEmergency, discardDraw } = props.controller;
const ticketGroups = ['单职业券', '双职业券', '定向券', '任意券'].map((name) => ({
  name, tickets: IN_RUN_TICKETS.filter((ticket) => ticket.category === name),
}));
const registrationKind = ref<RegistrationKind | null>(null);
const registrationOperators = computed(() => registrationKind.value ? props.controller.registrationOptions(registrationKind.value) : []);
const sourceNames: Record<RecruitSource, string> = { start: '开局', random: '局内', manual: '补录', temporary: '临时' };
function register(id: string) {
  if (registrationKind.value && props.controller.register(id, registrationKind.value)) registrationKind.value = null;
}
</script>

<template>
  <section class="feature-section" aria-labelledby="in-run-title">
    <h2 id="in-run-title" class="feature-title">局内随机干员</h2>
    <p v-if="!active" class="feature-description">确认开局后，可按实际获得的招募券抽取局内候选。</p>
    <template v-else>
      <p class="feature-description">按招募券抽取候选，再确认一名干员。已招募和应急助力自动排除，是否招募由你根据当前希望判断。</p>
      <template v-if="!draw">
        <div v-for="group in ticketGroups" :key="group.name" class="ticket-group">
          <h3>{{ group.name }}</h3>
          <div class="ticket-options" role="group" :aria-label="group.name">
            <button v-for="ticket in group.tickets" :key="ticket.id" class="button secondary"
              :aria-label="`抽取${ticket.name}${ticket.id === 'any' ? '' : '招募券'}候选`" @click="drawTicket(ticket.id)">{{ ticket.name }}</button>
          </div>
        </div>
      </template>
      <div v-else class="in-run-draw">
        <div class="feature-subheading">
          <h3>{{ draw.ticket.name }}{{ draw.ticket.id === 'any' ? '候选' : '招募候选' }}</h3>
          <span>{{ candidates.length }} 名候选</span>
        </div>
        <p v-if="candidates.length < draw.expectedCount" class="inline-warning" role="status">
          {{ candidates.length ? `候选不足：应有 ${draw.expectedCount} 名，当前提供 ${candidates.length} 名；不跨职业或星级补齐。` : '当前券型没有可抽取干员，可核对随机范围和本局名单，或更换招募券。' }}
        </p>
        <div class="in-run-candidates" role="group" aria-label="局内招募候选">
          <button v-for="operator in candidates" :key="operator.id" class="operator-tile"
            :class="{ selected: chosen?.id === operator.id }" :aria-pressed="chosen?.id === operator.id"
            :aria-label="`选择${operator.name}，${operator.rarity}星${CLASS_CN[operator.profession]}`" @click="selectCandidate(operator.id)">
            <OperatorPortrait :operator="operator" :selected="chosen?.id === operator.id" />
          </button>
        </div>
        <p class="selection-count">{{ chosen ? `已选：${chosen.name}` : '选择一名干员，或放弃本次招募。' }}</p>
        <div class="feature-actions">
          <button class="button primary" :disabled="!chosen" @click="confirmRecruit">确认招募</button>
          <button class="button secondary" @click="drawTicket(draw.ticket.id)">重新抽取</button>
          <button class="text-button" @click="discardDraw">放弃本次</button>
        </div>
      </div>
      <div class="run-registration">
        <div class="feature-actions">
          <button class="button secondary" aria-haspopup="dialog" @click="registrationKind = 'manual'">补录干员</button>
          <button class="button secondary" aria-haspopup="dialog" @click="registrationKind = 'temporary'">临时招募</button>
          <button class="button secondary" aria-haspopup="dialog" @click="registrationKind = 'emergency'">应急助力</button>
        </div>
        <p class="feature-note">自行搭配的开局干员可在此补录。临时招募加入本局名单，应急助力在列期间排除。</p>
      </div>
      <div v-if="emergency.length" class="run-emergency">
        <h3>应急助力</h3>
        <ul class="run-member-list" aria-label="应急助力名单">
          <li v-for="operator in emergency" :key="operator.id" class="run-member">
            <span>{{ operator.name }}</span>
            <button class="text-button" :aria-label="`移除应急助力${operator.name}`" @click="removeEmergency(operator.id)"><AppIcon name="close" /></button>
          </li>
        </ul>
      </div>
      <details class="run-management">
        <summary>本局招募名单管理</summary>
        <p class="feature-note">所有星级的已招募干员都在此记录；移除后可重新参与随机。</p>
        <ul v-if="members.length" class="run-member-list" aria-label="本局已招募名单">
          <li v-for="member in members" :key="member.operator.id" class="run-member">
            <span>{{ member.operator.name }}<small>{{ sourceNames[member.source] }}</small></span>
            <button class="text-button" :aria-label="`移除招募记录${member.operator.name}`" @click="removeMember(member.operator.id)"><AppIcon name="close" /></button>
          </li>
        </ul>
        <p v-else class="feature-note">本局暂无招募记录。</p>
      </details>
      <p class="run-status" role="status" aria-live="polite">{{ message }}</p>
    </template>
  </section>
  <OperatorRegistration v-if="registrationKind && active" :kind="registrationKind" :operators="registrationOperators"
    @select="register" @close="registrationKind = null" />
</template>
