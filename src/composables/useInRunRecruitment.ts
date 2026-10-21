import { computed, getCurrentScope, onScopeDispose, shallowRef, watch, type Ref } from 'vue';
import { drawInRunCandidates, IN_RUN_TICKETS, operatorIdentity, type InRunDraw } from '../lib/in-run';
import type { Rng } from '../lib/roll';
import type { Operator, RollSettings, Theme } from '../lib/types';
import type { ConfirmedStart } from './useStartConfirmation';
import { useRecruitCounts } from './useRecruitCounts';

export type RecruitSource = 'start' | 'random' | 'manual' | 'temporary';
export type RegistrationKind = 'manual' | 'temporary' | 'emergency';
export interface RunMember { operator: Operator; source: RecruitSource }
interface RunSession {
  themeId: string;
  start: ConfirmedStart | null;
  members: RunMember[];
  emergency: Operator[];
  draw: InRunDraw | null;
  selectedId: string | null;
  message: string;
}

export function useInRunRecruitment(
  theme: Readonly<Ref<Theme | null>>,
  operators: readonly Operator[],
  settings: Readonly<Ref<RollSettings>>,
  rng: Rng = Math.random,
) {
  const countSettings = useRecruitCounts();
  const session = shallowRef<RunSession | null>(null);
  const removal = shallowRef<{ before: RunSession; name: string } | null>(null);
  let removalTimeout: ReturnType<typeof setTimeout> | undefined;
  function clearRemoval() {
    if (removalTimeout !== undefined) clearTimeout(removalTimeout);
    removalTimeout = undefined;
    removal.value = null;
  }
  if (getCurrentScope()) onScopeDispose(clearRemoval);
  watch(theme, clearRemoval, { flush: 'sync' });
  const current = computed(() => session.value?.themeId === theme.value?.id ? session.value : null);
  const active = computed(() => Boolean(theme.value));
  const members = computed(() => current.value?.members ?? []);
  const emergency = computed(() => current.value?.emergency ?? []);
  const recruited = computed(() => members.value.map((member) => member.operator));
  const excluded = computed(() => [...recruited.value, ...emergency.value]);
  const sixStars = computed(() => excluded.value.filter((operator) => operator.rarity === 6));
  const excludedKeys = computed(() => new Set(excluded.value.map(operatorIdentity)));
  const draw = computed(() => current.value?.draw ?? null);
  const candidates = computed(() => draw.value?.candidates.filter((operator) => !excludedKeys.value.has(operatorIdentity(operator))) ?? []);
  const chosen = computed(() => candidates.value.find((operator) => operator.id === current.value?.selectedId) ?? null);
  const message = computed(() => current.value?.message ?? '');
  const canUndoRemoval = computed(() => Boolean(current.value && removal.value));
  watch(settings, clearRemoval, { deep: true, flush: 'sync' });

  function update(patch: Partial<RunSession>) {
    if (!theme.value) return;
    clearRemoval();
    session.value = { ...(current.value ?? { themeId: theme.value.id, start: null, members: [],
      emergency: [], draw: null, selectedId: null, message: '' }), ...patch };
  }
  function applyStart(start: ConfirmedStart) {
    if (!theme.value || current.value?.start === start) return;
    const combined = new Map(members.value.map((member) => [operatorIdentity(member.operator), member]));
    for (const operator of start.operators) {
      const key = operatorIdentity(operator);
      if (!combined.has(key)) combined.set(key, { operator, source: 'start' });
    }
    update({ start, members: [...combined.values()],
      emergency: emergency.value.filter((operator) => !combined.has(operatorIdentity(operator))),
      draw: null, selectedId: null, message: '' });
  }
  function addSelected(id: string) {
    const operator = operators.find((item) => item.id === id && item.rarity === 6);
    if (!theme.value || !operator || excludedKeys.value.has(operatorIdentity(operator))) return false;
    update({ members: [...members.value, { operator, source: 'manual' }],
      selectedId: current.value?.selectedId === id ? null : current.value?.selectedId ?? null,
      message: `已添加：${operator.name}。` });
    return true;
  }
  function selectedOptions() {
    return operators.filter((operator) => operator.rarity === 6 && !excludedKeys.value.has(operatorIdentity(operator)));
  }
  function removeSelected(id: string) {
    if (!sixStars.value.some((operator) => operator.id === id)) return;
    if (emergency.value.some((operator) => operator.id === id)) removeEmergency(id);
    else removeMember(id);
  }
  function drawTicket(id: string) {
    const ticket = IN_RUN_TICKETS.find((item) => item.id === id);
    if (!active.value || !ticket) return false;
    const next = drawInRunCandidates(operators, settings.value, ticket, excluded.value, countSettings.counts.value, rng);
    update({ draw: next, selectedId: null, message: '' });
    return true;
  }
  function selectCandidate(id: string) {
    if (candidates.value.some((operator) => operator.id === id)) update({ selectedId: id });
  }
  function addMember(operator: Operator, source: RecruitSource) {
    const key = operatorIdentity(operator);
    if (!active.value || recruited.value.some((item) => operatorIdentity(item) === key)) return false;
    update({ members: [...members.value, { operator, source }],
      emergency: emergency.value.filter((item) => operatorIdentity(item) !== key),
      draw: null, selectedId: null, message: `已招募：${operator.name}。` });
    return true;
  }
  function confirmRecruit() {
    return chosen.value ? addMember(chosen.value, 'random') : false;
  }
  function register(id: string, kind: RegistrationKind) {
    const operator = operators.find((item) => item.id === id);
    if (!active.value || !operator) return false;
    if (kind !== 'emergency') return addMember(operator, kind);
    const key = operatorIdentity(operator);
    if (excludedKeys.value.has(key)) return false;
    update({ emergency: [...emergency.value, operator],
      selectedId: chosen.value && operatorIdentity(chosen.value) === key ? null : current.value?.selectedId ?? null,
      message: `应急助力已登记：${operator.name}。` });
    return true;
  }
  function removeMember(id: string) {
    const member = members.value.find((item) => item.operator.id === id);
    if (!member) return;
    const before = current.value!;
    update({ members: members.value.filter((item) => item !== member), message: `已移除招募记录：${member.operator.name}。` });
    rememberRemoval(before, member.operator.name);
  }
  function removeEmergency(id: string) {
    const operator = emergency.value.find((item) => item.id === id);
    if (!operator) return;
    const before = current.value!;
    update({ emergency: emergency.value.filter((item) => item !== operator), message: `应急助力已移除：${operator.name}。` });
    rememberRemoval(before, operator.name);
  }
  function rememberRemoval(before: RunSession, name: string) {
    removal.value = { before, name };
    removalTimeout = setTimeout(clearRemoval, 6000);
  }
  function undoRemoval() {
    const previous = removal.value;
    if (!current.value || !previous) return false;
    clearRemoval();
    session.value = { ...previous.before, message: `已恢复：${previous.name}。` };
    return true;
  }
  function discardDraw() {
    update({ draw: null, selectedId: null, message: '已放弃本次招募。' });
  }
  function registrationOptions(kind: RegistrationKind) {
    const unavailable = new Set((kind === 'emergency' ? excluded.value : recruited.value).map(operatorIdentity));
    return operators.filter((operator) => !unavailable.has(operatorIdentity(operator)));
  }
  return { active, members, emergency, recruited, sixStars, draw, candidates, chosen, message, canUndoRemoval, countSettings,
    applyStart, addSelected, selectedOptions, removeSelected,
    drawTicket, selectCandidate, confirmRecruit, register, removeMember, removeEmergency, undoRemoval, discardDraw, registrationOptions };
}

export type InRunController = ReturnType<typeof useInRunRecruitment>;
