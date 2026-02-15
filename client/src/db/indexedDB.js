import Dexie from 'dexie';
import { API_BASE_URL, getApiPath } from '../config';

const db = new Dexie('ToothAidDB');

db.version(24).stores({
  children: 'childId, fullName, school, barangay, updatedAt',
  visits: 'visitId, childId, date, createdAt',
  outbox: 'opId, ts, action, entityId',
  meta: 'key',
  clinicDays: 'clinicDayId, date, school, createdAt',
  appointments: 'appointmentId, childId, clinicDayId, status, createdAt'
});

// Helper to get/set metadata
export const getMeta = async (key) => {
  const record = await db.meta.get(key);
  return record ? record.value : null;
};

export const setMeta = async (key, value) => {
  await db.meta.put({ key, value });
};

// Get device ID
export const getDeviceId = async () => {
  let deviceId = await getMeta('deviceId');
  if (!deviceId) {
    deviceId = `device-${crypto.randomUUID()}`;
    await setMeta('deviceId', deviceId);
  }
  return deviceId;
};

// Get last sync time
export const getLastSyncAt = async () => {
  return await getMeta('lastSyncAt');
};

export const setLastSyncAt = async (timestamp) => {
  await setMeta('lastSyncAt', timestamp);
};

// Outbox operations
export const addToOutbox = async (action, entityId, payload) => {
  const opId = crypto.randomUUID();
  const deviceId = await getDeviceId();
  const op = {
    opId,
    deviceId,
    ts: new Date().toISOString(),
    action,
    entityId,
    payload
  };
  await db.outbox.add(op);
  return op;
};

export const getOutboxOps = async () => {
  return await db.outbox.toArray();
};

export const removeFromOutbox = async (opIds) => {
  await db.outbox.bulkDelete(opIds);
};

// Children operations
export const getAllChildren = async () => {
  return await db.children.toArray();
};

export const getChild = async (childId) => {
  return await db.children.get(childId);
};

export const searchChildren = async (query) => {
  const lowerQuery = query.toLowerCase();
  return await db.children
    .filter(child => 
      child.fullName.toLowerCase().includes(lowerQuery) ||
      child.school.toLowerCase().includes(lowerQuery) ||
      child.barangay.toLowerCase().includes(lowerQuery)
    )
    .toArray();
};

export const upsertChild = async (childData) => {
  await db.children.put(childData);
  return childData;
};

// Delete child and cascade to visits and appointments
export const deleteChild = async (childId) => {
  // Delete all visits for this child
  await db.visits.where('childId').equals(childId).delete();
  // Delete all appointments for this child
  await db.appointments.where('childId').equals(childId).delete();
  // Delete the child record
  await db.children.delete(childId);
};

// Check for possible duplicates
export const checkDuplicates = async (childData) => {
  const { school, fullName, dob, age } = childData;
  const matches = await db.children
    .filter(child => {
      if (child.school !== school) return false;
      const nameSimilar = child.fullName.toLowerCase().includes(fullName.toLowerCase()) ||
                         fullName.toLowerCase().includes(child.fullName.toLowerCase());
      if (!nameSimilar) return false;
      
      if (dob && child.dob) {
        return Math.abs(new Date(dob) - new Date(child.dob)) < 86400000; // Same day
      }
      if (age && child.age) {
        return Math.abs(age - child.age) <= 1; // Within 1 year
      }
      return false;
    })
    .toArray();
  
  return matches;
};

// Visits operations
export const getVisitsByChild = async (childId) => {
  return await db.visits
    .where('childId')
    .equals(childId)
    .sortBy('date');
};

export const getAllVisits = async () => {
  return await db.visits.toArray();
};

