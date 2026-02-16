/**
 * Build treatment summary data from visits (filtered by month/year).
 * Report structure is derived from TREATMENT_OPTIONS so it stays in sync with treatment types.
 */
import { TREATMENT_OPTIONS } from './treatmentTypes';

/**
 * Filter visits to those in the given month (1-12) and year.
 */
export function filterVisitsByMonthYear(visits, month, year) {
  return visits.filter((v) => {
    const d = new Date(v.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });
}

/**
 * Filter visits to those in the given year.
 */
export function filterVisitsByYear(visits, year) {
  return visits.filter((v) => new Date(v.date).getFullYear() === year);
}

/**
 * Build report row spec (key + label) from TREATMENT_OPTIONS so report always matches treatment types.
 * Options with subType are expanded into detailed rows (extraction → 2, fillings → 3, temporary_filling → 1).
 */
function getReportRowSpec() {
  const rows = [];
  for (const opt of TREATMENT_OPTIONS) {
    if (opt.id === 'extraction') {
      rows.push({ key: 'extraction_permanent', label: 'Extraction (Permanent Teeth)' });
      rows.push({ key: 'extraction_temporary', label: 'Extraction (Temporary Teeth)' });
    } else if (opt.id === 'fillings') {
      rows.push({ key: 'fillings_number_teeth', label: 'Fillings – Number of teeth' });
      rows.push({ key: 'fillings_gi_per_surface', label: 'Fillings – Glass Ionomer per surface' });
      rows.push({ key: 'fillings_composite_per_surface', label: 'Fillings – Synthetic/Composite per surface' });
    } else if (opt.id === 'temporary_filling') {
      rows.push({ key: 'temporary_filling_per_surface', label: 'Temporary Filling per Surface' });
    } else {
      rows.push({ key: opt.id, label: opt.label });
    }
  }
  return rows;
}

const REPORT_ROW_SPEC = getReportRowSpec();
const REPORT_ROW_KEYS = REPORT_ROW_SPEC.map((r) => r.key);
const REPORT_ROW_LABELS = Object.fromEntries(REPORT_ROW_SPEC.map((r) => [r.key, r.label]));

/**
 * Parse a single treatment string and return updates to add to the detailed totals.
 * Returns a partial object like { extraction_permanent: 2 } or { oral_prophylaxis: 1 }.
 */
function parseTreatmentForReport(t) {
  const s = (t || '').trim();
  if (!s) return null;

  // Extraction (Permanent Teeth: N) and/or (Temporary Teeth: M)
  if (s.startsWith('Extraction (')) {
    const out = {};
    const permMatch = s.match(/Permanent Teeth:\s*(\d+)/i);
    const tempMatch = s.match(/Temporary Teeth:\s*(\d+)/i);
    if (permMatch) out.extraction_permanent = parseInt(permMatch[1], 10);
    if (tempMatch) out.extraction_temporary = parseInt(tempMatch[1], 10);
    if (!permMatch && !tempMatch && s.includes('Teeth')) {
      if (s.includes('Permanent')) out.extraction_permanent = 1;
      else if (s.includes('Temporary')) out.extraction_temporary = 1;
    }
    if (Object.keys(out).length) return out;
    return { extraction_permanent: 1 };
  }

  // Fillings / Restorations (N teeth, GI: X, Composite: Y)
  if (s.startsWith('Fillings / Restorations (')) {
    const m = s.match(/\((\d+)\s*teeth,\s*GI:\s*(\d+),\s*Composite:\s*(\d+)\)/i);
    if (m) {
      return {
        fillings_number_teeth: parseInt(m[1], 10),
        fillings_gi_per_surface: parseInt(m[2], 10),
        fillings_composite_per_surface: parseInt(m[3], 10),
      };
    }
    return { fillings_number_teeth: 1, fillings_gi_per_surface: 0, fillings_composite_per_surface: 0 };
  }

  // Temporary Filling per Surface (N)
  if (s.startsWith('Temporary Filling per Surface (')) {
    const m = s.match(/\((\d+)\)/);
    return { temporary_filling_per_surface: m ? parseInt(m[1], 10) : 1 };
  }

  // Exact label match – any treatment type from TREATMENT_OPTIONS (simple ones, no subType detail)
  const opt = TREATMENT_OPTIONS.find((o) => o.label === s);
  if (opt && !opt.subType) return { [opt.id]: 1 };
  return { others: 1 };
}

/**
 * Aggregate visits into detailed report totals (extraction perm/temp, fillings teeth/GI/composite, etc.).
 */
export function aggregateTreatmentsDetailed(visits) {
  const totals = {};
  REPORT_ROW_KEYS.forEach((k) => { totals[k] = 0; });

  visits.forEach((visit) => {
    if (!visit.treatmentTypes || !visit.treatmentTypes.length) return;
    visit.treatmentTypes.forEach((treatment) => {
      const update = parseTreatmentForReport(treatment);
      if (update) {
        Object.entries(update).forEach(([key, value]) => {
          if (totals[key] !== undefined) totals[key] += value;
        });
      }
    });
  });
  return totals;
}

/**
 * Build Excel rows for the detailed report (all rows in fixed order).
 */
function buildDetailedReportRows(totals, title) {
  const rows = [
    [title],
    [],
    ['Treatment Type', 'Count'],
  ];
  REPORT_ROW_KEYS.forEach((key) => {
    rows.push([REPORT_ROW_LABELS[key], totals[key] || 0]);
  });
  return rows;
}

/**
 * Build rows for Excel (monthly): title "Treatment summary for [Month] [Year]"
 */
export function buildSummaryRows(aggregated, month, year) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const title = `Treatment summary for ${monthNames[month - 1]} ${year}`;
  return buildDetailedReportRows(aggregated, title);
}

