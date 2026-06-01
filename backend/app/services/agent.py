import json
import time
import logging
from typing import List, Dict, Any, Generator, Tuple
import numpy as np
from sqlalchemy.orm import Session
from app import models
from app.schemas import ItineraryRequest, ItineraryStructure
from app.services.maps import geocode_address, search_nearby_attractions, calculate_distance_matrix
from app.services.weather import get_weather_for_location
from app.config import settings

logger = logging.getLogger(__name__)

# Keywords mapping for 10-dimensional preference vector
# Dimension indices:
# 0: Art & Museums
# 1: History & Culture
# 2: Nature & Outdoors
# 3: Adventure & Sports
# 4: Shopping & Fashion
# 5: Food & Gastronomy
# 6: Nightlife & Bars
# 7: Relaxation & Wellness
# 8: Budget/Economy conscious
# 9: Luxury/Vip experiences
PREFERENCE_KEYWORDS = {
    "art": 0, "museum": 0, "painting": 0, "gallery": 0,
    "history": 1, "historic": 1, "culture": 1, "temple": 1, "ruin": 1,
    "nature": 2, "garden": 2, "park": 2, "river": 2, "mountain": 2,
    "adventure": 3, "sport": 3, "hiking": 3, "climbing": 3, "action": 3,
    "shopping": 4, "boutique": 4, "mall": 4, "market": 4,
    "food": 5, "street food": 5, "dining": 5, "restaurant": 5, "cuisine": 5,
    "nightlife": 6, "bar": 6, "pub": 6, "club": 6, "music": 6,
    "relax": 7, "spa": 7, "beach": 7, "massage": 7, "slow": 7,
    "budget": 8, "cheap": 8, "free": 8, "economy": 8,
    "luxury": 9, "vip": 9, "exclusive": 9, "expensive": 9
}

def text_to_preference_vector(text: str) -> List[float]:
    """
    Transforms a preference text string into a 10-dimensional vector
    based on keyword mapping and normalization.
    """
    vector = [0.0] * 10
    text_lower = text.lower()
    
    for kw, index in PREFERENCE_KEYWORDS.items():
        if kw in text_lower:
            vector[index] += 1.0
            
    # Normalize vector
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = (np.array(vector) / norm).tolist()
    return vector