// Get only manually added visits (exclude auto-generated missed appointment visits)
export const getManualVisits = async () => {
  const allVisits = await db.visits.toArray();
  // Filter out visits that were auto-generated from missed appointments
  // These have notes containing "Missed appointment on" and "Reschedule needed"
  return allVisits.filter(visit => {
    if (!visit.notes) return true; // Keep visits without notes
    // Exclude if notes contain the auto-generated pattern
    const notes = visit.notes.toLowerCase();
    return !(notes.includes('missed appointment on') && notes.includes('reschedule needed'));
  });
};

export const addVisit = async (visitData) => {
  await db.visits.add(visitData);
  return visitData;
};

// Delete a single visit
export const deleteVisit = async (visitId) => {
  await db.visits.delete(visitId);
};

// Update existing visit
export const updateVisit = async (visitData) => {
  await db.visits.put(visitData);
  return visitData;
};

// Get a single visit by ID
export const getVisit = async (visitId) => {
  return await db.visits.get(visitId);
};

// Calculate tier for a visit
const calculateTier = (visit) => {
  // Tier 1: EMERGENCY - swelling OR pain
  if (visit.swellingFlag || visit.painFlag) {
    return 1; // Emergency
  }
  
  // Tier 2: HIGH - no pain, no swelling, but decayedTeeth >= 3
  const decayed = visit.decayedTeeth !== null && visit.decayedTeeth !== undefined ? visit.decayedTeeth : 0;
  if (decayed >= 3) {
    return 2; // High
  }
  
  // Tier 3: ROUTINE - everything else
  return 3; // Routine
};

// Calculate urgency score for a visit
const calculateUrgencyScore = (visit) => {
  let score = 0;
  
  // +100 if swelling
  if (visit.swellingFlag) score += 100;
  
  // +60 if pain
  if (visit.painFlag) score += 60;
  
  // +10 × decayedTeeth
  const decayed = visit.decayedTeeth !== null && visit.decayedTeeth !== undefined ? visit.decayedTeeth : 0;
  score += 10 * decayed;
  
  // +2 × missingTeeth
  const missing = visit.missingTeeth !== null && visit.missingTeeth !== undefined ? visit.missingTeeth : 0;
  score += 2 * missing;
  
  // +1 × filledTeeth
  const filled = visit.filledTeeth !== null && visit.filledTeeth !== undefined ? visit.filledTeeth : 0;
  score += 1 * filled;
  
  return score;
};

// High-risk visits with tiered ranking
export const getHighRiskVisits = async () => {
  // Get all visits (not just pain/swelling, to include all tiers)
  const visits = await db.visits.toArray();
  
  // Group visits by childId and keep only the latest visit for each child
  const visitsByChild = {};
  visits.forEach(visit => {
    const childId = visit.childId;
    if (!visitsByChild[childId]) {
      visitsByChild[childId] = visit;
    } else {
      // Compare dates to find the most recent visit
      const existingDate = new Date(visitsByChild[childId].date);
      const currentDate = new Date(visit.date);
      
      // If dates are equal, use createdAt as tiebreaker
      if (currentDate > existingDate || 
          (currentDate.getTime() === existingDate.getTime() && 
           new Date(visit.createdAt) > new Date(visitsByChild[childId].createdAt))) {
        visitsByChild[childId] = visit;
      }
    }
  });
  
  // Get only the latest visit for each child
  const latestVisits = Object.values(visitsByChild);
  
  // Get child info for each visit and calculate tier/score
  const visitsWithChildren = await Promise.all(
    latestVisits.map(async (visit) => {
      const child = await getChild(visit.childId);
      const tier = calculateTier(visit);
      const urgencyScore = calculateUrgencyScore(visit);
      return { 
        ...visit, 
        child,
        tier,
        urgencyScore,
        tierName: tier === 1 ? 'EMERGENCY' : tier === 2 ? 'HIGH' : 'ROUTINE'
      };
    })
  );
  
  // Sort by: Tier (1→2→3), then UrgencyScore (high→low), then older date first
  return visitsWithChildren.sort((a, b) => {
    // First sort by tier (Emergency → High → Routine)
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    
    // Within same tier, sort by urgency score (high → low)
    if (a.urgencyScore !== b.urgencyScore) {
      return b.urgencyScore - a.urgencyScore;
    }
    
    // If tied, older visit date first
    return new Date(a.date) - new Date(b.date);
  });
};

