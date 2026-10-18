import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares/error';

// Routes
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import familyRoutes from './routes/family.routes';
import categoryRoutes from './routes/category.routes';
import expenseRoutes from './routes/expense.routes';
import reportRoutes from './routes/report.routes';

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow native mobile apps, Postman, curl (requests with no origin)
    if (!origin) return callback(null, true);
    if (env.CORS_ORIGIN === '*') return callback(null, true);
    const allowed = env.CORS_ORIGIN.split(',').map((o) => o.trim());
    if (allowed.includes(origin) || allowed.includes('*')) {
      return callback(null, true);
    }
    // Allow local development web origins
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked request from origin: ${origin}`));
  },
  credentials: true,
}));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Request parsing & Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Health Check
app.get('/api/health', (req, res) => {
  let supabaseHost = 'none';
  try {
    if (env.SUPABASE_URL) {
      supabaseHost = new URL(env.SUPABASE_URL).hostname;
    }
  } catch {
    supabaseHost = 'invalid-url';
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    demoMode: env.IS_DEMO_MODE,
    supabaseHost,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);

// Centralized Error Handler
app.use(errorHandler);

// Start Server
if (require.main === module) {
  let supabaseHost = 'none';
  try {
    if (env.SUPABASE_URL) {
      supabaseHost = new URL(env.SUPABASE_URL).hostname;
    }
  } catch {
    supabaseHost = 'unknown';
  }

  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(` ExpenseApp API Server running on port ${env.PORT}`);
    console.log(` Host: 0.0.0.0 (Accepting Localhost, LAN & Emulator)`);
    console.log(` Environment: ${env.NODE_ENV}`);
    console.log(` Demo Mode: ${env.IS_DEMO_MODE ? 'ENABLED (Offline Mock Data)' : 'DISABLED (Real Supabase)'}`);
    console.log(` Supabase Host: ${supabaseHost}`);
    console.log(` Health: http://localhost:${env.PORT}/api/health`);
    console.log(`===============================================`);
  });
}

export default app;
