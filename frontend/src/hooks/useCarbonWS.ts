import { useState, useEffect, useRef, useCallback } from 'react';

export interface CarbonInput {
  commuteMode: 'gas' | 'ev' | 'transit' | 'bike';
  dailyDistance: number;
  shortHaulFlights: number;
  longHaulFlights: number;
  dietaryProfile: 'vegan' | 'vegetarian' | 'flexitarian' | 'average' | 'heavy';
  housingType: 'apartment' | 'semi-detached' | 'detached';
  powerSource: 'grid' | 'solar';
}

export interface CalculationResult {
  total: number;
  breakdown: {
    transport: {
      total: number;
      commute: number;
      flights: number;
    };
    diet: {
      total: number;
    };
    energy: {
      total: number;
      electricity: number;
      heating: number;
    };
  };
  simulation: Array<{
    id: string;
    category: 'transport' | 'diet' | 'energy';
    title: string;
    description: string;
    savings: number;
  }>;
}

const DEFAULT_INPUTS: CarbonInput = {
  commuteMode: 'gas',
  dailyDistance: 25,
  shortHaulFlights: 2,
  longHaulFlights: 1,
  dietaryProfile: 'average',
  housingType: 'semi-detached',
  powerSource: 'grid',
};

const BACKEND_HTTP_URL = process.env.NEXT_PUBLIC_API_URL || '';
const BACKEND_WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';

/**
 * Custom React Hook that establishes a connection to the real-time calculation WebSocket server.
 * Offers connection status tracking, input debouncing (at 80ms to lock client slider rendering at 60FPS),
 * and transparent automated fallback to HTTP POST calculations if connection is lost.
 *
 * @returns An object containing the current user inputs, calculation results, connection state, error messages, and updater callback.
 */
export function useCarbonWS() {
  const [inputs, setInputs] = useState<CarbonInput>(DEFAULT_INPUTS);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'fallback'>('connecting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const isFallbackModeRef = useRef(false);

  // Fallback REST API trigger
  const fetchCalculationFallback = useCallback(async (payload: CarbonInput) => {
    try {
      const response = await fetch(`${BACKEND_HTTP_URL}/api/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Fallback computation failed');
      }
      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        setErrorMsg(null);
      } else {
        setErrorMsg(data.error || 'Validation failed');
      }
    } catch (err) {
      console.error('[CarbonWS Fallback Error]:', err);
      setErrorMsg('Failed to connect to backend server. Running in offline/disconnected mode.');
    }
  }, []);

  // Securely transmit input updates
  const sendInputsUpdate = useCallback((updatedInputs: CarbonInput) => {
    if (isFallbackModeRef.current || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      // Fallback directly to HTTP
      fetchCalculationFallback(updatedInputs);
      return;
    }

    try {
      socketRef.current.send(JSON.stringify(updatedInputs));
    } catch (err) {
      console.warn('[CarbonWS Send Failed] Falling back to HTTP:', err);
      fetchCalculationFallback(updatedInputs);
    }
  }, [fetchCalculationFallback]);

  // Debounced input change triggers (keeps interface performing at 60FPS on sliders)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const updateInputs = useCallback((updater: Partial<CarbonInput> | ((prev: CarbonInput) => CarbonInput)) => {
    setInputs((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        sendInputsUpdate(next);
      }, 80); // 80ms debounce satisfies smooth drag experience while limiting socket traffic

      return next;
    });
  }, [sendInputsUpdate]);

  // WebSocket lifecycle management
  useEffect(() => {
    let active = true;

    function connect() {
      if (isFallbackModeRef.current) return;

      setConnectionStatus('connecting');
      const ws = new WebSocket(BACKEND_WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        setErrorMsg(null);
        // Sync initial state on connect
        ws.send(JSON.stringify(inputs));
      };

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.success && payload.data) {
            setResult(payload.data);
            setErrorMsg(null);
          } else if (payload.error) {
            setErrorMsg(payload.error);
          }
        } catch (e) {
          console.error('[WS Parse error]:', e);
        }
      };

      ws.onerror = () => {
        if (!active) return;
        console.warn('[CarbonWS Socket Error]. Retrying...');
      };

      ws.onclose = () => {
        if (!active) return;
        socketRef.current = null;
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          setTimeout(connect, 3000);
        } else {
          console.warn('[CarbonWS Max Reconnect reached] Activating HTTP Fallback mode.');
          isFallbackModeRef.current = true;
          setConnectionStatus('fallback');
          // Fetch once to populate initial data in HTTP mode
          fetchCalculationFallback(inputs);
        }
      };
    }

    connect();

    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchCalculationFallback]);

  return {
    inputs,
    result,
    connectionStatus,
    errorMsg,
    updateInputs,
  };
}