// Clinic Day operations
export const getAllClinicDays = async () => {
  return await db.clinicDays.orderBy('date').reverse().toArray();
};

export const getClinicDay = async (clinicDayId) => {
  return await db.clinicDays.get(clinicDayId);
};

export const getClinicDaysByDateRange = async (startDate, endDate) => {
  return await db.clinicDays
    .where('date')
    .between(startDate, endDate, true, true)
    .sortBy('date');
};

export const upsertClinicDay = async (clinicDayData) => {
  await db.clinicDays.put(clinicDayData);
  return clinicDayData;
};

// Delete clinic day and cascade to appointments
export const deleteClinicDay = async (clinicDayId) => {
  // Delete all appointments for this clinic day
  await db.appointments.where('clinicDayId').equals(clinicDayId).delete();
  // Delete the clinic day record
  await db.clinicDays.delete(clinicDayId);
};

// Appointment operations
export const getAppointment = async (appointmentId) => {
  return await db.appointments.get(appointmentId);
};

export const getAppointmentsByClinicDay = async (clinicDayId) => {
  return await db.appointments
    .where('clinicDayId')
    .equals(clinicDayId)
    .toArray();
};

export const getAppointmentsByChild = async (childId) => {
  return await db.appointments
    .where('childId')
    .equals(childId)
    .toArray();
};

export const getAllScheduledAppointments = async () => {
  return await db.appointments
    .where('status')
    .equals('SCHEDULED')
    .toArray();
};

export const upsertAppointment = async (appointmentData) => {
  await db.appointments.put(appointmentData);
  return appointmentData;
};

export const deleteAppointment = async (appointmentId) => {
  await db.appointments.delete(appointmentId);
};

export const getAppointmentCountForClinicDay = async (clinicDayId, status = null) => {
  let query = db.appointments.where('clinicDayId').equals(clinicDayId);
  if (status) {
    query = query.and(a => a.status === status);
  }
  return await query.count();
};

