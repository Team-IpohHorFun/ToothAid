import express from 'express';
import Child from '../models/Child.js';
import Visit from '../models/Visit.js';
import ClinicDay from '../models/ClinicDay.js';
import Appointment from '../models/Appointment.js';
import ProcessedOp from '../models/ProcessedOp.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Push operations from client
router.post('/push', authenticateToken, async (req, res) => {
  try {
    const { ops } = req.body;
    if (!Array.isArray(ops)) {
      return res.status(400).json({ error: 'ops must be an array' });
    }

    const ackedOpIds = [];
    const errors = [];

    for (const op of ops) {
      try {
        // Check if operation already processed (idempotency)
        const existing = await ProcessedOp.findOne({ opId: op.opId });
        if (existing) {
          ackedOpIds.push(op.opId);
          continue;
        }

        // Process operation based on action
        const username = req.user?.username || 'unknown';
        
        if (op.action === 'UPSERT_CHILD') {
          const childData = op.payload;
          // Ensure createdBy is set (use username from token, fallback to payload, then deviceId)
          if (!childData.createdBy) {
            childData.createdBy = username;
          }
          // Set updatedBy to current user if updating
          const existing = await Child.findOne({ childId: childData.childId });
          if (existing) {
            childData.updatedBy = username;
          } else if (!childData.updatedBy) {
            childData.updatedBy = childData.createdBy;
          }
          await Child.findOneAndUpdate(
            { childId: childData.childId },
            childData,
            { upsert: true, new: true }
          );
        } else if (op.action === 'ADD_VISIT') {
          const payload = op.payload;
          // Create clean visitData with only allowed fields
          const visitData = {
            visitId: payload.visitId,
            childId: payload.childId,
            date: payload.date,
            type: payload.type,
            painFlag: payload.painFlag || false,
            swellingFlag: payload.swellingFlag || false,
            decayedTeeth: payload.decayedTeeth !== undefined ? payload.decayedTeeth : null,
            missingTeeth: payload.missingTeeth !== undefined ? payload.missingTeeth : null,
            filledTeeth: payload.filledTeeth !== undefined ? payload.filledTeeth : null,
            treatmentTypes: payload.treatmentTypes || [],
            notes: payload.notes || null,
            createdBy: payload.createdBy || username,
            createdAt: payload.createdAt || new Date()
          };
          
          // Check if visit already exists
          const existingVisit = await Visit.findOne({ visitId: visitData.visitId });
          if (!existingVisit) {
            await Visit.create(visitData);
          } else {
            // Update existing visit and explicitly remove old fields
            await Visit.findOneAndUpdate(
              { visitId: visitData.visitId },
              { 
                $set: visitData,
                $unset: { referralFlag: '', dmft: '', DMFT: '' }
              },
              { new: true }
            );
          }
        } else if (op.action === 'UPSERT_CLINIC_DAY') {
          const clinicDayData = { ...op.payload };
          if (!clinicDayData.createdBy) {
            clinicDayData.createdBy = username;
          }
          // Convert date strings to Date objects
          if (clinicDayData.date && typeof clinicDayData.date === 'string') {
            clinicDayData.date = new Date(clinicDayData.date);
          }
          if (clinicDayData.createdAt && typeof clinicDayData.createdAt === 'string') {
            clinicDayData.createdAt = new Date(clinicDayData.createdAt);
          }
          const result = await ClinicDay.findOneAndUpdate(
            { clinicDayId: clinicDayData.clinicDayId },
            clinicDayData,
            { upsert: true, new: true, runValidators: true }
          );
          console.log(`✓ UPSERT_CLINIC_DAY: ${clinicDayData.clinicDayId}`);
        } else if (op.action === 'UPSERT_APPOINTMENT') {
          const appointmentData = { ...op.payload };
          if (!appointmentData.createdBy) {
            appointmentData.createdBy = username;
          }
          // Convert date strings to Date objects
          if (appointmentData.createdAt && typeof appointmentData.createdAt === 'string') {
            appointmentData.createdAt = new Date(appointmentData.createdAt);
          }
          const result = await Appointment.findOneAndUpdate(
            { appointmentId: appointmentData.appointmentId },
            appointmentData,
            { upsert: true, new: true, runValidators: true }
          );
          console.log(`✓ UPSERT_APPOINTMENT: ${appointmentData.appointmentId}`);
        } else if (op.action === 'DELETE_APPOINTMENT') {
          const { appointmentId } = op.payload;
          await Appointment.findOneAndDelete({ appointmentId });
          console.log(`✓ DELETE_APPOINTMENT: ${appointmentId}`);
        } else if (op.action === 'DELETE_CLINIC_DAY') {
          // Delete clinic day and cascade to appointments
          const { clinicDayId } = op.payload;
          const deletedAppointments = await Appointment.deleteMany({ clinicDayId });
          await ClinicDay.findOneAndDelete({ clinicDayId });
          console.log(`✓ DELETE_CLINIC_DAY: ${clinicDayId} (${deletedAppointments.deletedCount} appointments)`);
        } else if (op.action === 'DELETE_CHILD') {
          // Delete child and cascade to visits and appointments
          const { childId } = op.payload;
          const deletedVisits = await Visit.deleteMany({ childId });
          const deletedAppointments = await Appointment.deleteMany({ childId });
          await Child.findOneAndDelete({ childId });
          console.log(`✓ DELETE_CHILD: ${childId} (${deletedVisits.deletedCount} visits, ${deletedAppointments.deletedCount} appointments)`);
        } else if (op.action === 'DELETE_VISIT') {
          // Delete single visit
          const { visitId } = op.payload;
          await Visit.findOneAndDelete({ visitId });
          console.log(`✓ DELETE_VISIT: ${visitId}`);
        } else if (op.action === 'UPDATE_VISIT') {
          // Update existing visit
          const payload = op.payload;
          const visitData = {
            visitId: payload.visitId,
            childId: payload.childId,
            date: payload.date,
            type: payload.type,
            painFlag: payload.painFlag || false,
            swellingFlag: payload.swellingFlag || false,
            decayedTeeth: payload.decayedTeeth !== undefined ? payload.decayedTeeth : null,
            missingTeeth: payload.missingTeeth !== undefined ? payload.missingTeeth : null,
            filledTeeth: payload.filledTeeth !== undefined ? payload.filledTeeth : null,
            treatmentTypes: payload.treatmentTypes || [],
            notes: payload.notes || null,
            updatedBy: payload.updatedBy || username,
            updatedAt: new Date()
          };
          await Visit.findOneAndUpdate(
            { visitId: visitData.visitId },
            { $set: visitData },
            { new: true }
          );
          console.log(`✓ UPDATE_VISIT: ${visitData.visitId}`);
        }

        // Mark operation as processed
        await ProcessedOp.create({ opId: op.opId });
        ackedOpIds.push(op.opId);
      } catch (error) {
        console.error(`Error processing op ${op.opId}:`, error);
        errors.push({ opId: op.opId, error: error.message });
      }
    }

    res.json({
      ackedOpIds,
      errors: errors.length > 0 ? errors : undefined,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync push error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// Pull data from server
router.get('/pull', authenticateToken, async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const scope = req.query.scope || 'ALL';

    const childrenQuery = { updatedAt: { $gte: since } };
    const visitsQuery = { createdAt: { $gte: since } };

    // Apply scope filtering (school or barangay)
    if (scope !== 'ALL') {
      // Try to parse as school or barangay
      const [type, value] = scope.split(':');
      if (type === 'school') {
        childrenQuery.school = value;
        // Get childIds for this school to filter visits
        const schoolChildren = await Child.find({ school: value }).select('childId');
        const childIds = schoolChildren.map(c => c.childId);
        visitsQuery.childId = { $in: childIds };
      } else if (type === 'barangay') {
        childrenQuery.barangay = value;
        const barangayChildren = await Child.find({ barangay: value }).select('childId');
        const childIds = barangayChildren.map(c => c.childId);
        visitsQuery.childId = { $in: childIds };
      }
    }

    const children = await Child.find(childrenQuery).lean();
    const visits = await Visit.find(visitsQuery).lean();
    
    // For clinic days and appointments, pull all records to ensure updates are synced
    // (since they don't have updatedAt fields, we can't filter by update time)
    const clinicDays = await ClinicDay.find({}).lean();
    const appointments = await Appointment.find({}).lean();

    // Remove old fields from visits (safety measure)
    const cleanedVisits = visits.map(visit => {
      const { referralFlag, dmft, DMFT, ...cleanVisit } = visit;
      return cleanVisit;
    });

    // Always include ALL current IDs for deletion detection (regardless of scope)
    // This allows immediate deletion sync when user clicks "Sync Now"
    const allChildIds = (await Child.find({}).select('childId').lean()).map(c => c.childId);
    const allVisitIds = (await Visit.find({}).select('visitId').lean()).map(v => v.visitId);
    const allClinicDayIds = (await ClinicDay.find({}).select('clinicDayId').lean()).map(c => c.clinicDayId);
    const allAppointmentIds = (await Appointment.find({}).select('appointmentId').lean()).map(a => a.appointmentId);

    res.json({
      children,
      visits: cleanedVisits,
      clinicDays,
      appointments,
      allChildIds, // All current child IDs on server (for deletion detection)
      allVisitIds, // All current visit IDs on server (for deletion detection)
      allClinicDayIds, // All current clinic day IDs on server (for deletion detection)
      allAppointmentIds, // All current appointment IDs on server (for deletion detection)
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync pull error:', error);
    res.status(500).json({ error: 'Pull failed', details: error.message });
  }
});

export default router;
