/**
 * Philippine Address Utility
 * Wraps the phil-reg-prov-mun-brgy package with a clean API.
 * Data source: PSGC (Philippine Standard Geographic Code)
 */
import ph from 'phil-reg-prov-mun-brgy';

/** Capitalize each word, e.g. "CAMARINES NORTE" → "Camarines Norte" */
function toTitle(str) {
  return str
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** All regions sorted alphabetically by name */
export function getRegions() {
  return [...ph.regions]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(r => ({ code: r.reg_code, name: toTitle(r.name) }));
}

/** Provinces for a given region code */
export function getProvinces(regionCode) {
  if (!regionCode) return [];
  return ph.getProvincesByRegion(regionCode)
    .map(p => ({ code: p.prov_code, name: toTitle(p.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Cities/Municipalities for a given province code */
export function getCities(provinceCode) {
  if (!provinceCode) return [];
  return ph.getCityMunByProvince(provinceCode)
    .map(c => ({ code: c.mun_code, name: toTitle(c.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Barangays for a given city/municipality code */
export function getBarangays(cityCode) {
  if (!cityCode) return [];
  return ph.getBarangayByMun(cityCode)
    .map(b => ({ name: toTitle(b.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Given saved address parts, build the formatted address string.
 * Format: "Barangay, City, Province, Region"
 */
export function buildAddressString({ barangay, city, province, region }) {
  return [barangay, city, province, region].filter(Boolean).join(', ');
}

/**
 * Default selections for Camarines Norte, Region V
 */
export const DEFAULTS = {
  regionCode: '05',
  regionName: 'Region V (Bicol Region)',
  provinceCode: '0516',
  provinceName: 'Camarines Norte',
};

/**
 * Parse a saved address string back into structured addr state.
 * Format expected: "Barangay, City, Province, Region"  (1–4 comma-separated parts)
 *
 * Strategy: match province name against PSGC data, then city, then barangay.
 * Returns a full addr object, or EMPTY_ADDR if the string can't be parsed.
 */
export function parseAddressString(raw) {
  const empty = { region: '', regionCode: '', province: '', provinceCode: '', city: '', cityCode: '', barangay: '' };
  if (!raw || !raw.trim()) return empty;

  // Split into parts: [barangay?, city?, province?, region?]
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return empty;

  // Work from the right: last part = region, second-to-last = province, etc.
  const regionRaw   = parts.length >= 1 ? parts[parts.length - 1] : '';
  const provinceRaw = parts.length >= 2 ? parts[parts.length - 2] : '';
  const cityRaw     = parts.length >= 3 ? parts[parts.length - 3] : '';
  const barangayRaw = parts.length >= 4 ? parts[parts.length - 4] : '';

  // Match region (fuzzy: compare lower-cased)
  const regions = getRegions();
  const region = regions.find(r => r.name.toLowerCase() === regionRaw.toLowerCase());
  if (!region) return { ...empty, region: regionRaw };

  // Match province within that region
  const provinces = getProvinces(region.code);
  const province = provinces.find(p => p.name.toLowerCase() === provinceRaw.toLowerCase());
  if (!province) return { ...empty, region: region.name, regionCode: region.code, province: provinceRaw };

  // Match city within that province
  const cities = getCities(province.code);
  const city = cities.find(c => c.name.toLowerCase() === cityRaw.toLowerCase());
  if (!city) return {
    ...empty,
    region: region.name, regionCode: region.code,
    province: province.name, provinceCode: province.code,
    city: cityRaw,
  };

  // Match barangay within that city
  const barangays = getBarangays(city.code);
  const barangay = barangays.find(b => b.name.toLowerCase() === barangayRaw.toLowerCase());

  return {
    region:       region.name,
    regionCode:   region.code,
    province:     province.name,
    provinceCode: province.code,
    city:         city.name,
    cityCode:     city.code,
    barangay:     barangay?.name || barangayRaw,
  };
}