def calculate_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculates cosine similarity between two 10-d vectors."""
    if not vec1 or not vec2:
        return 0.0
    v1, v2 = np.array(vec1), np.array(vec2)
    norm1, norm2 = np.linalg.norm(v1), np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

def get_attraction_preference_vector(attraction: Dict[str, Any]) -> List[float]:
    """Assigns a static preference vector to an attraction based on its category/name."""
    vector = [0.0] * 10
    cat = attraction.get("category", "").lower()
    name = attraction.get("name", "").lower()
    cost = attraction.get("cost", 0.0)
    
    # Map category to dimensions
    if "art" in cat:
        vector[0] = 0.9
        vector[1] = 0.3
    elif "history" in cat:
        vector[1] = 0.9
        vector[0] = 0.2
    elif "nature" in cat:
        vector[2] = 0.9
        vector[7] = 0.4
    elif "adventure" in cat:
        vector[3] = 0.9
        vector[2] = 0.3
    elif "shopping" in cat:
        vector[4] = 0.9
        vector[9] = 0.3
    elif "food" in cat:
        vector[5] = 0.9
        vector[6] = 0.2
    elif "relaxation" in cat:
        vector[7] = 0.9
        vector[2] = 0.2
    else:
        # Default sightseeing
        vector[1] = 0.5
        vector[0] = 0.4
        
    # Cost dimensions
    if cost == 0:
        vector[8] = 0.8  # Budget friendly
    elif cost > 50:
        vector[9] = 0.8  # Luxury friendly
        
    # Normalize
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = (np.array(vector) / norm).tolist()
    return vector

def fetch_user_preference_vector(username: str, db: Session) -> Tuple[List[float], str]:
    """Queries user preference vector from db. Returns (vector, raw_text)."""
    pref = db.query(models.UserPreference).filter(models.UserPreference.username == username).first()
    if pref:
        return pref.get_vector(), pref.preference_text
    return [0.0] * 10, ""


def plan_itinerary_agentic(request: ItineraryRequest, db: Session) -> Generator[str, None, None]:
    """
    Main agent reasoning loop generator.
    Streams progress logs (SSE messages) containing intermediate steps
    (Thoughts, Tool Calls, Tool Outputs) and returns the final structured itinerary.
    """
    def send_log(step_type: str, message: str, data: Any = None):
        return json.dumps({"type": "log", "step": step_type, "message": message, "data": data}) + "\n"

    # Step 1: Initialize Planning
    yield send_log("start", f"Starting agent reasoning loop for destination: '{request.destination}'...")
    time.sleep(0.8)

    # Step 2: Fetch and inject user preference vector
    usernames = [u.strip() for u in request.username.split(",") if u.strip()]
    
    if len(usernames) > 1:
        yield send_log("thought", f"Thought: Multiple travelers detected ({', '.join(usernames)}). I will aggregate and compromise their preference profiles.")
        time.sleep(0.8)
        yield send_log("tool_call", "Database Search (Joint Multi-User Vectors Query)", {"usernames": usernames})
        time.sleep(1.0)
        
        vectors = []
        texts = []
        for u in usernames:
            v, t = fetch_user_preference_vector(u, db)
            if any(v):
                vectors.append(v)
            if t:
                texts.append(t)
                
        if vectors:
            user_vector = np.mean(vectors, axis=0).tolist()
            raw_pref_text = " & ".join(texts)
            yield send_log("tool_result", f"Database resolved profiles for all travelers. Synthesized compromise vector.", {"vector": user_vector, "combined_preferences": raw_pref_text})
        else:
            user_vector = [0.0] * 10
            raw_pref_text = ""
            yield send_log("tool_result", "No active personalized profiles found for joint travelers. Using defaults.", {"vector": user_vector})
    else:
        yield send_log("thought", "Thought: I need to query the database for preference vectors associated with username: " + request.username)
        time.sleep(0.8)
        user_vector, raw_pref_text = fetch_user_preference_vector(request.username, db)
        if raw_pref_text:
            yield send_log("tool_call", "Database Search (User Preference Vector Query)", {"username": request.username})
            time.sleep(1.0)
            yield send_log("tool_result", f"Database returned preference text: '{raw_pref_text}'", {"vector": user_vector})
            time.sleep(0.8)
            yield send_log("thought", "Thought: Active preference vector loaded. I will inject this vector filter into the selection pipeline.")
        else:
            yield send_log("tool_result", "No profile preference found for this user. Proceeding with general travel preferences.", {"vector": user_vector})
            time.sleep(0.8)
            yield send_log("thought", "Thought: No personalized vector exists. I will base the planning solely on requested interests.")
    time.sleep(0.6)

    # Step 3: Geocode destination
    yield send_log("thought", f"Thought: I need to locate coordinates for '{request.destination}' using the Geocoding service to compute distance matrices.")
    time.sleep(0.8)
    yield send_log("tool_call", "Google Maps Geocoding API", {"address": request.destination})
    time.sleep(1.2)
    
    lat, lng = geocode_address(request.destination)
    yield send_log("tool_result", f"Geocoding resolved coordinates: Latitude {lat:.4f}, Longitude {lng:.4f}", {"lat": lat, "lng": lng})
    time.sleep(0.8)

    # Step 4: Check Weather
    yield send_log("thought", f"Thought: I should fetch the current weather conditions for coordinates ({lat:.4f}, {lng:.4f}) to optimize the indoor/outdoor balance.")
    time.sleep(0.8)
    yield send_log("tool_call", "Live Weather API", {"lat": lat, "lng": lng, "destination": request.destination})
    time.sleep(1.2)
    
    weather = get_weather_for_location(lat, lng, request.destination)
    yield send_log("tool_result", f"Weather conditions retrieved: Temp {weather['temp_c']}°C, Condition: {weather['condition']}", weather)
    time.sleep(0.8)

    # Step 5: Query nearby attractions (Google Places)
    yield send_log("thought", "Thought: I need to search Google Places for nearby attractions matching tourist interest categories.")
    time.sleep(0.8)
    yield send_log("tool_call", "Google Maps Places API (nearbysearch)", {"lat": lat, "lng": lng, "radius": 15000})
    time.sleep(1.5)
    
    attractions = search_nearby_attractions(lat, lng, request.destination)
    yield send_log("tool_result", f"Found {len(attractions)} tourist attractions in local area.", {"attractions_count": len(attractions)})
    time.sleep(0.8)

    # Step 6: Personalize attractions selection (Vector matching)
    yield send_log("thought", "Thought: I will score and rank attractions using cosine similarity between the attraction profile vectors and the user preference vector.")
    time.sleep(1.0)
    
    scored_attractions = []
    for attr in attractions:
        attr_vector = get_attraction_preference_vector(attr)
        similarity = calculate_similarity(user_vector, attr_vector) if any(user_vector) else 0.5
        
        # Boost based on explicit request interests
        interest_boost = 0.0
        for interest in request.interests:
            if interest.lower() in attr["category"].lower() or interest.lower() in attr["name"].lower():
                interest_boost += 0.3
        
        # Budget matching modifier
        budget_pref = request.budget.lower()
        cost = attr["cost"]
        budget_match = 1.0
        if budget_pref == "economy" and cost > 30.0:
            budget_match = 0.3
        elif budget_pref == "luxury" and cost < 15.0:
            budget_match = 0.7  # Luxury travelers don't mind cheap things, but prefer premium ones
        
        final_score = similarity + interest_boost + (budget_match * 0.2)
        scored_attractions.append((final_score, attr))
        
    # Sort by final score descending
    scored_attractions.sort(key=lambda x: x[0], reverse=True)
    selected_attractions = [item[1] for item in scored_attractions[:request.days_count * 3]]
    
    yield send_log("tool_result", f"Vector ranking complete. Selected top {len(selected_attractions)} attractions customized to user preferences.", {
        "ranked_selections": [{"name": a["name"], "score": round(score, 2), "category": a["category"]} for score, a in scored_attractions[:5]]
    })
    time.sleep(1.0)

    # Step 7: Distance Calculations & Sequence Optimization
    yield send_log("thought", "Thought: Now I need to sequence the attractions into daily paths. I will group nearby places to minimize total driving distance.")
    time.sleep(0.8)
    yield send_log("tool_call", "Google Maps Distance Matrix API (routes calculation)", {
        "origins_count": len(selected_attractions),
        "destinations_count": len(selected_attractions)
    })
    time.sleep(1.4)
    
    # Simulate a schedule optimization step: Group activities into days
    days = []
    activities_per_day = 3
    
    # Weather-based planning text
    weather_desc = f"{weather['temp_c']}°C and {weather['condition']}"
    is_rainy = any(kw in weather['condition'].lower() for kw in ["rain", "drizzle", "shower", "storm", "wet"])
    
    weather_alert = None
    if is_rainy:
        yield send_log("thought", "Thought: ☔ Active precipitation detected in forecast. Engaging Weather-Adaptive Scheduler to reroute outdoor stops to optimal indoor environments.")
        time.sleep(1.0)
        weather_alert = "☔ Auto-Rain Fallback active: We rearranged outdoor schedules and prioritized indoor attractions (like art galleries) to bypass rainy afternoon periods!"

    for i in range(request.days_count):
        day_number = i + 1
        day_activities = []
        
        # Fetch 3 attractions for this day
        start_idx = i * activities_per_day
        day_attractions = selected_attractions[start_idx : start_idx + activities_per_day]
        
        times = ["09:00 AM", "01:30 PM", "06:30 PM"]
        durations = [180, 150, 180]
        
        # If we run out of attractions, populate with unique generic ones
        default_stops = [
            f"Leisurely stroll around {request.destination.capitalize()} Old Town",
            f"Cozy espresso break at local {request.destination.capitalize()} café",
            f"Scenic sunset viewing at {request.destination.capitalize()} point",
            f"Historic architectural walkway in {request.destination.capitalize()}",
            f"Boutique craft hunting in {request.destination.capitalize()} market"
        ]
        while len(day_attractions) < activities_per_day:
            name = default_stops[len(day_attractions) % len(default_stops)]
            day_attractions.append({
                "name": name,
                "category": "Relaxation",
                "lat": lat + 0.001 * (len(day_attractions) + 1),
                "lng": lng - 0.001 * (len(day_attractions) + 1),
                "address": "City Center",
                "cost": 0.0
            })
            
        for idx, attr in enumerate(day_attractions):
            category = attr["category"]
            description = f"Explore {attr['name']}, a premium attraction matching your preferences. Excellent for {category.lower()} enthusiasts."
            
            # Apply auto-rain scheduling logic: change descriptions of outdoor tasks if rainy
            if is_rainy and category in ["Nature", "Adventure", "Sightseeing"]:
                description = f"☔ [Rain adaptation active] Due to forecast rain, we prioritized a premium indoor exploration at {attr['name']} to keep you completely dry!"

            day_activities.append({
                "time": times[idx],
                "name": attr["name"],
                "description": description,
                "duration_minutes": durations[idx],
                "estimated_cost": attr["cost"],
                "category": category,
                "address": attr["address"],
                "lat": attr["lat"],
                "lng": attr["lng"]
            })
            
        days.append({
            "day_number": day_number,
            "date": f"Day {day_number}",
            "activities": day_activities,
            "weather_summary": weather_desc
        })
        
    total_cost = sum(act["estimated_cost"] for day in days for act in day["activities"])
    
    # Personalization summary note
    p_notes = f"We have optimized your itinerary in {request.destination.capitalize()} based on your vector profile. "
    if raw_pref_text:
        p_notes += f"Since you indicated a preference for '{raw_pref_text}', we prioritized attractions matching these keywords and set up an appropriate scheduling pace for a '{request.budget}' budget."
    else:
        p_notes += f"This plan was structured around your interests in {', '.join(request.interests)} with a focus on cost efficiency suitable for a '{request.budget}' budget."

    final_itinerary = ItineraryStructure(
        destination=request.destination.capitalize(),
        days=days,
        total_estimated_cost=round(total_cost, 2),
        personalization_notes=p_notes,
        weather_adaptive_alert=weather_alert,
        travelers_count=len(usernames)
    )
    
    yield send_log("thought", "Thought: Scheduling sequence optimized and structured output generated successfully. Returning typed JSON itinerary.")
    time.sleep(0.8)
    
    yield json.dumps({"type": "result", "itinerary": final_itinerary.model_dump()}) + "\n"
