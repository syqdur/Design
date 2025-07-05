interface LocationSuggestion {
  name: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
  placeId?: string;
  distance?: number;
  types?: string[];
  rating?: number;
  priceLevel?: number;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyBzYPmwISWFA0plYDMSKHZ9zh5eymdqL8Y';

// Load Google Maps JavaScript API with Places library
let googleMapsLoaded = false;
let googleMapsPromise: Promise<void> | null = null;

const loadGoogleMaps = (): Promise<void> => {
  if (googleMapsLoaded) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser'));
      return;
    }

    if (window.google && window.google.maps) {
      googleMapsLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

// Use new Google Places API (google.maps.places.Place)
export const searchLocations = async (query: string): Promise<LocationSuggestion[]> => {
  console.log('🔍 Searching with new Google Places API:', query);

  if (typeof window === 'undefined') {
    console.log('❌ Not in browser');
    return [];
  }

  try {
    // Load Google Maps API
    await loadGoogleMaps();
    console.log('✅ Google Maps loaded');

    // Get user location
    const userLocation = await getCurrentLocation();
    console.log('📍 User location:', userLocation);

    // Use new Places API - Text Search
    const { Place } = await window.google.maps.importLibrary("places") as google.maps.PlacesLibrary;

    const request = {
      textQuery: query,
      fields: ['displayName', 'formattedAddress', 'location', 'types', 'rating', 'priceLevel', 'id'],
      locationBias: {
        center: { 
          lat: userLocation.latitude, 
          lng: userLocation.longitude 
        },
        radius: 5000 // 5km radius
      },
      maxResultCount: 20
    };

    console.log('📡 New Places API searchByText request:', request);

    const { places } = await Place.searchByText(request);
    console.log('📍 New Places API raw results:', places);

    if (places && places.length > 0) {
      const locations: LocationSuggestion[] = places
        .map(place => {
          const location = place.location;
          if (!location) return null;

          const lat = location.lat();
          const lng = location.lng();

          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            lat,
            lng
          );

          return {
            name: place.displayName || 'Unknown',
            address: place.formattedAddress || 'No address',
            coordinates: { latitude: lat, longitude: lng },
            placeId: place.id,
            types: place.types,
            rating: place.rating,
            priceLevel: place.priceLevel,
            distance: Math.round(distance * 100) / 100
          };
        })
        .filter((place): place is LocationSuggestion => place !== null)
        .filter(place => (place.distance || 999) <= 15) // Only within 15km
        .sort((a, b) => (a.distance || 999) - (b.distance || 999))
        .slice(0, 10);

      console.log('✅ Processed new Places API results:', locations);
      return locations;
    }

    console.log('❌ No results from new Places API');
    return [];

  } catch (error) {
    console.error('❌ New Places API search failed:', error);
    return [];
  }
};

// Nearby search using new Places API
export const searchNearbyLocations = async (query: string): Promise<LocationSuggestion[]> => {
  console.log('🔍 Nearby search with new Google Places API:', query);

  try {
    await loadGoogleMaps();
    const userLocation = await getCurrentLocation();

    const { Place } = await window.google.maps.importLibrary("places") as google.maps.PlacesLibrary;

    const request = {
      fields: ['displayName', 'formattedAddress', 'location', 'types', 'rating', 'priceLevel', 'id'],
      locationRestriction: {
        center: { 
          lat: userLocation.latitude, 
          lng: userLocation.longitude 
        },
        radius: 3000 // 3km radius for nearby search
      },
      includedTypes: ['restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'establishment'],
      maxResultCount: 20
    };

    console.log('📡 New Places API searchNearby request:', request);

    const { places } = await Place.searchNearby(request);
    console.log('📍 New Places API nearby results:', places);

    if (places && places.length > 0) {
      // Filter by query match
      const filteredPlaces = places.filter(place => {
        const name = place.displayName?.toLowerCase() || '';
        const address = place.formattedAddress?.toLowerCase() || '';
        const queryLower = query.toLowerCase();

        return name.includes(queryLower) || address.includes(queryLower);
      });

      const locations: LocationSuggestion[] = filteredPlaces
        .map(place => {
          const location = place.location;
          if (!location) return null;

          const lat = location.lat();
          const lng = location.lng();

          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            lat,
            lng
          );

          return {
            name: place.displayName || 'Unknown',
            address: place.formattedAddress || 'No address',
            coordinates: { latitude: lat, longitude: lng },
            placeId: place.id,
            types: place.types,
            rating: place.rating,
            priceLevel: place.priceLevel,
            distance: Math.round(distance * 100) / 100
          };
        })
        .filter((place): place is LocationSuggestion => place !== null)
        .sort((a, b) => (a.distance || 999) - (b.distance || 999))
        .slice(0, 10);

      console.log('✅ Processed nearby search results:', locations);
      return locations;
    }

    return [];

  } catch (error) {
    console.error('❌ Nearby search failed:', error);
    return [];
  }
};

export const searchEstablishments = async (
  query: string,
  userLocation: { latitude: number; longitude: number }
): Promise<LocationSuggestion[]> => {
  console.log('🔍 Searching establishments:', query);

  try {
    // Try text search first
    const textResults = await searchLocations(query);
    if (textResults.length > 0) {
      return textResults;
    }

    // If no text results, try nearby search
    console.log('🔄 Trying nearby search...');
    return await searchNearbyLocations(query);

  } catch (error) {
    console.error('❌ Establishment search failed:', error);
    return [];
  }
};

// Get user's current location
export const getCurrentLocation = (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        console.log('📍 GPS Location:', coords);
        resolve(coords);
      },
      (error) => {
        console.log('❌ Geolocation error:', error.message);
        reject(error);
      },
      options
    );
  });
};

// Reverse geocode using new API
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    await loadGoogleMaps();

    const { Geocoder } = await window.google.maps.importLibrary("geocoding") as google.maps.GeocodingLibrary;
    const geocoder = new Geocoder();

    return new Promise((resolve) => {
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve('Deutschland');
          }
        }
      );
    });

  } catch (error) {
    console.error('❌ Reverse geocoding failed:', error);
    return 'Deutschland';
  }
};

// Calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

// TypeScript declarations
declare global {
  interface Window {
    google: any;
  }
}

export type { LocationSuggestion };