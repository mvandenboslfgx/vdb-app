/**
 * Device AAL2 TOTP entry via ADB — no stdout of code/secret.
 * Workaround for RN secureTextEntry + Maestro controlled-input gap on v5 APK.
 */
import { spawnSync } from 'node:child_process';

function adb(args) {
  return spawnSync('adb', args, { encoding: 'utf8', shell: false });
}

function sleepMs(ms) {
  spawnSync('powershell', ['-Command', `Start-Sleep -Milliseconds ${ms}`], { shell: false });
}

/**
 * @param {string} totp six digits
 */
export function submitAal2TotpViaAdb(totp) {
  if (!/^\d{6}$/.test(totp)) throw new Error('invalid_totp_format');

  adb(['shell', 'uiautomator', 'dump', '/sdcard/aal2-ui.xml']);
  adb(['shell', 'input', 'tap', '540', '1223']);
  sleepMs(400);
  adb(['shell', 'input', 'keyevent', 'KEYCODE_MOVE_END']);
  for (let i = 0; i < 8; i += 1) {
    adb(['shell', 'input', 'keyevent', 'KEYCODE_DEL']);
  }
  for (const ch of totp) {
    const key = `KEYCODE_${ch}`;
    adb(['shell', 'input', 'keyevent', key]);
    sleepMs(80);
  }
  sleepMs(400);
  adb(['shell', 'input', 'tap', '540', '750']);
  sleepMs(600);
  adb(['shell', 'input', 'tap', '540', '1520']);
  sleepMs(1200);
}

/**
 * @param {string} totp
 * @returns {boolean}
 */
export function waitForAal2ModalGone() {
  sleepMs(2000);
  adb(['shell', 'uiautomator', 'dump', '/sdcard/aal2-after.xml']);
  const pull = adb(['shell', 'cat', '/sdcard/aal2-after.xml']);
  const xml = pull.stdout ?? '';
  return !xml.includes('input-aal2-totp');
}
