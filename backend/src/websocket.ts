import { IncomingMessage } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { calculateCarbonFootprint } from './calculator';
import { CarbonCalculationSchema } from './schema';

// Rate limiting in-memory map for WS clients by IP
const wsRateLimits = new Map<string, { count: number; resetTime: number }>();
const WS_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const WS_MAX_REQUESTS = 120; // Allow max 120 messages per minute (approx 2 per second, plenty for slider drags)

/**
 * Assesses whether a client request exceeds the rate limiting limits based on IP.
 *
 * @param ip - The remote client IP address.
 * @returns True if the client is within limits, false if they exceed.
 */
function checkWsRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = wsRateLimits.get(ip);

  if (!limit) {
    wsRateLimits.set(ip, { count: 1, resetTime: now + WS_LIMIT_WINDOW_MS });
    return true;
  }

  if (now > limit.resetTime) {
    wsRateLimits.set(ip, { count: 1, resetTime: now + WS_LIMIT_WINDOW_MS });
    return true;
  }

  if (limit.count >= WS_MAX_REQUESTS) {
    return false;
  }

  limit.count += 1;
  return true;
}

/**
 * Initializes Event Listeners for the WebSocket Server, attaching security
 * verification, heartbeats, and real-time calculations.
 *
 * @param wss - The WebSocketServer instance to initialize.
 */
export function initializeWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    
    // Heartbeat ping-pong to clean up stale connections
    let isAlive = true;
    ws.on('pong', () => {
      isAlive = true;
    });

    const pingInterval = setInterval(() => {
      if (!isAlive) {
        clearInterval(pingInterval);
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, 30000);

    ws.on('message', (message: string) => {
      try {
        // Security checks: Check payload size limit (max 10KB)
        if (message.length > 10 * 1024) {
          ws.send(JSON.stringify({ error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' }));
          return;
        }

        // Rate limiting check
        if (!checkWsRateLimit(clientIp)) {
          ws.send(JSON.stringify({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMIT_EXCEEDED' }));
          return;
        }

        // Parse JSON input
        const rawData = JSON.parse(message);
        
        // Validate with Zod schema
        const parseResult = CarbonCalculationSchema.safeParse(rawData);
        
        if (!parseResult.success) {
          ws.send(JSON.stringify({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: parseResult.error.flatten().fieldErrors
          }));
          return;
        }

        // Perform calculation
        const result = calculateCarbonFootprint(parseResult.data);
        
        // Return result
        ws.send(JSON.stringify({
          success: true,
          data: result
        }));
      } catch (err) {
        ws.send(JSON.stringify({
          error: 'Invalid message format',
          code: 'BAD_REQUEST'
        }));
      }
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
    });

    // Send connection established confirmation
    ws.send(JSON.stringify({ status: 'connected', message: 'Carbon Real-Time API active.' }));
  });
}
