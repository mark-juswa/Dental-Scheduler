/**
 * useProcColors()
 * Returns the effective procedure color map, merging user-saved custom colors
 * (stored in settings.procColors) on top of the built-in defaults.
 *
 * Each entry: { bg, border, text }
 * Consumer usage:
 *   const PROC_COLORS = useProcColors();
 */
import { useApp } from '../context/useApp.js';
import { PROC_COLORS as DEFAULTS } from '../utils/constants.js';

export function useProcColors() {
  const { state } = useApp();
  const custom = state.settings?.procColors || {};

  // Merge custom overrides per-procedure, per-channel
  const merged = {};
  for (const key of Object.keys(DEFAULTS)) {
    merged[key] = { ...DEFAULTS[key], ...(custom[key] || {}) };
  }
  return merged;
}
