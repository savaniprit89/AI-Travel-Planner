# 🧭 Autonomous AI Travel Agent (Agentic)

AI Travel Agent is a state-of-the-art, responsive AI Travel Planner powered by a FastAPI backend implementing a LangChain reasoning loop (vector compromises, weather adaptation, Places geocoding) and a futuristic, glassmorphic Vite-React frontend dashboard.

It features **real-time execution console logging**, **live coordinate harvesting** (no keys required!), and **interactive vector preference modeling**.

---

## 🌟 Key Features

1.  **👥 Couple & Group Preference Vector Compromises**:
    Input multiple comma-separated usernames (e.g., `user1, user2`). The system split-queries database preference tables, calculates a **mathematical average compromise vector**, and builds an itinerary satisfying all travelers.
2.  **☔ Rain-Adaptive Scheduling Fallbacks**:
    Automatically scans destination forecasts. If rain/precipitations are active, a glowing alert is displayed, and outdoor attractions are dynamically re-routed to indoor alternatives (like art galleries and covered palaces) to keep you dry.
3.  **💬 AI Travel Agent Companion Chat**:
    Click the floating message drawer in the bottom right corner to speak to your planning assistant in plain English. Ask it to: *"Add a coffee stop on Day 1"*, *"Swap the first stop"*, or *"Make the pace more relaxed"*. It mutates the active structured itinerary in real time.
4.  **🚗 SVG Route Journey Simulation**:
    Click **"Simulate Drive"** on the tactical route canvas. An active glowing green tracker dot travels step-by-step between nodes while streaming navigation ETAs directly to the reasoning console.
5.  **📅 Client-Side Calendar Exporter (.ics)**:
    Download standard calendar event schedules to instantly import your travel plans into **Google Calendar, Apple Calendar, or Outlook**.
6.  **💳 Expense Allocation Budget Trackers**:
    Categorizes expenses (Activities, Food, Sightseeing) and tracks them against custom Economy ($60), Moderate ($180), or Luxury ($600) daily caps, alerting you visually if threshold limits are exceeded.
7.  **🌍 Live Data Harvesting (Zero Keys Fallback)**:
    If no Google Maps API keys are set, it queries live OpenStreetMap Nominatim and Wikipedia Geosearch APIs to fetch *real, famous monuments and coordinates* anywhere on Earth for free!

---

## 📂 Project Structure

```
AI travel/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py      # Preference, SSE planning, and Chat mutation endpoints
│   │   ├── services/
│   │   │   ├── agent.py          # LangChain planning loop & compromise vectors
│   │   │   ├── maps.py           # Live OSM & Wikipedia API Harvesting
│   │   │   ├── weather.py        # Live OpenWeatherMap coordinates checker
│   │   │   └── cache.py          # 24-Hour TTL Redis & SQLite Geocoding cache
│   │   ├── database.py           # Database connection logic
│   │   ├── models.py             # SQLite / Postgres profile schemas
│   │   ├── schemas.py            # Pydantic structured schemas
│   │   └── config.py             # Settings configurations
│   ├── requirements.txt          # Python dependencies
│   └── run.py                    # Dev server startup launcher
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AgentConsole.jsx   # Streaming terminal logger
│   │   │   ├── ItineraryView.jsx  # Activity timeline, budget tracking & composition mix
│   │   │   ├── MapMock.jsx        # SVG Interactive route canvas
│   │   │   ├── PreferencesForm.jsx# Real-time 10-D visualizer profiles
│   │   │   └── TravelForm.jsx     # Main trip parameters form
│   │   ├── App.jsx                # Main container & chat drawer orchestrator
│   │   ├── main.jsx
│   │   └── index.css              # Cyberpunk Glassmorphism styling sheets
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 How to Run Manually

### Prerequisites
*   Python 3.8 or higher installed.
*   Node.js v18 or higher & npm installed.

### Step 1: Start the Backend Server
1.  Open a terminal and navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Start the FastAPI server:
    ```bash
    python run.py
    ```
    The API will now be running on **http://localhost:8000** (Swagger docs at `/docs`).

### Step 2: Start the Frontend Vite UI
1.  Open a new terminal window and navigate to the `frontend/` directory:
    ```bash
    cd frontend
    ```
2.  Install Node packages:
    ```bash
    npm install
    ```
3.  Start the Vite developer server:
    ```bash
    npm run dev
    ```
    Open your browser and navigate to **http://localhost:5173** to view the app!

---
Create a .env file inside the backend/ directory:

OPENAI_API_KEY=your_openai_api_key

GOOGLE_MAPS_API_KEY=your_google_maps_api_key
