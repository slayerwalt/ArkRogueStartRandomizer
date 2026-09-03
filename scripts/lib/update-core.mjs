const OPERATOR_FIELDS = [
  'name',
  'profession',
  'subProfession',
  'rarity',
  'hopeCost',
  'charDiscount',
  'bonusProfessions',
];

const SQUAD_FIELDS = ['name', 'desc', 'unlockCond', 'initialHopeBonus', 'recruitDiscount'];
const RECRUIT_GROUP_FIELDS = ['name', 'desc', 'slots'];

function isEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function indexById(entries = []) {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function compareEntries(previous = [], next = [], fields) {
  const oldById = indexById(previous);
  const newById = indexById(next);
  const added = next.filter((entry) => !oldById.has(entry.id));
  const removed = previous.filter((entry) => !newById.has(entry.id));
  const changed = next.flatMap((entry) => {
    const oldEntry = oldById.get(entry.id);
    if (!oldEntry) return [];
    const changedFields = fields.filter((field) => !isEqual(oldEntry[field], entry[field]));
    return changedFields.length > 0 ? [{ id: entry.id, name: entry.name, fields: changedFields }] : [];
  });
  return { added, removed, changed };
}

export function parseDataVersion(content) {
  const match = /^VersionControl:\s*(\S+)\s*$/m.exec(content);
  if (!match) throw new Error('data_version.txt 中缺少 VersionControl 字段');
  return match[1];
}

/** 比较前端实际消费的数据，故意忽略 generatedAt 与 source。 */
export function hasSameDomainData(previous, next) {
  return Boolean(previous) && isEqual(previous.themes, next.themes) && isEqual(previous.operators, next.operators);
}

export function collectCountDecreases(previous, next) {
  if (!previous) return [];

  const decreases = [];
  if (next.operators.length < previous.operators.length) {
    decreases.push(`干员数量 ${previous.operators.length} → ${next.operators.length}`);
  }

  const nextThemes = indexById(next.themes);
  for (const oldTheme of previous.themes) {
    const newTheme = nextThemes.get(oldTheme.id);
    const nextSquadCount = newTheme?.squads.length ?? 0;
    const nextGroupCount = newTheme?.recruitGroups.length ?? 0;
    if (nextSquadCount < oldTheme.squads.length) {
      decreases.push(`${oldTheme.id} 分队数量 ${oldTheme.squads.length} → ${nextSquadCount}`);
    }
    if (nextGroupCount < oldTheme.recruitGroups.length) {
      decreases.push(`${oldTheme.id} 招募组合数量 ${oldTheme.recruitGroups.length} → ${nextGroupCount}`);
    }
  }
  return decreases;
}

export function assertNoUnexpectedRemovals(previous, next, allowRemovals = false) {
  const decreases = collectCountDecreases(previous, next);
  if (decreases.length > 0 && !allowRemovals) {
    throw new Error(
      `检测到数据数量下降，已停止写入：\n- ${decreases.join('\n- ')}\n` +
        '确认是正常版本变化后，使用 --allow-removals 重新运行。',
    );
  }
  return decreases;
}

export function buildDiff(previous, next) {
  if (!previous) {
    return {
      initial: true,
      operators: { added: next.operators, removed: [], changed: [] },
      themes: next.themes.map((theme) => ({
        id: theme.id,
        name: theme.name,
        state: 'added',
        changedFields: [],
        squads: { added: theme.squads, removed: [], changed: [] },
        recruitGroups: { added: theme.recruitGroups, removed: [], changed: [] },
      })),
    };
  }

  const oldThemes = indexById(previous.themes);
  const newThemes = indexById(next.themes);
  const themeIds = [...new Set([...oldThemes.keys(), ...newThemes.keys()])];
  return {
    initial: false,
    operators: compareEntries(previous.operators, next.operators, OPERATOR_FIELDS),
    themes: themeIds.map((id) => {
      const oldTheme = oldThemes.get(id);
      const newTheme = newThemes.get(id);
      return {
        id,
        name: newTheme?.name ?? oldTheme?.name ?? id,
        state: oldTheme ? (newTheme ? null : 'removed') : 'added',
        changedFields:
          oldTheme && newTheme && oldTheme.name !== newTheme.name ? ['name'] : [],
        squads: compareEntries(oldTheme?.squads, newTheme?.squads, SQUAD_FIELDS),
        recruitGroups: compareEntries(
          oldTheme?.recruitGroups,
          newTheme?.recruitGroups,
          RECRUIT_GROUP_FIELDS,
        ),
      };
    }),
  };
}

function describeEntry(entry) {
  return entry.name ? `${entry.id}（${entry.name}）` : entry.id;
}

function appendEntryChanges(lines, label, changes) {
  if (changes.added.length > 0) {
    lines.push(`${label}新增 ${changes.added.length}：${changes.added.map(describeEntry).join('、')}`);
  }
  if (changes.removed.length > 0) {
    lines.push(`${label}移除 ${changes.removed.length}：${changes.removed.map(describeEntry).join('、')}`);
  }
  if (changes.changed.length > 0) {
    lines.push(
      `${label}变更 ${changes.changed.length}：` +
        changes.changed.map((entry) => `${describeEntry(entry)}[${entry.fields.join(', ')}]`).join('、'),
    );
  }
}

export function formatDiffSummary(diff) {
  const lines = [];
  appendEntryChanges(lines, '干员', diff.operators);
  for (const theme of diff.themes) {
    if (theme.state === 'added') lines.push(`主题新增：${theme.id}（${theme.name}）`);
    if (theme.state === 'removed') lines.push(`主题移除：${theme.id}（${theme.name}）`);
    if (theme.changedFields.length > 0) {
      lines.push(`主题变更：${theme.id}（${theme.name}）[${theme.changedFields.join(', ')}]`);
    }
    appendEntryChanges(lines, `${theme.name}分队`, theme.squads);
    appendEntryChanges(lines, `${theme.name}招募组合`, theme.recruitGroups);
  }
  return lines.length > 0 ? lines.join('\n') : '业务数据无变化';
}

export function inspectAvatarCoverage(operators, avatarFileNames) {
  const operatorIds = new Set(operators.map((operator) => operator.id));
  const avatarIds = new Set(
    avatarFileNames
      .filter((fileName) => fileName.toLowerCase().endsWith('.webp'))
      .map((fileName) => fileName.slice(0, -5)),
  );
  return {
    missing: [...operatorIds].filter((id) => !avatarIds.has(id)).sort(),
    orphaned: [...avatarIds].filter((id) => !operatorIds.has(id)).sort(),
  };
}
