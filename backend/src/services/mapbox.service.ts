import dotenv from 'dotenv';

dotenv.config();

const MAPBOX_SECRET_TOKEN = process.env.MAPBOX_SECRET_TOKEN;
const MAPBOX_PUBLIC_TOKEN = process.env.MAPBOX_PUBLIC_TOKEN;
const MAPBOX_API_URL = 'https://api.mapbox.com';

interface Coordinates {
  lat: number;
  lng: number;
}

interface RouteDetails {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: any; // GeoJSON for the route path
}

class MapboxService {
  private accessToken: string;

  constructor() {
    if (!MAPBOX_SECRET_TOKEN) {
      throw new Error('MAPBOX_SECRET_TOKEN is required');
    }
    this.accessToken = MAPBOX_SECRET_TOKEN;
  }

  // Reverse geocoding - get address from coordinates
  async getAddressFromCoordinates(coordinates: Coordinates): Promise<string> {
    try {
      const response = await fetch(
        `${MAPBOX_API_URL}/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?access_token=${this.accessToken}`
      );

      const data = await response.json();
      return data.features[0]?.place_name || '';
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      throw error;
    }
  }

  // Forward geocoding - get coordinates from address
  async getCoordinatesFromAddress(address: string): Promise<Coordinates> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `${MAPBOX_API_URL}/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${this.accessToken}`
      );

      const data = await response.json();
      const [lng, lat] = data.features[0]?.center || [0, 0];
      
      return { lat, lng };
    } catch (error) {
      console.error('Error in forward geocoding:', error);
      throw error;
    }
  }

  // Get route details between two points
  async getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteDetails> {
    try {
      const response = await fetch(
        `${MAPBOX_API_URL}/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${this.accessToken}&geometries=geojson&overview=full`
      );

      const data = await response.json();
      const route = data.routes[0];

      return {
        distance: route.distance, // meters
        duration: route.duration, // seconds
        geometry: route.geometry
      };
    } catch (error) {
      console.error('Error getting route:', error);
      throw error;
    }
  }

  // Get nearby drivers (using Mapbox Tilequery API)
  async getNearbyDrivers(coordinates: Coordinates, radiusInMeters: number = 5000): Promise<any[]> {
    try {
      const response = await fetch(
        `${MAPBOX_API_URL}/v4/mapbox.mapbox-streets-v8/tilequery/${coordinates.lng},${coordinates.lat}.json?radius=${radiusInMeters}&layers=poi&access_token=${this.accessToken}`
      );

      const data = await response.json();
      return data.features;
    } catch (error) {
      console.error('Error getting nearby drivers:', error);
      throw error;
    }
  }

  // Convert meters to kilometers
  static metersToKm(meters: number): number {
    return meters / 1000;
  }

  // Convert seconds to minutes
  static secondsToMinutes(seconds: number): number {
    return Math.ceil(seconds / 60);
  }
}

export default new MapboxService();