/**
 * Build rows for Excel (yearly): title "Treatment summary for [Year]"
 */
export function buildSummaryRowsForYear(aggregated, year) {
  const title = `Treatment summary for ${year}`;
  return buildDetailedReportRows(aggregated, title);
}

/** Legacy: aggregate for pie chart (big titles only). Derived from TREATMENT_OPTIONS + detailed totals. */
export function aggregateTreatmentsFromVisits(visits) {
  const detailed = aggregateTreatmentsDetailed(visits);
  const counts = {};
  for (const opt of TREATMENT_OPTIONS) {
    if (opt.id === 'extraction') {
      counts[opt.label] = (detailed.extraction_permanent || 0) + (detailed.extraction_temporary || 0);
    } else if (opt.id === 'fillings') {
      const hasFillings = (detailed.fillings_number_teeth || 0) + (detailed.fillings_gi_per_surface || 0) + (detailed.fillings_composite_per_surface || 0) > 0;
      counts[opt.label] = hasFillings ? 1 : 0;
    } else if (opt.id === 'temporary_filling') {
      counts[opt.label] = detailed.temporary_filling_per_surface || 0;
    } else {
      counts[opt.label] = detailed[opt.id] || 0;
    }
  }
  return counts;
}

/**
 * Generate and download an Excel file for the treatment summary.
 * @param {Array} visits - All visits (will be filtered by period)
 * @param {'monthly'|'yearly'} range - 'monthly' = one month, 'yearly' = full year
 * @param {number} month - 1-12 (used when range === 'monthly')
 * @param {number} year - e.g. 2025
 */
export async function downloadTreatmentSummaryExcel(visits, range, month, year) {
  const XLSX = await import('xlsx');
  const lib = XLSX.default || XLSX;
  const filtered = range === 'yearly'
    ? filterVisitsByYear(visits, year)
    : filterVisitsByMonthYear(visits, month, year);
  const aggregated = aggregateTreatmentsDetailed(filtered);
  const rows = range === 'yearly'
    ? buildSummaryRowsForYear(aggregated, year)
    : buildSummaryRows(aggregated, month, year);
  // Add total visits row at the end
  rows.push([]);
  rows.push(['Total visits in period', filtered.length]);

  const ws = lib.utils.aoa_to_sheet(rows);
  const colWidths = [{ wch: 40 }, { wch: 18 }];
  ws['!cols'] = colWidths;
  const wb = lib.utils.book_new();
  lib.utils.book_append_sheet(wb, ws, 'Treatment Summary');
  const fileName = range === 'yearly'
    ? `treatment-summary-${year}.xlsx`
    : `treatment-summary-${year}-${String(month).padStart(2, '0')}.xlsx`;
  lib.writeFile(wb, fileName);
}
