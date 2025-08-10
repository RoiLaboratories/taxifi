import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  role: 'rider' | 'driver';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  role: 'rider' | 'driver';
  status: 'active' | 'inactive';
}

// Store user session in AsyncStorage
const storeUserSession = async (user: User) => {
  try {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    console.error('Error storing user session:', error);
    throw error;
  }
};

// Get user session from AsyncStorage
export const getUserSession = async (): Promise<User | null> => {
  try {
    const userString = await AsyncStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
};

// Clear user session from AsyncStorage
export const clearUserSession = async () => {
  try {
    await AsyncStorage.removeItem('user');
  } catch (error) {
    console.error('Error clearing user session:', error);
    throw error;
  }
};

// Sign up a new user
export const signUp = async (data: SignUpData): Promise<User> => {
  try {
    // Insert user into the database
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        email: data.email,
        password: data.password, // Note: In a real app, hash this password
        full_name: data.full_name,
        phone_number: data.phone_number,
        role: data.role,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    if (!newUser) throw new Error('Failed to create user');

    // Store user session
    await storeUserSession(newUser);
    
    return newUser;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

// Login user
export const login = async (data: LoginData): Promise<User> => {
  try {
    // Check credentials in the database
    const { data: user, error } = await supabase
      .from('users')
      .select()
      .eq('email', data.email)
      .eq('password', data.password) // Note: In a real app, use proper password hashing
      .single();

    if (error) throw error;
    if (!user) throw new Error('Invalid credentials');

    // Store user session
    await storeUserSession(user);
    
    return user;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

// Logout user
export const logout = async () => {
  try {
    await clearUserSession();
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};
