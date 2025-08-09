import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/auth.middleware';
import { logger } from './utils/logger';
import path from 'path';

// Import routes
import authRoutes from './routes/auth.routes';
import walletRoutes from './routes/wallet.routes';
import rideRoutes from './routes/ride.routes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(rateLimiter);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Constants
export const ADMIN_WALLET_ACCOUNT = process.env.ADMIN_WALLET_ACCOUNT || '9000000001';
export const COMMISSION_RATE = Number(process.env.COMMISSION_RATE) || 5;

// Import routes
import driveAndSaveRoutes from './routes/drive-and-save.routes';
import bonusRoutes from './routes/bonus.routes';
import configRoutes from './routes/config.routes';
import chatRoutes from './routes/chat.routes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/ride', rideRoutes);
app.use('/api/drive-and-save', driveAndSaveRoutes);
app.use('/api/bonus', bonusRoutes);
app.use('/api/config', configRoutes);
app.use('/api/chat', chatRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Initialize server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize admin wallet on server start
  initializeAdminWallet();
});

// Initialize admin wallet if it doesn't exist
async function initializeAdminWallet() {
  try {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('account_number', ADMIN_WALLET_ACCOUNT)
      .single();

    if (error || !wallet) {
      await supabase
        .from('wallets')
        .insert([
          {
            account_number: ADMIN_WALLET_ACCOUNT,
            balance: 0,
            user_id: 'admin',
            is_admin: true
          }
        ]);
      console.log('Admin wallet initialized');
    }
  } catch (error) {
    console.error('Error initializing admin wallet:', error);
  }
}
