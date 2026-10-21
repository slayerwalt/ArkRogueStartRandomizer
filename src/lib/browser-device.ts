type BrowserDevice = Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> & {
  userAgentData?: { mobile?: boolean };
};

/** 与窗口宽度无关；iPad 的桌面 UA 需要结合触摸能力识别。 */
export function isMobileBrowser(device: BrowserDevice): boolean {
  return Boolean(device.userAgentData?.mobile) ||
    /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(device.userAgent) ||
    (device.platform === 'MacIntel' && device.maxTouchPoints > 1);
}
