import requests
import logging
from typing import Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

def get_weather_for_location(lat: float, lng: float, location_name: str = "") -> Dict[str, Any]:
    """
    Fetches weather summary for a coordinate.
    Uses OpenWeatherMap API if a key is present, otherwise falls back to a realistic weather generator.
    """
    if not settings.WEATHER_API_KEY:
        logger.info(f"Weather API key not set. Generating mock weather for {location_name or 'location'}.")
        
        # Simple simulation based on latitude
        abs_lat = abs(lat)
        if abs_lat < 15:
            # Tropical
            temp = 28.5
            condition = "Humid & Sunny"
        elif abs_lat < 35:
            # Subtropical/Warm Temperate
            temp = 22.0
            condition = "Mostly Sunny"
        elif abs_lat < 55:
            # Temperate
            temp = 15.0
            condition = "Partly Cloudy with occasional breezes"
        else:
            # Subpolar
            temp = 7.0
            condition = "Cool and Foggy"

        # Special adjustments for common cities
        clean_name = location_name.lower()
        if "tokyo" in clean_name:
            temp, condition = 21.0, "Sunny with mild winds"
        elif "paris" in clean_name:
            temp, condition = 18.0, "Showers in the afternoon"
        elif "new york" in clean_name:
            temp, condition = 23.0, "Clear skies"
        elif "london" in clean_name:
            temp, condition = 15.0, "Light drizzle, typical grey skies"
        elif "rome" in clean_name:
            temp, condition = 26.0, "Hot and Sunny"

        return {
            "temp_c": temp,
            "condition": condition,
            "humidity": 65,
            "wind_kph": 12.0
        }

    try:
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lng,
            "units": "metric",
            "appid": settings.WEATHER_API_KEY
        }
        response = requests.get(url, params=params)
        data = response.json()
        
        if response.status_code == 200:
            return {
                "temp_c": data["main"]["temp"],
                "condition": data["weather"][0]["description"].capitalize(),
                "humidity": data["main"]["humidity"],
                "wind_kph": round(data["wind"]["speed"] * 3.6, 1) # convert m/s to kph
            }
        else:
            logger.error(f"OpenWeatherMap failed: {data.get('message')}")
    except Exception as e:
        logger.error(f"Error calling OpenWeatherMap API: {e}")

    # Fallback return
    return {
        "temp_c": 19.5,
        "condition": "Mild and Partly Cloudy",
        "humidity": 60,
        "wind_kph": 10.0
    }
