export const RIDE_CONFIG = {
  BASE_FARE: 500, // Base fare in Naira
  DISTANCE_RATE: 100, // Naira per kilometer
  TIME_RATE: 10, // Naira per minute
  MIN_SAVE_PERCENTAGE: 5, // Minimum percentage for Drive & Save
  SAVE_DURATIONS: [7, 30, 365] as const, // Available saving durations in days
  SAVE_BREAK_FEE: 5, // Early withdrawal fee percentage
  DAILY_BONUS_RIDES: 5, // Number of rides needed for daily bonus
  BONUS_AMOUNT: 200, // Bonus amount in Naira
};

export const WALLET_CONFIG = {
  MIN_WITHDRAWAL: 1000, // Minimum withdrawal amount in Naira
  MAX_WITHDRAWAL: 100000, // Maximum withdrawal amount in Naira
};

export const USER_CONFIG = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  DEFAULT_RATING: 5,
};

// Function to calculate ride fare
export function calculateFare(distanceKm: number, durationMinutes: number): number {
  return Math.ceil(
    RIDE_CONFIG.BASE_FARE +
    (RIDE_CONFIG.DISTANCE_RATE * distanceKm) +
    (RIDE_CONFIG.TIME_RATE * durationMinutes)
  );
}

// Function to calculate commission
export function calculateCommission(fare: number, commissionRate: number): number {
  return Math.ceil((fare * commissionRate) / 100);
}

// Function to calculate early withdrawal penalty
export function calculateSavingsBreakingFee(amount: number): number {
  return Math.ceil((amount * RIDE_CONFIG.SAVE_BREAK_FEE) / 100);
}

// Function to format phone number as wallet account number (remove leading zero)
export function formatPhoneToAccountNumber(phone: string): string {
  return phone.startsWith('0') ? phone.substring(1) : phone;
}

// Function to validate BVN format
export function isValidBVN(bvn: string): boolean {
  return /^\d{11}$/.test(bvn);
}

// Function to validate Nigerian phone number
export function isValidPhoneNumber(phone: string): boolean {
  return /^0[789][01]\d{8}$/.test(phone);
}
