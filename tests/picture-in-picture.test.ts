import { effectScope } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isMobileBrowser } from '../src/lib/browser-device';
import { usePictureInPicture } from '../src/composables/usePictureInPicture';

afterEach(() => vi.unstubAllGlobals());

describe('小窗仅允许桌面端开启', () => {
  it.each([
    ['Windows Chrome', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/144.0', 'Win32', 0, false],
    ['触摸屏 Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/144.0', 'Win32', 10, false],
    ['macOS', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1', 'MacIntel', 0, false],
    ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile Safari', 'iPhone', 5, true],
    ['Android 手机', 'Mozilla/5.0 (Linux; Android 15) Chrome/144.0 Mobile Safari', 'Linux armv8l', 5, true],
    ['Android 平板桌面布局', 'Mozilla/5.0 (Linux; Android 15; Tablet) Chrome/144.0 Safari', 'Linux armv8l', 5, true],
    ['iPad 桌面 UA', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1', 'MacIntel', 5, true],
  ] as const)('%s 的设备判断', (_name, userAgent, platform, maxTouchPoints, mobile) => {
    expect(isMobileBrowser({ userAgent, platform, maxTouchPoints })).toBe(mobile);
  });

  it('优先接受浏览器提供的移动设备标识', () => {
    expect(isMobileBrowser({ userAgent: '', platform: '', maxTouchPoints: 0, userAgentData: { mobile: true } })).toBe(true);
  });

  it('移动端即使支持画中画 API，也不会发起打开请求', async () => {
    const requestWindow = vi.fn();
    vi.stubGlobal('window', {
      navigator: { userAgent: 'Android', platform: 'Linux armv8l', maxTouchPoints: 5 },
      isSecureContext: true,
      documentPictureInPicture: { requestWindow },
    });
    const scope = effectScope();
    try {
      const mini = scope.run(usePictureInPicture)!;
      expect(mini.desktop).toBe(false);
      await mini.open();
      expect(requestWindow).not.toHaveBeenCalled();
      expect(mini.isOpen.value).toBe(false);
      expect(mini.error.value).toContain('仅支持桌面浏览器');
    } finally {
      scope.stop();
    }
  });
});
