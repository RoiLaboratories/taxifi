import { Router } from 'express';
import { supabase } from '../index';

const router = Router();

// Get Mapbox public token (requires authenticated user)
router.get('/mapbox-token', async (req, res) => {
  try {
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Return public token
    res.json({
      token: process.env.MAPBOX_PUBLIC_TOKEN
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error fetching Mapbox token'
    });
  }
});

export default router;
