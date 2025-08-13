// Mock MapBox service for prototyping
interface DirectionsResponse {
  coordinates: [number, number][];
  distance: string;
  duration: string;
}

export const mapboxService = {
  async getDirections(
    start: [number, number],
    end: [number, number]
  ): Promise<DirectionsResponse> {
    try {
      // Generate a simple mock route between start and end points
      const mockRoute: [number, number][] = [
        start,
        [start[0] + (end[0] - start[0])/2, start[1] + (end[1] - start[1])/2] as [number, number],
        end
      ];

      // Calculate mock distance (this is just an approximation)
      const distance = `${(Math.sqrt(
        Math.pow(end[0] - start[0], 2) + 
        Math.pow(end[1] - start[1], 2)
      ) * 111).toFixed(1)} km`;

      // Mock duration based on distance
      const duration = `${Math.round(parseFloat(distance) * 3)} mins`;

      return {
        coordinates: mockRoute,
        distance,
        duration
      };
    } catch (error) {
      console.error('Error in mock directions:', error);
      throw error;
    }
  },

  async geocode(address: string) {
    try {
      // Return mock coordinates for Lagos
      return {
        coordinates: [3.3792, 6.5244], // Lagos coordinates
        address: "Mock Address: " + address
      };

    } catch (error) {
      console.error('Error in mock geocoding:', error);
      throw error;
    }
  },

  async reverseGeocode(longitude: number, latitude: number) {
    try {
      // Mock addresses based on coordinates in Lagos
      const mockAddresses: { [key: string]: string | string[] } = {
        // Ikeja area
        '6.5244,3.3792': '23 Allen Avenue, Ikeja, Lagos',
        '6.5100,3.3900': 'Computer Village, Ikeja, Lagos',
        // Victoria Island area
        '6.4281,3.4219': 'Eko Hotel, Victoria Island, Lagos',
        '6.4300,3.4240': 'Lagos City Mall, Victoria Island',
        // Lekki area
        '6.4698,3.5852': 'Shoprite Circle Mall, Lekki Phase 1',
        '6.4500,3.5400': 'Lekki Conservation Centre, Lekki',
        // Default addresses for other coordinates
        default: [
          'Lagos Business School, Ajah',
          'Ikeja City Mall, Alausa',
          'Maryland Mall, Maryland',
          'Novare Mall, Sangotedo',
          'The Palms Shopping Mall, Lekki',
          'MMA2 Terminal, Ikeja',
          'National Stadium, Surulere',
          'University of Lagos, Akoka',
          'Terra Kulture, Victoria Island',
          'Freedom Park, Lagos Island'
        ]
      };

      const coordKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const address = mockAddresses[coordKey] || 
        mockAddresses.default[Math.floor(Math.random() * mockAddresses.default.length)];

      return {
        address: address
      };
    } catch (error) {
      console.error('Error in mock reverse geocoding:', error);
      throw error;
    }
  }
};
