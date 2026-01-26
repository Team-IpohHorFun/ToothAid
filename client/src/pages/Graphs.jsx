import { useEffect, useState, useRef, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import NavBar from '../components/NavBar';
import { getAllChildren, getAllVisits } from '../db/indexedDB';

const Graphs = () => {
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef(null);
  
  const [chartData, setChartData] = useState({
    avgDecayedTeeth: [],          // Chart 1: Average D per child (monthly)
    pctWithDecay: [],              // Chart 2: % with ≥1 decayed tooth (monthly)
    fDmftRatio: [],                // Chart 3: F/DMFT ratio (monthly)
    treatmentsByType: [],          // Chart 4: Treatments by type (bar)
    treatmentsBySchool: [],        // Chart 5: Treatments by school (stacked bar, top 10)
    avgDmftBySchool: [],           // Chart 6: Average DMFT by school (bar, top 10)
    avgDmftOverTime: []            // Chart 7: Average DMFT over time (monthly) - supporting
  });

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
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide((prev) => prev - 1);
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

  // Helper: Get latest visit per child in a month
  const getLatestVisitsPerChildInMonth = (monthVisits) => {
    const latestVisitPerChild = {};
    monthVisits.forEach(visit => {
      const childId = visit.childId;
      const visitDate = new Date(visit.date);
      if (!latestVisitPerChild[childId] || 
          visitDate > new Date(latestVisitPerChild[childId].date)) {
        latestVisitPerChild[childId] = visit;
      }
    });
    return Object.values(latestVisitPerChild);
  };

  // Helper: All months between start and end (YYYY-MM), inclusive; equal x-axis spacing for line charts
  const getAllMonthsInRange = (startKey, endKey) => {
    const out = [];
    const [sy, sm] = startKey.split('-').map(Number);
    const [ey, em] = endKey.split('-').map(Number);
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      out.push(`${y}-${String(m).padStart(2, '0')}`);
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return out;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const children = await getAllChildren();
        const visits = await getAllVisits();

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

        // Group all visits by month
        const visitsByMonth = {};
        visitsWithChildren.forEach(visit => {
          const date = new Date(visit.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!visitsByMonth[monthKey]) {
            visitsByMonth[monthKey] = [];
          }
          visitsByMonth[monthKey].push(visit);
        });

        const monthKeys = Object.keys(visitsByMonth).sort();
        const allMonths = monthKeys.length > 0
          ? getAllMonthsInRange(monthKeys[0], monthKeys[monthKeys.length - 1])
          : [];

        // Line charts use allMonths so x-axis has equal time intervals; missing months show as 0
        const valueForMonth = (monthKey) => {
          const monthVisits = visitsByMonth[monthKey] || [];
          return getLatestVisitsPerChildInMonth(monthVisits);
        };

        // Chart 1: Average Decayed Teeth (D) per child - Monthly
        const avgDecayedTeeth = allMonths.map(monthKey => {
          const latestVisits = valueForMonth(monthKey);
          const decayedValues = latestVisits.map(v => (v.decayedTeeth ?? 0));
          const totalD = decayedValues.reduce((sum, d) => sum + d, 0);
          const childCount = decayedValues.length;
          return {
            month: monthKey,
            avgD: childCount > 0 ? parseFloat((totalD / childCount).toFixed(2)) : 0
          };
        });

        // Chart 2: % of children with ≥1 decayed tooth - Monthly
        const pctWithDecay = allMonths.map(monthKey => {
          const latestVisits = valueForMonth(monthKey);
          const childrenWithDecay = latestVisits.filter(v => (v.decayedTeeth ?? 0) >= 1).length;
          const totalChildren = latestVisits.length;
          return {
            month: monthKey,
            pct: totalChildren > 0 ? parseFloat(((childrenWithDecay / totalChildren) * 100).toFixed(1)) : 0
          };
        });

        // Chart 3: F / DMFT ratio - Monthly (population-level)
        const fDmftRatio = allMonths.map(monthKey => {
          const latestVisits = valueForMonth(monthKey);
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
          return { month: monthKey, ratio };
        });

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

        // Chart 7: Average DMFT over time - Monthly (supporting chart)
        const avgDmftOverTime = allMonths.map(monthKey => {
          const latestVisits = valueForMonth(monthKey);
          const dmftValues = latestVisits.map(v => {
            const D = v.decayedTeeth ?? 0;
            const M = v.missingTeeth ?? 0;
            const F = v.filledTeeth ?? 0;
            return D + M + F;
          });
          const totalDMFT = dmftValues.reduce((sum, dmft) => sum + dmft, 0);
          const childCount = dmftValues.length;
          return {
            month: monthKey,
            avgDmft: childCount > 0 ? parseFloat((totalDMFT / childCount).toFixed(2)) : 0
          };
        });

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
  }, []);

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

  // Memoize pie chart data to prevent recalculation
  const pieChartData = useMemo(() => {
    if (chartData.treatmentsByType.length === 0) return [];
    return chartData.treatmentsByType.map(item => ({
      name: item.type,
      value: item.count,
      color: colors[item.type] || colors.Other
    }));
  }, [chartData.treatmentsByType]);

  const renderSlide = (slideType, slideIndex) => {
    switch (slideType) {
      case 'avgDecayedTeeth':
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Average Decayed Teeth per Child (D)</h2>
            <ResponsiveContainer width="100%" height={350} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <LineChart data={chartData.avgDecayedTeeth} margin={{ top: 20, right: 20, bottom: 5, left: 0 }} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '4px' }}
                  formatter={(value) => [value.toFixed(2), 'Avg Decayed Teeth']}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgD" 
                  stroke="var(--color-accent)" 
                  strokeWidth={3}
                  dot={{ fill: 'var(--color-accent)', r: 6, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 10, strokeWidth: 2, stroke: '#fff' }}
                  name="Average Decayed Teeth"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'pctWithDecay':
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>% of Children with ≥1 Decayed Tooth</h2>
            <ResponsiveContainer width="100%" height={350} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <LineChart data={chartData.pctWithDecay} margin={{ top: 20, right: 20, bottom: 5, left: 0 }} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '4px' }}
                  formatter={(value) => [`${value}%`, 'Percentage']}
                />
                <Line 
                  type="monotone" 
                  dataKey="pct" 
                  stroke="var(--color-warning)" 
                  strokeWidth={3}
                  dot={{ fill: 'var(--color-warning)', r: 6, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 10, strokeWidth: 2, stroke: '#fff' }}
                  name="% with Decay"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'fDmftRatio':
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>F / DMFT Ratio</h2>
            <ResponsiveContainer width="100%" height={350} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <LineChart data={chartData.fDmftRatio} margin={{ top: 20, right: 20, bottom: 5, left: 0 }} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '4px' }}
                  formatter={(value) => [`${value}%`, 'F/DMFT Ratio']}
                />
                <Line 
                  type="monotone" 
                  dataKey="ratio" 
                  stroke="var(--color-success)" 
                  strokeWidth={3}
                  dot={{ fill: 'var(--color-success)', r: 6, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 10, strokeWidth: 2, stroke: '#fff' }}
                  name="F/DMFT %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'treatmentsByType':
        if (pieChartData.length === 0) return null;
        
        // Optimized label function
        const renderLabel = (entry) => {
          const percent = entry.percent || 0;
          if (percent < 0.05) return ''; // Hide labels for very small slices
          return `${(percent * 100).toFixed(0)}%`;
        };
        
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Treatments by Type</h2>
            <ResponsiveContainer width="100%" height={350} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <PieChart style={{ outline: 'none' }}>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '4px' }}
                  formatter={(value, name) => [value, name || 'Count']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      case 'treatmentsBySchool':
        if (chartData.treatmentsBySchool.length === 0) return null;
        
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Treatments by School (Top 10)</h2>
            <ResponsiveContainer width="100%" height={350} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <BarChart data={chartData.treatmentsBySchool} margin={{ top: 5, right: 20, bottom: 60, left: 0 }} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="school" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  interval={0}
                />
                <YAxis />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <Legend />
                <Bar dataKey="Filling" stackId="a" fill={colors.Filling} />
                <Bar dataKey="Extraction" stackId="a" fill={colors.Extraction} />
                <Bar dataKey="Fluoride" stackId="a" fill={colors.Fluoride} />
                <Bar dataKey="Sealant" stackId="a" fill={colors.Sealant} />
                <Bar dataKey="SDF" stackId="a" fill={colors.SDF} />
                <Bar dataKey="Cleaning" stackId="a" fill={colors.Cleaning} />
                <Bar dataKey="Other" stackId="a" fill={colors.Other} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'avgDmftBySchool':
        if (chartData.avgDmftBySchool.length === 0) return null;
        
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '300px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Average DMFT by School (Top 10)</h2>
            <ResponsiveContainer width="100%" height={250} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <BarChart data={chartData.avgDmftBySchool} margin={{ top: 5, right: 20, bottom: 10, left: 0 }} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="school" 
                  hide={true}
                />
                <YAxis />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '4px' }}
                  formatter={(value) => [value.toFixed(2), 'Average DMFT']}
                />
                <Bar dataKey="avgDmft" name="Average DMFT" radius={[8, 8, 0, 0]}>
                  {chartData.avgDmftBySchool.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={schoolColors[index % schoolColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Custom Legend */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '16px', 
              marginTop: '16px', 
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              {chartData.avgDmftBySchool.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div 
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      backgroundColor: schoolColors[index % schoolColors.length],
                      borderRadius: '2px'
                    }} 
                  />
                  <span style={{ fontSize: '14px', color: '#333' }}>{entry.school}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'avgDmftOverTime':
        return (
          <div className="card" style={{ marginBottom: '20px', minHeight: '400px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Average DMFT Over Time</h2>
            <ResponsiveContainer width="100%" height={350} style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <LineChart data={chartData.avgDmftOverTime} margin={{ top: 20, right: 20, bottom: 5, left: 0 }} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '4px' }}
                  formatter={(value) => [value.toFixed(2), 'Average DMFT']}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgDmft" 
                  stroke="var(--color-primary)" 
                  strokeWidth={3}
                  dot={{ fill: 'var(--color-primary)', r: 6, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 10, strokeWidth: 2, stroke: '#fff' }}
                  name="Average DMFT"
                />
              </LineChart>
            </ResponsiveContainer>
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
        <div className="page-header">
          <h1>Statistics & Graphs</h1>
          <p>Data visualization and insights</p>
        </div>
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
      <div className="page-header">
        <h1>Statistics & Graphs</h1>
        <p>Data visualization and insights</p>
      </div>

      {/* Navigation buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
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
