import { nextTick, onMounted, onScopeDispose, watch, type Ref } from 'vue';

/** 测量自然内容高度，避免窗口高度反过来决定测量结果。 */
export function useMiniWindowHeight(
  pipWindow: Window,
  toolbar: Readonly<Ref<HTMLElement | null>>,
  body: Readonly<Ref<HTMLElement | null>>,
  expanded: Readonly<Ref<boolean>>,
  resize: (height: number) => void,
) {
  let observer: ResizeObserver | undefined;
  let frame: number | undefined;
  let queued = false;
  let disposed = false;

  function fit() {
    if (disposed || pipWindow.closed || !toolbar.value) return;
    const barHeight = toolbar.value.getBoundingClientRect().height;
    const bodyHeight = expanded.value ? (body.value?.getBoundingClientRect().height ?? 0) + 1 : 0;
    const frameHeight = Math.max(0, pipWindow.outerHeight - pipWindow.innerHeight);
    const maximum = Math.max(barHeight, Math.min(360, pipWindow.screen.availHeight - frameHeight - 40));
    resize(Math.ceil(Math.min(barHeight + bodyHeight, maximum)));
  }

  function scheduleFit() {
    if (queued || disposed) return;
    queued = true;
    nextTick(() => {
      if (disposed || pipWindow.closed) return;
      frame = pipWindow.requestAnimationFrame(() => {
        frame = undefined;
        queued = false;
        fit();
      });
    });
  }

  onMounted(() => {
    observer = new ResizeObserver(scheduleFit);
    if (toolbar.value) observer.observe(toolbar.value);
    if (body.value) observer.observe(body.value);
    pipWindow.addEventListener('resize', scheduleFit);
    scheduleFit();
  });
  watch(expanded, scheduleFit, { flush: 'post' });
  onScopeDispose(() => {
    disposed = true;
    observer?.disconnect();
    pipWindow.removeEventListener('resize', scheduleFit);
    if (frame !== undefined) pipWindow.cancelAnimationFrame(frame);
  });
  return { scheduleFit };
}
