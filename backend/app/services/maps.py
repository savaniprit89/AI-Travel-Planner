import requests
import logging
import math
from typing import List, Dict, Any, Tuple
from app.config import settings
from app.services.cache import geo_cache

logger = logging.getLogger(__name__)

# Standard headers to comply with OpenStreetMap terms of use
OSM_HEADERS = {
    "User-Agent": "TravelPlannerAI/1.0"
}


def geocode_address(address: str) -> Tuple[float, float]:
    """
    Converts a location/address to latitude and longitude.
    Uses Google Maps Geocoding if key is present.
    If no key is present, queries OpenStreetMap's Nominatim API in real time.
    All geocoding queries are cached for 24 hours.
    """
    cache_key = f"geocode:{address.lower().strip()}"
    cached = geo_cache.get(cache_key)
    if cached:
        logger.info(f"Geocoding cache hit for: {address}")
        return cached["lat"], cached["lng"]

    # If Google Maps API key is not present, use live free OSM Nominatim API!
    if not settings.GOOGLE_MAPS_API_KEY:
        logger.info(f"Google Maps API key not set. Fetching LIVE coordinate data from OpenStreetMap for: {address}")
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": address,
                "format": "json",
                "limit": 1
            }
            response = requests.get(url, params=params, headers=OSM_HEADERS)
            data = response.json()
            if data:
                lat = float(data[0]["lat"])
                lng = float(data[0]["lon"])
                result = {"lat": lat, "lng": lng}
                geo_cache.set(cache_key, result)
                logger.info(f"OSM resolved {address} to: {lat}, {lng}")
                return lat, lng
        except Exception as e:
            logger.error(f"Failed to query OpenStreetMap Geocoding: {e}")
        
        # Absolute fallback if geocoding fails completely
        return 34.0522, -118.2437  # Los Angeles default

    # Call actual Google Maps API
    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {"address": address, "key": settings.GOOGLE_MAPS_API_KEY}
        response = requests.get(url, params=params)
        data = response.json()
        
        if data["status"] == "OK":
            location = data["results"][0]["geometry"]["location"]
            coords = (location["lat"], location["lng"])
            geo_cache.set(cache_key, {"lat": coords[0], "lng": coords[1]})
            return coords
        else:
            logger.error(f"Google Maps Geocoding failed: {data.get('error_message', data['status'])}")
    except Exception as e:
        logger.error(f"Error during Google Maps Geocoding call: {e}")
    
    return 34.0522, -118.2437


