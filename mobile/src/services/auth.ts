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
  password?: string; // Optional for responses
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
    console.log('Starting signup process...');
    
    // First try to sign up with Supabase auth
    let sessionData;
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          phone_number: data.phone_number,
          role: data.role
        }
      }
    });

    if (signUpError) {
      // If user already exists in auth, we should tell them to use login instead
      if (signUpError.message === 'User already registered') {
        throw new Error('This email is already registered. Please login instead.');
      } else {
        console.error('Auth signup error:', signUpError);
        throw signUpError;
      }
    }

    // If we get here, the signup was successful
    sessionData = authData;
    
    if (!sessionData.user) {
      console.error('No user data returned from auth');
      throw new Error('Failed to create user');
    }

    // Create the user profile using the session
    const { data: userData, error: userError } = await supabase
      .rpc('create_new_user', {
        user_id: sessionData.user.id,
        user_email: data.email,
        user_full_name: data.full_name,
        user_phone_number: data.phone_number,
        user_role: data.role,
        user_password: data.password
      });

    if (userError) {
      console.error('Error creating user profile:', userError);
      throw new Error(userError.message);
    }

    if (!userData) {
      throw new Error('Failed to create user profile: No data returned');
    }

    // Cast the returned JSON to our User type and return
    const newUser = userData as User;
    return newUser;

  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

// Login user
export const login = async (data: LoginData): Promise<User> => {
  try {
    // First sign in with Supabase Auth
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    });

    if (signInError) throw signInError;
    if (!authData.user) throw new Error('No user data returned from auth');

    // Then fetch the user profile
    let userData: User;
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // If user profile doesn't exist but auth succeeded, create it
        const { data: newUser, error: createError } = await supabase
          .rpc('create_new_user', {
            user_id: authData.user.id,
            user_email: data.email,
            user_full_name: authData.user.user_metadata.full_name || '',
            user_phone_number: authData.user.user_metadata.phone_number || '',
            user_role: authData.user.user_metadata.role || 'rider',
            user_password: data.password
          });

        if (createError) throw createError;
        if (!newUser) throw new Error('Failed to create user profile');
        
        userData = newUser as User;
      } else {
        throw fetchError;
      }
    } else {
      userData = existingUser as User;
    }

    // Store user session
    await storeUserSession(userData);
    
    return userData;
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
