import { isReadonly, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useStartMode, type StartMode } from '../src/composables/useStartMode';
import type { Theme } from '../src/lib/types';

const availableTheme: Theme = { id: 'rogue_6', name: '黑流树海', squads: [], recruitGroups: [] };
function setup() {
  const theme = ref<Theme | null>(availableTheme);
  return { theme, ...useStartMode(theme) };
}

describe('开局方式选择', () => {
  it.each(['candidates', 'quick'] as const)('首次选择 %s 后锁定，普通选择不能再次覆盖', (initialMode) => {
    const app = setup();
    expect(app.mode.value).toBeNull();
    expect(isReadonly(app.mode)).toBe(true);
    expect(app.choose(initialMode)).toBe(true);
    expect(app.choose('candidates')).toBe(false);
    expect(app.choose('quick')).toBe(false);
    expect(app.mode.value).toBe(initialMode);
  });

  it('显式重新开局可更换或重新采用当前方式，随后继续保持锁定', () => {
    const app = setup();
    app.choose('candidates');
    expect(app.restart('quick')).toBe(true);
    expect(app.mode.value).toBe('quick');
    expect(app.choose('candidates')).toBe(false);
    expect(app.restart('quick')).toBe(true);
    expect(app.restart('candidates')).toBe(true);
    expect(app.mode.value).toBe('candidates');
  });

  it('未开放主题拒绝操作，返回相同主题 id 恢复已选方式', () => {
    const app = setup();
    app.choose('quick');
    app.theme.value = null;
    expect(app.mode.value).toBeNull();
    expect(app.choose('candidates')).toBe(false);
    expect(app.restart('candidates')).toBe(false);
    app.theme.value = { ...availableTheme };
    expect(app.mode.value).toBe('quick');
    expect(app.choose('candidates')).toBe(false);
    app.theme.value = { ...availableTheme, id: 'other' };
    expect(app.mode.value).toBeNull();
    app.theme.value = availableTheme;
    expect(app.mode.value).toBe('quick');
  });

  it('非法运行时输入不会锁定方式或覆盖当前选择', () => {
    const app = setup();
    for (const invalid of ['', 'random', null, undefined, 0, {}]) {
      expect(app.choose(invalid as StartMode)).toBe(false);
      expect(app.restart(invalid as StartMode)).toBe(false);
      expect(app.mode.value).toBeNull();
    }
    app.choose('candidates');
    expect(app.restart('invalid' as StartMode)).toBe(false);
    expect(app.mode.value).toBe('candidates');
  });

  it('新会话重新从未选择开始，不继承另一会话的锁定', () => {
    const app = setup();
    app.choose('quick');
    const fresh = useStartMode(app.theme);
    expect(fresh.mode.value).toBeNull();
    expect(fresh.choose('candidates')).toBe(true);
    expect(app.mode.value).toBe('quick');
  });
});
