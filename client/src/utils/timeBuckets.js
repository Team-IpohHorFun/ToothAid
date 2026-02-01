/**
 * Time Bucketing Utility for ToothAid Charts
 * 
 * Supports three granularities:
 * - 1M (Monthly): YYYY-MM
 * - 3M (Quarterly): YYYY-Qn (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec)
 * - 6M (Half-year): YYYY-Hn (H1=Jan-Jun, H2=Jul-Dec)
 */

/**
 * Convert a date to a bucket key based on granularity
 * @param {Date|string} date - Date object or ISO string
 * @param {string} granularity - "1M", "3M", or "6M"
 * @returns {string} Bucket key
 */
export const dateToBucketKey = (date, granularity) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12

  switch (granularity) {
    case '1M':
      return `${year}-${String(month).padStart(2, '0')}`;
    case '3M': {
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    }
    case '6M': {
      const half = month <= 6 ? 1 : 2;
      return `${year}-H${half}`;
    }
    default:
      return `${year}-${String(month).padStart(2, '0')}`;
  }
};

/**
 * Get a sortable numeric value for a bucket key (for chronological sorting)
 * @param {string} bucketKey - Bucket key like "2025-03", "2025-Q2", "2025-H1"
 * @returns {number} Sortable numeric value
 */
export const bucketKeyToSortValue = (bucketKey) => {
  const parts = bucketKey.split('-');
  const year = parseInt(parts[0], 10);
  const suffix = parts[1];

  if (suffix.startsWith('Q')) {
    const quarter = parseInt(suffix.slice(1), 10);
    // Q1 -> month 2, Q2 -> month 5, Q3 -> month 8, Q4 -> month 11 (middle of quarter)
    return year * 100 + (quarter * 3 - 1);
  } else if (suffix.startsWith('H')) {
    const half = parseInt(suffix.slice(1), 10);
    // H1 -> month 4, H2 -> month 10 (middle of half-year)
    return year * 100 + (half === 1 ? 4 : 10);
  } else {
    // Monthly - suffix is the month
    return year * 100 + parseInt(suffix, 10);
  }
};

/**
 * Sort bucket keys chronologically
 * @param {string[]} bucketKeys - Array of bucket keys
 * @returns {string[]} Sorted bucket keys
 */
export const sortBucketKeys = (bucketKeys) => {
  return [...bucketKeys].sort((a, b) => bucketKeyToSortValue(a) - bucketKeyToSortValue(b));
};

/**
 * Get display label for a bucket key
 * @param {string} bucketKey - Bucket key like "2025-03", "2025-Q2", "2025-H1"
 * @returns {string} Human-readable label
 */
export const bucketKeyToLabel = (bucketKey) => {
  const parts = bucketKey.split('-');
  const year = parts[0];
  const suffix = parts[1];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (suffix.startsWith('Q')) {
    return `${suffix} ${year}`;
  } else if (suffix.startsWith('H')) {
    return `${suffix} ${year}`;
  } else {
    // Monthly - suffix is the month number
    const monthIndex = parseInt(suffix, 10) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  }
};

/**
 * Get granularity label for display
 * @param {string} granularity - "1M", "3M", or "6M"
 * @returns {string} Human-readable label
 */
export const granularityLabel = (granularity) => {
  switch (granularity) {
    case '1M': return 'Monthly';
    case '3M': return 'Quarterly';
    case '6M': return 'Half-year';
    default: return 'Monthly';
  }
};

/**
 * Group visits by bucket and get latest visit per child in each bucket
 * @param {Array} visits - Array of visit objects with date and childId
 * @param {string} granularity - "1M", "3M", or "6M"
 * @returns {Object} { bucketKey: [latestVisitPerChild, ...], ... }
 */
export const groupVisitsByBucket = (visits, granularity) => {
  // First group all visits by bucket
  const buckets = {};
  visits.forEach(visit => {
    const bucketKey = dateToBucketKey(visit.date, granularity);
    if (!buckets[bucketKey]) {
      buckets[bucketKey] = [];
    }
    buckets[bucketKey].push(visit);
  });

  // For each bucket, get the latest visit per child
  const result = {};
  Object.keys(buckets).forEach(bucketKey => {
    const bucketVisits = buckets[bucketKey];
    const latestPerChild = {};

    bucketVisits.forEach(visit => {
      const childId = visit.childId;
      const visitDate = new Date(visit.date);
      if (!latestPerChild[childId] || visitDate > new Date(latestPerChild[childId].date)) {
        latestPerChild[childId] = visit;
      }
    });

    result[bucketKey] = Object.values(latestPerChild);
  });

  return result;
};

/**
 * Get the last N buckets from a bucketed dataset, sorted chronologically
 * @param {Object} bucketedData - { bucketKey: data, ... }
 * @param {number} maxBuckets - Maximum number of buckets to return (default 12)
 * @returns {string[]} Array of bucket keys (sorted, last N)
 */
export const getLastNBuckets = (bucketedData, maxBuckets = 12) => {
  const sortedKeys = sortBucketKeys(Object.keys(bucketedData));
  return sortedKeys.slice(-maxBuckets);
};

/**
 * Generate all bucket keys between start and end (inclusive) for equal x-axis spacing
 * @param {string} startKey - Starting bucket key
 * @param {string} endKey - Ending bucket key
 * @param {string} granularity - "1M", "3M", or "6M"
 * @returns {string[]} Array of all bucket keys in range
 */
