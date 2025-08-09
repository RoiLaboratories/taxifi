export type UserRole = 'driver' | 'rider';

export interface SignupFormData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  bvn: string; // Required for all users for wallet creation
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  role: UserRole;
  bvn: string;
  wallet_id: string; // Generated from phone number
  created_at: string;
  updated_at: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}
