import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    preference_text = Column(Text, nullable=False)
    # Store embedding vector as a JSON string for cross-database compatibility (SQLite / Postgres fallback)
    vector_json = Column(Text, nullable=True) 
    created_at = Column(DateTime, default=datetime.utcnow)

    def set_vector(self, vector):
        if vector is not None:
            self.vector_json = json.dumps(vector)
        else:
            self.vector_json = None

    def get_vector(self):
        if self.vector_json:
            return json.loads(self.vector_json)
        return []

class SavedItinerary(Base):
    __tablename__ = "saved_itineraries"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, nullable=False)
    destination = Column(String, nullable=False)
    budget = Column(String, nullable=False)
    interests = Column(String, nullable=False)  # JSON list
    itinerary_data = Column(Text, nullable=False) # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
