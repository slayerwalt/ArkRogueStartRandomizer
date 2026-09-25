<script setup lang="ts">
import { computed } from 'vue';
import type { ChallengePool } from '../lib/challenges';
import type { ChallengeController } from '../composables/useChallenges';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ pools: readonly ChallengePool[]; controller: ChallengeController; error?: string }>();
const { selectedPoolId, pool, selected, remaining, canDraw, lastDrawn, selectPool, draw, remove, clear } = props.controller;
const recentFirst = computed(() => [...selected.value].reverse());
</script>

<template>
  <section class="feature-section" aria-labelledby="challenge-title">
    <h2 id="challenge-title" class="feature-title">随机词条</h2>
    <p v-if="error || !pools.length" class="inline-warning" role="status">{{ error || '暂无可用词条池。' }}</p>
    <template v-else-if="pool">
      <p class="feature-description">每次等概率抽取1条，可连续追加，已抽词条不重复。移除或清空后可重新抽到。</p>
      <p class="feature-note">词条作为挑战提示，具体限制由玩家自行执行。</p>
      <div class="challenge-pool-control">
        <label for="challenge-pool">词条池</label>
        <select id="challenge-pool" :value="selectedPoolId" @change="selectPool(($event.target as HTMLSelectElement).value)">
          <option v-for="item in pools" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <a :href="pool.sourceUrl" target="_blank" rel="noopener noreferrer">查看来源</a>
      </div>
      <div class="feature-actions">
        <button class="button primary" :disabled="!canDraw" @click="draw">随机抽取词条</button>
        <button class="button secondary" :disabled="!selected.length" @click="clear">清空已抽词条</button>
      </div>
      <p v-if="!remaining" class="inline-warning" role="status">当前池已全部抽完，移除或清空已抽词条后可继续。</p>
      <p v-if="!selected.length" class="feature-note challenge-empty">暂无已抽词条。</p>
      <ol v-else class="challenge-list" :start="selected.length" reversed aria-label="已抽挑战词条">
        <li v-for="term in recentFirst" :key="term.id">
          <div class="challenge-term">
            <span><strong>{{ term.restriction === 'forbid' ? '禁用' : '仅限' }}</strong>{{ term.text }}</span>
            <button class="text-button" :aria-label="`移除词条${term.text}`" @click="remove(term.id)"><AppIcon name="close" /></button>
          </div>
        </li>
      </ol>
      <p class="sr-only" role="status" aria-live="polite">{{ lastDrawn ? `已抽取 ${selected.length} 条，最新词条：${lastDrawn.restriction === 'forbid' ? '禁用' : '仅限'}${lastDrawn.text}` : '已抽词条为空' }}</p>
    </template>
  </section>
</template>
