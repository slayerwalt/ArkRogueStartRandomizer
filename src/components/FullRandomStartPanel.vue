<script setup lang="ts">
import { computed } from 'vue';
import type { RecruitGroup, RollResult, Squad } from '../lib/types';
import AppIcon from './AppIcon.vue';
import RecruitSlots from './RecruitSlots.vue';
import SquadCard from './SquadCard.vue';

const props = defineProps<{
  squad: Squad | null;
  group: RecruitGroup | null;
  squadRandomized: boolean;
  groupRandomized: boolean;
  result: RollResult | null;
  blockReason: string;
  canConfirm: boolean;
  registered: boolean;
}>();
const emit = defineEmits<{
  roll: [];
  rollSquad: [];
  rollGroup: [];
  rollSlot: [index: number];
  chooseSquad: [];
  chooseGroup: [];
  settings: [];
  confirm: [];
}>();
const isBlocked = computed(() => Boolean(props.blockReason));
</script>

<template>
  <div class="full-random-start">
    <div class="full-start-actions">
      <button
        class="button primary roll-button"
        :disabled="isBlocked"
        :aria-describedby="isBlocked ? 'pool-warning' : undefined"
        @click="emit('roll')"
      >
        {{ result ? '重新随机全部' : '开始随机' }}
      </button>
    </div>
    <div
      v-if="blockReason"
      id="pool-warning"
      class="inline-warning warning-action"
      role="status"
    >
      <span>{{ blockReason }}</span>
      <button class="text-button" @click="emit('settings')">
        调整范围
        <AppIcon name="arrow" />
      </button>
    </div>
    <div class="context-grid">
      <SquadCard
        :squad="squad"
        :randomized="squadRandomized"
        :disabled="isBlocked"
        @choose="emit('chooseSquad')"
        @reroll="emit('rollSquad')"
      />
      <section class="context-card group-card" aria-label="招募组合">
        <div class="context-main">
          <span class="eyebrow">招募组合</span>
          <template v-if="group">
            <h3>{{ group.name }}</h3>
            <p>{{ group.desc }}</p>
          </template>
          <p v-else>尚未选择组合</p>
        </div>
        <div class="context-actions">
          <button
            class="button secondary"
            :disabled="isBlocked"
            aria-haspopup="dialog"
            @click="emit('chooseGroup')"
          >
            选择组合
          </button>
          <button class="button secondary" :disabled="isBlocked" @click="emit('rollGroup')">
            {{ groupRandomized ? '重新随机' : '随机组合' }}
          </button>
        </div>
      </section>
    </div>
    <template v-if="result">
      <div class="roster-heading">
        <h3 class="roster-title">开局干员</h3>
      </div>
      <RecruitSlots
        :slots="result.slots"
        :disabled="isBlocked"
        @reroll-slot="emit('rollSlot', $event)"
        @settings="emit('settings')"
      />
      <div class="quick-confirm">
        <button class="button primary" :disabled="!canConfirm || registered" @click="emit('confirm')">
          {{ registered ? '已确认开局' : '确认开局' }}
        </button>
      </div>
      <p v-if="!canConfirm" class="inline-warning">请先补齐所有券位的干员，再确认开局。</p>
    </template>
    <div v-else class="welcome-panel">
      <h3>暂无随机结果</h3>
    </div>
  </div>
</template>

<style scoped>
.full-random-start { min-width: 0; }
.roster-title { font-size: 15px; }
</style>
