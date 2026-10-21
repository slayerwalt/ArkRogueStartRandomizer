import type { InjectionKey, Ref } from 'vue';

/** 跨窗口渲染时，弹窗使用所属窗口的挂载点。 */
export const dialogTargetKey: InjectionKey<Readonly<Ref<HTMLElement | null>>> = Symbol('dialog-target');
