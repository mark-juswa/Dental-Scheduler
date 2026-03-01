export const PHT = 'Asia/Manila';

export const PROC_COLORS = {
  extraction:      { bg: '#fee2e2', border: '#dc2626', text: '#7f1d1d' },
  filling:         { bg: '#dbeafe', border: '#1d4ed8', text: '#1e3a8a' },
  oralProphylaxis: { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  denture:         { bg: '#fce7f3', border: '#db2777', text: '#831843' },
  ortho:           { bg: '#fefce8', border: '#ca8a04', text: '#713f12' },
  prosto:          { bg: '#ede9fe', border: '#6d28d9', text: '#4c1d95' },
  consultation:    { bg: '#f0fdf4', border: '#059669', text: '#064e3b' },
  other:           { bg: '#f1f5f9', border: '#64748b', text: '#1e293b' },
  cleaning:        { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  rootCanal:       { bg: '#ffedd5', border: '#ea580c', text: '#7c2d12' },
  orthodontics:    { bg: '#fefce8', border: '#ca8a04', text: '#713f12' },
  whitening:       { bg: '#cffafe', border: '#0891b2', text: '#164e63' },
};

export const PROC_LABELS = {
  extraction: 'Extraction', filling: 'Filling', oralProphylaxis: 'Oral Prophylaxis',
  denture: 'Denture', ortho: 'Ortho', prosto: 'Prosto', consultation: 'Consultation', other: 'Other',
  cleaning: 'Cleaning', rootCanal: 'Root Canal', orthodontics: 'Orthodontics', whitening: 'Whitening',
};

export const DOCTOR_COLORS = { dr1: '#2563eb', dr2: '#7c3aed' };

export const PROCEDURES = [
  { value: 'extraction',      label: 'Extraction' },
  { value: 'filling',         label: 'Filling' },
  { value: 'oralProphylaxis', label: 'Oral Prophylaxis' },
  { value: 'denture',         label: 'Denture' },
  { value: 'ortho',           label: 'Ortho' },
  { value: 'prosto',          label: 'Prosto' },
  { value: 'consultation',    label: 'Consultation' },
  { value: 'other',           label: 'Other' },
];

export const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];