/**
 * Compute current age in full years from date of birth.
 * If birthday hasn't occurred yet this year, age is one less.
 * Returns null if dob is missing or invalid.
 * Age updates as time passes (computed from DOB each time).
 */
export function getAgeFromDOB(dob) {
  if (dob == null || dob === '') return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return age < 0 ? null : age;
}
