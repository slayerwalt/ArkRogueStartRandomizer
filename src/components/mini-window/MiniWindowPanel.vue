<script setup lang="ts">
import { computed, nextTick, provide, shallowRef, useId, useTemplateRef, watch } from 'vue';
import type { InRunController } from '../../composables/useInRunRecruitment';
import { useMiniWindowHeight } from '../../composables/useMiniWindowHeight';
import { dialogTargetKey } from '../../lib/dialog-target';
import { CLASS_CN } from '../../lib/constants';
import AppIcon from '../AppIcon.vue';
import InRunRecruitmentPanel from '../InRunRecruitmentPanel.vue';
import OperatorPicker from '../OperatorPicker.vue';
import MiniRoster from './MiniRoster.vue';

const props = defineProps<{ controller: InRunController; pipWindow: Window }>();
const emit = defineEmits<{ resize: [height: number] }>();
const { sixStars, message, canUndoRemoval } = props.controller;
const view = shallowRef<'draw' | 'add' | 'manage' | null>(null);
const inspectedId = shallowRef<string | null>(null);
const drawOpened = shallowRef(false);
const contentId = `${useId()}-mini-content`;
const drawButton = useTemplateRef<HTMLButtonElement>('drawButton');
const addButton = useTemplateRef<HTMLButtonElement>('addButton');
const picker = useTemplateRef<InstanceType<typeof OperatorPicker>>('picker');
const drawPanel = useTemplateRef<InstanceType<typeof InRunRecruitmentPanel>>('drawPanel');
const managementHeading = useTemplateRef<HTMLHeadingElement>('managementHeading');
const content = useTemplateRef<HTMLDivElement>('content');
const toolbar = useTemplateRef<HTMLDivElement>('toolbar');
const contentBody = useTemplateRef<HTMLDivElement>('contentBody');
const undoButton = useTemplateRef<HTMLButtonElement>('undoButton');
const options = computed(() => props.controller.selectedOptions());
const inspected = computed(() => sixStars.value.find((operator) => operator.id === inspectedId.value));
const { scheduleFit } = useMiniWindowHeight(props.pipWindow, toolbar, contentBody, computed(() => view.value !== null), (height) => emit('resize', height));
provide(dialogTargetKey, computed(() => props.pipWindow.document.body));
watch(canUndoRemoval, (available) => {
  if (!available && undoButton.value?.matches(':focus')) nextTick(() => managementHeading.value?.focus({ preventScroll: true }));
});

function reveal() {
  if (content.value) content.value.scrollTop = 0;
}

function collapse() {
  const focusTarget = view.value === 'add' ? addButton : drawButton;
  view.value = null;
  nextTick(() => focusTarget.value?.focus({ preventScroll: true }));
}
async function show(next: 'draw' | 'add') {
  if (view.value === next) return collapse();
  view.value = next;
  if (next === 'draw') drawOpened.value = true;
  await nextTick();
  reveal();
  if (next === 'add') picker.value?.focusSearch();
  else drawPanel.value?.focusHeading();
}
function add(id: string) {
  if (props.controller.addSelected(id)) collapse();
}
async function inspect(id: string) {
  inspectedId.value = id;
  view.value = 'manage';
  await nextTick();
  reveal();
  managementHeading.value?.focus({ preventScroll: true });
}
async function remove() {
  if (!inspected.value) return;
  props.controller.removeSelected(inspected.value.id);
  await nextTick();
  undoButton.value?.focus({ preventScroll: true });
}
function escape(event: KeyboardEvent) {
  if (!view.value || event.defaultPrevented) return;
  event.preventDefault();
  collapse();
}
</script>

<template>
  <section class="mini-window" aria-label="RollLike 小窗模式" @keydown.esc="escape"
    @click="scheduleFit" @input="scheduleFit" @change="scheduleFit">
    <div ref="toolbar" class="mini-toolbar">
      <div class="mini-count" :aria-label="`已选 ${sixStars.length} 名六星`">
        <span>已选</span><strong>{{ sixStars.length }}</strong>
      </div>
      <MiniRoster :operators="sixStars" :selected-id="view === 'manage' ? inspectedId : null" @inspect="inspect" />
      <div class="mini-actions">
        <button ref="drawButton" class="button primary" :aria-expanded="view === 'draw'" :aria-controls="contentId" @click="show('draw')">
          抽取
        </button>
        <button ref="addButton" class="button secondary" :aria-expanded="view === 'add'" :aria-controls="contentId" @click="show('add')">添加</button>
      </div>
    </div>
    <div :id="contentId" v-show="view" ref="content" class="mini-content">
      <div ref="contentBody" class="mini-content-body">
        <InRunRecruitmentPanel v-if="drawOpened" v-show="view === 'draw'" ref="drawPanel" :controller="controller" compact @complete="collapse" @reveal="reveal" />
        <section v-if="view === 'add'" class="mini-add" aria-label="手动添加六星干员">
          <OperatorPicker ref="picker" :operators="options" compact @select="add" />
        </section>
        <section v-if="view === 'manage'" class="mini-management" aria-label="管理已选干员">
          <header class="mini-panel-heading">
            <h2 ref="managementHeading" tabindex="-1">{{ inspected?.name ?? '已移除干员' }}</h2>
            <button class="text-button mini-collapse" @click="collapse">收起<AppIcon name="chevron" /></button>
          </header>
          <div v-if="inspected" class="mini-management-row">
            <p>六星 · {{ CLASS_CN[inspected.profession] }}</p>
            <button class="button secondary" @click="remove">移除干员</button>
          </div>
          <div v-if="canUndoRemoval" class="mini-management-row">
            <p>{{ message }}</p><button ref="undoButton" class="button secondary" @click="controller.undoRemoval()">撤销移除</button>
          </div>
          <p v-else-if="!inspected" class="mini-management-notice">{{ message }}</p>
        </section>
      </div>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ message }}</p>
  </section>
</template>

<style scoped>
.mini-window { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; color: var(--ink); background: var(--surface); }
.mini-toolbar { display: flex; flex: 0 0 72px; align-items: center; gap: 10px; min-width: 0; padding: 0 10px; }
.mini-count { display: flex; flex: 0 0 32px; flex-direction: column; align-items: center; gap: 2px; color: var(--muted); font-size: 11px; }
.mini-count strong { color: var(--ink); font-size: 22px; font-weight: 600; line-height: 26px; font-variant-numeric: tabular-nums; }
.mini-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 8px; padding-left: 12px; border-left: 1px solid var(--line); }
.mini-actions .button { min-height: 42px; padding: 8px 12px; gap: 5px; font-size: 13px; white-space: nowrap; }
.mini-actions .secondary[aria-expanded='true'] { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }
.mini-content { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; border-top: 1px solid var(--line); scrollbar-width: thin; }
.mini-content-body { display: flow-root; }
.mini-add, .mini-management { padding: 8px 10px; }
.mini-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.mini-panel-heading h2 { font-size: 15px; font-weight: 600; }
.mini-collapse { flex-shrink: 0; min-height: 36px; padding: 4px; font-size: 12px; }
.mini-collapse .icon { width: 14px; height: 14px; transform: rotate(-90deg); }
.mini-management-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; }
.mini-management-row .button { flex-shrink: 0; min-height: 40px; font-size: 13px; }
.mini-management-notice { font-size: 13px; color: var(--muted); }
</style>
