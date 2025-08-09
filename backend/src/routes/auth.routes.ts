import { Router } from 'express';
import { supabase } from '../index';
import { isValidPhoneNumber, isValidBVN, formatPhoneToAccountNumber } from '../config/constants';

const router = Router();

// Register new user (driver or rider)
router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, bvn, user_role, full_name } = req.body;

    // Validate input
    if (!email || !phone || !password || !bvn || !user_role || !full_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!full_name.trim() || full_name.trim().split(' ').length < 2) {
      return res.status(400).json({ error: 'Please provide your full legal name (first and last name)' });
    }

    if (!isValidPhoneNumber(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    if (!isValidBVN(bvn)) {
      return res.status(400).json({ error: 'Invalid BVN format' });
    }

    if (!['driver', 'rider'].includes(user_role)) {
      return res.status(400).json({ error: 'Invalid user role' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      phone,
    });

    if (authError) throw authError;

    // Create user profile in users table
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user?.id,
          email,
          phone,
          full_name,
          user_role,
          bvn,
          rating: 5,
          status: user_role === 'driver' ? 'pending' : 'active'
        }
      ]);

    if (profileError) throw profileError;

    // Create wallet for user
    const { error: walletError } = await supabase
      .from('wallets')
      .insert([
        {
          user_id: authData.user?.id,
          account_number: formatPhoneToAccountNumber(phone),
          balance: 0
        }
      ]);

    if (walletError) throw walletError;

    res.status(201).json({
      message: 'Registration successful',
      user_role,
      status: user_role === 'driver' ? 'pending' : 'active'
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error during registration'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw profileError;

    // Get wallet info
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (walletError) throw walletError;

    res.json({
      user: profile,
      wallet,
      session: authData.session
    });

  } catch (error: any) {
    res.status(401).json({
      error: error.message || 'Invalid credentials'
    });
  }
});

// Request role change
router.post('/request-role-change', async (req, res) => {
  try {
    const { user_id, desired_role } = req.body;

    if (!user_id || !desired_role || !['driver', 'rider'].includes(desired_role)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const { error } = await supabase
      .from('role_change_requests')
      .insert([
        {
          user_id,
          desired_role,
          status: 'pending'
        }
      ]);

    if (error) throw error;

    res.json({ message: 'Role change request submitted successfully' });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error submitting role change request'
    });
  }
});

export default router;
