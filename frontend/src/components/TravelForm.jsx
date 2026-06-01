import React, { useState } from 'react';
import { MapPin, Calendar, DollarSign, Compass, ChevronRight, Activity } from 'lucide-react';

const INTEREST_OPTIONS = [
  { id: "Art", label: "🎨 Art & Galleries" },
  { id: "History", label: "🏛️ History & Culture" },
  { id: "Nature", label: "🌳 Nature & Parks" },
  { id: "Food", label: "🍳 Food & Markets" },
  { id: "Adventure", label: "🚴 Adventure & Sports" },
  { id: "Shopping", label: "🛍️ Shopping & Malls" }
];

export default function TravelForm({ onSubmit, loading, username }) {
  const [destination, setDestination] = useState("");
  const [daysCount, setDaysCount] = useState(3);
  const [budget, setBudget] = useState("Moderate");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [additionalPrefs, setAdditionalPrefs] = useState("");

  const handleInterestToggle = (id) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!destination.trim()) return;
    onSubmit({
      destination: destination.trim(),
      days_count: Number(daysCount),
      budget,
      interests: selectedInterests,
      additional_preferences: additionalPrefs.trim()
    });
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div className="icon-wrapper">
          <Compass size={20} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>Generate Itinerary</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Specify parameters to invoke the Agent</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group">
          <label className="input-label" htmlFor="destination">Destination</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="destination"
              className="input-field"
              placeholder="e.g. Paris, Tokyo, London, Rome"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              disabled={loading}
            />
            <MapPin size={16} className="input-icon-left" />
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="input-label" htmlFor="daysCount">Duration</label>
            <div className="input-wrapper">
              <select
                id="daysCount"
                className="input-field"
                style={{ cursor: 'pointer', appearance: 'none', paddingLeft: '40px' }}
                value={daysCount}
                onChange={(e) => setDaysCount(e.target.value)}
                disabled={loading}
              >
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <option key={day} value={day} style={{ background: 'white' }}>{day} {day === 1 ? 'Day' : 'Days'}</option>
                ))}
              </select>
              <Calendar size={16} className="input-icon-left" style={{ pointerEvents: 'none' }} />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="input-label" htmlFor="budget">Budget Level</label>
            <div className="input-wrapper">
              <select
                id="budget"
                className="input-field"
                style={{ cursor: 'pointer', appearance: 'none', paddingLeft: '40px' }}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                disabled={loading}
              >
                <option value="Economy" style={{ background: 'white' }}>Economy ($)</option>
                <option value="Moderate" style={{ background: 'white' }}>Moderate ($$)</option>
                <option value="Luxury" style={{ background: 'white' }}>Luxury ($$$)</option>
              </select>
              <DollarSign size={16} className="input-icon-left" style={{ pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="input-label">Interests & Categories</label>
          <div className="interests-grid">
            {INTEREST_OPTIONS.map(opt => {
              const active = selectedInterests.includes(opt.id);
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => handleInterestToggle(opt.id)}
                  disabled={loading}
                  className={`interest-btn ${active ? "active" : ""}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="input-label" htmlFor="additionalPrefs">Trip-Specific Demands (Optional)</label>
          <textarea
            id="additionalPrefs"
            className="input-field"
            placeholder="e.g. Include a fine dining reservation, or avoid walking long distances."
            value={additionalPrefs}
            onChange={(e) => setAdditionalPrefs(e.target.value)}
            rows={2}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="btn-primary"
          style={{ marginTop: '10px' }}
        >
          {loading ? (
            <>
              <Activity className="animate-spin" size={16} />
              Agent Planning active...
            </>
          ) : (
            <>
              Initialize AI Agent
              <ChevronRight size={16} />
            </>
          )}
        </button>
        {!username.trim() && (
          <p style={{ fontSize: '9px', textAlign: 'center', color: '#f87171', margin: '4px 0 0 0', fontWeight: 'bold' }}>
            * Please specify a username above to initialize planning.
          </p>
        )}
      </form>
    </div>
  );
}
