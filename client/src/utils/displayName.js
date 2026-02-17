/**
 * Format child name for display: "Last name First name" (e.g. "Tan Michelle").
 * Uses firstName/lastName when present; otherwise parses fullName (last word = last name).
 */
export function formatChildDisplayName(child) {
  if (!child) return '';
  let ln = (child.lastName != null && child.lastName !== '') ? child.lastName.trim() : '';
  let fn = (child.firstName != null && child.firstName !== '') ? child.firstName.trim() : '';
  if (!ln && !fn && child.fullName) {
    const parts = (child.fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      ln = parts.pop();
      fn = parts.join(' ');
    } else if (parts.length === 1) {
      fn = parts[0];
    }
  }
  return [ln, fn].filter(Boolean).join(' ') || (child.fullName || '').trim() || '';
}