def search_nearby_attractions(lat: float, lng: float, city_name: str) -> List[Dict[str, Any]]:
    """
    Search nearby attractions for coordinates.
    Uses Google Maps Places if key is present.
    If no key is present, queries the live Wikipedia Geosearch API in real time
    to retrieve authentic, famous monuments, museums, and landmarks!
    """
    cache_key = f"places:{lat:.4f}:{lng:.4f}:{city_name.lower().strip()}"
    cached = geo_cache.get(cache_key)
    if cached:
        logger.info(f"Places cache hit for coordinates: {lat}, {lng} ({city_name})")
        return cached["attractions"]

    if not settings.GOOGLE_MAPS_API_KEY:
        logger.info(f"Google Maps API key not set. Fetching LIVE famous landmarks from Wikipedia Geosearch API for: {city_name}")
        try:
            # Step 1: Query nearby Wikipedia articles based on coordinates
            wiki_url = "https://en.wikipedia.org/w/api.php"
            wiki_params = {
                "action": "query",
                "list": "geosearch",
                "gsradius": 15000,  # 15km radius
                "gscoord": f"{lat}|{lng}",
                "gslimit": 15,
                "format": "json"
            }
            response = requests.get(wiki_url, params=wiki_params)
            wiki_data = response.json()
            geosearch_results = wiki_data.get("query", {}).get("geosearch", [])
            
            if geosearch_results:
                page_ids = [str(item["pageid"]) for item in geosearch_results]
                
                # Step 2: Fetch detailed page summaries and details for each geocoded article
                summary_params = {
                    "action": "query",
                    "pageids": "|".join(page_ids),
                    "prop": "extracts",
                    "exintro": 1,
                    "explaintext": 1,
                    "exsentences": 2,
                    "format": "json"
                }
                summary_resp = requests.get(wiki_url, params=summary_params)
                pages_data = summary_resp.json().get("query", {}).get("pages", {})
                
                attractions = []
                for item in geosearch_results:
                    p_id = str(item["pageid"])
                    page_detail = pages_data.get(p_id, {})
                    title = item["title"]
                    description = page_detail.get("extract", f"Explore {title}, a famous destination in {city_name}.")
                    
                    # Ignore articles that match the city name itself or minor coordinates
                    if title.lower().strip() == city_name.lower().strip() or "demographics" in title.lower():
                        continue
                        
                    # Analyze title and description keywords to assign accurate categories
                    desc_lower = description.lower()
                    title_lower = title.lower()
                    
                    category = "Sightseeing"
                    cost = 0.0
                    
                    if any(k in desc_lower or k in title_lower for k in ["museum", "gallery", "art", "sculpture", "painting"]):
                        category = "Art"
                        cost = 20.0
                    elif any(k in desc_lower or k in title_lower for k in ["park", "garden", "lake", "nature", "forest", "hill", "beach"]):
                        category = "Nature"
                        cost = 0.0
                    elif any(k in desc_lower or k in title_lower for k in ["stadium", "adventure", "theme park", "arena", "climb"]):
                        category = "Adventure"
                        cost = 45.0
                    elif any(k in desc_lower or k in title_lower for k in ["history", "castle", "temple", "monument", "cathedral", "church", "ruins", "tomb"]):
                        category = "History"
                        cost = 10.0
                    elif any(k in desc_lower or k in title_lower for k in ["food", "market", "restaurant", "cafe", "culinary"]):
                        category = "Food"
                        cost = 25.0

                    attractions.append({
                        "name": title,
                        "category": category,
                        "lat": item["lat"],
                        "lng": item["lon"],
                        "address": f"Local Attraction, {city_name.capitalize()}",
                        "cost": cost,
                        "description": description
                    })
                
                if attractions:
                    # Filter and rank attractions
                    result = {"attractions": attractions}
                    geo_cache.set(cache_key, result)
                    logger.info(f"Resolved {len(attractions)} live authentic attractions for {city_name}.")
                    return attractions
        except Exception as e:
            logger.error(f"Failed to fetch live coordinates from Wikipedia: {e}")

        # Static fallback if live Wikipedia API has no results
        city_cap = city_name.capitalize()
        return [
            {"name": f"{city_cap} Old Town Square", "category": "History", "lat": lat + 0.002, "lng": lng - 0.003, "address": "Historical District", "cost": 0.0, "description": "Stroll around the scenic, historic central marketplace filled with charming old architecture."},
            {"name": f"{city_cap} Museum of Fine Arts", "category": "Art", "lat": lat - 0.004, "lng": lng + 0.004, "address": "Museum Plaza", "cost": 15.0, "description": "Explore standard galleries exhibiting classical and contemporary masterpieces from local and national artists."},
            {"name": f"{city_cap} Heritage Botanical Gardens", "category": "Nature", "lat": lat + 0.005, "lng": lng - 0.002, "address": "Park Side Way", "cost": 8.0, "description": "Take a tranquil stroll through lush green glass greenhouses, flowerbeds, and peaceful gravel walkways."},
            {"name": f"Downtown {city_cap} Culinary Market", "category": "Food", "lat": lat - 0.003, "lng": lng - 0.005, "address": "Food Street Lane", "cost": 25.0, "description": "Sample delicious local street food, artisanal cheese, and hot snacks at the bustling culinary market stalls."},
            {"name": f"{city_cap} Panoramic Sky Observatory", "category": "Sightseeing", "lat": lat + 0.007, "lng": lng + 0.006, "address": "Tower Heights", "cost": 30.0, "description": "Take a high-speed elevator to the top tower observation deck for premium panoramic views of the city skyline."},
            {"name": f"{city_cap} Riverside Boardwalk", "category": "Relaxation", "lat": lat - 0.006, "lng": lng - 0.001, "address": "Waterfront Dr", "cost": 0.0, "description": "Enjoy a quiet afternoon breeze walking near the riverfront dotted with cafes, street players, and rest stops."},
            {"name": f"Adventure Quest {city_cap}", "category": "Adventure", "lat": lat + 0.008, "lng": lng - 0.008, "address": "Activity Park", "cost": 45.0, "description": "Participate in exciting outdoor climbs, high ropes, and scenic cycle paths across the valley parks."},
            {"name": f"{city_cap} Old Clock Tower & Palace", "category": "History", "lat": lat - 0.002, "lng": lng + 0.002, "address": "Palace Courtyard", "cost": 10.0, "description": "Visit the majestic clock tower and explore the open chambers of the historic local royal palace grounds."},
            {"name": f"The Shopping Boulevard at {city_cap}", "category": "Shopping", "lat": lat + 0.004, "lng": lng + 0.003, "address": "Commercial District", "cost": 20.0, "description": "Browse premium local boutiques, craft stores, and trendy galleries along the wide pedestrian boulevard."},
            {"name": f"{city_cap} Lakefront Walkway", "category": "Nature", "lat": lat - 0.008, "lng": lng + 0.008, "address": "Lakeview Circle", "cost": 0.0, "description": "A tranquil walkway orbiting the main local lake, perfect for a peaceful evening stroll and sunset viewing."}
        ]

    # Call Google Maps Places API
    try:
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            "location": f"{lat},{lng}",
            "radius": 15000,
            "type": "tourist_attraction",
            "key": settings.GOOGLE_MAPS_API_KEY
        }
        response = requests.get(url, params=params)
        data = response.json()
        
        if data["status"] in ["OK", "ZERO_RESULTS"]:
            attractions = []
            for place in data.get("results", [])[:15]:
                types = place.get("types", [])
                cost = 0.0
                category = "Sightseeing"
                if "museum" in types or "art_gallery" in types:
                    cost = 20.0
                    category = "Art"
                elif "amusement_park" in types or "zoo" in types:
                    cost = 45.0
                    category = "Adventure"
                elif "park" in types:
                    cost = 0.0
                    category = "Nature"
                elif "church" in types or "hindu_temple" in types or "mosque" in types:
                    cost = 0.0
                    category = "History"
                elif "restaurant" in types or "food" in types:
                    cost = 25.0
                    category = "Food"

                attractions.append({
                    "name": place["name"],
                    "category": category,
                    "lat": place["geometry"]["location"]["lat"],
                    "lng": place["geometry"]["location"]["lng"],
                    "address": place.get("vicinity", "Local Area"),
                    "cost": cost,
                    "description": f"Visit {place['name']}, one of the most popular {category.lower()} spots in the local area."
                })
            
            geo_cache.set(cache_key, {"attractions": attractions})
            return attractions
        else:
            logger.error(f"Google Maps Places failed: {data.get('error_message', data['status'])}")
    except Exception as e:
        logger.error(f"Error during Google Maps Places call: {e}")

    return []


