import { Router } from 'express';
import { supabase } from '../index';
import { RIDE_CONFIG, calculateFare, calculateCommission } from '../config/constants';
import { ADMIN_WALLET_ACCOUNT, COMMISSION_RATE } from '../index';

const router = Router();

// Request a ride
router.post('/request', async (req, res) => {
  try {
    const {
      rider_id,
      pickup_location,
      destination_location,
      estimated_distance,
      estimated_duration
    } = req.body;

    // Calculate estimated fare
    const estimated_fare = calculateFare(estimated_distance, estimated_duration);

    // Create ride request
    const { data: ride, error } = await supabase
      .from('rides')
      .insert([
        {
          rider_id,
          pickup_location,
          destination_location,
          status: 'requested',
          fare: estimated_fare,
          distance: estimated_distance,
          duration: estimated_duration
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Notify nearby drivers (implement with WebSocket/Supabase Realtime)

    res.status(201).json({
      ride,
      estimated_fare
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error creating ride request'
    });
  }
});

// Accept ride request (driver)
router.post('/:rideId/accept', async (req, res) => {
  try {
    const { rideId } = req.params;
    const { driver_id } = req.body;

    const { error } = await supabase
      .from('rides')
      .update({
        driver_id,
        status: 'accepted'
      })
      .eq('id', rideId)
      .eq('status', 'requested');

    if (error) throw error;

    res.json({ message: 'Ride accepted successfully' });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error accepting ride'
    });
  }
});

// Start ride
router.post('/:rideId/start', async (req, res) => {
  try {
    const { rideId } = req.params;

    const { error } = await supabase
      .from('rides')
      .update({
        status: 'in_progress',
        start_time: new Date().toISOString()
      })
      .eq('id', rideId)
      .eq('status', 'accepted');

    if (error) throw error;

    res.json({ message: 'Ride started successfully' });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error starting ride'
    });
  }
});

// Complete ride and process payment
router.post('/:rideId/complete', async (req, res) => {
  try {
    const { rideId } = req.params;
    const { final_distance, final_duration } = req.body;

    // Get ride details
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*, rider:rider_id(id), driver:driver_id(id)')
      .eq('id', rideId)
      .single();

    if (rideError) throw rideError;

    // Calculate final fare
    const final_fare = calculateFare(final_distance, final_duration);
    const commission = calculateCommission(final_fare, COMMISSION_RATE);
    const driver_earning = final_fare - commission;

    // Get rider's wallet
    const { data: riderWallet, error: riderWalletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', ride.rider.id)
      .single();

    if (riderWalletError) throw riderWalletError;

    if (riderWallet.balance < final_fare) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Get driver's wallet
    const { data: driverWallet, error: driverWalletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', ride.driver.id)
      .single();

    if (driverWalletError) throw driverWalletError;

    // Update ride status and details
    const { error: updateRideError } = await supabase
      .from('rides')
      .update({
        status: 'completed',
        end_time: new Date().toISOString(),
        final_distance,
        final_duration,
        fare: final_fare,
        commission_amount: commission
      })
      .eq('id', rideId);

    if (updateRideError) throw updateRideError;

    // Process payments
    // 1. Deduct from rider's wallet
    const { error: riderUpdateError } = await supabase
      .from('wallets')
      .update({ balance: riderWallet.balance - final_fare })
      .eq('user_id', ride.rider.id);

    if (riderUpdateError) throw riderUpdateError;

    // 2. Add driver's earning to their wallet
    const { error: driverUpdateError } = await supabase
      .from('wallets')
      .update({ balance: driverWallet.balance + driver_earning })
      .eq('user_id', ride.driver.id);

    if (driverUpdateError) throw driverUpdateError;

    // 3. Transfer commission to admin wallet
    const { data: adminWallet, error: getAdminError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('account_number', ADMIN_WALLET_ACCOUNT)
      .single();

    if (getAdminError) throw getAdminError;

    const { error: adminUpdateError } = await supabase
      .from('wallets')
      .update({
        balance: (adminWallet?.balance || 0) + commission
      })
      .eq('account_number', ADMIN_WALLET_ACCOUNT);

    if (adminUpdateError) throw adminUpdateError;

    // Record transactions
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          ride_id: rideId,
          from_account: riderWallet.account_number,
          to_account: driverWallet.account_number,
          amount: driver_earning,
          type: 'ride_payment',
          status: 'completed'
        },
        {
          ride_id: rideId,
          from_account: riderWallet.account_number,
          to_account: ADMIN_WALLET_ACCOUNT,
          amount: commission,
          type: 'commission',
          status: 'completed'
        }
      ]);

    if (transactionError) throw transactionError;

    res.json({
      message: 'Ride completed successfully',
      fare: final_fare,
      driver_earning,
      commission
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error completing ride'
    });
  }
});

// Rate ride
router.post('/:rideId/rate', async (req, res) => {
  try {
    const { rideId } = req.params;
    const { rating, review, rater_type } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Get ride details
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (rideError) throw rideError;

    // Create rating
    const { error: ratingError } = await supabase
      .from('ratings')
      .insert([
        {
          ride_id: rideId,
          rating,
          review,
          rater_type,
          rated_user_id: rater_type === 'rider' ? ride.driver_id : ride.rider_id
        }
      ]);

    if (ratingError) throw ratingError;

    // Update user's average rating
    const { data: ratings, error: avgError } = await supabase
      .from('ratings')
      .select('rating')
      .eq('rated_user_id', rater_type === 'rider' ? ride.driver_id : ride.rider_id);

    if (avgError) throw avgError;

    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    const { error: updateError } = await supabase
      .from('users')
      .update({ rating: avgRating })
      .eq('id', rater_type === 'rider' ? ride.driver_id : ride.rider_id);

    if (updateError) throw updateError;

    res.json({ message: 'Rating submitted successfully' });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error submitting rating'
    });
  }
});

export default router;
