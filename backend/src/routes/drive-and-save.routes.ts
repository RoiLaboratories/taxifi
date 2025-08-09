import { Router } from 'express';
import { supabase } from '../index';
import { RIDE_CONFIG, calculateSavingsBreakingFee } from '../config/constants';

const router = Router();

// Start a new Drive & Save plan
router.post('/start', async (req, res) => {
  try {
    const { driver_id, save_percentage, duration_days } = req.body;

    // Validate input
    if (!RIDE_CONFIG.SAVE_DURATIONS.includes(duration_days)) {
      return res.status(400).json({ 
        error: `Invalid duration. Must be one of: ${RIDE_CONFIG.SAVE_DURATIONS.join(', ')} days` 
      });
    }

    if (save_percentage < RIDE_CONFIG.MIN_SAVE_PERCENTAGE) {
      return res.status(400).json({ 
        error: `Save percentage must be at least ${RIDE_CONFIG.MIN_SAVE_PERCENTAGE}%` 
      });
    }

    // Check if driver already has an active plan
    const { data: existingPlan, error: planCheckError } = await supabase
      .from('drive_and_save')
      .select('*')
      .eq('driver_id', driver_id)
      .eq('status', 'active')
      .single();

    if (planCheckError && planCheckError.code !== 'PGRST116') throw planCheckError;
    if (existingPlan) {
      return res.status(400).json({
        error: 'Driver already has an active savings plan'
      });
    }

    // Check for existing savings wallet or create new one
    let wallet;
    const { data: existingWallet, error: walletCheckError } = await supabase
      .from('drive_and_save_wallets')
      .select('*')
      .eq('driver_id', driver_id)
      .single();

    if (walletCheckError && walletCheckError.code !== 'PGRST116') throw walletCheckError;

    if (existingWallet) {
      wallet = existingWallet;
    } else {
      const { data: newWallet, error: walletError } = await supabase
        .from('drive_and_save_wallets')
        .insert([{
          driver_id,
          balance: 0
        }])
        .select()
        .single();

      if (walletError) throw walletError;
      wallet = newWallet;
    }

    const start_date = new Date().toISOString();
    const end_date = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString();

    // Create Drive & Save plan
    const { error } = await supabase
      .from('drive_and_save')
      .insert([
        {
          driver_id,
          wallet_id: wallet.id,
          save_percentage,
          duration_days,
          start_date,
          end_date,
          status: 'active'
        }
      ]);

    if (error) throw error;

    res.status(201).json({
      message: 'Drive & Save plan started successfully',
      start_date,
      end_date
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error starting Drive & Save plan'
    });
  }
});

// Get active Drive & Save plans for a driver
router.get('/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

    const { data, error } = await supabase
      .from('drive_and_save')
      .select('*')
      .eq('driver_id', driverId)
      .eq('status', 'active');

    if (error) throw error;

    res.json(data);

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error fetching Drive & Save plans'
    });
  }
});

// Early withdrawal from Drive & Save
router.post('/:planId/withdraw', async (req, res) => {
  try {
    const { planId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    // Get plan details with savings wallet
    const { data: plan, error: planError } = await supabase
      .from('drive_and_save')
      .select(`
        *,
        drive_and_save_wallets (
          balance
        )
      `)
      .eq('id', planId)
      .single();

    if (planError) throw planError;

    if (!plan || plan.status !== 'active') {
      return res.status(400).json({ error: 'Invalid or inactive plan' });
    }

    const savingsWallet = plan.drive_and_save_wallets;
    if (!savingsWallet || amount > savingsWallet.balance) {
      return res.status(400).json({ error: 'Insufficient savings balance' });
    }

    // Calculate breaking fee if withdrawing before end date
    const isEarlyWithdrawal = new Date() < new Date(plan.end_date);
    const breakingFee = isEarlyWithdrawal ? amount * 0.05 : 0;
    const withdrawalAmount = amount - breakingFee;

    // Get driver's main wallet and admin wallet
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('*')
      .or(`user_id.eq.${plan.driver_id},is_admin.eq.true`);

    if (walletsError) throw walletsError;

    const driverWallet = wallets.find(w => w.user_id === plan.driver_id);
    const adminWallet = wallets.find(w => w.is_admin);

    if (!driverWallet || !adminWallet) {
      throw new Error('Required wallets not found');
    }

    // Update savings wallet balance
    const { error: updateSavingsError } = await supabase
      .from('drive_and_save_wallets')
      .update({ balance: savingsWallet.balance - amount })
      .eq('id', plan.wallet_id);

    if (updateSavingsError) throw updateSavingsError;

    // Create withdrawal transaction
    const { error: withdrawalError } = await supabase
      .from('transactions')
      .insert([{
        from_account: driverWallet.account_number,
        to_account: driverWallet.account_number,
        amount: withdrawalAmount,
        type: 'savings_withdrawal',
        status: 'completed'
      }]);

    if (withdrawalError) throw withdrawalError;

    // If early withdrawal, create breaking fee transaction
    if (isEarlyWithdrawal && breakingFee > 0) {
      const { error: feeError } = await supabase
        .from('transactions')
        .insert([{
          from_account: driverWallet.account_number,
          to_account: adminWallet.account_number,
          amount: breakingFee,
          type: 'breaking_fee',
          status: 'completed'
        }]);

      if (feeError) throw feeError;
    }

    // If all savings withdrawn and it's early, mark plan as broken
    if (savingsWallet.balance - amount === 0 && isEarlyWithdrawal) {
      const { error: updatePlanError } = await supabase
        .from('drive_and_save')
        .update({ status: 'broken' })
        .eq('id', planId);

      if (updatePlanError) throw updatePlanError;
    }

    res.json({
      message: isEarlyWithdrawal ? 'Early withdrawal processed successfully' : 'Withdrawal processed successfully',
      withdrawalAmount,
      breakingFee,
      newBalance: savingsWallet.balance - amount
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error processing withdrawal'
    });
  }
});

// Function to check and complete expired plans
const checkAndCompleteExpiredPlans = async (driverId: string) => {
  const { data: expiredPlans, error: expiredError } = await supabase
    .from('drive_and_save')
    .select('*')
    .eq('driver_id', driverId)
    .eq('status', 'active')
    .lt('end_date', new Date().toISOString());

  if (expiredError) throw expiredError;

  if (expiredPlans && expiredPlans.length > 0) {
    const { error: updateError } = await supabase
      .from('drive_and_save')
      .update({ status: 'completed' })
      .in('id', expiredPlans.map(p => p.id));

    if (updateError) throw updateError;
  }
};

// Get plan history
router.get('/history/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

    const { data, error } = await supabase
      .from('drive_and_save')
      .select(`
        *,
        drive_and_save_wallets (
          balance
        )
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error fetching savings history'
    });
  }
});

// Get savings wallet balance with active plan details
router.get('/wallet/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

    // Check and complete any expired plans
    await checkAndCompleteExpiredPlans(driverId);

    // Get wallet and active plan details
    const { data, error } = await supabase
      .from('drive_and_save_wallets')
      .select(`
        *,
        drive_and_save!drive_and_save_wallets_driver_id_fkey (
          save_percentage,
          duration_days,
          start_date,
          end_date,
          status
        )
      `)
      .eq('driver_id', driverId)
      .single();

    if (error) throw error;

    res.json(data);

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error fetching savings wallet'
    });
  }
});

export default router;