// Sync operations
export const syncPush = async (token) => {
  const ops = await getOutboxOps();
  if (ops.length === 0) return { ackedOpIds: [] };

  const response = await fetch(`${API_BASE_URL}${getApiPath('/sync/push')}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ ops })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = result?.error || result?.details || response.statusText;
    throw new Error(`Sync push failed: ${msg}`);
  }

  if (result.errors && result.errors.length > 0) {
    console.warn('Sync push had errors for some ops:', result.errors);
  }

  if (result.ackedOpIds && result.ackedOpIds.length > 0) {
    await removeFromOutbox(result.ackedOpIds);
  }
  return result;
};

export const syncPull = async (token, since = null, scope = 'ALL') => {
  const lastSync = since || await getLastSyncAt();
  const params = new URLSearchParams();
  if (lastSync) {
    params.append('since', lastSync);
  }
  if (scope !== 'ALL') {
    params.append('scope', scope);
  }
  const queryString = params.toString();
  const url = `${API_BASE_URL}${getApiPath('/sync/pull')}${queryString ? '?' + queryString : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Sync pull failed');
  }

  const result = await response.json();
  
  // Store children
  if (result.children && result.children.length > 0) {
    await db.children.bulkPut(result.children);
  }
  
  // Store visits
  if (result.visits && result.visits.length > 0) {
    await db.visits.bulkPut(result.visits);
  }
  
  // Store clinic days
  if (result.clinicDays && result.clinicDays.length > 0) {
    await db.clinicDays.bulkPut(result.clinicDays);
  }
  
  // Store appointments
  if (result.appointments && result.appointments.length > 0) {
    await db.appointments.bulkPut(result.appointments);
  }
  
  // Handle deletions: remove local records that don't exist on server
  let deletedChildrenCount = 0;
  let deletedVisitsCount = 0;
  let deletedClinicDaysCount = 0;
  let deletedAppointmentsCount = 0;
  
  if (result.allChildIds && Array.isArray(result.allChildIds)) {
    const localChildren = await db.children.toCollection().primaryKeys();
    const serverChildIds = new Set(result.allChildIds);
    const toDelete = localChildren.filter(id => !serverChildIds.has(id));
    
    if (toDelete.length > 0) {
      // Also delete visits for deleted children
      const deletedChildIds = new Set(toDelete);
      const allVisits = await db.visits.toArray();
      const visitsToDelete = allVisits
        .filter(v => deletedChildIds.has(v.childId))
        .map(v => v.visitId);
      
      if (visitsToDelete.length > 0) {
        await db.visits.bulkDelete(visitsToDelete);
        deletedVisitsCount = visitsToDelete.length;
      }
      
      await db.children.bulkDelete(toDelete);
      deletedChildrenCount = toDelete.length;
    }
  }
  
  if (result.allVisitIds && Array.isArray(result.allVisitIds)) {
    const localVisits = await db.visits.toCollection().primaryKeys();
    const serverVisitIds = new Set(result.allVisitIds);
    const toDelete = localVisits.filter(id => !serverVisitIds.has(id));
    
    if (toDelete.length > 0) {
      await db.visits.bulkDelete(toDelete);
      deletedVisitsCount += toDelete.length;
    }
  }
  
  if (result.allClinicDayIds && Array.isArray(result.allClinicDayIds)) {
    const localClinicDays = await db.clinicDays.toCollection().primaryKeys();
    const serverClinicDayIds = new Set(result.allClinicDayIds);
    const toDelete = localClinicDays.filter(id => !serverClinicDayIds.has(id));
    
    if (toDelete.length > 0) {
      // Also delete appointments for deleted clinic days
      const deletedClinicDayIds = new Set(toDelete);
      const allAppointments = await db.appointments.toArray();
      const appointmentsToDelete = allAppointments
        .filter(a => deletedClinicDayIds.has(a.clinicDayId))
        .map(a => a.appointmentId);
      
      if (appointmentsToDelete.length > 0) {
        await db.appointments.bulkDelete(appointmentsToDelete);
        deletedAppointmentsCount += appointmentsToDelete.length;
      }
      
      await db.clinicDays.bulkDelete(toDelete);
      deletedClinicDaysCount = toDelete.length;
    }
  }
  
  if (result.allAppointmentIds && Array.isArray(result.allAppointmentIds)) {
    const localAppointments = await db.appointments.toCollection().primaryKeys();
    const serverAppointmentIds = new Set(result.allAppointmentIds);
    const toDelete = localAppointments.filter(id => !serverAppointmentIds.has(id));
    
    if (toDelete.length > 0) {
      await db.appointments.bulkDelete(toDelete);
      deletedAppointmentsCount += toDelete.length;
    }
  }
  
  // Return deletion count for UI feedback
  result.deletedCount = deletedChildrenCount + deletedVisitsCount + deletedClinicDaysCount + deletedAppointmentsCount;
  
  // Update last sync time
  if (result.serverTime) {
    await setLastSyncAt(result.serverTime);
  }
  
  return result;
};

export const performSync = async (token) => {
  try {
    // Push first
    await syncPush(token);
    
    // Then pull (this handles deletions and sets deletedCount on result)
    const pullResult = await syncPull(token);
    
    return { 
      success: true, 
      deletedCount: pullResult.deletedCount || 0,
      message: (pullResult.deletedCount || 0) > 0 
        ? `Sync completed. Removed ${pullResult.deletedCount} deleted record(s).` 
        : 'Sync completed successfully!'
    };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: error.message };
  }
};

export default db;
