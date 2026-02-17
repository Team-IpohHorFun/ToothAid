import { useState, useEffect, useRef } from 'react';

const currentYear = new Date().getFullYear();

/**
 * Date input with button trigger and calendar popover.
 * Month and year dropdowns for easy selection (e.g. date of birth).
 */
const DateInput = ({
  name,
  value,
  onChange,
  required,
  placeholder = 'Select date',
  label,
  yearStart = currentYear - 50,
  yearEnd = currentYear + 1,
  showTodayButton = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const containerRef = useRef(null);

  // Parse value to Date object
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  // Set viewDate to selected date or current date
  useEffect(() => {
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      setViewDate(new Date(selectedDate));
    } else {
      setViewDate(new Date());
    }
  }, [value]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Format date for display (MM/DD/YYYY)
  const formatForDisplay = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Format date for storage (YYYY-MM-DD)
  const formatForStorage = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get day of week for first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    // Convert to Monday = 0, Sunday = 6
    return day === 0 ? 6 : day - 1;
  };

  // Select a date (day number uses viewDate, or pass full Date object)
  const selectDate = (dayOrDate) => {
    const newDate = dayOrDate instanceof Date 
      ? dayOrDate 
      : new Date(viewDate.getFullYear(), viewDate.getMonth(), dayOrDate);
    onChange({
      target: {
        name,
        value: formatForStorage(newDate)
      }
    });
    setIsOpen(false);
  };

  // Check if a date is selected
  const isSelected = (day) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewDate.getMonth() &&
      selectedDate.getFullYear() === viewDate.getFullYear()
    );
  };

  // Check if a date is today
  const isToday = (day) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewDate.getMonth() &&
      today.getFullYear() === viewDate.getFullYear()
    );
  };

  // Generate calendar grid
  const generateCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    const days = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isPrevMonth: true
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true
      });
    }

    // Next month days (fill remaining slots)
    const remaining = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isNextMonth: true
      });
    }

    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const years = [];
  for (let y = yearEnd; y >= yearStart; y--) years.push(y);

  const onMonthChange = (e) => {
    const month = parseInt(e.target.value, 10);
    setViewDate(new Date(viewDate.getFullYear(), month, 1));
  };

  const onYearChange = (e) => {
    const year = parseInt(e.target.value, 10);
    setViewDate(new Date(year, viewDate.getMonth(), 1));
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)', marginBottom: '6px' }}>
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-btn)',
          fontSize: '16px',
          height: '48px',
          boxSizing: 'border-box',
          background: 'var(--color-card)',
          color: value ? 'var(--color-text)' : 'var(--color-muted)',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          outline: 'none',
          boxShadow: isOpen ? 'var(--focus-ring)' : 'none',
          borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-border)'
        }}
      >
        {value ? formatForDisplay(selectedDate) : placeholder}
      </button>

      {/* Calendar Popup */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'var(--color-card)',
            borderRadius: 'var(--radius-card)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            padding: '20px',
            minWidth: '300px',
            border: '1px solid var(--color-border)',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          {/* Header with month and year dropdown menus */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}
          >
            <select
              value={viewDate.getMonth()}
              onChange={onMonthChange}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-card)',
                color: 'var(--color-text)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {monthNames.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={viewDate.getFullYear()}
              onChange={onYearChange}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-card)',
                color: 'var(--color-text)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Day names header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              marginBottom: '8px'
            }}
          >
            {dayNames.map((day, index) => (
              <div
                key={day}
                style={{
                  textAlign: 'center',
                  color: index >= 5 ? 'var(--color-accent)' : 'var(--color-muted)',
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '8px 0',
                  textTransform: 'uppercase'
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px'
            }}
          >
            {generateCalendar().map((item, index) => {
              const isWeekend = index % 7 >= 5;
              const selected = item.isCurrentMonth && isSelected(item.day);
              const today = item.isCurrentMonth && isToday(item.day);
              
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => item.isCurrentMonth && selectDate(item.day)}
                  disabled={!item.isCurrentMonth}
                  style={{
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    border: today && !selected ? '2px solid var(--color-primary)' : 'none',
                    cursor: item.isCurrentMonth ? 'pointer' : 'default',
                    fontSize: '14px',
                    fontWeight: selected || today ? '600' : '400',
                    transition: 'all 0.15s',
                    background: selected 
                      ? 'var(--color-primary)' 
                      : 'transparent',
                    color: selected
                      ? '#fff'
                      : !item.isCurrentMonth
                        ? 'var(--color-disabled-bg)'
                        : isWeekend
                          ? 'var(--color-accent)'
                          : 'var(--color-text)',
                    outline: 'none'
                  }}
                  onMouseOver={(e) => {
                    if (item.isCurrentMonth && !selected) {
                      e.target.style.background = 'var(--color-primary-soft)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (item.isCurrentMonth && !selected) {
                      e.target.style.background = 'transparent';
                    }
                  }}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {showTodayButton && (
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setViewDate(today);
                selectDate(today);
              }}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                background: 'var(--color-primary)',
                border: 'none',
                borderRadius: 'var(--radius-btn)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'var(--color-primary-hover)'}
              onMouseOut={(e) => e.target.style.background = 'var(--color-primary)'}
            >
              Today
            </button>
          )}
        </div>
      )}

      {/* Styles for animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default DateInput;
