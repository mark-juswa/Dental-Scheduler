/**
 * useProcLabels()
 * Returns the effective procedure label map, merging user-created custom
 * procedures (stored in settings.customProcedures) on top of the built-in
 * PROC_LABELS from constants.
 *
 * Consumer usage:
 *   const PROC_LABELS = useProcLabels();
 *   <span>{PROC_LABELS[appt.procedure] || 'Other'}</span>
 */
import { useApp } from '../context/useApp.js';
import { PROC_LABELS as DEFAULTS } from '../utils/constants.js';

export function useProcLabels() {
  const { state } = useApp();
  const customProcs = state.settings?.customProcedures || [];

  // Start with built-in defaults
  const merged = { ...DEFAULTS };

  // Add every custom procedure's key → label mapping
  for (const cp of customProcs) {
    merged[cp.key] = cp.label;
  }

  return merged;
}
