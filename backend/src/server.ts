import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { initializeWebSocket } from './websocket';
import { calculateCarbonFootprint } from './calculator';
import { CarbonCalculationSchema, ProjectionRequestSchema, SessionSaveSchema } from './schema';
import { sharedProjector } from './carbonEngine';
import { stateStore } from './stateStore';
import { avatarRouter } from './avatarRoute';
import * as dotenv from 'dotenv';

dotenv.config();

export const app = express();
const port = process.env.PORT || 5000;

// Security configuration: Helmet for secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration (allow Next.js frontend to connect)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL || ''
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Express body parsers (sanitization & limits)
app.use(express.json({ limit: '10kb' })); // Mitigate DOS via large JSON loads
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/**
 * Lightweight CSRF protection middleware verifying Origin and Referer headers.
 * Protects state-changing HTTP POST endpoints from unauthorized cross-origin requests.
 */
function csrfProtection(req: Request, res: Response, next: express.NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const isTestOrDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  let isValidOrigin = false;
  if (origin) {
    if (allowedOrigins.includes(origin) || isTestOrDev) {
      isValidOrigin = true;
    }
  } else if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.includes(refererOrigin) || isTestOrDev) {
        isValidOrigin = true;
      }
    } catch {
      // Invalid URL parse
    }
  } else if (isTestOrDev) {
    isValidOrigin = true;
  }

  if (!isValidOrigin) {
    return res.status(403).json({
      error: 'CORS/CSRF check failed: Request origin is forbidden.',
      code: 'CSRF_FORBIDDEN'
    });
  }

  next();
}

app.use(csrfProtection);

// HTTP Rate Limiting
const httpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.', code: 'HTTP_RATE_LIMIT_EXCEEDED' }
});
app.use('/api/', httpLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// HTTP Fallback calculation endpoint
app.post('/api/calculate', (req: Request, res: Response) => {
  try {
    const parseResult = CarbonCalculationSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.flatten().fieldErrors
      });
    }

    const result = calculateCarbonFootprint(parseResult.data);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// ── Avatar generation route ─────────────────────────────────────────────────
app.use('/api/avatar', avatarRouter);

// ── NEW: Time-Travel Projection endpoint ──────────────────────────────────
app.post('/api/project', (req: Request, res: Response) => {
  try {
    const parseResult = ProjectionRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.flatten().fieldErrors,
      });
    }
    const result = sharedProjector.project(parseResult.data);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ error: 'Projection failed', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// ── NEW: Session state save ─────────────────────────────────────────────────
app.post('/api/state/save', async (req: Request, res: Response) => {
  try {
    const parseResult = SessionSaveSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.flatten().fieldErrors,
      });
    }
    const now = new Date().toISOString();
    await stateStore.save({
      sessionId: parseResult.data.sessionId,
      createdAt: now,
      updatedAt: now,
      inputs:    parseResult.data.inputs,
      totalKg:   parseResult.data.totalKg,
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'State save failed', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// ── NEW: Session state load ─────────────────────────────────────────────────
app.get('/api/state/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const doc = await stateStore.load(sessionId);
    if (!doc) {
      return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
    }
    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    if ((err as Error).message === 'Invalid sessionId format') {
      return res.status(400).json({ error: 'Invalid sessionId', code: 'BAD_REQUEST' });
    }
    return res.status(500).json({ error: 'State load failed', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// Global Error Handler
app.use((err: unknown, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Something went wrong', code: 'INTERNAL_SERVER_ERROR' });
});

// Create HTTP server & WebSocket server
const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Attach WebSocket server during HTTP upgrade request
httpServer.on('upgrade', (request, socket, head) => {
  // Check CORS / Origin header to mitigate Cross-Site WebSocket Hijacking (CSWSH)
  const origin = request.headers.origin;
  const isTestOrDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  
  if (origin && !allowedOrigins.includes(origin) && !isTestOrDev) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Initialize WebSocket event handling
initializeWebSocket(wss);

// Start server
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(port, () => {
    console.log(`[Carbon API] Server listening on port ${port}`);
    console.log(`[Carbon API] WebSocket server attached.`);
  });
}
