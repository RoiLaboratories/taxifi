import { Router } from 'express';
import { supabase } from '../index';
import { RIDE_CONFIG } from '../config/constants';

const router = Router();

// Check and process daily bonus eligibility
router.post('/check-eligibility', async (req, res) => {
  try {
    const { driver_id } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count completed rides for today
    const { data: rides, error: ridesError } = await supabase
      .from('rides')
      .select('id')
      .eq('driver_id', driver_id)
      .eq('status', 'completed')
      .gte('created_at', today.toISOString());

    if (ridesError) throw ridesError;

    const completedRides = rides?.length || 0;

    if (completedRides < RIDE_CONFIG.DAILY_BONUS_RIDES) {
      return res.json({
        eligible: false,
        completedRides,
        requiredRides: RIDE_CONFIG.DAILY_BONUS_RIDES
      });
    }

    // Check if bonus already claimed for today
    const { data: existingBonus, error: bonusError } = await supabase
      .from('transactions')
      .select('id')
      .eq('to_account', driver_id)
      .eq('type', 'bonus')
      .gte('created_at', today.toISOString())
      .single();

    if (bonusError && bonusError.message !== 'No rows found') throw bonusError;

    if (existingBonus) {
      return res.json({
        eligible: false,
        message: 'Bonus already claimed for today'
      });
    }

    // Get driver's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', driver_id)
      .single();

    if (walletError) throw walletError;

    // Add bonus to wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance + RIDE_CONFIG.BONUS_AMOUNT })
      .eq('user_id', driver_id);

    if (updateError) throw updateError;

    // Record bonus transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          from_account: 'system',
          to_account: wallet.account_number,
          amount: RIDE_CONFIG.BONUS_AMOUNT,
          type: 'bonus',
          status: 'completed'
        }
      ]);

    if (transactionError) throw transactionError;

    res.json({
      eligible: true,
      claimed: true,
      bonusAmount: RIDE_CONFIG.BONUS_AMOUNT,
      message: 'Daily bonus claimed successfully'
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error processing bonus eligibility'
    });
  }
});

// Update bonus amount (admin only)
router.put('/update-amount', async (req, res) => {
  try {
    const { new_amount, admin_id } = req.body;

    // Verify admin
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .select('user_role')
      .eq('id', admin_id)
      .single();

    if (adminError || admin?.user_role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update bonus amount in environment
    process.env.BONUS_AMOUNT = new_amount.toString();
    RIDE_CONFIG.BONUS_AMOUNT = new_amount;

    res.json({
      message: 'Bonus amount updated successfully',
      new_amount
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error updating bonus amount'
    });
  }
});

export default router;
