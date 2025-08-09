export interface User {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  user_role: 'driver' | 'rider';
  created_at: string;
  updated_at: string;
  bvn: string;
  rating: number;
  status: 'active' | 'inactive' | 'pending';
}

export interface Wallet {
  id: string;
  user_id: string;
  account_number: string;
  balance: number;
  created_at: string;
  updated_at: string;
  is_admin?: boolean;
}

export interface Ride {
  id: string;
  rider_id: string;
  driver_id: string;
  pickup_location: {
    lat: number;
    lng: number;
    address: string;
  };
  destination_location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  fare: number;
  distance: number;
  duration: number;
  created_at: string;
  updated_at: string;
  commission_amount: number;
}

export interface DriveAndSaveWallet {
  id: string;
  driver_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface DriveAndSave {
  id: string;
  driver_id: string;
  wallet_id: string;
  save_percentage: number;
  duration_days: 7 | 30 | 365;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'broken';
  created_at: string;
  updated_at: string;
  drive_and_save_wallets?: DriveAndSaveWallet;
}

export interface Transaction {
  id: string;
  from_account: string;
  to_account: string;
  amount: number;
  type: 'ride_payment' | 'commission' | 'withdrawal' | 'deposit' | 'savings' | 'savings_withdrawal' | 'breaking_fee' | 'bonus';
  status: 'pending' | 'completed' | 'failed';
  ride_id?: string;
  created_at: string;
  updated_at: string;
}

export type MessageType = 'text' | 'image' | 'location';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface ChatMessage {
  id: string;
  ride_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: MessageType;
  is_read: boolean;
  is_encrypted: boolean;
  encryption_iv?: string;
  media_url?: string;
  location?: Location;
  created_at: string;
}

export interface TypingStatus {
  user_id: string;
  ride_id: string;
  is_typing: boolean;
  last_updated: string;
}

export interface ChatRoom {
  id: string;
  ride_id: string;
  driver_id: string;
  rider_id: string;
  status: 'active' | 'archived';
  last_message?: string;
  last_message_time?: string;
  created_at: string;
  updated_at: string;
}
