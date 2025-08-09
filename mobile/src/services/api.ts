// import Constants from 'expo-constants';
// import { type UserRole } from './supabase';

// const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

// interface APIError {
//   message: string;
//   status: number;
// }

// interface APIResponse<T> {
//   data: T | null;
//   error: APIError | null;
// }

// // Create base fetch wrapper with auth token
// async function fetchWithAuth(
//   endpoint: string,
//   options: RequestInit = {}
// ): Promise<Response> {
//   const { supabaseToken } = await import('./supabase');
//   const headers = new Headers(options.headers);
  
//   if (supabaseToken) {
//     headers.set('Authorization', `Bearer ${supabaseToken}`);
//   }
  
//   return fetch(`${API_URL}${endpoint}`, {
//     ...options,
//     headers,
//   });
// }

// // Wallet Operations
// export async function getWalletBalance(): Promise<APIResponse<{ balance: number }>> {
//   try {
//     const response = await fetchWithAuth('/wallet/balance');
//     if (!response.ok) throw new Error('Failed to fetch wallet balance');
    
//     const data = await response.json();
//     return { data, error: null };
//   } catch (error) {
//     return {
//       data: null,
//       error: {
//         message: error instanceof Error ? error.message : 'Failed to fetch wallet balance',
//         status: 500,
//       },
//     };
//   }
// }

// // Ride Operations
// interface RideRequest {
//   pickup: {
//     latitude: number;
//     longitude: number;
//     address: string;
//   };
//   destination: {
//     latitude: number;
//     longitude: number;
//     address: string;
//   };
// }

// interface RideEstimate {
//   fare: number;
//   distance: number;
//   duration: number;
// }

// export async function getRideEstimate(request: RideRequest): Promise<APIResponse<RideEstimate>> {
//   try {
//     const response = await fetchWithAuth('/rides/estimate', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(request),
//     });
    
//     if (!response.ok) throw new Error('Failed to get ride estimate');
    
//     const data = await response.json();
//     return { data, error: null };
//   } catch (error) {
//     return {
//       data: null,
//       error: {
//         message: error instanceof Error ? error.message : 'Failed to get ride estimate',
//         status: 500,
//       },
//     };
//   }
// }

// // Drive & Save Operations
// interface SavingsPlan {
//   savePercentage: number;
//   durationDays: 7 | 30 | 365;
// }

// export async function createSavingsPlan(plan: SavingsPlan): Promise<APIResponse<{ id: string }>> {
//   try {
//     const response = await fetchWithAuth('/drive-and-save', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(plan),
//     });
    
//     if (!response.ok) throw new Error('Failed to create savings plan');
    
//     const data = await response.json();
//     return { data, error: null };
//   } catch (error) {
//     return {
//       data: null,
//       error: {
//         message: error instanceof Error ? error.message : 'Failed to create savings plan',
//         status: 500,
//       },
//     };
//   }
// }

// // Driver Operations
// interface DriverStatus {
//   isOnline: boolean;
//   location: {
//     latitude: number;
//     longitude: number;
//   };
// }

// export async function updateDriverStatus(status: DriverStatus): Promise<APIResponse<void>> {
//   try {
//     const response = await fetchWithAuth('/driver/status', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(status),
//     });
    
//     if (!response.ok) throw new Error('Failed to update driver status');
    
//     return { data: null, error: null };
//   } catch (error) {
//     return {
//       data: null,
//       error: {
//         message: error instanceof Error ? error.message : 'Failed to update driver status',
//         status: 500,
//       },
//     };
//   }
// }

// // Payment Operations
// interface PaymentMethod {
//   type: 'card' | 'wallet';
//   lastFour?: string;
//   expiryDate?: string;
// }

// export async function addPaymentMethod(method: PaymentMethod): Promise<APIResponse<{ id: string }>> {
//   try {
//     const response = await fetchWithAuth('/payment/methods', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(method),
//     });
    
//     if (!response.ok) throw new Error('Failed to add payment method');
    
//     const data = await response.json();
//     return { data, error: null };
//   } catch (error) {
//     return {
//       data: null,
//       error: {
//         message: error instanceof Error ? error.message : 'Failed to add payment method',
//         status: 500,
//       },
//     };
//   }
// }
