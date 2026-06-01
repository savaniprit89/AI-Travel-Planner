import React, { useState } from 'react';
import { Compass, Award, MessageSquare, Send, X } from 'lucide-react';
import PreferencesForm from './components/PreferencesForm';
import TravelForm from './components/TravelForm';
import AgentConsole from './components/AgentConsole';
import ItineraryView from './components/ItineraryView';
import MapMock from './components/MapMock';

export default function App() {
  const [username, setUsername] = useState("traveler_one");
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Itinerary states
  const [itinerary, setItinerary] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [budget, setBudget] = useState("Moderate");
  const [interests, setInterests] = useState([]);

  // Interactive sync states
  const [hoveredActivityIndex, setHoveredActivityIndex] = useState(null);
  const [selectedActivityIndex, setSelectedActivityIndex] = useState(null);

  // Chat Drawer states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'agent', text: "👋 Hi! I'm your Travel Companion. Tell me how you'd like to tweak your plan! \n\nTry asking me to: \n- *'Add a coffee stop'*\n- *'Swap the first museum stop'*\n- *'Make the schedule more relaxed'*" }
  ]);

  // Handle chatbot dynamic mutation queries
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !itinerary) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setChatLoading(true);

    // Stream status update to tactical console log
    setLogs(prev => [...prev, {
      step: "tool_call",
      message: `AI Agent Chat Prompt Mutator active: '${userMessage}'`,
      data: { username, destination: itinerary.destination }
    }]);

    try {
      const response = await fetch("http://localhost:8000/api/plan/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          message: userMessage,
          itinerary: itinerary
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Mutate local itinerary structure in state!
        setItinerary(data.itinerary);

        // Append response text to chat messages
        setChatMessages(prev => [...prev, { sender: 'agent', text: data.message }]);

        // Push result to tactical console log
        setLogs(prev => [...prev, {
          step: "result",
          message: `Itinerary dynamically mutated successfully: '${data.message.split(".")[0]}'`
        }]);
      } else {
        const err = await response.json();
        setChatMessages(prev => [...prev, { sender: 'agent', text: `⚠️ Mutation failed: ${err.detail || "Error."}` }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'agent', text: "⚠️ Database connection failed. Please ensure the backend server is active." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Client-side interactive attraction swapping
  const handleSwapActivity = (dayNumber, activityIndex) => {
    if (!itinerary) return;

    const newItinerary = JSON.parse(JSON.stringify(itinerary));
    const day = newItinerary.days.find(d => d.day_number === dayNumber);
    if (!day) return;

    const activity = day.activities[activityIndex];
    if (!activity) return;

    const alternatePool = [
      { name: "Musée d'Orsay", description: "View the world's largest collection of impressionist masterpieces in a beautiful former railway station.", cost: 16.0, category: "Art", lat: 48.8599, lng: 2.3265, address: "1 Rue de la Légion d'Honneur, 75007 Paris" },
      { name: "Centre Pompidou", description: "Explore the national museum of modern art housed in an iconic high-tech building.", cost: 15.0, category: "Art", lat: 48.8606, lng: 2.3522, address: "Place Georges-Pompidou, 75004 Paris" },
      { name: "Sainte-Chapelle", description: "Admire the stunning 13th-century stained glass windows inside a royal medieval chapel.", cost: 11.5, category: "History", lat: 48.8554, lng: 2.3450, address: "10 Boulevard du Palais, 75001 Paris" },
      { name: "Jardin du Luxembourg", description: "Stroll through quiet gravel pathways, fountains, and beautiful flowerbeds in a historic park.", cost: 0.0, category: "Nature", lat: 48.8462, lng: 2.3371, address: "75006 Paris" },
      { name: "Meiji Shrine Inner Garden", description: "Take a quiet forest walk right next to Harajuku's bustle.", cost: 4.0, category: "Nature", lat: 35.6720, lng: 139.6975, address: "Shibuya City, Tokyo" },
      { name: "Mori Art Museum & View", description: "A contemporary art museum on the 53rd floor with panoramic skyscraper views.", cost: 18.0, category: "Art", lat: 35.6605, lng: 139.7291, address: "Roppongi Hills, Minato, Tokyo" },
      { name: "Broadway Times Square Walk", description: "Walk through neon billboards and theater centers in Manhattan.", cost: 0.0, category: "Sightseeing", lat: 40.7580, lng: -73.9855, address: "New York, NY 10036" },
      { name: "The High Line Park", description: "An elevated railway line converted into a public park on Manhattan's West Side.", cost: 0.0, category: "Nature", lat: 40.7482, lng: -74.0048, address: "New York, NY 10011" }
    ];

    let match = alternatePool.find(alt =>
      alt.category === activity.category &&
      !day.activities.some(act => act.name === alt.name)
    );

    if (!match) {
      match = alternatePool.find(alt =>
        !day.activities.some(act => act.name === alt.name)
      );
    }

    if (match) {
      day.activities[activityIndex] = {
        ...activity,
        name: match.name,
        description: match.description,
        estimated_cost: match.cost,
        category: match.category,
        lat: match.lat,
        lng: match.lng,
        address: match.address
      };

      const newTotal = newItinerary.days.reduce((sum, d) =>
        sum + d.activities.reduce((dSum, act) => dSum + act.estimated_cost, 0)
        , 0);
      newItinerary.total_estimated_cost = newTotal;

      setItinerary(newItinerary);

      setLogs(prev => [...prev, {
        step: "tool_result",
        message: `Swapped activity on Day ${dayNumber} Index ${activityIndex + 1} with alternative: '${match.name}'`
      }]);
    }
  };

  // Handles planning trigger from TravelForm
  const handleGeneratePlan = async (params) => {
    setLoading(true);
    setLogs([]);
    setError(null);
    setItinerary(null);
    setActiveDay(1);
    setBudget(params.budget);
    setInterests(params.interests);

    try {
      const response = await fetch("http://localhost:8000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          destination: params.destination,
          days_count: params.days_count,
          budget: params.budget,
          interests: params.interests,
          additional_preferences: params.additional_preferences
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      // Stream readable response chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const data = JSON.parse(trimmed);
            if (data.type === "log") {
              setLogs(prev => [...prev, data]);
            } else if (data.type === "result") {
              setItinerary(data.itinerary);
              setLogs(prev => [...prev, {
                step: "result",
                message: `Successfully resolved and compromised multi-day itinerary. Total Activities: ${data.itinerary.days.reduce((acc, curr) => acc + curr.activities.length, 0)
                  }`
              }]);
            }
          } catch (e) {
            console.error("Failed to parse SSE JSON chunk:", trimmed, e);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to communicate with planning agent.");
    } finally {
      setLoading(false);
    }
  };

  // Helper callback for simulation routing logs
  const handleSimulationLog = (stepType, message, data = null) => {
    setLogs(prev => [...prev, { step: stepType, message, data }]);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '60px', overflow: 'hidden' }}>
      {/* Decorative ambient glows */}
      <div className="glow-orb glow-orb-indigo" />
      <div className="glow-orb glow-orb-purple" />

      {/* Header Bar */}
      <header className="app-header">
        <div className="max-w-container header-container">
          <div className="header-logo-group">
            <div className="logo-badge">
              <Compass size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
                <span className="text-gradient">AI Travel Agent</span>
              </h1>
              <p style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace', margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Autonomous Multi-Step Scheduler
              </p>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '5px 12px', borderRadius: '99px', fontFamily: 'monospace' }}>
              FastAPI v1.0.0
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid Dashboard */}
      <main className="max-w-container">
        <div className="dashboard-grid">

          {/* Left Inputs Column */}
          <div className="sidebar-column">
            <PreferencesForm
              username={username}
              setUsername={setUsername}
            />
            <TravelForm
              onSubmit={handleGeneratePlan}
              loading={loading}
              username={username}
            />
          </div>

          {/* Right Console & Results Column */}
          <div className="main-column">

            {/* Agent Console */}
            <AgentConsole
              logs={logs}
              error={error}
              isRunning={loading}
            />

            {/* Results Display */}
            {itinerary ? (
              <div className="results-grid">
                {/* Timeline display */}
                <div>
                  <ItineraryView
                    itinerary={itinerary}
                    activeDay={activeDay}
                    setActiveDay={setActiveDay}
                    username={username}
                    budget={budget}
                    interests={interests}
                    hoveredActivityIndex={hoveredActivityIndex}
                    setHoveredActivityIndex={setHoveredActivityIndex}
                    selectedActivityIndex={selectedActivityIndex}
                    setSelectedActivityIndex={setSelectedActivityIndex}
                    onSwapActivity={handleSwapActivity}
                  />
                </div>
                {/* Interactive map visualization */}
                <div className="sticky-map-wrapper">
                  {/* <MapMock 
                    itinerary={itinerary}
                    activeDay={activeDay}
                    hoveredActivityIndex={hoveredActivityIndex}
                    setHoveredActivityIndex={setHoveredActivityIndex}
                    selectedActivityIndex={selectedActivityIndex}
                    setSelectedActivityIndex={setSelectedActivityIndex}
                    onSimulationLog={handleSimulationLog}
                  /> */}
                </div>
              </div>
            ) : (
              !loading && !error && (
                <div className="glass-panel empty-state-card">
                  <div className="empty-icon-circle">
                    <Award size={26} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>No Active Itinerary Plan</h3>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '320px', margin: '4px auto 0 auto', lineHeight: 1.4 }}>
                      Save a vector profile on the left, then trigger the AI Agent planning sequence to generate a customized travel agenda.
                    </p>
                  </div>
                </div>
              )
            )}

          </div>
        </div>
      </main>

      {/* FLOATING CHAT COMPANION SYSTEM */}
      {itinerary && (
        <>
          {/* Floating trigger bubble */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="chat-trigger-btn animate-bounce-slow"
            title="Chat with Agent to dynamically tweak plan"
          >
            {chatOpen ? <X size={24} /> : <MessageSquare size={24} />}
          </button>

          {/* Sliding Chat Drawer */}
          <div className={`chat-drawer ${chatOpen ? "open" : ""}`}>
            <div className="chat-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} className="text-indigo-400" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>Travel Chat</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="chat-drawer-body">
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`chat-message-bubble ${m.sender === 'user' ? 'chat-message-user' : 'chat-message-agent'}`}
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {m.text}
                </div>
              ))}
              {chatLoading && (
                <div className="chat-message-bubble chat-message-agent animate-pulse">
                  💭 Tweaking itinerary vectors...
                </div>
              )}
            </div>

            <form onSubmit={handleSendChatMessage} className="chat-drawer-input-area">
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Add a coffee stop to Day 1"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                style={{ padding: '8px 12px', fontSize: '0.75rem' }}
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="btn-primary"
                style={{ width: '40px', height: '36px', padding: 0, borderRadius: '10px' }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
