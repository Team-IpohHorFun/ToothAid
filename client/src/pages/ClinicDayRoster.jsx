import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { 
  getClinicDay, 
  getAppointmentsByClinicDay,
  getChild,
  upsertAppointment,
  addVisit,
  addToOutbox,
  performSync
} from '../db/indexedDB';

const ClinicDayRoster = ({ token }) => {
  const { clinicDayId } = useParams();
  const navigate = useNavigate();
  const [clinicDay, setClinicDay] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsWithChildren, setAppointmentsWithChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const day = await getClinicDay(clinicDayId);
      if (!day) {
        navigate('/clinic-days');
        return;
      }
      setClinicDay(day);

      const rosterAppointments = await getAppointmentsByClinicDay(clinicDayId);
      setAppointments(rosterAppointments);

      // Load child data for each appointment
      const appointmentsData = await Promise.all(
        rosterAppointments.map(async (appt) => {
          const child = await getChild(appt.childId);
          return { appointment: appt, child };
        })
      );
      setAppointmentsWithChildren(appointmentsData);
      setLoading(false);
    };
    
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [clinicDayId, navigate]);

  const handleStatusChange = async (appointmentId, newStatus) => {
    setSaving(true);
    try {
      const appointment = appointments.find(a => a.appointmentId === appointmentId);
      if (!appointment) return;

      const updatedAppointment = {
        ...appointment,
        status: newStatus
      };

      await upsertAppointment(updatedAppointment);
      await addToOutbox('UPSERT_APPOINTMENT', appointmentId, updatedAppointment);

      // If status is MISSED, create a follow-up visit (Step 5)
      if (newStatus === 'MISSED') {
        const child = await getChild(appointment.childId);
        if (child) {
          // Calculate follow-up date (e.g., 2 weeks from clinic day)
          const followUpDate = new Date(clinicDay.date);
          followUpDate.setDate(followUpDate.getDate() + 14);

          const visitId = `visit-${crypto.randomUUID()}`;
          const now = new Date().toISOString();
          const username = localStorage.getItem('username') || 'unknown';

          const visitData = {
            visitId,
            childId: appointment.childId,
            date: clinicDay.date,
            type: 'FOLLOWUP',
            painFlag: false,
            swellingFlag: false,
            decayedTeeth: null,
            missingTeeth: null,
            filledTeeth: null,
            treatmentTypes: [],
            followUpDate: followUpDate.toISOString(),
            notes: `Missed appointment on ${new Date(clinicDay.date).toLocaleDateString()}. Reschedule needed.`,
            createdBy: username,
            createdAt: now
          };

          await addVisit(visitData);
          await addToOutbox('ADD_VISIT', visitId, visitData);
        }
      }

      // Reload appointments
      const updatedAppointments = await getAppointmentsByClinicDay(clinicDayId);
      setAppointments(updatedAppointments);
      const updatedData = await Promise.all(
        updatedAppointments.map(async (appt) => {
          const child = await getChild(appt.childId);
          return { appointment: appt, child };
        })
      );
      setAppointmentsWithChildren(updatedData);

      // Try to sync if online
      if (navigator.onLine && token) {
        try {
          await performSync(token);
        } catch (syncError) {
          console.error('Sync error:', syncError);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'ATTENDED': return 'var(--color-success)';
      case 'MISSED': return 'var(--color-accent)';
      case 'RESCHEDULED': return 'var(--color-warning)';
      case 'CANCELLED': return '#6B7280';
      default: return 'var(--color-primary)';
    }
  };

  const getStatusCounts = () => {
    const counts = {
      SCHEDULED: 0,
      ATTENDED: 0,
      MISSED: 0,
      RESCHEDULED: 0,
      CANCELLED: 0
    };
    appointments.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  };

  if (loading || !clinicDay) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
        <NavBar />
      </div>
    );
  }

  const statusCounts = getStatusCounts();
  const hasAmPmCapacity = clinicDay.amCapacity !== null && clinicDay.pmCapacity !== null;
  const amCount = appointments.filter(a => a.timeWindow === 'AM').length;
  const pmCount = appointments.filter(a => a.timeWindow === 'PM').length;

  return (
    <div className="container">
      <div className="page-header">
        <h1>Clinic Day Roster</h1>
        <p>{clinicDay.school} • {formatDate(clinicDay.date)}</p>
      </div>

      {/* Roster Capacity Summary */}
      {hasAmPmCapacity && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '12px' }}>Roster Capacity</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span>AM Slots:</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              {amCount} / {clinicDay.amCapacity}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>PM Slots:</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              {pmCount} / {clinicDay.pmCapacity}
            </span>
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '12px' }}>Status Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              {statusCounts.SCHEDULED}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Scheduled</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-success)' }}>
              {statusCounts.ATTENDED}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Attended</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
              {statusCounts.MISSED}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Missed</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-warning)' }}>
              {statusCounts.RESCHEDULED}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Rescheduled</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6B7280' }}>
              {statusCounts.CANCELLED}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Cancelled</div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      {appointmentsWithChildren.length === 0 ? (
        <div className="empty-state">
          <p>No appointments scheduled</p>
        </div>
      ) : (
        <div>
          {appointmentsWithChildren.map(({ appointment, child }) => (
            <div key={appointment.appointmentId} className="card" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '4px' }}>{child?.fullName || 'Unknown'}</h3>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>
                    {appointment.timeWindow === 'AM' ? 'AM slot' : 
                     appointment.timeWindow === 'PM' ? 'PM slot' : 
                     'Full day'} • {appointment.reason.replace('_', ' ')}
                  </p>
                  {child && (
                    <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
                      {child.grade || 'No grade'} • {child.barangay}
                    </p>
                  )}
                </div>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#fff',
                  backgroundColor: getStatusColor(appointment.status)
                }}>
                  {appointment.status}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  onClick={() => handleStatusChange(appointment.appointmentId, 'ATTENDED')}
                  disabled={saving || appointment.status === 'ATTENDED'}
                  style={{
                    backgroundColor: appointment.status === 'ATTENDED' ? 'var(--color-success)' : '#E5E7EB',
                    color: appointment.status === 'ATTENDED' ? '#fff' : 'var(--color-text)',
                    flex: 1,
                    minWidth: '80px'
                  }}
                >
                  Attended
                </button>
                <button
                  className="btn"
                  onClick={() => handleStatusChange(appointment.appointmentId, 'MISSED')}
                  disabled={saving || appointment.status === 'MISSED'}
                  style={{
                    backgroundColor: appointment.status === 'MISSED' ? 'var(--color-accent)' : '#E5E7EB',
                    color: appointment.status === 'MISSED' ? '#fff' : 'var(--color-text)',
                    flex: 1,
                    minWidth: '80px'
                  }}
                >
                  Missed
                </button>
                <button
                  className="btn"
                  onClick={() => handleStatusChange(appointment.appointmentId, 'RESCHEDULED')}
                  disabled={saving || appointment.status === 'RESCHEDULED'}
                  style={{
                    backgroundColor: appointment.status === 'RESCHEDULED' ? 'var(--color-warning)' : '#E5E7EB',
                    color: appointment.status === 'RESCHEDULED' ? '#111827' : 'var(--color-text)',
                    flex: 1,
                    minWidth: '100px'
                  }}
                >
                  Rescheduled
                </button>
                <button
                  className="btn"
                  onClick={() => handleStatusChange(appointment.appointmentId, 'CANCELLED')}
                  disabled={saving || appointment.status === 'CANCELLED'}
                  style={{
                    backgroundColor: appointment.status === 'CANCELLED' ? '#6B7280' : '#E5E7EB',
                    color: appointment.status === 'CANCELLED' ? '#fff' : 'var(--color-text)',
                    flex: 1,
                    minWidth: '80px'
                  }}
                >
                  Cancelled
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '24px', marginBottom: '16px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/clinic-days/${clinicDayId}/build-roster`)}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          Edit Roster
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/clinic-days')}
          style={{ width: '100%' }}
        >
          Back to Clinic Days
        </button>
      </div>

      <NavBar />
    </div>
  );
};

export default ClinicDayRoster;
