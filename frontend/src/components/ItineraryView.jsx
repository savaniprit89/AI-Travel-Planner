import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, CloudSun, BookmarkCheck, Heart, MapPin, RefreshCw, BarChart2, Activity, Award, Calendar, AlertTriangle } from 'lucide-react';

const CATEGORY_EMOJIS = {
  Sightseeing: "🏛️",
  Art: "🎨",
  History: "🕰️",
  Nature: "🌳",
  Food: "🍳",
  Adventure: "🚴",
  Relaxation: "🏖️",
  Shopping: "🛍️"
};

const CATEGORY_COLORS = {
  Sightseeing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Art: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  History: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Nature: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Food: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Adventure: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Relaxation: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  Shopping: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20"
};

export default function ItineraryView({
  itinerary,
  activeDay,
  setActiveDay,
  username,
  budget,
  interests,
  hoveredActivityIndex,
  setHoveredActivityIndex,
  selectedActivityIndex,
  setSelectedActivityIndex,
  onSwapActivity
}) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Scroll active activity card into view when selected from the map
  useEffect(() => {
    if (selectedActivityIndex !== null) {
      const el = document.getElementById(`activity-card-${selectedActivityIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const timer = setTimeout(() => setSelectedActivityIndex(null), 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedActivityIndex]);

  if (!itinerary) return null;

  const currentDay = itinerary.days[activeDay - 1] || itinerary.days[0];
  const activities = currentDay ? currentDay.activities : [];

  // Analytics calculations
  const totalMinutes = activities.reduce((acc, curr) => acc + curr.duration_minutes, 0);
  const totalCost = activities.reduce((acc, curr) => acc + curr.estimated_cost, 0);

  // Pace indicator
  let paceLabel = "⚖️ Balanced Pace";
  let paceColor = "text-sky-400 bg-sky-500/10 border-sky-500/20";
  if (totalMinutes < 300) {
    paceLabel = "💆 Leisurely Pace";
    paceColor = "text-teal-400 bg-teal-500/10 border-teal-500/20";
  } else if (totalMinutes > 500) {
    paceLabel = "🏃 Action-Packed Pace";
    paceColor = "text-pink-400 bg-pink-500/10 border-pink-500/20";
  }

  // Budget calculations
  const budgetCaps = {
    Economy: 60.0,
    Moderate: 180.0,
    Luxury: 600.0
  };
  const activeCap = budgetCaps[budget] || 180.0;
  const costPercentage = Math.min((totalCost / activeCap) * 100, 100);
  const isOverBudget = totalCost > activeCap;

  // Category distributions
  const categoryCounts = {};
  activities.forEach(act => {
    categoryCounts[act.category] = (categoryCounts[act.category] || 0) + 1;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("http://localhost:8000/api/itineraries/save", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: username.trim(),
          destination: itinerary.destination,
          budget: budget,
          interests: JSON.stringify(interests),
          itinerary_data: JSON.stringify(itinerary)
        })
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Failed to save itinerary to database.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting server database.");
    } finally {
      setSaving(false);
    }
  };

  // iCal Calendar Exporter (.ics downloader)
  const handleExportICS = () => {
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AI Travel Agent//EN\n";
    itinerary.days.forEach(day => {
      day.activities.forEach((act, idx) => {
        const fakeDate = new Date();
        fakeDate.setDate(fakeDate.getDate() + (day.day_number - 1));
        const formattedDate = fakeDate.toISOString().slice(0, 10).replace(/-/g, "");

        const hour = 9 + idx * 3;
        const startStr = `${formattedDate}T${String(hour).padStart(2, '0')}0000`;
        const endStr = `${formattedDate}T${String(hour + 2).padStart(2, '0')}0000`;

        ics += "BEGIN:VEVENT\n";
        ics += `SUMMARY:[AI Travel Agent] ${act.name}\n`;
        ics += `DESCRIPTION:${act.description.replace(/\n/g, " ")}\n`;
        ics += `LOCATION:${act.address || itinerary.destination}\n`;
        ics += `DTSTART:${startStr}\n`;
        ics += `DTEND:${endStr}\n`;
        ics += "END:VEVENT\n";
      });
    });
    ics += "END:VCALENDAR";

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${itinerary.destination}_Itinerary.ics`;
    link.click();
  };

  return (
    <div className="space-y-6" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Weather Adaptation Banner */}
      {itinerary.weather_adaptive_alert && (
        <div className="status-banner status-error" style={{ display: 'flex', alignItems: 'center', gap: '10px', animation: 'pulse 2s infinite' }}>
          <span style={{ fontSize: '14px' }}>☔</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{itinerary.weather_adaptive_alert}</span>
        </div>
      )}

      {/* Travel Summary Card */}
      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="itinerary-summary-card">
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Award size={12} className="animate-pulse" />
              {itinerary.travelers_count > 1 ? `Joint Planning compromisation (Travelers: ${itinerary.travelers_count})` : "Personalized Vector Plan"}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Explore {itinerary.destination}
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px', lineHeight: 1.4 }}>
              {itinerary.personalization_notes}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            <div>
              <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontFamily: 'monospace' }}>Total Plan Spend</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#a5b4fc', fontFamily: 'monospace' }}>
                ${itinerary.total_estimated_cost.toFixed(2)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleExportICS}
                title="Download standard ICS event coordinates"
                className="btn-secondary"
                style={{ padding: '8px 12px', fontSize: '0.75rem' }}
              >
                <Calendar size={14} />
                iCal
              </button>
              {/* <button
                onClick={handleSave}
                disabled={saving || saved}
                className="btn-primary"
                style={{ padding: '8px 12px', fontSize: '0.75rem', width: 'auto' }}
              > */}
              {/* {saved ? <BookmarkCheck size={14} /> : <Heart size={14} />} */}
              {/* <span>{saved ? "Saved" : saving ? "Saving..." : "Save Plan"}</span> */}
            </div>
          </div>
        </div>
      </div>

      {/* DAYS NAVIGATION & WEATHER */}
      <div className="days-nav">
        <div className="tab-buttons-container">
          {itinerary.days.map((day, idx) => (
            <button
              key={idx}
              onClick={() => setActiveDay(day.day_number)}
              className={`tab-btn ${activeDay === day.day_number ? "active" : ""}`}
            >
              Day {day.day_number}
            </button>
          ))}
        </div>

        {currentDay?.weather_summary && (
          <div className="weather-badge">
            <CloudSun size={14} style={{ color: '#f59e0b' }} />
            <span style={{ textTransform: 'capitalize' }}>{currentDay.weather_summary}</span>
          </div>
        )}
      </div>

      {/* METRICS ROW */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-card-title">
            <Clock size={10} />
            Active Hours
          </div>
          <div className="metric-card-value">
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-title">
            <Activity size={10} />
            Intensity
          </div>
          <div className={`metric-card-value ${paceColor}`} style={{ fontSize: '0.75rem', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', textAlign: 'center', border: '1px solid transparent' }}>
            {paceLabel.split(" ")[1]}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-title">
            <DollarSign size={10} />
            Daily Spend
          </div>
          <div className="metric-card-value">
            ${totalCost.toFixed(0)}
          </div>
        </div>
      </div>

      {/* VISUAL BUDGET GAUGES */}
      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Active Daily Cap Tracking ({budget} cap: ${activeCap})
          </span>
          <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 'bold', color: isOverBudget ? '#f87171' : '#a5b4fc' }}>
            ${totalCost.toFixed(0)} / ${activeCap}
          </span>
        </div>
        <div className="vector-bar-bg" style={{ height: '8px', background: '#02040a' }}>
          <div
            className="vector-bar-fill"
            style={{
              width: `${costPercentage}%`,
              background: isOverBudget ? 'linear-gradient(90deg, #ef4444, #f43f5e)' : 'linear-gradient(90deg, #6366f1, #a855f7)'
            }}
          />
        </div>
        {isOverBudget && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontSize: '0.65rem', marginTop: '6px', fontWeight: 'bold' }}>
            <AlertTriangle size={12} />
            <span>Exceeds active budget allocation. Reroll or swap activities to optimize!</span>
          </div>
        )}
      </div>

      {/* CATEGORY DONUT BAR */}
      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          Agenda Mix Composition
        </div>
        <div className="flex-row-wrap">
          {Object.entries(categoryCounts).map(([cat, count]) => {
            const percentage = (count / activities.length) * 100;
            return (
              <div
                key={cat}
                className={`status-banner ${CATEGORY_COLORS[cat] || "status-info"}`}
                style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(255,255,255,0.03)' }}
              >
                <span>{CATEGORY_EMOJIS[cat] || "📍"}</span>
                <span>{cat}:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{percentage.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline of Activities */}
      <div className="timeline-container">
        {activities.map((act, index) => {
          const isHovered = hoveredActivityIndex === index;
          const isSelected = selectedActivityIndex === index;

          return (
            <div
              key={index}
              id={`activity-card-${index}`}
              onMouseEnter={() => setHoveredActivityIndex(index)}
              onMouseLeave={() => setHoveredActivityIndex(null)}
              className={`timeline-card ${isHovered ? "active-card" : isSelected ? "highlight-card" : ""}`}
            >
              <div className="timeline-dot" style={{
                borderColor: isSelected ? "#f59e0b" : isHovered ? "#818cf8" : "#6366f1",
                boxShadow: isSelected ? "0 0 10px #f59e0b" : isHovered ? "0 0 10px #818cf8" : "none"
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>

                  {/* Time & Category */}
                  <div className="activity-header">
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#818cf8', fontFamily: 'monospace', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                      {act.time}
                    </span>
                    <span className={`status-banner ${CATEGORY_COLORS[act.category] || "status-info"}`} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.62rem' }}>
                      {CATEGORY_EMOJIS[act.category] || "📍"} {act.category}
                    </span>
                  </div>

                  {/* Attraction Name */}
                  <h4 className="activity-title">
                    {act.name}
                  </h4>

                  {/* Address */}
                  {act.address && (
                    <p style={{ fontSize: '0.65rem', color: '#475569', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={10} />
                      {act.address}
                    </p>
                  )}

                  {/* Description */}
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5, marginTop: '8px', margin: '8px 0 0 0' }}>
                    {act.description}
                  </p>
                </div>

                {/* Activity Cost, Duration, & Swap */}
                <div className="activity-meta-side">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} style={{ color: '#475569' }} />
                    <span>{act.duration_minutes} mins</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold', color: '#818cf8', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                    <DollarSign size={11} />
                    <span>{act.estimated_cost > 0 ? act.estimated_cost.toFixed(2) : "Free"}</span>
                  </div>

                  {/* Swap Button */}
                  {/* {onSwapActivity && (
                    <button
                      onClick={() => onSwapActivity(activeDay, index)}
                      title="Swap attraction with alternative candidate"
                      className="btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}
                    >
                      <RefreshCw size={10} />
                      <span>Swap</span>
                    </button>
                  )} */}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div >
  );
}
