import { useEffect, useState, useRef, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import NavBar from '../components/NavBar';
import PageHeader from '../components/PageHeader';
import { getAllChildren, getAllVisits } from '../db/indexedDB';
import { 
  groupVisitsByBucket, 
  getLastNBucketsWithEqualIntervals, 
  bucketKeyToLabel, 
  assertChartData,
  getCumulativeLatestVisits
} from '../utils/timeBuckets';

const Graphs = () => {
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef(null);
  
  // Granularity state - persisted in localStorage
  const [granularity, setGranularity] = useState(() => {
    const saved = localStorage.getItem('toothaid_granularity');
    return saved && ['1M', '3M', '6M'].includes(saved) ? saved : '1M';
  });
  
  // Pie chart time filter state - persisted in localStorage
  const [pieTimeFilter, setPieTimeFilter] = useState(() => {
    const saved = localStorage.getItem('toothaid_pie_time_filter');
    return saved && ['6M', '1Y', 'ALL'].includes(saved) ? saved : 'ALL';
  });
  
  // Headline metrics state
  const [metrics, setMetrics] = useState({
    totalChildren: 0,
    totalVisits: 0,
    schoolsCovered: 0,
    dateRange: null // { start: Date, end: Date }
  });
  
  const [chartData, setChartData] = useState({
    avgDecayedTeeth: [],          // Chart 1: Average D per child (monthly)
    pctWithDecay: [],              // Chart 2: % with ≥1 decayed tooth (monthly)
    fDmftRatio: [],                // Chart 3: F/DMFT ratio (monthly)
    treatmentsByType: [],          // Chart 4: Treatments by type (bar)
    treatmentsBySchool: [],        // Chart 5: Treatments by school (stacked bar, top 10)
    avgDmftBySchool: [],           // Chart 6: Average DMFT by school (bar, top 10)
    avgDmftOverTime: []            // Chart 7: Average DMFT over time (monthly) - supporting
  });
  
  // Store raw visits for pie chart filtering
  const [allVisits, setAllVisits] = useState([]);
  
  // Active point state for custom tooltip (only shows when dot is touched directly)
  const [activePoint, setActivePoint] = useState(null); // { chartId, index, x, y, value, label }

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && !isTransitioning) {
      handleNext();
    } else if (isRightSwipe && !isTransitioning) {
      handlePrev();
    }
  };

  const handleNext = () => {
    const slides = getAvailableSlides();
    if (currentSlide < slides.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide((prev) => prev + 1);
      setActivePoint(null); // Clear tooltip when switching slides
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide((prev) => prev - 1);
      setActivePoint(null); // Clear tooltip when switching slides
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const getAvailableSlides = () => {
    const slides = [];
    
    // Chart 1: Average Decayed Teeth (D)
    if (chartData.avgDecayedTeeth.length > 0) {
      slides.push('avgDecayedTeeth');
    }
    
    // Chart 2: % with ≥1 decayed tooth
    if (chartData.pctWithDecay.length > 0) {
      slides.push('pctWithDecay');
    }
    
    // Chart 3: F/DMFT ratio
    if (chartData.fDmftRatio.length > 0) {
      slides.push('fDmftRatio');
    }
    
    // Chart 4: Treatments by type
    if (chartData.treatmentsByType.length > 0) {
      slides.push('treatmentsByType');
    }
    
    // Chart 5: Treatments by school
    if (chartData.treatmentsBySchool.length > 0) {
      slides.push('treatmentsBySchool');
    }
    
    // Chart 6: Average DMFT by school
    if (chartData.avgDmftBySchool.length > 0) {
      slides.push('avgDmftBySchool');
    }
    
    // Chart 7: Average DMFT over time (supporting)
    if (chartData.avgDmftOverTime.length > 0) {
      slides.push('avgDmftOverTime');
    }
    
    return slides;
  };

  // Persist granularity to localStorage
  useEffect(() => {
    localStorage.setItem('toothaid_granularity', granularity);
  }, [granularity]);
  
  // Persist pie time filter to localStorage
  useEffect(() => {
    localStorage.setItem('toothaid_pie_time_filter', pieTimeFilter);
  }, [pieTimeFilter]);

  // Handle granularity change
  const handleGranularityChange = (newGranularity) => {
    setGranularity(newGranularity);
    setActivePoint(null); // Clear tooltip when changing view
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const children = await getAllChildren();
        const visits = await getAllVisits();
        
        // Store raw visits for pie chart filtering
        setAllVisits(visits);

        // Create child lookup map
        const childMap = {};
        children.forEach(child => {
          childMap[child.childId] = child;
        });

        // Filter visits with child info
        const visitsWithChildren = visits
          .map(visit => ({
            ...visit,
            child: childMap[visit.childId],
            visitDate: new Date(visit.date)
          }))
          .filter(v => v.child);

        // Group visits by bucket (used for determining time range)
        const bucketedVisits = groupVisitsByBucket(visitsWithChildren, granularity);
        
        // Get the last 12 buckets with equal time intervals (fills gaps)
        const bucketKeys = getLastNBucketsWithEqualIntervals(bucketedVisits, granularity, 12);
        
        // Get cumulative latest visits per child up to each bucket (rolling approach)
        // For each bucket, shows the "current known state" based on each child's latest visit up to that point
        const cumulativeVisits = getCumulativeLatestVisits(visitsWithChildren, bucketKeys, granularity);

        // Compute headline metrics
        const uniqueSchools = new Set(children.map(c => c.school).filter(Boolean));
        
        // Calculate date range from visits
        let dateRange = null;
        if (visits.length > 0) {
          const visitDates = visits.map(v => new Date(v.date)).filter(d => !isNaN(d));
          if (visitDates.length > 0) {
            const minDate = new Date(Math.min(...visitDates));
            const maxDate = new Date(Math.max(...visitDates));
            dateRange = { start: minDate, end: maxDate };
          }
        }
        
        setMetrics({
          totalChildren: children.length,
          totalVisits: visits.length,
          schoolsCovered: uniqueSchools.size,
          dateRange
        });

        // Chart 1: Average Decayed Teeth (D) per child (rolling - latest known state at each point)
        const avgDecayedTeeth = bucketKeys.map(bucketKey => {
          const latestVisits = cumulativeVisits[bucketKey] || [];
          if (latestVisits.length === 0) {
            // No data up to this bucket - use null for gap in line
            return { label: bucketKeyToLabel(bucketKey), bucketKey, avgD: null };
          }
          const decayedValues = latestVisits.map(v => (v.decayedTeeth ?? 0));
          const totalD = decayedValues.reduce((sum, d) => sum + d, 0);
          const childCount = decayedValues.length;
          return {
            label: bucketKeyToLabel(bucketKey),
            bucketKey,
            avgD: parseFloat((totalD / childCount).toFixed(2))
          };
        });
        assertChartData(avgDecayedTeeth, 'Average Decayed Teeth');

        // Chart 2: % of children with ≥1 decayed tooth (rolling)
        const pctWithDecay = bucketKeys.map(bucketKey => {
          const latestVisits = cumulativeVisits[bucketKey] || [];
          if (latestVisits.length === 0) {
            return { label: bucketKeyToLabel(bucketKey), bucketKey, pct: null };
          }
          const childrenWithDecay = latestVisits.filter(v => (v.decayedTeeth ?? 0) >= 1).length;
          const totalChildren = latestVisits.length;
          return {
            label: bucketKeyToLabel(bucketKey),
            bucketKey,
            pct: parseFloat(((childrenWithDecay / totalChildren) * 100).toFixed(1))
          };
        });
        assertChartData(pctWithDecay, '% with Decay');

        // Chart 3: F / DMFT ratio (rolling, population-level)
        const fDmftRatio = bucketKeys.map(bucketKey => {
          const latestVisits = cumulativeVisits[bucketKey] || [];
          if (latestVisits.length === 0) {
            return { label: bucketKeyToLabel(bucketKey), bucketKey, ratio: null };
          }
          let totalF = 0;
          let totalDMFT = 0;
          latestVisits.forEach(v => {
            const D = v.decayedTeeth ?? 0;
            const M = v.missingTeeth ?? 0;
            const F = v.filledTeeth ?? 0;
            const DMFT = D + M + F;
            totalF += F;
            totalDMFT += DMFT;
          });
          const ratio = totalDMFT > 0 ? parseFloat(((totalF / totalDMFT) * 100).toFixed(1)) : 0;
          return { 
            label: bucketKeyToLabel(bucketKey),
            bucketKey,
            ratio 
          };
        });
        assertChartData(fDmftRatio, 'F/DMFT Ratio');

        // Chart 4: Treatments by Type - Bar chart
        const treatmentTypes = ['Filling', 'Extraction', 'Fluoride', 'Sealant', 'SDF', 'Cleaning', 'Other'];
        const treatmentsByTypeCounts = {};
        treatmentTypes.forEach(type => {
          treatmentsByTypeCounts[type] = 0;
        });
        
        visits.forEach(visit => {
          if (visit.treatmentTypes && visit.treatmentTypes.length > 0) {
            visit.treatmentTypes.forEach(treatment => {
              const normalized = treatment.trim();
              if (treatmentsByTypeCounts.hasOwnProperty(normalized)) {
                treatmentsByTypeCounts[normalized]++;
              } else {
                treatmentsByTypeCounts['Other']++;
              }
            });
          }
        });

        const treatmentsByType = Object.keys(treatmentsByTypeCounts)
          .map(type => ({
            type: type,
            count: treatmentsByTypeCounts[type]
          }))
          .filter(item => item.count > 0)
          .sort((a, b) => b.count - a.count);

        // Chart 5: Treatments by School - Stacked bar chart (top 10)
        const treatmentsBySchoolData = {};
        visits.forEach(visit => {
          if (visit.treatmentTypes && visit.treatmentTypes.length > 0) {
            const child = childMap[visit.childId];
            if (child && child.school) {
              const school = child.school;
              
              if (!treatmentsBySchoolData[school]) {
                treatmentsBySchoolData[school] = {
                  school: school,
                  Filling: 0,
                  Extraction: 0,
                  Fluoride: 0,
                  Sealant: 0,
                  SDF: 0,
                  Cleaning: 0,
                  Other: 0
                };
              }

              visit.treatmentTypes.forEach(treatment => {
                const normalized = treatment.trim();
                if (treatmentsBySchoolData[school].hasOwnProperty(normalized)) {
                  treatmentsBySchoolData[school][normalized]++;
                } else {
                  treatmentsBySchoolData[school]['Other']++;
                }
              });
            }
          }
        });

        const treatmentsBySchool = Object.values(treatmentsBySchoolData)
          .filter(schoolData => {
            const total = Object.values(schoolData)
              .filter((v, i) => i > 0) // Skip school name
              .reduce((sum, count) => sum + count, 0);
            return total > 0;
          })
          .map(schoolData => ({
            ...schoolData,
            total: Object.values(schoolData)
              .filter((v, i) => i > 0)
              .reduce((sum, count) => sum + count, 0)
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10)
          .map(({ total, ...rest }) => rest); // Remove total for chart

        // Chart 6: Average DMFT by School - Bar chart (top 10)
        // Use overall latest visit per child (not monthly)
        const latestVisitsByChild = {};
        visitsWithChildren.forEach(visit => {
          const childId = visit.childId;
          if (!latestVisitsByChild[childId] || 
              visit.visitDate > latestVisitsByChild[childId].visitDate) {
            latestVisitsByChild[childId] = visit;
          }
        });

        const latestVisits = Object.values(latestVisitsByChild);
        const dmftBySchool = {};
        const dmftCountBySchool = {};
        
        latestVisits.forEach(visit => {
          if (visit.child && visit.child.school) {
            const school = visit.child.school;
            const D = visit.decayedTeeth ?? 0;
            const M = visit.missingTeeth ?? 0;
            const F = visit.filledTeeth ?? 0;
            const DMFT = D + M + F;
            
            if (!dmftBySchool[school]) {
              dmftBySchool[school] = 0;
              dmftCountBySchool[school] = 0;
            }
            dmftBySchool[school] += DMFT;
            dmftCountBySchool[school] += 1;
          }
        });

        const avgDmftBySchool = Object.keys(dmftBySchool)
          .map(school => ({
            school: school,
            avgDmft: parseFloat(dmftCountBySchool[school] > 0
              ? (dmftBySchool[school] / dmftCountBySchool[school]).toFixed(2)
              : 0)
          }))
          .sort((a, b) => b.avgDmft - a.avgDmft)
          .slice(0, 10);

        // Chart 7: Average DMFT over time (rolling - latest known state at each point)
        const avgDmftOverTime = bucketKeys.map(bucketKey => {
          const latestVisits = cumulativeVisits[bucketKey] || [];
          if (latestVisits.length === 0) {
            return { label: bucketKeyToLabel(bucketKey), bucketKey, avgDmft: null };
          }
          const dmftValues = latestVisits.map(v => {
            const D = v.decayedTeeth ?? 0;
            const M = v.missingTeeth ?? 0;
            const F = v.filledTeeth ?? 0;
            return D + M + F;
          });
          const totalDMFT = dmftValues.reduce((sum, dmft) => sum + dmft, 0);
          const childCount = dmftValues.length;
          return {
            label: bucketKeyToLabel(bucketKey),
            bucketKey,
            avgDmft: parseFloat((totalDMFT / childCount).toFixed(2))
          };
        });
        assertChartData(avgDmftOverTime, 'Average DMFT Over Time');

        setChartData({
          avgDecayedTeeth,
          pctWithDecay,
          fDmftRatio,
          treatmentsByType,
          treatmentsBySchool,
          avgDmftBySchool,
          avgDmftOverTime
        });
      } catch (error) {
        console.error('Error loading graph data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [granularity]);

  // Reset slide when data changes
  useEffect(() => {
    setCurrentSlide(0);
  }, [loading]);

  const colors = {
    Filling: 'var(--color-primary)',
    Extraction: 'var(--color-accent)',
    Fluoride: 'var(--color-success)',
    Sealant: 'var(--color-warning)',
    SDF: '#6366F1',
    Cleaning: '#06B6D4',
    Other: '#6B7280'
  };

  const getBarColor = (value, maxValue) => {
    if (maxValue === 0) return 'var(--color-success)';
    const ratio = value / maxValue;
    if (ratio > 0.7) return 'var(--color-accent)';
    if (ratio > 0.4) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  // Distinct colors for school bars
  const schoolColors = [
    'var(--color-primary)',
    'var(--color-accent)',
    'var(--color-success)',
    'var(--color-warning)',
    '#6366F1', // Indigo
    '#06B6D4', // Cyan
    '#A855F7', // Purple
    '#14B8A6', // Teal
    '#F43F5E', // Rose
    '#6B7280'  // Gray
  ];

  // Filter visits for pie chart based on time filter
  const filteredVisitsForPie = useMemo(() => {
    if (allVisits.length === 0) return [];
    
    const now = new Date();
    let cutoffDate = null;
    
    if (pieTimeFilter === '6M') {
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    } else if (pieTimeFilter === '1Y') {
      cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }
    // 'ALL' means no filtering
    
    if (cutoffDate) {
      return allVisits.filter(v => new Date(v.date) >= cutoffDate);
    }
    return allVisits;
  }, [allVisits, pieTimeFilter]);
  
  // Memoize pie chart data based on filtered visits
  const pieChartData = useMemo(() => {
    if (filteredVisitsForPie.length === 0) return [];
    
    const treatmentTypes = ['Filling', 'Extraction', 'Fluoride', 'Sealant', 'SDF', 'Cleaning', 'Other'];
    const treatmentsByTypeCounts = {};
    treatmentTypes.forEach(type => {
      treatmentsByTypeCounts[type] = 0;
    });
    
    filteredVisitsForPie.forEach(visit => {
      if (visit.treatmentTypes && visit.treatmentTypes.length > 0) {
        visit.treatmentTypes.forEach(treatment => {
          const normalized = treatment.trim();
          if (treatmentsByTypeCounts.hasOwnProperty(normalized)) {
            treatmentsByTypeCounts[normalized]++;
          } else {
            treatmentsByTypeCounts['Other']++;
          }
        });
      }
    });
    
    return Object.keys(treatmentsByTypeCounts)
      .map(type => ({
        name: type,
        value: treatmentsByTypeCounts[type],
        color: colors[type] || colors.Other
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredVisitsForPie]);

  // Custom interactive dot component - only responds to direct touch/click on the dot
  const createInteractiveDot = (chartId, color, dataKey, valueFormatter) => {
    return (props) => {
      const { cx, cy, payload, index } = props;
      if (cx === undefined || cy === undefined || payload[dataKey] === null) return null;
      
      const isActive = activePoint?.chartId === chartId && activePoint?.index === index;
      const radius = isActive ? 10 : 6;
      
      const handleClick = (e) => {
        e.stopPropagation();
        if (isActive) {
          setActivePoint(null);
        } else {
          setActivePoint({
            chartId,
            index,
            x: cx,
            y: cy,
            value: payload[dataKey],
            label: payload.label,
            formattedValue: valueFormatter(payload[dataKey])
          });
        }
      };
      
      return (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={color}
          stroke="#fff"
          strokeWidth={2}
          style={{ cursor: 'pointer', transition: 'r 0.15s' }}
          onClick={handleClick}
          onTouchEnd={handleClick}
        />
      );
    };
  };
  
  // Custom tooltip that appears near the selected point
  const CustomPointTooltip = ({ chartId }) => {
    if (!activePoint || activePoint.chartId !== chartId) return null;
    
    return (
      <div style={{
        position: 'absolute',
        left: activePoint.x,
        top: activePoint.y - 45,
        transform: 'translateX(-50%)',
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '6px 10px',
        fontSize: '12px',
        fontWeight: '600',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        pointerEvents: 'none',
        zIndex: 10,
        whiteSpace: 'nowrap'
      }}>
        <div style={{ color: '#666', fontSize: '11px' }}>{activePoint.label}</div>
        <div style={{ color: '#333' }}>{activePoint.formattedValue}</div>
      </div>
    );
  };
  
  // Clear active point when clicking outside
  const handleChartClick = () => {
    setActivePoint(null);
  };

  // Granularity selector component for line charts
  const GranularitySelector = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '12px'
    }}>
      <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: '500' }}>View:</span>
      <div style={{
        display: 'flex',
        background: '#f0f0f0',
        borderRadius: '6px',
        padding: '2px',
        gap: '2px'
      }}>
        {[
          { value: '1M', label: 'Monthly' },
          { value: '3M', label: 'Quarterly' },
          { value: '6M', label: 'Half-year' }
        ].map(option => (
          <button
            key={option.value}
            onClick={() => handleGranularityChange(option.value)}
            style={{
              padding: '4px 10px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: granularity === option.value ? 'white' : 'transparent',
              color: granularity === option.value ? 'var(--color-primary)' : '#666',
              boxShadow: granularity === option.value ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderSlide = (slideType, slideIndex) => {
    switch (slideType) {
      case 'avgDecayedTeeth':
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>Average Decayed Teeth per Child (D)</h2>
            </div>
            <GranularitySelector />
            <div style={{ position: 'relative' }} onClick={handleChartClick}>
              <CustomPointTooltip chartId="avgDecayedTeeth" />
              <ResponsiveContainer width="100%" height={320} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
                <LineChart data={chartData.avgDecayedTeeth} margin={{ top: 20, right: 20, bottom: 5, left: 0 }} style={{ outline: 'none' }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Line 
                    type="monotone" 
                    dataKey="avgD" 
                    stroke="var(--color-accent)" 
                    strokeWidth={3}
                    dot={createInteractiveDot('avgDecayedTeeth', 'var(--color-accent)', 'avgD', (v) => `${v.toFixed(2)} avg decayed`)}
                    activeDot={false}
                    name="Average Decayed Teeth"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'pctWithDecay':
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>% of Children with ≥1 Decayed Tooth</h2>
            </div>
            <GranularitySelector />
            <div style={{ position: 'relative' }} onClick={handleChartClick}>
              <CustomPointTooltip chartId="pctWithDecay" />
              <ResponsiveContainer width="100%" height={320} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
                <LineChart data={chartData.pctWithDecay} margin={{ top: 20, right: 20, bottom: 5, left: 0 }} style={{ outline: 'none' }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Line 
                    type="monotone" 
                    dataKey="pct" 
                    stroke="var(--color-warning)" 
                    strokeWidth={3}
                    dot={createInteractiveDot('pctWithDecay', 'var(--color-warning)', 'pct', (v) => `${v}%`)}
                    activeDot={false}
                    name="% with Decay"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'fDmftRatio':
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>F / DMFT Ratio</h2>
            </div>
            <GranularitySelector />
            <div style={{ position: 'relative' }} onClick={handleChartClick}>
              <CustomPointTooltip chartId="fDmftRatio" />
              <ResponsiveContainer width="100%" height={320} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
                <LineChart data={chartData.fDmftRatio} margin={{ top: 20, right: 20, bottom: 5, left: 0 }} style={{ outline: 'none' }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Line 
                    type="monotone" 
                    dataKey="ratio" 
                    stroke="var(--color-success)" 
                    strokeWidth={3}
                    dot={createInteractiveDot('fDmftRatio', 'var(--color-success)', 'ratio', (v) => `${v}% F/DMFT`)}
                    activeDot={false}
                    name="F/DMFT %"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'treatmentsByType':
        if (pieChartData.length === 0) return null;
        
        // Label function for pie chart - shows percentage outside the slice (no lines)
        const total = pieChartData.reduce((sum, item) => sum + item.value, 0);
        
        const renderLabel = ({ cx, cy, midAngle, outerRadius, index }) => {
          const item = pieChartData[index];
          if (!item) return null;
          const pct = (item.value / total) * 100;
          if (pct < 3) return null; // Hide labels for very small slices (<3%)
          const RADIAN = Math.PI / 180;
          const radius = outerRadius * 1.25;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);
          
          return (
            <text 
              x={x} 
              y={y} 
              fill="#333"
              textAnchor={x > cx ? 'start' : 'end'} 
              dominantBaseline="central"
              style={{ fontSize: '12px', fontWeight: '600' }}
            >
              {`${pct.toFixed(1)}%`}
            </text>
          );
        };
        
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>Treatments by Type</h2>
            </div>
            {/* Time filter selector for pie chart */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: '500' }}>View:</span>
              <div style={{
                display: 'flex',
                background: '#f0f0f0',
                borderRadius: '6px',
                padding: '2px',
                gap: '2px'
              }}>
                {[
                  { value: '6M', label: 'Last 6 months' },
                  { value: '1Y', label: 'Last 1 year' },
                  { value: 'ALL', label: 'All data' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setPieTimeFilter(option.value)}
                    style={{
                      padding: '4px 10px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: pieTimeFilter === option.value ? 'white' : 'transparent',
                      color: pieTimeFilter === option.value ? 'var(--color-primary)' : '#666',
                      boxShadow: pieTimeFilter === option.value ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <PieChart style={{ outline: 'none' }}>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={85}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    padding: '6px 10px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#666', fontSize: '11px', marginBottom: '2px' }}
                  itemStyle={{ color: '#333', fontWeight: '600' }}
                  formatter={(value, name) => [value, name || 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Divider line and Custom Legend */}
            <div style={{ 
              borderTop: '1px solid #e0e0e0',
              marginTop: '16px',
              paddingTop: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px 16px',
                justifyContent: 'center'
              }}>
                {pieChartData.map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: item.color,
                      borderRadius: '2px'
                    }} />
                    <span style={{ fontSize: '12px', color: '#666' }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'treatmentsBySchool':
        if (chartData.treatmentsBySchool.length === 0) return null;
        
        const treatmentLegendItems = [
          { key: 'Filling', color: colors.Filling },
          { key: 'Extraction', color: colors.Extraction },
          { key: 'Fluoride', color: colors.Fluoride },
          { key: 'Sealant', color: colors.Sealant },
          { key: 'SDF', color: colors.SDF },
          { key: 'Cleaning', color: colors.Cleaning },
          { key: 'Other', color: colors.Other }
        ];
        
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Treatments by School</h2>
            <ResponsiveContainer width="100%" height={250} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <BarChart data={chartData.treatmentsBySchool} margin={{ top: 5, right: 20, bottom: 10, left: 0 }} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="school" 
                  hide={true}
                />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    padding: '6px 10px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#666', fontSize: '11px', marginBottom: '2px' }}
                  itemStyle={{ fontWeight: '600' }}
                />
                <Bar dataKey="Filling" stackId="a" fill={colors.Filling} />
                <Bar dataKey="Extraction" stackId="a" fill={colors.Extraction} />
                <Bar dataKey="Fluoride" stackId="a" fill={colors.Fluoride} />
                <Bar dataKey="Sealant" stackId="a" fill={colors.Sealant} />
                <Bar dataKey="SDF" stackId="a" fill={colors.SDF} />
                <Bar dataKey="Cleaning" stackId="a" fill={colors.Cleaning} />
                <Bar dataKey="Other" stackId="a" fill={colors.Other} />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Divider line */}
            <div style={{ 
              borderTop: '1px solid #e0e0e0',
              marginTop: '20px',
              paddingTop: '16px'
            }}>
              {/* Treatment Types Legend */}
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px 16px',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                {treatmentLegendItems.map((item) => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: item.color,
                      borderRadius: '2px'
                    }} />
                    <span style={{ fontSize: '12px', color: '#666' }}>{item.key}</span>
                  </div>
                ))}
              </div>
              
              {/* School Names - Row by Row */}
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Schools (left to right):</p>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '6px'
              }}>
                {chartData.treatmentsBySchool.map((entry, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: '600',
                      color: 'var(--color-primary)',
                      minWidth: '20px'
                    }}>
                      {index + 1}.
                    </span>
                    <span style={{ fontSize: '14px', color: '#333' }}>{entry.school}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'avgDmftBySchool':
        if (chartData.avgDmftBySchool.length === 0) return null;
        
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '300px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Average DMFT by School</h2>
            <ResponsiveContainer width="100%" height={250} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <BarChart data={chartData.avgDmftBySchool} margin={{ top: 5, right: 20, bottom: 10, left: 0 }} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="school" 
                  hide={true}
                />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    padding: '6px 10px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#666', fontSize: '11px', marginBottom: '2px' }}
                  itemStyle={{ color: '#333', fontWeight: '600' }}
                  formatter={(value) => [value.toFixed(2), 'Average DMFT']}
                />
                <Bar dataKey="avgDmft" name="Average DMFT" radius={[8, 8, 0, 0]}>
                  {chartData.avgDmftBySchool.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={schoolColors[index % schoolColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Custom Legend - Row by Row */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '8px', 
              marginTop: '16px', 
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              {chartData.avgDmftBySchool.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div 
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      backgroundColor: schoolColors[index % schoolColors.length],
                      borderRadius: '2px',
                      flexShrink: 0
                    }} 
                  />
                  <span style={{ fontSize: '14px', color: '#333' }}>{entry.school}</span>
                  <span style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>({entry.avgDmft})</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'avgDmftOverTime':
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>Average DMFT Over Time</h2>
            </div>
            <GranularitySelector />
            <div style={{ position: 'relative' }} onClick={handleChartClick}>
              <CustomPointTooltip chartId="avgDmftOverTime" />
              <ResponsiveContainer width="100%" height={320} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
                <LineChart data={chartData.avgDmftOverTime} margin={{ top: 20, right: 20, bottom: 5, left: 0 }} style={{ outline: 'none' }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Line 
                    type="monotone" 
                    dataKey="avgDmft" 
                    stroke="var(--color-primary)" 
                    strokeWidth={3}
                    dot={createInteractiveDot('avgDmftOverTime', 'var(--color-primary)', 'avgDmft', (v) => `${v.toFixed(2)} avg DMFT`)}
                    activeDot={false}
                    name="Average DMFT"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading graphs...</div>
        <NavBar />
      </div>
    );
  }

  const availableSlides = getAvailableSlides();

  if (availableSlides.length === 0) {
    return (
      <div className="container">
        <PageHeader title="Reports" subtitle="Data visualization and insights" icon="reports" />
        <div className="card">
          <div className="empty-state">No data available yet. Register children and add visits to see statistics.</div>
        </div>
        <NavBar />
      </div>
    );
  }

  const currentSlideType = availableSlides[currentSlide];

  return (
    <div className="container">
      <PageHeader title="Reports" subtitle="Data visualization and insights" icon="reports" />

      {/* Dataset Overview Section */}
      <div style={{ marginTop: '8px', marginBottom: '28px' }}>
        {/* Section Title */}
        <h2 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--color-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
          paddingLeft: '4px'
        }}>
          Dataset Overview
        </h2>

        {/* Metrics Container Card */}
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '12px',
          padding: '14px 16px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px 16px'
          }}>
            <div style={{ padding: '6px 8px' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#495057',
                lineHeight: 1
              }}>
                {metrics.totalChildren}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: '#6c757d',
                marginTop: '2px'
              }}>
                Total Children
              </div>
            </div>
            <div style={{ padding: '6px 8px' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#495057',
                lineHeight: 1
              }}>
                {metrics.totalVisits}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: '#6c757d',
                marginTop: '2px'
              }}>
                Total Visits
              </div>
            </div>
            <div style={{ padding: '6px 8px' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#495057',
                lineHeight: 1
              }}>
                {metrics.schoolsCovered}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: '#6c757d',
                marginTop: '2px'
              }}>
                Schools Covered
              </div>
            </div>
            <div style={{ padding: '6px 8px' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#495057',
                lineHeight: 1
              }}>
                {metrics.dateRange ? (
                  <>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {metrics.dateRange.start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <span style={{ margin: '0 4px' }}>–</span>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {metrics.dateRange.end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </>
                ) : (
                  'No data'
                )}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: '#6c757d',
                marginTop: '2px'
              }}>
                Coverage
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section Label */}
      <h2 style={{
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--color-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '12px',
        paddingLeft: '4px'
      }}>
        Trends
      </h2>

      {/* Navigation buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px',
        padding: '0 4px'
      }}>
        <button
          onClick={handlePrev}
          disabled={currentSlide === 0}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            background: currentSlide === 0 ? 'var(--color-disabled-bg)' : 'var(--color-primary)',
            color: 'white',
            cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            opacity: currentSlide === 0 ? 0.5 : 1
          }}
        >
          ← Prev
        </button>

        {/* Slide indicators */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {availableSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (!isTransitioning) {
                  setIsTransitioning(true);
                  setCurrentSlide(index);
                  setTimeout(() => setIsTransitioning(false), 300);
                }
              }}
              style={{
                width: index === currentSlide ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                border: 'none',
                background: index === currentSlide ? 'var(--color-primary)' : 'var(--color-disabled-bg)',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentSlide === availableSlides.length - 1}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            background: currentSlide === availableSlides.length - 1 ? 'var(--color-disabled-bg)' : 'var(--color-primary)',
            color: 'white',
            cursor: currentSlide === availableSlides.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            opacity: currentSlide === availableSlides.length - 1 ? 0.5 : 1
          }}
        >
          Next →
        </button>
      </div>

      {/* Slide container with swipe support */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          touchAction: 'pan-y',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          style={{
            display: 'flex',
            transform: `translateX(-${currentSlide * 100}%)`,
            transition: 'transform 0.3s ease-in-out',
            willChange: 'transform'
          }}
        >
          {availableSlides.map((slideType, index) => (
            <div
              key={slideType}
              style={{
                minWidth: '100%',
                width: '100%',
                flexShrink: 0
              }}
            >
              {renderSlide(slideType, index)}
            </div>
          ))}
        </div>
      </div>

      {/* Slide counter */}
      <div style={{ 
        textAlign: 'center', 
        color: '#666', 
        fontSize: '12px', 
        marginTop: '8px',
        marginBottom: '16px'
      }}>
        {currentSlide + 1} of {availableSlides.length}
      </div>

      <NavBar />
    </div>
  );
};

export default Graphs;
