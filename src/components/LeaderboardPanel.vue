<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  buildLeaderboard,
  LEADERBOARD_RARITIES,
  type Outcome,
  type StartRecord,
} from '../lib/stats';

const props = defineProps<{ records: StartRecord[] }>();

const rarity = ref<number>(6);

const boards: { outcome: Outcome; title: string; className: string }[] = [
  { outcome: 'accepted', title: '最喜欢的开局干员', className: 'accept' },
  { outcome: 'abandoned', title: '最不想要的开局干员', className: 'abandon' },
];

const entries = computed(() =>
  boards.map((b) => ({ ...b, list: buildLeaderboard(props.records, rarity.value, b.outcome) })),
);
</script>

<template>
  <div class="card leaderboard">
    <div class="card-title">
      <span class="label">开局排行榜</span>
      <select v-model.number="rarity" class="rarity-select" aria-label="选择星级">
        <option v-for="r in LEADERBOARD_RARITIES" :key="r" :value="r">{{ r }}星</option>
      </select>
    </div>
    <div class="boards">
      <div v-for="b in entries" :key="b.outcome" class="board">
        <div class="board-title" :class="b.className">{{ b.title }}</div>
        <ol v-if="b.list.length" class="board-list">
          <li v-for="(e, i) in b.list" :key="e.id">
            <span class="board-rank">{{ i + 1 }}</span>
            <span class="board-name">{{ e.name }}</span>
            <span class="board-count">{{ e.count }}</span>
          </li>
        </ol>
        <div v-else class="board-empty">暂无记录</div>
      </div>
    </div>
    <div class="board-total">共 {{ records.length }} 条本地记录</div>
  </div>
</template>
