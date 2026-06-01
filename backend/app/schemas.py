from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Preferences
class UserPreferenceBase(BaseModel):
    username: str
    preference_text: str

class UserPreferenceCreate(UserPreferenceBase):
    pass

class UserPreferenceResponse(UserPreferenceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Itinerary Sub-elements (structured output mapping)
class ItineraryActivity(BaseModel):
    time: str = Field(description="Time of activity (e.g. '09:00 AM')")
    name: str = Field(description="Name of attraction or activity")
    description: str = Field(description="Detailed description of what to do")
    duration_minutes: int = Field(description="Expected duration of activity in minutes")
    estimated_cost: float = Field(description="Estimated cost in USD")
    category: str = Field(description="Category (e.g. 'Sightseeing', 'Adventure', 'Food', 'Relaxation')")
    address: Optional[str] = Field(None, description="Location address")
    lat: Optional[float] = Field(None, description="Latitude coordinates")
    lng: Optional[float] = Field(None, description="Longitude coordinates")

class ItineraryDay(BaseModel):
    day_number: int = Field(description="Day index starting at 1")
    date: str = Field(description="Calendar date of this day")
    activities: List[ItineraryActivity] = Field(description="List of ordered activities for this day")
    weather_summary: Optional[str] = Field(None, description="Weather conditions summary for this day")

class ItineraryStructure(BaseModel):
    destination: str = Field(description="Name of destination city")
    days: List[ItineraryDay] = Field(description="Day-by-day activities list")
    total_estimated_cost: float = Field(description="Total cost of entire trip in USD")
    personalization_notes: str = Field(description="Brief explanation of how the itinerary was tailored to the user's vector preferences")
    weather_adaptive_alert: Optional[str] = Field(None, description="Detailed warning if weather adaptations occurred")
    travelers_count: Optional[int] = Field(1, description="Number of travelers whose vectors were compromised")

# API Requests / Responses
class ItineraryRequest(BaseModel):
    username: str
    destination: str
    days_count: int = Field(default=3, ge=1, le=10)
    budget: str = Field(description="Budget category: 'Economy', 'Moderate', or 'Luxury'")
    interests: List[str] = Field(default=[], description="List of interest tags, e.g. ['Art', 'Nature']")
    additional_preferences: Optional[str] = Field(None, description="Any specific request for this plan")

class SavedItineraryResponse(BaseModel):
    id: int
    username: str
    destination: str
    budget: str
    interests: List[str]
    itinerary_data: ItineraryStructure
    created_at: datetime

    class Config:
        from_attributes = True
