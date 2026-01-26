import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { 
  getClinicDay, 
  getHighRiskVisits, 
  getFollowUpsDue,
  getAllChildren,
  getAppointmentsByClinicDay,
  getAllScheduledAppointments,
  upsertAppointment,
  deleteAppointment,
  addToOutbox,
  performSync,
  getChild
} from '../db/indexedDB';

const BuildRoster = ({ token }) => {
  const { clinicDayId } = useParams();
  const navigate = useNavigate();
  const [clinicDay, setClinicDay] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [highRiskVisits, setHighRiskVisits] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [routineChildren, setRoutineChildren] = useState([]);
  const [allScheduledAppointments, setAllScheduledAppointments] = useState([]);
  const [rosterChildren, setRosterChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTimeWindowModal, setShowTimeWindowModal] = useState(false);
  const [pendingAdd, setPendingAdd] = useState(null); // { childId, reason, tier, urgencyScore }

  useEffect(() => {
    const loadData = async () => {
      const day = await getClinicDay(clinicDayId);
      if (!day) {
        navigate('/clinic-days');
        return;
      }
      setClinicDay(day);

      // Load appointments for this clinic day
      const rosterAppointments = await getAppointmentsByClinicDay(clinicDayId);
      setAppointments(rosterAppointments);

      // Load child data for roster
      const childrenData = await Promise.all(
        rosterAppointments.map(async (appt) => {
          const child = await getChild(appt.childId);
          return { appointment: appt, child };
        })
      );
      setRosterChildren(childrenData);

      // Load all scheduled appointments (to prevent double-booking)
      const allScheduled = await getAllScheduledAppointments();
      setAllScheduledAppointments(allScheduled);

      // Get roster child IDs (children already in this roster)
      const rosterChildIds = new Set(rosterAppointments.map(a => a.childId));

      // Get scheduled child IDs (children scheduled in OTHER clinic days)
      const scheduledChildIds = new Set(
        allScheduled
          .filter(a => a.clinicDayId !== clinicDayId)
          .map(a => a.childId)
      );

      // Load high-risk visits
      const highRisk = await getHighRiskVisits();
      // Exclude already scheduled (no school filtering)
      const filteredHighRisk = highRisk.filter(v => {
        if (!v.child) return false;
        return !rosterChildIds.has(v.childId) && !scheduledChildIds.has(v.childId);
      });
      setHighRiskVisits(filteredHighRisk);

      // Load follow-ups
      const followUpsList = await getFollowUpsDue(90); // 90 days
      // Exclude already scheduled (no school filtering)
      const filteredFollowUps = followUpsList.filter(v => {
        if (!v.child) return false;
        return !rosterChildIds.has(v.childId) && !scheduledChildIds.has(v.childId);
      });
      setFollowUps(filteredFollowUps);

      // Load routine children (all children, excluding high-risk and follow-ups)
      const allChildren = await getAllChildren();
      const highRiskChildIds = new Set(filteredHighRisk.map(v => v.childId));
      const followUpChildIds = new Set(filteredFollowUps.map(v => v.childId));
      
      const routine = allChildren
        .filter(child => {
          return !rosterChildIds.has(child.childId) && 
                 !scheduledChildIds.has(child.childId) &&
                 !highRiskChildIds.has(child.childId) &&
                 !followUpChildIds.has(child.childId);
        })
        .slice(0, 100); // Limit to first 100 for performance
      setRoutineChildren(routine);

      setLoading(false);
    };
    
    loadData();
  }, [clinicDayId, navigate]);

  const isInRoster = (childId) => {
    return appointments.some(a => a.childId === childId);
  };

  const handleAddToRoster = async (childId, reason, tier = null, urgencyScore = null, timeWindow = null) => {
    if (isInRoster(childId)) return;

    // Determine time window if not provided
    let selectedTimeWindow = timeWindow;
    if (!selectedTimeWindow && clinicDay.amCapacity !== null && clinicDay.pmCapacity !== null) {
      // Count current AM and PM appointments
      const amCount = appointments.filter(a => a.timeWindow === 'AM').length;
      const pmCount = appointments.filter(a => a.timeWindow === 'PM').length;
      
      // Check capacity
      if (amCount >= clinicDay.amCapacity && pmCount >= clinicDay.pmCapacity) {
        alert('Both AM and PM slots are full');
        return;
      }
      
      // Show modal to choose if both have space
      if (amCount < clinicDay.amCapacity && pmCount < clinicDay.pmCapacity) {
        setPendingAdd({ childId, reason, tier, urgencyScore });
        setShowTimeWindowModal(true);
        return; // Will continue after user selects
      } else if (amCount < clinicDay.amCapacity) {
        selectedTimeWindow = 'AM';
      } else {
        selectedTimeWindow = 'PM';
      }
    } else if (!selectedTimeWindow) {
      selectedTimeWindow = 'FULL';
    }

    // Continue with adding to roster
    await addToRosterWithTimeWindow(childId, reason, tier, urgencyScore, selectedTimeWindow);
  };

  const addToRosterWithTimeWindow = async (childId, reason, tier = null, urgencyScore = null, selectedTimeWindow) => {
    if (isInRoster(childId)) return;

    // Check capacity based on time window
    if (selectedTimeWindow === 'AM' && clinicDay.amCapacity !== null) {
      const amCount = appointments.filter(a => a.timeWindow === 'AM').length;
      if (amCount >= clinicDay.amCapacity) {
        alert(`AM capacity reached (${clinicDay.amCapacity})`);
        return;
      }
    } else if (selectedTimeWindow === 'PM' && clinicDay.pmCapacity !== null) {
      const pmCount = appointments.filter(a => a.timeWindow === 'PM').length;
      if (pmCount >= clinicDay.pmCapacity) {
        alert(`PM capacity reached (${clinicDay.pmCapacity})`);
        return;
      }
    } else {
      const currentCount = appointments.length;
      if (currentCount >= clinicDay.capacity) {
        alert(`Capacity reached (${clinicDay.capacity})`);
        return;
      }
    }

    setSaving(true);
    setShowTimeWindowModal(false);
    setPendingAdd(null);
    try {
      const appointmentId = `appointment-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const username = localStorage.getItem('username') || 'unknown';

      // Calculate slot number based on time window
      let slotNumber = null;
      if (selectedTimeWindow === 'AM') {
        slotNumber = appointments.filter(a => a.timeWindow === 'AM').length + 1;
      } else if (selectedTimeWindow === 'PM') {
        slotNumber = appointments.filter(a => a.timeWindow === 'PM').length + 1;
      } else {
        slotNumber = appointments.length + 1;
      }

      const appointmentData = {
        appointmentId,
        childId,
        clinicDayId,
        timeWindow: selectedTimeWindow,
        slotNumber,
        reason,
        status: 'SCHEDULED',
        priorityTier: tier,
        urgencyScore,
        createdBy: username,
        createdAt: now
      };

      await upsertAppointment(appointmentData);
      await addToOutbox('UPSERT_APPOINTMENT', appointmentId, appointmentData);

      // Update appointments state immediately
      const updatedAppointments = [...appointments, appointmentData];
      setAppointments(updatedAppointments);
      
      // Update roster children immediately
      const child = await getChild(childId);
      const newRosterChild = { appointment: appointmentData, child };
      setRosterChildren([...rosterChildren, newRosterChild]);

      // Remove child from all available lists immediately (so they disappear from UI right away)
      setHighRiskVisits(prev => prev.filter(v => v.childId !== childId));
      setFollowUps(prev => prev.filter(v => v.childId !== childId));
      setRoutineChildren(prev => prev.filter(c => c.childId !== childId));

      // Reload all scheduled appointments
      const allScheduled = await getAllScheduledAppointments();
      setAllScheduledAppointments(allScheduled);

      // Try to sync if online
      if (navigator.onLine && token) {
        try {
          await performSync(token);
        } catch (syncError) {
          console.error('Sync error:', syncError);
        }
      }
    } catch (error) {
      console.error('Error adding to roster:', error);
      alert('Failed to add to roster');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromRoster = async (appointmentId) => {
    setSaving(true);
    try {
      // Get the appointment to find the childId before deleting
      const appointmentToRemove = appointments.find(a => a.appointmentId === appointmentId);
      const removedChildId = appointmentToRemove?.childId;

      // Delete from IndexedDB locally first
      await deleteAppointment(appointmentId);
      
      // Add to outbox for sync
      await addToOutbox('DELETE_APPOINTMENT', appointmentId, { appointmentId });

      // Update appointments state immediately
      const updatedAppointments = appointments.filter(a => a.appointmentId !== appointmentId);
      setAppointments(updatedAppointments);

      // Update roster children immediately
      setRosterChildren(prev => prev.filter(rc => rc.appointment.appointmentId !== appointmentId));

      // Reload all scheduled appointments (to prevent double-booking)
      const allScheduled = await getAllScheduledAppointments();
      setAllScheduledAppointments(allScheduled);

      // Reload available children lists so the removed child reappears
      if (removedChildId) {
        // Get roster child IDs (children already in this roster)
        const rosterChildIds = new Set(updatedAppointments.map(a => a.childId));

        // Get scheduled child IDs (children scheduled in OTHER clinic days)
        const scheduledChildIds = new Set(
          allScheduled
            .filter(a => a.clinicDayId !== clinicDayId)
            .map(a => a.childId)
        );

        // Reload high-risk visits
        const highRisk = await getHighRiskVisits();
        const filteredHighRisk = highRisk.filter(v => {
          if (!v.child) return false;
          return !rosterChildIds.has(v.childId) && !scheduledChildIds.has(v.childId);
        });
        setHighRiskVisits(filteredHighRisk);

        // Reload follow-ups
        const followUpsList = await getFollowUpsDue(90);
        const filteredFollowUps = followUpsList.filter(v => {
          if (!v.child) return false;
          return !rosterChildIds.has(v.childId) && !scheduledChildIds.has(v.childId);
        });
        setFollowUps(filteredFollowUps);

        // Reload routine children
        const allChildren = await getAllChildren();
        const highRiskChildIds = new Set(filteredHighRisk.map(v => v.childId));
        const followUpChildIds = new Set(filteredFollowUps.map(v => v.childId));
        
        const routine = allChildren
          .filter(child => {
            return !rosterChildIds.has(child.childId) && 
                   !scheduledChildIds.has(child.childId) &&
                   !highRiskChildIds.has(child.childId) &&
                   !followUpChildIds.has(child.childId);
          })
          .slice(0, 100);
        setRoutineChildren(routine);
      }

      // Try to sync if online
      if (navigator.onLine && token) {
        try {
          await performSync(token);
        } catch (syncError) {
          console.error('Sync error:', syncError);
        }
      }
    } catch (error) {
      console.error('Error removing from roster:', error);
      alert('Failed to remove from roster');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoFill = async () => {
    if (saving) return;
    
    const hasAmPmCapacity = clinicDay.amCapacity !== null && clinicDay.pmCapacity !== null;
    let currentAmCount = appointments.filter(a => a.timeWindow === 'AM').length;
    let currentPmCount = appointments.filter(a => a.timeWindow === 'PM').length;
    let currentFullCount = appointments.filter(a => a.timeWindow === 'FULL').length;
    
    let remaining = 0;
    if (hasAmPmCapacity) {
      const amRemaining = clinicDay.amCapacity - currentAmCount;
      const pmRemaining = clinicDay.pmCapacity - currentPmCount;
      remaining = amRemaining + pmRemaining;
    } else {
      remaining = clinicDay.capacity - appointments.length;
    }
    
    if (remaining <= 0) {
      alert('Capacity already reached');
      return;
    }

    setSaving(true);
    try {
      // Get scheduled child IDs (from other clinic days)
      const scheduledChildIds = new Set(
        allScheduledAppointments
          .filter(a => a.clinicDayId !== clinicDayId)
          .map(a => a.childId)
      );

      // Get roster child IDs
      const rosterChildIds = new Set(appointments.map(a => a.childId));

      // Combine candidates: Emergency/High priority first, then follow-ups, then routine
      const highRiskCandidates = highRiskVisits
        .filter(v => v.tier <= 2 && v.child && !rosterChildIds.has(v.childId) && !scheduledChildIds.has(v.childId));
      
      const followUpCandidates = followUps
        .filter(v => v.child && !rosterChildIds.has(v.childId) && !scheduledChildIds.has(v.childId));
      
      const routineCandidates = routineChildren
        .filter(c => !rosterChildIds.has(c.childId) && !scheduledChildIds.has(c.childId));

      const candidates = [
        ...highRiskCandidates,
        ...followUpCandidates,
        ...routineCandidates
      ].slice(0, remaining);

      const username = localStorage.getItem('username') || 'unknown';
      const newAppointments = [];
      let updatedAmCount = currentAmCount;
      let updatedPmCount = currentPmCount;
      let updatedFullCount = currentFullCount;

      // Add candidates to roster (batch create)
      for (const candidate of candidates) {
        // Check if we still have capacity
        if (hasAmPmCapacity) {
          if (updatedAmCount >= clinicDay.amCapacity && updatedPmCount >= clinicDay.pmCapacity) {
            break; // Both full
          }
        } else {
          if (updatedAmCount + updatedPmCount + updatedFullCount >= clinicDay.capacity) {
            break; // Total capacity reached
          }
        }
        
        // Determine which slot to use
        let timeWindow = 'FULL';
        if (hasAmPmCapacity) {
          if (updatedAmCount < clinicDay.amCapacity && updatedPmCount < clinicDay.pmCapacity) {
            // Alternate between AM and PM
            timeWindow = updatedAmCount <= updatedPmCount ? 'AM' : 'PM';
          } else if (updatedAmCount < clinicDay.amCapacity) {
            timeWindow = 'AM';
          } else if (updatedPmCount < clinicDay.pmCapacity) {
            timeWindow = 'PM';
          } else {
            break; // Both full
          }
        }

        const childId = candidate.childId || candidate.child?.childId;
        if (!childId) continue;

        const reason = candidate.tier ? (candidate.tier === 1 ? 'EMERGENCY' : 'HIGH_PRIORITY') : 
                      candidate.followUpDate ? 'FOLLOW_UP' : 'ROUTINE';
        const tier = candidate.tier || null;
        const urgencyScore = candidate.urgencyScore || null;

        // Calculate slot number
        let slotNumber = null;
        if (timeWindow === 'AM') {
          slotNumber = updatedAmCount + 1;
          updatedAmCount++;
        } else if (timeWindow === 'PM') {
          slotNumber = updatedPmCount + 1;
          updatedPmCount++;
        } else {
          slotNumber = updatedFullCount + 1;
          updatedFullCount++;
        }

        const appointmentId = `appointment-${crypto.randomUUID()}`;
        const now = new Date().toISOString();

        const appointmentData = {
          appointmentId,
          childId,
          clinicDayId,
          timeWindow,
          slotNumber,
          reason,
          status: 'SCHEDULED',
          priorityTier: tier,
          urgencyScore,
          createdBy: username,
          createdAt: now
        };

        newAppointments.push(appointmentData);
      }

        // Batch save all appointments
        if (newAppointments.length > 0) {
          const addedChildIds = new Set(newAppointments.map(a => a.childId));
          
          for (const appointmentData of newAppointments) {
            await upsertAppointment(appointmentData);
            await addToOutbox('UPSERT_APPOINTMENT', appointmentData.appointmentId, appointmentData);
          }

          // Update appointments state immediately
          const updatedAppointments = [...appointments, ...newAppointments];
          setAppointments(updatedAppointments);
          
          // Update roster children immediately
          const updatedChildrenData = await Promise.all(
            newAppointments.map(async (appt) => {
              const child = await getChild(appt.childId);
              return { appointment: appt, child };
            })
          );
          setRosterChildren([...rosterChildren, ...updatedChildrenData]);

          // Remove all added children from available lists immediately
          setHighRiskVisits(prev => prev.filter(v => !addedChildIds.has(v.childId)));
          setFollowUps(prev => prev.filter(v => !addedChildIds.has(v.childId)));
          setRoutineChildren(prev => prev.filter(c => !addedChildIds.has(c.childId)));

          // Reload all scheduled appointments
          const allScheduled = await getAllScheduledAppointments();
          setAllScheduledAppointments(allScheduled);

          // Try to sync if online
          if (navigator.onLine && token) {
            try {
              await performSync(token);
            } catch (syncError) {
              console.error('Sync error:', syncError);
            }
          }
        }
    } catch (error) {
      console.error('Error auto-filling:', error);
      alert('Failed to auto-fill roster');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  if (loading || !clinicDay) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
        <NavBar />
      </div>
    );
  }

  const rosterCount = appointments.length;
  const amCount = appointments.filter(a => a.timeWindow === 'AM').length;
  const pmCount = appointments.filter(a => a.timeWindow === 'PM').length;
  const fullCount = appointments.filter(a => a.timeWindow === 'FULL').length;
  
  // Show AM/PM breakdown if clinic day has AM/PM capacity
  const hasAmPmCapacity = clinicDay.amCapacity !== null && clinicDay.pmCapacity !== null;
  const amRemaining = hasAmPmCapacity ? (clinicDay.amCapacity - amCount) : 0;
  const pmRemaining = hasAmPmCapacity ? (clinicDay.pmCapacity - pmCount) : 0;
  const remaining = hasAmPmCapacity ? (amRemaining + pmRemaining) : (clinicDay.capacity - rosterCount);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Build Roster</h1>
        <p>{clinicDay.school} • {formatDate(clinicDay.date)}</p>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, marginBottom: '12px' }}>Roster Status</h3>
        {hasAmPmCapacity ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>AM Slots:</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: amRemaining > 0 ? 'var(--color-success)' : 'var(--color-accent)' }}>
                {amCount} / {clinicDay.amCapacity}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span>PM Slots:</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: pmRemaining > 0 ? 'var(--color-success)' : 'var(--color-accent)' }}>
                {pmCount} / {clinicDay.pmCapacity}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span>Total Slots:</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: remaining > 0 ? 'var(--color-success)' : 'var(--color-accent)' }}>
              {rosterCount} / {clinicDay.capacity}
            </span>
          </div>
        )}
        {remaining > 0 && (
          <button 
            className="btn btn-primary" 
            onClick={handleAutoFill}
            disabled={saving}
            style={{ width: '100%' }}
          >
            {saving ? 'Adding...' : `Auto-fill ${remaining} ${remaining === 1 ? 'slot' : 'slots'}`}
          </button>
        )}
      </div>

      {/* Current Roster */}
      {rosterChildren.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Current Roster ({rosterChildren.length})</h2>
          {rosterChildren.map(({ appointment, child }) => (
            <div key={appointment.appointmentId} className="card" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '4px' }}>{child?.fullName || 'Unknown'}</h3>
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                    {appointment.reason.replace('_', ' ')} • {appointment.timeWindow === 'AM' ? 'AM slot' : 
                     appointment.timeWindow === 'PM' ? 'PM slot' : 
                     'Full day'}
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleRemoveFromRoster(appointment.appointmentId)}
                  disabled={saving}
                  style={{ marginLeft: '8px' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Emergency / High Priority */}
      {highRiskVisits.filter(v => v.tier <= 2).length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--color-accent)' }}>
            🚨 Emergency / High Priority ({highRiskVisits.filter(v => v.tier <= 2).length})
          </h2>
          {highRiskVisits
            .filter(v => v.tier <= 2 && !isInRoster(v.childId))
            .slice(0, 20)
            .map(visit => (
              <div key={visit.visitId} className="card" style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '4px' }}>{visit.child?.fullName || 'Unknown'}</h3>
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>
                      {visit.tierName} • Urgency: {visit.urgencyScore}
                    </p>
                    {visit.painFlag && <span className="flag-badge pain" style={{ marginRight: '4px' }}>Pain</span>}
                    {visit.swellingFlag && <span className="flag-badge swelling">Swelling</span>}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAddToRoster(
                      visit.childId, 
                      visit.tier === 1 ? 'EMERGENCY' : 'HIGH_PRIORITY',
                      visit.tier,
                      visit.urgencyScore
                    )}
                    disabled={saving || isInRoster(visit.childId) || remaining <= 0}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Follow-ups Due */}
      {followUps.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--color-warning)' }}>
            📅 Follow-ups Due ({followUps.length})
          </h2>
          {followUps
            .filter(v => !isInRoster(v.childId))
            .slice(0, 20)
            .map(visit => (
              <div key={visit.visitId} className="card" style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '4px' }}>{visit.child?.fullName || 'Unknown'}</h3>
                    <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                      Follow-up: {formatDate(visit.followUpDate)}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAddToRoster(visit.childId, 'FOLLOW_UP')}
                    disabled={saving || isInRoster(visit.childId) || remaining <= 0}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Routine Screenings */}
      {routineChildren.length > 0 && remaining > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>
            ℹ️ Routine Screenings ({routineChildren.length})
          </h2>
          {routineChildren
            .filter(c => !isInRoster(c.childId))
            .slice(0, 20)
            .map(child => (
              <div key={child.childId} className="card" style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '4px' }}>{child.fullName}</h3>
                    <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                      {child.grade || 'No grade'} • {child.barangay}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAddToRoster(child.childId, 'ROUTINE')}
                    disabled={saving || isInRoster(child.childId) || remaining <= 0}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <div style={{ marginTop: '24px', marginBottom: '16px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/clinic-days/${clinicDayId}/roster`)}
          style={{ width: '100%' }}
        >
          View Roster & Mark Attendance
        </button>
      </div>

      {/* Time Window Selection Modal */}
      {showTimeWindowModal && pendingAdd && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => {
          setShowTimeWindowModal(false);
          setPendingAdd(null);
        }}>
          <div className="card" style={{
            maxWidth: '400px',
            width: '100%',
            background: 'white',
            zIndex: 1001
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px' }}>Choose Time Slot</h3>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                AM: {appointments.filter(a => a.timeWindow === 'AM').length} / {clinicDay.amCapacity} slots
              </p>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                PM: {appointments.filter(a => a.timeWindow === 'PM').length} / {clinicDay.pmCapacity} slots
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  addToRosterWithTimeWindow(
                    pendingAdd.childId,
                    pendingAdd.reason,
                    pendingAdd.tier,
                    pendingAdd.urgencyScore,
                    'AM'
                  );
                }}
                disabled={saving}
                style={{ flex: 1 }}
              >
                AM Slot
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  addToRosterWithTimeWindow(
                    pendingAdd.childId,
                    pendingAdd.reason,
                    pendingAdd.tier,
                    pendingAdd.urgencyScore,
                    'PM'
                  );
                }}
                disabled={saving}
                style={{ flex: 1 }}
              >
                PM Slot
              </button>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowTimeWindowModal(false);
                setPendingAdd(null);
              }}
              style={{ width: '100%', marginTop: '12px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <NavBar />
    </div>
  );
};

export default BuildRoster;
