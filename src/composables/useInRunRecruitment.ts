import { computed, shallowRef, watch, type Ref } from 'vue';
import { drawInRunCandidates, IN_RUN_TICKETS, operatorIdentity, type InRunDraw } from '../lib/in-run';
import type { Rng } from '../lib/roll';
import type { Operator, RollSettings } from '../lib/types';
import type { ConfirmedStart } from './useStartConfirmation';

export type RecruitSource = 'start' | 'random' | 'manual' | 'temporary';
export type RegistrationKind = 'manual' | 'temporary' | 'emergency';
export interface RunMember { operator: Operator; source: RecruitSource }
interface RunSession {
  start: ConfirmedStart;
  members: RunMember[];
  emergency: Operator[];
  draw: InRunDraw | null;
  selectedId: string | null;
  message: string;
}

export function useInRunRecruitment(
  operators: readonly Operator[],
  settings: Readonly<Ref<RollSettings>>,
  confirmedStart: Readonly<Ref<ConfirmedStart | null>>,
  rng: Rng = Math.random,
) {
  const session = shallowRef<RunSession | null>(null);
  watch(confirmedStart, (start) => {
    if (!start || session.value?.start === start) return;
    const unique = [...new Map(start.operators.map((operator) => [operatorIdentity(operator), operator])).values()];
    session.value = { start, members: unique.map((operator) => ({ operator, source: 'start' })),
      emergency: [], draw: null, selectedId: null, message: '' };
  }, { immediate: true, flush: 'sync' });
  const current = computed(() => confirmedStart.value && session.value?.start === confirmedStart.value ? session.value : null);
  const active = computed(() => Boolean(current.value));
  const members = computed(() => current.value?.members ?? []);
  const emergency = computed(() => current.value?.emergency ?? []);
  const recruited = computed(() => members.value.map((member) => member.operator));
  const sixStars = computed(() => recruited.value.filter((operator) => operator.rarity === 6));
  const excluded = computed(() => [...recruited.value, ...emergency.value]);
  const excludedKeys = computed(() => new Set(excluded.value.map(operatorIdentity)));
  const draw = computed(() => current.value?.draw ?? null);
  const candidates = computed(() => draw.value?.candidates.filter((operator) => !excludedKeys.value.has(operatorIdentity(operator))) ?? []);
  const chosen = computed(() => candidates.value.find((operator) => operator.id === current.value?.selectedId) ?? null);
  const message = computed(() => current.value?.message ?? '');

  function update(patch: Partial<RunSession>) {
    if (current.value) session.value = { ...current.value, ...patch };
  }
  function drawTicket(id: string) {
    const ticket = IN_RUN_TICKETS.find((item) => item.id === id);
    if (!active.value || !ticket) return false;
    const next = drawInRunCandidates(operators, settings.value, ticket, excluded.value, rng);
    update({ draw: next, selectedId: null, message: `${ticket.name}：提供 ${next.candidates.length} 名候选。` });
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
      selectedId: chosen.value && operatorIdentity(chosen.value) === key ? null : current.value!.selectedId,
      message: `应急助力已登记：${operator.name}。` });
    return true;
  }
  function removeMember(id: string) {
    const member = members.value.find((item) => item.operator.id === id);
    if (!member) return;
    update({ members: members.value.filter((item) => item !== member), message: `已移除招募记录：${member.operator.name}。` });
  }
  function removeEmergency(id: string) {
    const operator = emergency.value.find((item) => item.id === id);
    if (!operator) return;
    update({ emergency: emergency.value.filter((item) => item !== operator), message: `应急助力已移除：${operator.name}。` });
  }
  function discardDraw() {
    update({ draw: null, selectedId: null, message: '已放弃本次招募。' });
  }
  function registrationOptions(kind: RegistrationKind) {
    const unavailable = new Set((kind === 'emergency' ? excluded.value : recruited.value).map(operatorIdentity));
    return operators.filter((operator) => !unavailable.has(operatorIdentity(operator)));
  }
  return { active, members, emergency, recruited, sixStars, draw, candidates, chosen, message,
    drawTicket, selectCandidate, confirmRecruit, register, removeMember, removeEmergency, discardDraw, registrationOptions };
}

export type InRunController = ReturnType<typeof useInRunRecruitment>;
