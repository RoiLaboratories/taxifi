import { Router } from 'express';
import { supabase } from '../index';
import { WALLET_CONFIG } from '../config/constants';

const router = Router();

// Get wallet balance
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    res.json(wallet);

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error fetching wallet'
    });
  }
});

// Fund wallet (simulation - in production, integrate with payment gateway)
router.post('/fund', async (req, res) => {
  try {
    const { user_id, amount } = req.body;

    // Start transaction
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (walletError) throw walletError;

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance + amount })
      .eq('user_id', user_id);

    if (updateError) throw updateError;

    // Record transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          from_account: 'bank',
          to_account: wallet.account_number,
          amount,
          type: 'deposit',
          status: 'completed'
        }
      ]);

    if (transactionError) throw transactionError;

    res.json({ message: 'Wallet funded successfully' });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error funding wallet'
    });
  }
});

// Withdraw from wallet
router.post('/withdraw', async (req, res) => {
  try {
    const { user_id, amount, bank_account } = req.body;

    if (amount < WALLET_CONFIG.MIN_WITHDRAWAL || amount > WALLET_CONFIG.MAX_WITHDRAWAL) {
      return res.status(400).json({
        error: `Withdrawal amount must be between ₦${WALLET_CONFIG.MIN_WITHDRAWAL} and ₦${WALLET_CONFIG.MAX_WITHDRAWAL}`
      });
    }

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (walletError) throw walletError;

    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance - amount })
      .eq('user_id', user_id);

    if (updateError) throw updateError;

    // Record transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          from_account: wallet.account_number,
          to_account: bank_account,
          amount,
          type: 'withdrawal',
          status: 'completed'
        }
      ]);

    if (transactionError) throw transactionError;

    res.json({ message: 'Withdrawal successful' });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error processing withdrawal'
    });
  }
});

// Transfer between wallets
router.post('/transfer', async (req, res) => {
  try {
    const { from_user_id, to_account, amount } = req.body;

    // Get sender's wallet
    const { data: fromWallet, error: fromError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', from_user_id)
      .single();

    if (fromError) throw fromError;

    if (fromWallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Get recipient's wallet
    const { data: toWallet, error: toError } = await supabase
      .from('wallets')
      .select('*')
      .eq('account_number', to_account)
      .single();

    if (toError) throw toError;

    // Update sender's balance
    const { error: fromUpdateError } = await supabase
      .from('wallets')
      .update({ balance: fromWallet.balance - amount })
      .eq('user_id', from_user_id);

    if (fromUpdateError) throw fromUpdateError;

    // Update recipient's balance
    const { error: toUpdateError } = await supabase
      .from('wallets')
      .update({ balance: toWallet.balance + amount })
      .eq('account_number', to_account);

    if (toUpdateError) throw toUpdateError;

    // Record transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          from_account: fromWallet.account_number,
          to_account,
          amount,
          type: 'transfer',
          status: 'completed'
        }
      ]);

    if (transactionError) throw transactionError;

    res.json({ message: 'Transfer successful' });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error processing transfer'
    });
  }
});

// Get transaction history by type
router.get('/transactions/:userId/:type', async (req, res) => {
  try {
    const { userId, type } = req.params;
    const { start_date, end_date } = req.query;

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('account_number')
      .eq('user_id', userId)
      .single();

    if (walletError) throw walletError;

    // Build query
    let query = supabase
      .from('transactions')
      .select('*')
      .or(`from_account.eq.${wallet.account_number},to_account.eq.${wallet.account_number}`)
      .eq('type', type)
      .order('created_at', { ascending: false });

    // Add date filters if provided
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error fetching transactions'
    });
  }
});

export default router;
