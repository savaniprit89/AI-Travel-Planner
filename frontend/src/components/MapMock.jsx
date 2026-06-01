import React, { useState, useEffect } from 'react';
import { Compass, Map, Navigation2 } from 'lucide-react';

export default function MapMock({ 
  itinerary, 
  activeDay,
  hoveredActivityIndex,
  setHoveredActivityIndex,
  selectedActivityIndex,
  setSelectedActivityIndex,
  onSimulationLog
}) {
  const [simulating, setSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(null);

  if (!itinerary || !itinerary.days) {
    return (
      <div className="glass-panel h-full min-h-[350px] flex flex-col items-center justify-center text-slate-500 gap-2">
        <Map size={32} className="opacity-30" />
        <p className="text-sm">No active route coordinates to display.</p>
      </div>
    );
  }

  const dayIndex = activeDay - 1;
  const currentDay = itinerary.days[dayIndex];
  const activities = currentDay ? currentDay.activities : [];

  // Filter activities that have coordinates
  const points = activities.filter(a => a.lat !== undefined && a.lng !== undefined);

  // Trigger step-by-step route journey simulation
  useEffect(() => {
    if (!simulating || points.length === 0) {
      setSimIndex(null);
      return;
    }

    let currentStep = 0;
    setSimIndex(0);
    if (onSimulationLog) {
      onSimulationLog("start", `⚡ Journey Simulation started! Simulating route navigation for Day ${activeDay}...`);
    }

    const interval = setInterval(() => {
      currentStep += 1;
      if (currentStep >= points.length) {
        clearInterval(interval);
        setSimulating(false);
        setSimIndex(null);
        if (onSimulationLog) {
          onSimulationLog("result", `🏆 Day ${activeDay} journey simulation complete! All stops successfully reached.`);
        }
      } else {
        setSimIndex(currentStep);
        setSelectedActivityIndex(currentStep); // highlight corresponding timeline card!
        if (onSimulationLog) {
          const origin = points[currentStep - 1].name;
          const dest = points[currentStep].name;
          const duration = points[currentStep].duration_minutes;
          onSimulationLog("tool_call", `🚗 Navigating Stop ${currentStep} to Stop ${currentStep + 1}`, {
            origin,
            destination: dest,
            status: "IN_TRANSIT"
          });
          setTimeout(() => {
            onSimulationLog("tool_result", `📍 Arrived at Stop ${currentStep + 1}: ${dest}! ETA satisfied. Preparing sightseeing window (${duration} mins).`);
          }, 800);
        }
      }
    }, 3000); // 3 seconds per hop

    return () => clearInterval(interval);
  }, [simulating]);

  if (points.length === 0) {
    return (
      <div className="glass-panel h-full min-h-[350px] flex flex-col items-center justify-center text-slate-500 gap-2">
        <Map size={32} className="opacity-30" />
        <p className="text-sm">No geocoded attractions on this day.</p>
      </div>
    );
  }

  // Bounding box calculations
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;

  const latMin = minLat - latRange * 0.25;
  const latMax = maxLat + latRange * 0.25;
  const lngMin = minLng - lngRange * 0.25;
  const lngMax = maxLng + lngRange * 0.25;

  const width = 500;
  const height = 350; // slightly reduced height to allocate space for inline legend

  const project = (lat, lng) => {
    const x = ((lng - lngMin) / (lngMax - lngMin)) * width;
    const y = height - ((lat - latMin) / (latMax - latMin)) * height;
    return { x: Math.max(35, Math.min(width - 35, x)), y: Math.max(35, Math.min(height - 35, y)) };
  };

  const projectedPoints = points.map((p, idx) => ({
    ...p,
    originalIndex: idx,
    ...project(p.lat, p.lng)
  }));

  // Build path strings
  let pathD = "";
  if (projectedPoints.length > 1) {
    pathD = `M ${projectedPoints[0].x} ${projectedPoints[0].y} ` + 
            projectedPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
  }

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      
      {/* Title Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Compass size={14} className="text-indigo-400 animate-pulse" />
          <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#cbd5e1', fontFamily: 'monospace' }}>
            Interactive Route Canvas
          </span>
        </div>
        <button
          onClick={() => setSimulating(!simulating)}
          className={`btn-primary ${simulating ? "bg-pink-600 animate-pulse" : ""}`}
          style={{ width: 'auto', padding: '5px 10px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}
        >
          <Navigation2 size={10} style={{ transform: simulating ? 'none' : 'rotate(45deg)' }} />
          {simulating ? "Stop Journey" : "Simulate Drive"}
        </button>
      </div>

      {/* Main Map Box Container */}
      <div style={{ flexGrow: 1, position: 'relative', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', background: '#020409' }}>
        {/* Map Grid backgrounds */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.015)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        
        {/* Interactive instructions helper */}
        <div className="absolute top-2 right-2 bg-slate-950/80 border border-white/5 text-[7px] text-indigo-300 font-mono px-2 py-0.5 rounded select-none pointer-events-none">
          {simulating ? "SIMULATION ACTIVE" : "CLICK NODES"}
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full relative z-10" style={{ display: 'block' }}>
          {/* Optimal Path */}
          {pathD && (
            <>
              <path
                d={pathD}
                fill="none"
                stroke="rgba(99, 102, 241, 0.12)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Interactive Nodes */}
          {projectedPoints.map((p, idx) => {
            const isHovered = hoveredActivityIndex === p.originalIndex;
            const isSelected = selectedActivityIndex === p.originalIndex;
            const isActiveSim = simIndex === p.originalIndex;
            
            const sizeMultiplier = isHovered || isSelected || isActiveSim ? 1.3 : 1.0;

            return (
              <g 
                key={idx} 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredActivityIndex(p.originalIndex)}
                onMouseLeave={() => setHoveredActivityIndex(null)}
                onClick={() => setSelectedActivityIndex(p.originalIndex)}
              >
                {/* Ping pulse for hovered/selected/simulating nodes */}
                {(isHovered || isSelected || isActiveSim) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={18}
                    fill={isActiveSim ? "rgba(16, 185, 129, 0.2)" : isSelected ? "rgba(245, 158, 11, 0.15)" : "rgba(99, 102, 241, 0.2)"}
                    className="animate-ping"
                  />
                )}

                {/* Outer Ring */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={8 * sizeMultiplier}
                  fill="#020409"
                  stroke={isActiveSim ? "#10b981" : isSelected ? "#f59e0b" : isHovered ? "#818cf8" : "#6366f1"}
                  strokeWidth={isHovered || isSelected || isActiveSim ? 3 : 2}
                  className="transition-all duration-300"
                />

                {/* Inner core dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4 * sizeMultiplier}
                  fill={isActiveSim ? "#10b981" : isSelected ? "#f59e0b" : isHovered ? "#818cf8" : "#818cf8"}
                  className="transition-all duration-300"
                />

                {/* Index number marker label */}
                <text
                  x={p.x}
                  y={p.y + (isHovered ? 22 : 16)}
                  textAnchor="middle"
                  className={`text-[8px] font-mono font-bold transition-all ${
                    isActiveSim ? "fill-emerald-400 font-bold" : isSelected ? "fill-amber-400" : "fill-slate-500"
                  }`}
                >
                  {p.originalIndex + 1}
                </text>

                {/* Floating tooltip popover for hovered or selected or simulating nodes */}
                {(isHovered || isSelected || isActiveSim) && (
                  <foreignObject
                    x={p.x - 70}
                    y={p.y - 60}
                    width="140"
                    height="50"
                    className="pointer-events-none transition-all duration-300 z-50"
                  >
                    <div className={`p-1.5 rounded border shadow-lg text-center backdrop-blur-md ${
                      isActiveSim
                        ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
                        : isSelected 
                          ? "bg-amber-950/90 border-amber-500/40 text-amber-100" 
                          : "bg-slate-950/95 border-indigo-500/40 text-indigo-100"
                    }`} style={{ fontSize: '8px', padding: '6px', borderRadius: '6px', border: '1px solid', boxSizing: 'border-box' }}>
                      <div className="font-bold truncate" style={{ margin: 0 }}>{p.name}</div>
                      <div style={{ fontSize: '7px', opacity: 0.8, marginTop: '2px', fontFamily: 'monospace' }}>
                        🕒 {p.time} | 💸 {p.estimated_cost > 0 ? `$${p.estimated_cost.toFixed(0)}` : "Free"}
                      </div>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Optimized Inline Legend Strip (Clean design, zero overlaps!) */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '16px', 
        padding: '8px', 
        background: 'rgba(255,255,255,0.01)', 
        border: '1px solid rgba(255,255,255,0.03)', 
        borderRadius: '8px',
        fontSize: '0.65rem',
        fontFamily: 'monospace',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#6366f1' }} />
          <span>Stops</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <span>Selected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} className="animate-pulse" />
          <span>Simulation Active</span>
        </div>
      </div>
    </div>
  );
}
