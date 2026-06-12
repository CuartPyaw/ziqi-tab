/**
 * Settings — settings panel with dual-column layout, search bar width control.
 */

const elSettingsBtn = document.getElementById('settings-toggle');
const elDialog = document.getElementById('settings-dialog');
const elSlider = document.getElementById('search-width');
const elValue = document.getElementById('search-width-value');
const elSave = document.getElementById('settings-save');
const WIDTH_KEY = 'ziqi-search-width';

/* ── Search bar width ──────────────────── */

function getStoredWidth() {
  try {
    const v = localStorage.getItem(WIDTH_KEY);
    if (v !== null) {
      const n = parseInt(v, 10);
      if (n >= 360 && n <= 720) return n;
    }
  } catch (_) { /* fall through */ }
  return 520;
}

/* stored value = what's actually applied (the last saved state) */
let storedWidth = 520;

function applyWidth(val) {
  document.documentElement.style.setProperty('--search-width', val + 'px');
}

function saveWidth(val) {
  storedWidth = val;
  localStorage.setItem(WIDTH_KEY, String(val));
  applyWidth(val);
}

/* ── Slider (preview only) ─────────────── */

function updateDisplay() {
  elValue.textContent = elSlider.value + 'px';
}

/* ── Dialog ────────────────────────────── */

function openDialog() {
  // Set slider to currently saved value
  elSlider.value = storedWidth;
  updateDisplay();
  elDialog.showModal();
}

function closeDialog() {
  elDialog.close();
}

function handleSave() {
  saveWidth(Number(elSlider.value));
  closeDialog();
}

function handleCancel() {
  // Revert to stored value on cancel
  elSlider.value = storedWidth;
  updateDisplay();
  closeDialog();
}

/* ── Init ──────────────────────────────── */

export function initSettings() {
  // Restore saved width
  storedWidth = getStoredWidth();
  applyWidth(storedWidth);

  // Slider — preview only, no side effects
  elSlider.addEventListener('input', updateDisplay);

  // Save button → persist + apply
  elSave.addEventListener('click', handleSave);

  // Cancel / close button
  elDialog.querySelector('[value="cancel"]').addEventListener('click', handleCancel);

  // Open
  elSettingsBtn.addEventListener('click', openDialog);

  // Close on backdrop click → treat as cancel
  elDialog.addEventListener('click', (e) => {
    if (e.target === elDialog) handleCancel();
  });

  // ESC → cancel
  elDialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    handleCancel();
  });

}
