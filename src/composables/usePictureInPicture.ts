import { computed, onScopeDispose, shallowRef } from 'vue';
import { isMobileBrowser } from '../lib/browser-device';

interface DocumentPictureInPicture {
  requestWindow(options: { width: number; height: number; preferInitialWindowPlacement?: boolean }): Promise<Window>;
}
type PictureInPictureHost = Window & { documentPictureInPicture?: DocumentPictureInPicture };

/** 只管理浏览器窗口，会话状态始终由主页面持有。 */
export function usePictureInPicture() {
  const host = window as PictureInPictureHost;
  const desktop = !isMobileBrowser(host.navigator);
  const supported = Boolean(host.isSecureContext && host.documentPictureInPicture);
  const pipWindow = shallowRef<Window | null>(null);
  const target = shallowRef<HTMLElement | null>(null);
  const opening = shallowRef(false);
  const error = shallowRef('');
  const isOpen = computed(() => pipWindow.value !== null);
  let disposeWindow: (() => void) | undefined;
  let generation = 0;
  let disposed = false;

  function close() {
    generation += 1;
    opening.value = false;
    const current = pipWindow.value;
    disposeWindow?.();
    if (current && !current.closed) current.close();
  }

  async function open() {
    if (disposed || opening.value) return;
    if (pipWindow.value && !pipWindow.value.closed) {
      pipWindow.value.focus();
      return;
    }
    error.value = '';
    if (!desktop) {
      error.value = '小窗模式仅支持桌面浏览器，请在电脑上打开本工具。';
      return;
    }
    if (!supported) {
      error.value = '当前浏览器暂不支持小窗模式。请使用支持文档画中画的桌面版 Chrome、Edge 或 Firefox 打开本工具。';
      return;
    }
    const request = ++generation;
    opening.value = true;
    let created: Window | undefined;
    try {
      // 直接在用户点击中调用，保留浏览器要求的用户激活状态。
      created = await host.documentPictureInPicture!.requestWindow({ width: 600, height: 72, preferInitialWindowPlacement: true });
      if (disposed || request !== generation) {
        if (!created.closed) created.close();
        return;
      }
      if (created.closed) throw new Error('Picture-in-Picture window was closed before initialization');
      const current = created;
      const doc = current.document;
      doc.title = 'RollLike · 小窗模式';
      doc.documentElement.lang = host.document.documentElement.lang || 'zh-CN';
      const base = doc.createElement('base');
      base.href = host.document.baseURI;
      const viewport = doc.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1';
      doc.head.append(base, viewport);
      Object.assign(doc.documentElement.style, { height: '100%', overflow: 'hidden' });
      Object.assign(doc.body.style, { margin: '0', minWidth: '0', height: '100%', overflow: 'hidden' });

      let copies: Element[] = [];
      const copyStyles = () => {
        copies.forEach((copy) => copy.remove());
        copies = Array.from(host.document.head.querySelectorAll('style, link[rel="stylesheet"]'), (source) => {
          const copy = source.cloneNode(true) as HTMLElement;
          if (source.tagName === 'LINK') (copy as HTMLLinkElement).href = (source as HTMLLinkElement).href;
          doc.head.append(copy);
          return copy;
        });
      };
      copyStyles();
      // 同步开发热更新与后续加载的样式。
      const observer = new MutationObserver(copyStyles);
      observer.observe(host.document.head, {
        childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ['href', 'media', 'disabled'],
      });
      const mount = doc.createElement('div');
      mount.id = 'rolllike-mini-window';
      doc.body.append(mount);
      const cleanup = () => {
        observer.disconnect();
        current.removeEventListener('pagehide', cleanup);
        if (pipWindow.value === current) {
          target.value = null;
          pipWindow.value = null;
          disposeWindow = undefined;
        }
      };
      current.addEventListener('pagehide', cleanup, { once: true });
      disposeWindow = cleanup;
      pipWindow.value = current;
      target.value = mount;
    } catch {
      if (created && !created.closed) created.close();
      if (request === generation && !disposed) {
        error.value = '小窗未能打开，请再次点击重试，并检查浏览器是否允许此网站使用画中画。';
      }
    } finally {
      if (request === generation) opening.value = false;
    }
  }

  function resize(contentHeight: number) {
    const current = pipWindow.value;
    if (!current || current.closed) return;
    if (Math.abs(current.innerHeight - contentHeight) <= 1) return;
    // resizeTo 会消耗用户激活，避免观察器重复请求或在后台反复触发失败。
    if (current.navigator.userActivation?.isActive === false) return;
    try {
      const frameHeight = Math.max(0, current.outerHeight - current.innerHeight);
      current.resizeTo(Math.max(current.innerWidth, current.outerWidth), contentHeight + frameHeight);
    } catch {
      // 受限浏览器仍可由用户拖动窗口边缘调整尺寸。
    }
  }

  onScopeDispose(() => {
    disposed = true;
    close();
  });
  return { desktop, supported, pipWindow, target, opening, error, isOpen, open, close, resize };
}
