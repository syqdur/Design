import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Location search endpoint using Google Places API
  app.get('/api/search-locations', async (req, res) => {
    const { query, lat, lng } = req.query;
    
    if (!query || typeof query !== 'string' || query.length < 3) {
      return res.json({ results: [] });
    }
    
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ No Google Maps API key found');
      return res.json({ results: [] });
    }
    
    try {
      // Try multiple real data sources
      let results: any[] = [];
      
      // Calculate distance helper
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };
      
      // 1. Try Google Places Text Search (primary method for comprehensive results)
      if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
          const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query as string)}&location=${lat},${lng}&radius=50000&region=de&key=${process.env.GOOGLE_MAPS_API_KEY}`;
          console.log(`🇩🇪 Searching Germany with Google Places API for: "${query}"`);
          
          const placesResponse = await fetch(placesUrl);
          
          if (placesResponse.ok) {
            const placesData = await placesResponse.json();
            console.log(`📍 Google Places found ${placesData.results?.length || 0} places`);
            
            if (placesData.results && placesData.results.length > 0) {
              results = placesData.results
                .map((place: any) => {
                  const distance = place.geometry?.location ? 
                    calculateDistance(parseFloat(lat as string), parseFloat(lng as string), place.geometry.location.lat, place.geometry.location.lng) : 9999;
                  
                  return {
                    name: place.name,
                    address: place.formatted_address,
                    placeId: place.place_id || '',
                    distance: Math.round(distance * 10) / 10,
                    coordinates: place.geometry?.location ? {
                      latitude: place.geometry.location.lat,
                      longitude: place.geometry.location.lng
                    } : undefined
                  };
                })
                .sort((a: any, b: any) => a.distance - b.distance)
                .slice(0, 20);
              
              console.log(`✅ Found ${results.length} places in Germany from Google Places, sorted by distance`);
              return res.json({ results });
            }
          } else {
            console.log('❌ Google Places API error:', placesResponse.status);
          }
        } catch (placesError) {
          console.log('❌ Google Places search failed:', placesError);
        }
      }
      
      // 2. Fallback to OpenStreetMap Nominatim
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query as string)}&countrycodes=de&limit=50&addressdetails=1`;
        console.log(`🌍 Fallback to Nominatim for: "${query}"`);
        
        const nominatimResponse = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'Wedding-Gallery-App/1.0'
          }
        });
        
        if (nominatimResponse.ok) {
          const nominatimData = await nominatimResponse.json();
          console.log(`📍 Nominatim found ${nominatimData?.length || 0} places`);
          
          if (nominatimData && nominatimData.length > 0 && lat && lng) {
            results = nominatimData
              .map((place: any) => {
                const distance = calculateDistance(parseFloat(lat as string), parseFloat(lng as string), parseFloat(place.lat), parseFloat(place.lon));
                
                return {
                  name: place.display_name.split(',')[0] || place.name || 'Unknown Place',
                  address: place.display_name,
                  placeId: place.place_id?.toString() || place.osm_id?.toString() || '',
                  distance: Math.round(distance * 10) / 10,
                  coordinates: {
                    latitude: parseFloat(place.lat),
                    longitude: parseFloat(place.lon)
                  }
                };
              })
              .sort((a: any, b: any) => a.distance - b.distance)
              .slice(0, 20);
            
            console.log(`✅ Found ${results.length} places from Nominatim fallback, sorted by distance`);
            return res.json({ results });
          }
        }
      } catch (nominatimError) {
        console.log('❌ Nominatim fallback failed:', nominatimError);
      }
      
      // 2. Try Google Geocoding API (should work with your key)
      try {
        const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query as string)}&region=de&key=${apiKey}`;
        const geocodingResponse = await fetch(geocodingUrl);
        
        if (geocodingResponse.ok) {
          const geocodingData = await geocodingResponse.json();
          
          if (geocodingData.status === 'OK' && geocodingData.results) {
            results = geocodingData.results.slice(0, 10).map((place: any) => ({
              name: place.address_components?.[0]?.long_name || place.formatted_address.split(',')[0] || 'Unknown Place',
              address: place.formatted_address,
              placeId: place.place_id || '',
              coordinates: place.geometry?.location ? {
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng
              } : undefined
            }));
            
            if (results.length > 0) {
              console.log(`✅ Found ${results.length} real places from Google Geocoding`);
              return res.json({ results });
            }
          }
        }
      } catch (geocodingError) {
        console.log('Google Geocoding failed:', geocodingError);
      }
      
      console.log('❌ No real location data found from any API');
      res.json({ results: [] });
      
    } catch (error) {
      console.error('Location search error:', error);
      res.json({ results: [] });
    }
  });
  // Challenge completion routes
  
  // Get user's challenge completions
  app.get('/api/challenges/completions/:userName/:deviceId', async (req, res) => {
    try {
      const { userName, deviceId } = req.params;
      const completions = await storage.getUserChallengeCompletions(userName, deviceId);
      res.json(completions);
    } catch (error) {
      console.error('Error fetching challenge completions:', error);
      res.status(500).json({ error: 'Failed to fetch challenge completions' });
    }
  });

  // Toggle challenge completion
  app.post('/api/challenges/toggle', async (req, res) => {
    try {
      const { challengeId, userName, deviceId } = req.body;
      
      if (!challengeId || !userName || !deviceId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const isCompleted = await storage.toggleChallengeCompletion(challengeId, userName, deviceId);
      res.json({ completed: isCompleted });
    } catch (error) {
      console.error('Error toggling challenge completion:', error);
      res.status(500).json({ error: 'Failed to toggle challenge completion' });
    }
  });

  // Get challenge leaderboard
  app.get('/api/challenges/leaderboard', async (req, res) => {
    try {
      const leaderboard = await storage.getChallengeLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching challenge leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch challenge leaderboard' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
