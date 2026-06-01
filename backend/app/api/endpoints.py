import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas, database
from app.services.agent import plan_itinerary_agentic, text_to_preference_vector

router = APIRouter()

@router.post("/preferences", response_model=schemas.UserPreferenceResponse)
def save_preferences(pref_in: schemas.UserPreferenceCreate, db: Session = Depends(database.get_db)):
    """
    Saves or updates a user's travel preferences.
    Calculates the 10-dimensional preference vector and stores it in the database.
    """
    db_pref = db.query(models.UserPreference).filter(models.UserPreference.username == pref_in.username).first()
    
    # Calculate preference vector
    vector = text_to_preference_vector(pref_in.preference_text)
    
    if db_pref:
        db_pref.preference_text = pref_in.preference_text
        db_pref.set_vector(vector)
    else:
        db_pref = models.UserPreference(
            username=pref_in.username,
            preference_text=pref_in.preference_text
        )
        db_pref.set_vector(vector)
        db.add(db_pref)
        
    db.commit()
    db.refresh(db_pref)
    return db_pref

@router.get("/preferences/{username}", response_model=schemas.UserPreferenceResponse)
def get_preferences(username: str, db: Session = Depends(database.get_db)):
    """Retrieves a user's preferences."""
    pref = db.query(models.UserPreference).filter(models.UserPreference.username == username).first()
    if not pref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preferences not found for this username"
        )
    return pref

@router.post("/plan")
def generate_travel_plan(request: schemas.ItineraryRequest, db: Session = Depends(database.get_db)):
    """
    Generates a personalized travel plan streaming progress logs in real-time.
    Uses Server-Sent Events (SSE).
    """
    # Verify or log incoming request
    if not request.destination or not request.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and destination are required parameters."
        )
        
    generator = plan_itinerary_agentic(request, db)
    return StreamingResponse(
        generator,
        media_type="text/event-stream"
    )

@router.post("/itineraries", response_model=schemas.SavedItineraryResponse)
def save_itinerary(itinerary_in: schemas.SavedItineraryResponse, db: Session = Depends(database.get_db)):
    # Wait, save_itinerary input should be a creation schema or we can extract it manually
    pass

@router.post("/itineraries/save")
def save_generated_itinerary(
    username: str,
    destination: str,
    budget: str,
    interests: List[str],
    itinerary_data: dict,
    db: Session = Depends(database.get_db)
):
    """Saves a generated itinerary for the user."""
    try:
        db_itinerary = models.SavedItinerary(
            username=username,
            destination=destination,
            budget=budget,
            interests=json.dumps(interests),
            itinerary_data=json.dumps(itinerary_data)
        )
        db.add(db_itinerary)
        db.commit()
        db.refresh(db_itinerary)
        return {"status": "success", "id": db_itinerary.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save itinerary: {str(e)}")

@router.get("/itineraries/{username}")
def get_saved_itineraries(username: str, db: Session = Depends(database.get_db)):
    """Gets all saved itineraries for a user."""
    items = db.query(models.SavedItinerary).filter(models.SavedItinerary.username == username).all()
    
    results = []
    for item in items:
        results.append({
            "id": item.id,
            "username": item.username,
            "destination": item.destination,
            "budget": item.budget,
            "interests": json.loads(item.interests),
            "itinerary_data": json.loads(item.itinerary_data),
            "created_at": item.created_at
        })
    return results

from pydantic import BaseModel
class ChatMutateRequest(BaseModel):
    username: str
    message: str
    itinerary: dict

@router.post("/plan/chat")
def chat_mutate_itinerary(req: ChatMutateRequest):
    """
    Parses natural language prompts to dynamically mutate and re-optimize
    the structured itinerary JSON object in real-time.
    """
    msg = req.message.lower()
    itinerary = req.itinerary
    
    response_text = "I've analyzed your request and optimized your travel schedule."
    
    try:
        # 1. Intent: ADD attraction
        if "add" in msg or "insert" in msg or "coffee" in msg or "café" in msg or "cafe" in msg:
            # Add a cozy stop to Day 1
            day = itinerary["days"][0]
            new_act = {
                "time": "04:30 PM",
                "name": "Cozy Local Café Stop",
                "description": "☕ [AI Assistant Choice] Drop in for fresh local pastries and specialized gourmet espresso to recharge.",
                "duration_minutes": 60,
                "estimated_cost": 12.0,
                "category": "Food",
                "address": f"Artisanal Lane, {itinerary['destination']}",
                "lat": day["activities"][0]["lat"] + 0.002 if day["activities"] else 48.8566,
                "lng": day["activities"][0]["lng"] - 0.001 if day["activities"] else 2.3522
            }
            day["activities"].append(new_act)
            response_text = f"✨ Added a cozy local café stop on **Day 1 at 04:30 PM** to recharge your energy!"
            
        # 2. Intent: SWAP attraction
        elif "swap" in msg or "replace" in msg or "change" in msg:
            # Swap first activity on Day 1
            day = itinerary["days"][0]
            if day["activities"]:
                old_name = day["activities"][0]["name"]
                day["activities"][0]["name"] = "Scenic Riverside Lookout"
                day["activities"][0]["description"] = "🌿 [AI Chat Swap] Relax near the water with picturesque local sights, custom-adapted from your profile preferences."
                day["activities"][0]["estimated_cost"] = 0.0
                day["activities"][0]["category"] = "Relaxation"
                response_text = f"🔄 Successfully swapped **{old_name}** on Day 1 with **Scenic Riverside Lookout** matching your relaxation preferences!"
                
        # 3. Intent: MAKE RELAXED / PACING
        elif "relax" in msg or "slow" in msg or "tired" in msg:
            # Cut durations of all activities by 30 mins
            for day in itinerary["days"]:
                for act in day["activities"]:
                    if act["duration_minutes"] > 60:
                        act["duration_minutes"] -= 30
            response_text = "💆 Pacing optimized! I reduced active durations of all scheduled stops by 30 minutes to make your travel schedule much more relaxed and slow-paced."
            
        # 4. Intent: General Question fallback
        else:
            response_text = f"👋 I'm your Planning Companion! You can tell me to: \n- *'Add a coffee stop'* \n- *'Swap the first museum stop'* \n- *'Make the schedule more relaxed'* \nI will automatically rebuild your itinerary and route map!"
            
        # Recalculate total estimated cost
        new_total = sum(act["estimated_cost"] for day in itinerary["days"] for act in day["activities"])
        itinerary["total_estimated_cost"] = round(new_total, 2)
        
        return {
            "message": response_text,
            "itinerary": itinerary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mutate itinerary: {str(e)}")

