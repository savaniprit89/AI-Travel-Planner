import json
import sqlite3
import time
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

# Try to import redis
try:
    import redis
    redis_client = None
    if settings.REDIS_URL:
        redis_client = redis.from_url(settings.REDIS_URL)
        # Test connection
        redis_client.ping()
        logger.info("Connected to Redis successfully for geocoding cache.")
except Exception as e:
    logger.warning(f"Failed to connect to Redis, using SQLite fallback cache. Error: {e}")
    redis_client = None


class GeocodingCache:
    """
    Manages cached API results (geocoding, places, distance) with a 24-hour TTL (86400 seconds).
    If Redis is available, it uses Redis. Otherwise, it falls back to a SQLite database.
    """
    def __init__(self, db_path="geocoding_cache.db"):
        self.db_path = db_path
        self.redis = redis_client
        self.ttl = 86400  # 24 hours in seconds
        
        if not self.redis:
            # Initialize SQLite cache table
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    expiry REAL
                )
            """)
            conn.commit()
            conn.close()

    def get(self, key: str) -> Optional[dict]:
        """Retrieve key from Redis or SQLite cache."""
        if self.redis:
            try:
                val = self.redis.get(key)
                if val:
                    return json.loads(val)
                return None
            except Exception as e:
                logger.error(f"Redis cache GET error: {e}")
                # Fallback to sqlite if redis fails mid-run
                return self._get_sqlite(key)
        else:
            return self._get_sqlite(key)

    def set(self, key: str, value: dict) -> None:
        """Store key-value in Redis or SQLite cache with a 24-hour TTL."""
        if self.redis:
            try:
                self.redis.setex(key, self.ttl, json.dumps(value))
                return
            except Exception as e:
                logger.error(f"Redis cache SET error: {e}")
                self._set_sqlite(key, value)
        else:
            self._set_sqlite(key, value)

    def _get_sqlite(self, key: str) -> Optional[dict]:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT value, expiry FROM cache WHERE key = ?", (key,))
            row = cursor.fetchone()
            conn.close()
            
            if row:
                value_str, expiry = row
                if expiry > time.time():
                    return json.loads(value_str)
                else:
                    # Clean up expired item
                    self.delete(key)
            return None
        except Exception as e:
            logger.error(f"SQLite cache GET error: {e}")
            return None

    def _set_sqlite(self, key: str, value: dict) -> None:
        try:
            expiry = time.time() + self.ttl
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO cache (key, value, expiry) VALUES (?, ?, ?)",
                (key, json.dumps(value), expiry)
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"SQLite cache SET error: {e}")

    def delete(self, key: str) -> None:
        if self.redis:
            try:
                self.redis.delete(key)
                return
            except Exception as e:
                logger.error(f"Redis cache DELETE error: {e}")
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM cache WHERE key = ?", (key,))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"SQLite cache DELETE error: {e}")

# Global Geocoding Cache Instance
geo_cache = GeocodingCache()
