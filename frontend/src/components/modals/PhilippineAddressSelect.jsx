/**
 * PhilippineAddressSelect
 * A cascading (dependent) dropdown for Philippine addresses.
 *
 * Props:
 *   value    – { region, regionCode, province, provinceCode, city, cityCode, barangay }
 *   onChange – called with updated value object whenever any field changes
 */
import { useMemo, useEffect } from 'react';
import {
  getRegions,
  getProvinces,
  getCities,
  getBarangays,
  DEFAULTS,
} from '../../utils/phAddress.js';

export default function PhilippineAddressSelect({ value = {}, onChange, isNew = false }) {
  const regions   = useMemo(() => getRegions(), []);
  const provinces = useMemo(() => getProvinces(value.regionCode), [value.regionCode]);
  const cities    = useMemo(() => getCities(value.provinceCode), [value.provinceCode]);
  const barangays = useMemo(() => getBarangays(value.cityCode), [value.cityCode]);

  // Only pre-select Camarines Norte default when creating a NEW record
  useEffect(() => {
    if (isNew && !value.regionCode) {
      const defaultProvs = getProvinces(DEFAULTS.regionCode);
      const camNorte = defaultProvs.find(p => p.code === DEFAULTS.provinceCode);
      onChange({
        region:       DEFAULTS.regionName,
        regionCode:   DEFAULTS.regionCode,
        province:     camNorte?.name || DEFAULTS.provinceName,
        provinceCode: DEFAULTS.provinceCode,
        city:         '',
        cityCode:     '',
        barangay:     '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  function handleRegion(e) {
    const code = e.target.value;
    const name = regions.find(r => r.code === code)?.name || '';
    onChange({ region: name, regionCode: code, province: '', provinceCode: '', city: '', cityCode: '', barangay: '' });
  }

  function handleProvince(e) {
    const code = e.target.value;
    const name = provinces.find(p => p.code === code)?.name || '';
    onChange({ ...value, province: name, provinceCode: code, city: '', cityCode: '', barangay: '' });
  }

  function handleCity(e) {
    const code = e.target.value;
    const name = cities.find(c => c.code === code)?.name || '';
    onChange({ ...value, city: name, cityCode: code, barangay: '' });
  }

  function handleBarangay(e) {
    const name = e.target.value;
    onChange({ ...value, barangay: name });
  }

  const selectClass = 'form-input';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Row 1: Region + Province */}
      <div className="field-grid-2">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Region *</label>
          <select className={selectClass} value={value.regionCode || ''} onChange={handleRegion}>
            <option value="">— Select Region —</option>
            {regions.map(r => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Province *</label>
          <select
            className={selectClass}
            value={value.provinceCode || ''}
            onChange={handleProvince}
            disabled={!value.regionCode}
          >
            <option value="">— Select Province —</option>
            {provinces.map(p => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: City/Municipality + Barangay */}
      <div className="field-grid-2">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>City / Municipality *</label>
          <select
            className={selectClass}
            value={value.cityCode || ''}
            onChange={handleCity}
            disabled={!value.provinceCode}
          >
            <option value="">— Select City / Municipality —</option>
            {cities.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Barangay *</label>
          <select
            className={selectClass}
            value={value.barangay || ''}
            onChange={handleBarangay}
            disabled={!value.cityCode}
          >
            <option value="">— Select Barangay —</option>
            {barangays.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Visual hint showing full composed address */}
      {(value.barangay || value.city || value.province || value.region) && (
        <div style={{
          fontSize: 11,
          color: 'var(--text-m)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <i className="fa fa-map-marker-alt" style={{ color: 'var(--primary)', fontSize: 11 }}></i>
          <span>
            {[value.barangay, value.city, value.province, value.region]
              .filter(Boolean)
              .join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}