def calculate_distance_matrix(origin: Tuple[float, float], destination: Tuple[float, float]) -> Tuple[float, float]:
    """
    Calculates distance (in kilometers) and travel time (in minutes) between two coordinates.
    Uses Google Maps Distance Matrix if key is present, otherwise calculates real Haversine metrics.
    """
    o_lat, o_lng = origin
    d_lat, d_lng = destination
    cache_key = f"distance:{o_lat:.4f}:{o_lng:.4f}:{d_lat:.4f}:{d_lng:.4f}"
    
    cached = geo_cache.get(cache_key)
    if cached:
        return cached["distance_km"], cached["duration_mins"]

    if not settings.GOOGLE_MAPS_API_KEY:
        try:
            R = 6371.0
            lat1 = math.radians(o_lat)
            lon1 = math.radians(o_lng)
            lat2 = math.radians(d_lat)
            lon2 = math.radians(d_lng)
            
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            
            a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            
            distance = R * c
            duration = (distance / 45.0) * 60.0 + 5.0
            
            result = {"distance_km": round(distance, 2), "duration_mins": round(duration, 1)}
            geo_cache.set(cache_key, result)
            return result["distance_km"], result["duration_mins"]
        except Exception:
            return 5.0, 15.0

    # Call Google Maps Distance Matrix API
    try:
        url = "https://maps.googleapis.com/maps/api/distancematrix/json"
        params = {
            "origins": f"{o_lat},{o_lng}",
            "destinations": f"{d_lat},{d_lng}",
            "mode": "driving",
            "key": settings.GOOGLE_MAPS_API_KEY
        }
        response = requests.get(url, params=params)
        data = response.json()
        
        if data["status"] == "OK" and data["rows"][0]["elements"][0]["status"] == "OK":
            element = data["rows"][0]["elements"][0]
            distance_meters = element["distance"]["value"]
            duration_seconds = element["duration"]["value"]
            
            distance_km = round(distance_meters / 1000.0, 2)
            duration_mins = round(duration_seconds / 60.0, 1)
            
            result = {"distance_km": distance_km, "duration_mins": duration_mins}
            geo_cache.set(cache_key, result)
            return distance_km, duration_mins
    except Exception as e:
        logger.error(f"Error during Distance Matrix API call: {e}")

    try:
        R = 6371.0
        lat1, lon1 = math.radians(o_lat), math.radians(o_lng)
        lat2, lon2 = math.radians(d_lat), math.radians(d_lng)
        dlon, dlat = lon2 - lon1, lat2 - lat1
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = R * c
        duration = (distance / 45.0) * 60.0 + 5.0
        return round(distance, 2), round(duration, 1)
    except Exception:
        return 5.0, 15.0
