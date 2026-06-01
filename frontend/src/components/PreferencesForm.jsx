import React, { useState, useEffect } from 'react';
import { User, Sparkles, Save, Info } from 'lucide-react';

const DIMENSIONS = [
  { label: "🎨 Art & Galleries", index: 0, color: "from-pink-500 to-rose-500" },
  { label: "🏛️ History & Culture", index: 1, color: "from-amber-500 to-yellow-500" },
  { label: "🌳 Nature & Parks", index: 2, color: "from-emerald-500 to-teal-500" },
  { label: "🚴 Adventure & Sports", index: 3, color: "from-cyan-500 to-blue-500" },
  { label: "🛍️ Shopping & Malls", index: 4, color: "from-fuchsia-500 to-purple-500" },
  { label: "🍳 Food & Markets", index: 5, color: "from-orange-500 to-red-500" },
  { label: "🍻 Nightlife & Bars", index: 6, color: "from-indigo-500 to-violet-500" },
  { label: "🏖️ Relaxation & Spa", index: 7, color: "from-teal-400 to-emerald-400" },
  { label: "💵 Budget Conscious", index: 8, color: "from-green-500 to-emerald-500" },
  { label: "💎 Luxury Experience", index: 9, color: "from-sky-400 to-indigo-500" }
];

const KEYWORDS = {
  art: 0, museum: 0, painting: 0, gallery: 0,
  history: 1, historic: 1, culture: 1, temple: 1, ruin: 1,
  nature: 2, garden: 2, park: 2, river: 2, mountain: 2,
  adventure: 3, sport: 3, hiking: 3, climbing: 3, action: 3,
  shopping: 4, boutique: 4, mall: 4, market: 4,
  food: 5, "street food": 5, dining: 5, restaurant: 5, cuisine: 5,
  nightlife: 6, bar: 6, pub: 6, club: 6, music: 6,
  relax: 7, spa: 7, beach: 7, massage: 7, slow: 7,
  budget: 8, cheap: 8, free: 8, economy: 8,
  luxury: 9, vip: 9, exclusive: 9, expensive: 9
};

const BAR_COLORS = [
  "linear-gradient(to right, #ec4899, #f43f5e)", // Art
  "linear-gradient(to right, #f59e0b, #eab308)", // History
  "linear-gradient(to right, #10b981, #14b8a6)", // Nature
  "linear-gradient(to right, #06b6d4, #3b82f6)", // Adventure
  "linear-gradient(to right, #d946ef, #a855f7)", // Shopping
  "linear-gradient(to right, #f97316, #ef4444)", // Food
  "linear-gradient(to right, #6366f1, #8b5cf6)", // Nightlife
  "linear-gradient(to right, #2dd4bf, #10b981)", // Relaxation
  "linear-gradient(to right, #22c55e, #10b981)", // Budget
  "linear-gradient(to right, #38bdf8, #6366f1)"  // Luxury
];

export default function PreferencesForm({ username, setUsername, onSaveSuccess }) {
  const [prefText, setPrefText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [vector, setVector] = useState(Array(10).fill(0));

  // Compute 10-dimensional vector in real-time locally
  useEffect(() => {
    const text = prefText.toLowerCase();
    const vec = Array(10).fill(0);

    let hasMatches = false;
    Object.entries(KEYWORDS).forEach(([kw, idx]) => {
      if (text.includes(kw)) {
        vec[idx] += 1;
        hasMatches = true;
      }
    });

    if (hasMatches) {
      const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
      if (magnitude > 0) {
        const normalized = vec.map(v => v / magnitude);
        setVector(normalized);
        return;
      }
    }
    setVector(Array(10).fill(0));
  }, [prefText]);

  // Fetch preferences when username changes
  useEffect(() => {
    if (!username.trim()) {
      setPrefText("");
      return;
    }

    const timer = setTimeout(() => {
      fetchPreferences();
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const fetchPreferences = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/preferences/${encodeURIComponent(username.trim())}`);
      if (response.ok) {
        const data = await response.json();
        setPrefText(data.preference_text);
        setStatus({ type: "info", message: "Loaded saved preference profile." });
      } else {
        setStatus({ type: "", message: "" });
      }
    } catch (err) {
      console.error("Error loading preferences:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setStatus({ type: "error", message: "Please specify a username." });
      return;
    }
    if (!prefText.trim()) {
      setStatus({ type: "error", message: "Please enter your preferences." });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch("http://localhost:8000/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          preference_text: prefText.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({ type: "success", message: "Preference vector cached in DB." });
        if (onSaveSuccess) onSaveSuccess(data);
      } else {
        const errData = await response.json();
        setStatus({ type: "error", message: errData.detail || "Failed to save profile." });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Connection to database server failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div className="icon-wrapper">
          <User size={20} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'black' }}>AI Personalization Profile</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Stores user preference vectors in SQLite/Postgres</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group">
          <label className="input-label" htmlFor="username">Username</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="username"
              className="input-field"
              placeholder="e.g. wanderlust99"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <span className="input-icon-left" style={{ fontWeight: 'bold' }}>@</span>
          </div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="input-label" htmlFor="preferences">Travel Preferences Statement</label>
          <textarea
            id="preferences"
            className="input-field"
            placeholder="I love historic ruins, museum art gallery visits, food markets, and outdoor hiking. I want moderate luxury travel."
            value={prefText}
            onChange={(e) => setPrefText(e.target.value)}
            rows={3}
            required
          />
        </div>

        {/* Real-Time Vector Visualizer */}
        <div style={{ paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={10} className="animate-pulse" />
              Real-Time Preference Vector
            </span>
          </div>

          {vector.every(v => v === 0) ? (
            <div className="status-banner status-info" style={{ display: 'flex', alignItems: 'flex-start', padding: '10px' }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '0.7rem', lineHeight: 1.4 }}>Type keywords like <b>art, museum, history, nature, adventure, food, shopping, bar, relax, budget, luxury</b> to synthesize preference vectors.</span>
            </div>
          ) : (
            <div className="vector-grid">
              {DIMENSIONS.map(dim => {
                const val = vector[dim.index];
                const active = val > 0;
                return (
                  <div key={dim.index} className="vector-bar-card" style={{ opacity: active ? 1 : 0.25 }}>
                    <div className="vector-bar-header">
                      <span style={{ color: '#cbd5e1', fontSize: '0.7rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{dim.label}</span>
                      <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>{(val * 100).toFixed(0)}%</span>
                    </div>
                    <div className="vector-bar-bg">
                      <div
                        className="vector-bar-fill"
                        style={{
                          width: `${val * 100}%`,
                          background: BAR_COLORS[dim.index]
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {status.message && (
          <div className={`status-banner ${status.type === "success" ? "status-success" :
              status.type === "error" ? "status-error" :
                "status-info"
            }`}>
            <Sparkles size={12} className="animate-pulse" style={{ flexShrink: 0 }} />
            <span>{status.message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-secondary"
        >
          {loading ? "Caching Preference Vector..." : (
            <>
              <Save size={14} />
              Cache Vector in DB
            </>
          )}
        </button>
      </form>
    </div>
  );
}
