import { useState, useEffect } from 'react';

/**
 * DateInput component that displays and accepts dates in MM/DD/YYYY format
 * but stores them in YYYY-MM-DD format for HTML date input compatibility
 */
const DateInput = ({ name, value, onChange, required, placeholder = "MM/DD/YYYY" }) => {
  const [displayValue, setDisplayValue] = useState('');

  // Convert YYYY-MM-DD to MM/DD/YYYY for display
  const formatForDisplay = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate + 'T00:00:00'); // Add time to avoid timezone issues
    if (isNaN(date.getTime())) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Convert MM/DD/YYYY to YYYY-MM-DD
  const parseInput = (input) => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    
    // Need exactly 8 digits for MMDDYYYY
    if (digits.length !== 8) return null;
    
    const month = digits.slice(0, 2);
    const day = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    
    // Validate
    if (parseInt(month) >= 1 && parseInt(month) <= 12 &&
        parseInt(day) >= 1 && parseInt(day) <= 31 &&
        year.length === 4) {
      // Check if valid date
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime()) && 
          date.getMonth() + 1 === parseInt(month) && 
          date.getDate() === parseInt(day)) {
        return `${year}-${month}-${day}`;
      }
    }
    return null;
  };

  useEffect(() => {
    // Update display value when value prop changes
    if (value) {
      setDisplayValue(formatForDisplay(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  // Auto-format input as user types (adds slashes automatically)
  const autoFormat = (input) => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '');
    
    // Limit to 8 digits (MMDDYYYY)
    const limited = digits.slice(0, 8);
    
    // Add slashes at appropriate positions
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  const handleChange = (e) => {
    const input = e.target.value;
    
    // Auto-format the input (add slashes automatically)
    const formatted = autoFormat(input);
    setDisplayValue(formatted);
    
    // Try to parse the formatted input
    const isoDate = parseInput(formatted);
    if (isoDate) {
      // Valid date, update parent
      onChange({
        target: {
          name,
          value: isoDate
        }
      });
    } else if (formatted === '') {
      // Empty input, clear the value
      onChange({
        target: {
          name,
          value: ''
        }
      });
    }
  };

  const handleBlur = () => {
    // On blur, format the display value if it's valid
    const isoDate = parseInput(displayValue);
    if (isoDate) {
      setDisplayValue(formatForDisplay(isoDate));
    } else if (displayValue && !displayValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      // Invalid format, try to reformat or clear
      setDisplayValue(formatForDisplay(value) || '');
    }
  };

  return (
    <input
      type="text"
      name={name}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      pattern="\d{2}/\d{2}/\d{4}"
      style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', height: '48px', boxSizing: 'border-box' }}
    />
  );
};

export default DateInput;