export const getAllBucketsInRange = (startKey, endKey, granularity) => {
  const buckets = [];
  
  if (granularity === '1M') {
    // Monthly: YYYY-MM
    const [startYear, startMonth] = startKey.split('-').map(Number);
    const [endYear, endMonth] = endKey.split('-').map(Number);
    
    let y = startYear, m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      buckets.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
  } else if (granularity === '3M') {
    // Quarterly: YYYY-Qn
    const startYear = parseInt(startKey.split('-')[0], 10);
    const startQ = parseInt(startKey.split('-Q')[1], 10);
    const endYear = parseInt(endKey.split('-')[0], 10);
    const endQ = parseInt(endKey.split('-Q')[1], 10);
    
    let y = startYear, q = startQ;
    while (y < endYear || (y === endYear && q <= endQ)) {
      buckets.push(`${y}-Q${q}`);
      q++;
      if (q > 4) { q = 1; y++; }
    }
  } else if (granularity === '6M') {
    // Half-year: YYYY-Hn
    const startYear = parseInt(startKey.split('-')[0], 10);
    const startH = parseInt(startKey.split('-H')[1], 10);
    const endYear = parseInt(endKey.split('-')[0], 10);
    const endH = parseInt(endKey.split('-H')[1], 10);
    
    let y = startYear, h = startH;
    while (y < endYear || (y === endYear && h <= endH)) {
      buckets.push(`${y}-H${h}`);
      h++;
      if (h > 2) { h = 1; y++; }
    }
  }
  
  return buckets;
};

/**
 * Get the last N buckets with equal time intervals (fills gaps)
 * @param {Object} bucketedData - { bucketKey: data, ... }
 * @param {string} granularity - "1M", "3M", or "6M"
 * @param {number} maxBuckets - Maximum number of buckets to return (default 12)
 * @returns {string[]} Array of bucket keys with equal intervals (sorted, last N)
 */
export const getLastNBucketsWithEqualIntervals = (bucketedData, granularity, maxBuckets = 12) => {
  const existingKeys = Object.keys(bucketedData);
  if (existingKeys.length === 0) return [];
  
  const sortedKeys = sortBucketKeys(existingKeys);
  const firstKey = sortedKeys[0];
  const lastKey = sortedKeys[sortedKeys.length - 1];
  
  // Generate all buckets in range
  const allBuckets = getAllBucketsInRange(firstKey, lastKey, granularity);
  
  // Take the last N buckets
  return allBuckets.slice(-maxBuckets);
};

/**
 * Get cumulative latest visits per child up to each bucket (rolling approach)
 * For each bucket, returns the latest known visit for each child as of that point in time
 * @param {Array} visits - Array of visit objects with date and childId
 * @param {string[]} bucketKeys - Array of bucket keys (sorted chronologically)
 * @param {string} granularity - "1M", "3M", or "6M"
 * @returns {Object} { bucketKey: [latestVisitPerChildUpToThisBucket, ...], ... }
 */
export const getCumulativeLatestVisits = (visits, bucketKeys, granularity) => {
  // Sort visits by date ascending
  const sortedVisits = [...visits].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Track latest visit per child as we progress through time
  const latestByChild = {};
  const result = {};
  
  // Create a map of bucket -> visits in that bucket
  const visitsByBucket = {};
  sortedVisits.forEach(visit => {
    const bucketKey = dateToBucketKey(visit.date, granularity);
    if (!visitsByBucket[bucketKey]) {
      visitsByBucket[bucketKey] = [];
    }
    visitsByBucket[bucketKey].push(visit);
  });
  
  // Process each bucket in chronological order
  bucketKeys.forEach(bucketKey => {
    // Update latestByChild with visits from this bucket
    const bucketVisits = visitsByBucket[bucketKey] || [];
    bucketVisits.forEach(visit => {
      const childId = visit.childId;
      const visitDate = new Date(visit.date);
      // Update if this is the first visit for this child or if it's more recent
      if (!latestByChild[childId] || visitDate > new Date(latestByChild[childId].date)) {
        latestByChild[childId] = visit;
      }
    });
    
    // Snapshot current state - all children's latest known visits up to this bucket
    result[bucketKey] = Object.values(latestByChild);
  });
  
  return result;
};

/**
 * Runtime assertions for development mode
 * @param {Array} data - Chart data array
 * @param {string} chartName - Name of the chart for error messages
 */
export const assertChartData = (data, chartName) => {
  if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
    // Check length <= 12
    if (data.length > 12) {
      console.warn(`[${chartName}] Chart has more than 12 data points: ${data.length}`);
    }

    // Check for NaN values
    data.forEach((point, index) => {
      Object.entries(point).forEach(([key, value]) => {
        if (typeof value === 'number' && isNaN(value)) {
          console.error(`[${chartName}] NaN value found at index ${index}, key "${key}"`);
        }
      });
    });

    // Check chronological order (by label position)
    if (data.length > 1 && data[0].label) {
      let prevSortValue = -Infinity;
      let isChronological = true;
      data.forEach((point, index) => {
        if (point.bucketKey) {
          const sortValue = bucketKeyToSortValue(point.bucketKey);
          if (sortValue < prevSortValue) {
            isChronological = false;
          }
          prevSortValue = sortValue;
        }
      });
      if (!isChronological) {
        console.warn(`[${chartName}] Data may not be in chronological order`);
      }
    }
  }
};
