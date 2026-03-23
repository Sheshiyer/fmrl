import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SelemeneClient, SelemeneApiError } from '../../services/SelemeneClient';

/**
 * SelemeneClient Test Suite
 *
 * Covers: constructor, token management, headers, all API methods,
 * error handling, and SelemeneApiError helper getters.
 */

// ---------- Mocks ----------

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---------- Helpers ----------

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as Response;
}

function mockResponseJsonFail(status: number): Response {
  return {
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.reject(new Error('not json')),
  } as Response;
}

// ---------- Tests ----------

describe('SelemeneClient', () => {
  let client: SelemeneClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new SelemeneClient('https://api.example.com');
  });

  // --- Constructor ---

  describe('constructor', () => {
    it('sets baseUrl and strips trailing slash', () => {
      const c = new SelemeneClient('https://api.example.com/');
      // Verify via a fetch call that the URL has no trailing slash
      mockFetch.mockResolvedValueOnce(mockResponse([]));
      c.listEngines();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/engines',
        expect.any(Object),
      );
    });

    it('stores optional token', () => {
      const c = new SelemeneClient('https://api.example.com', 'my-token');
      expect(c.getToken()).toBe('my-token');
    });

    it('defaults token to null when not provided', () => {
      expect(client.getToken()).toBeNull();
    });
  });

  // --- Token Management ---

  describe('setToken / getToken', () => {
    it('sets and retrieves a token', () => {
      client.setToken('abc123');
      expect(client.getToken()).toBe('abc123');
    });

    it('clears token when set to null', () => {
      client.setToken('abc123');
      client.setToken(null);
      expect(client.getToken()).toBeNull();
    });
  });

  // --- Headers ---

  describe('headers', () => {
    it('includes Authorization when token is set', async () => {
      client.setToken('bearer-tok');
      mockFetch.mockResolvedValueOnce(mockResponse([]));
      await client.listEngines();

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['Authorization']).toBe('Bearer bearer-tok');
      expect(callHeaders['Content-Type']).toBe('application/json');
    });

    it('omits Authorization when token is null', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]));
      await client.listEngines();

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['Authorization']).toBeUndefined();
      expect(callHeaders['Content-Type']).toBe('application/json');
    });
  });

  // --- Auth: login ---

  describe('login', () => {
    it('POSTs to /api/v1/auth/login and sets token from response', async () => {
      const authResp = { token: 'jwt-xyz', user_id: '1', email: 'a@b.com', tier: 'free' };
      mockFetch.mockResolvedValueOnce(mockResponse(authResp));

      const result = await client.login('a@b.com', 'pass123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com', password: 'pass123' }),
        }),
      );
      expect(result.token).toBe('jwt-xyz');
      expect(client.getToken()).toBe('jwt-xyz');
    });
  });

  // --- Engines ---

  describe('listEngines', () => {
    it('GETs /api/v1/engines', async () => {
      const engines = [{ id: 'panchanga', name: 'Panchanga' }];
      mockFetch.mockResolvedValueOnce(mockResponse(engines));

      const result = await client.listEngines();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/engines',
        expect.any(Object),
      );
      expect(result).toEqual(engines);
    });
  });

  describe('calculate', () => {
    it('POSTs to /api/v1/engines/{id}/calculate with body', async () => {
      const input = { datetime: '2026-03-19T00:00:00Z', location: { lat: 0, lng: 0 } };
      const output = { engine_id: 'panchanga', result: {} };
      mockFetch.mockResolvedValueOnce(mockResponse(output));

      const result = await client.calculate('panchanga', input as any);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/engines/panchanga/calculate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(input),
        }),
      );
      expect(result).toEqual(output);
    });

    it('encodes engine ID with special characters', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}));
      await client.calculate('engine/special', {} as any);

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.example.com/api/v1/engines/engine%2Fspecial/calculate',
      );
    });
  });

  describe('validate', () => {
    it('POSTs to /api/v1/engines/{id}/validate with body', async () => {
      const output = { engine_id: 'biorhythm', result: {} };
      const validation = { valid: true, errors: [] };
      mockFetch.mockResolvedValueOnce(mockResponse(validation));

      const result = await client.validate('biorhythm', output as any);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/engines/biorhythm/validate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(output),
        }),
      );
      expect(result).toEqual(validation);
    });
  });

  // --- Workflows ---

  describe('listWorkflows', () => {
    it('GETs /api/v1/workflows', async () => {
      const workflows = [{ id: 'daily', name: 'Daily Synthesis' }];
      mockFetch.mockResolvedValueOnce(mockResponse(workflows));

      const result = await client.listWorkflows();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/workflows',
        expect.any(Object),
      );
      expect(result).toEqual(workflows);
    });
  });

  describe('executeWorkflow', () => {
    it('POSTs to /api/v1/workflows/{id}/execute', async () => {
      const input = { datetime: '2026-03-19T00:00:00Z' };
      const workflowResult = { workflow_id: 'daily', results: [] };
      mockFetch.mockResolvedValueOnce(mockResponse(workflowResult));

      const result = await client.executeWorkflow('daily', input as any);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/workflows/daily/execute',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(input),
        }),
      );
      expect(result).toEqual(workflowResult);
    });
  });

  // --- Readings ---

  describe('listReadings', () => {
    it('GETs /api/v1/readings with default limit=20', async () => {
      const readings = [{ id: 'r1', created_at: '2026-03-19' }];
      mockFetch.mockResolvedValueOnce(mockResponse(readings));

      const result = await client.listReadings();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/readings?limit=20',
        expect.any(Object),
      );
      expect(result).toEqual(readings);
    });

    it('GETs /api/v1/readings with custom limit', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]));
      await client.listReadings(50);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/readings?limit=50',
        expect.any(Object),
      );
    });
  });

  describe('getReading', () => {
    it('GETs /api/v1/readings/{id}', async () => {
      const reading = { id: 'r42', data: {} };
      mockFetch.mockResolvedValueOnce(mockResponse(reading));

      const result = await client.getReading('r42');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/readings/r42',
        expect.any(Object),
      );
      expect(result).toEqual(reading);
    });
  });

  // --- User ---

  describe('getMe', () => {
    it('GETs /api/v1/users/me', async () => {
      const profile = { id: 'u1', email: 'user@test.com', name: 'Test User' };
      mockFetch.mockResolvedValueOnce(mockResponse(profile));

      const result = await client.getMe();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/users/me',
        expect.any(Object),
      );
      expect(result).toEqual(profile);
    });
  });

  // --- Health ---

  describe('health', () => {
    it('returns true on successful response', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ status: 'ok' }));

      const result = await client.health();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/health',
        expect.any(Object),
      );
    });

    it('returns false on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'));

      const result = await client.health();

      expect(result).toBe(false);
    });

    it('returns false on non-2xx response', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ error: 'down', error_code: 'UNHEALTHY' }, 503),
      );

      const result = await client.health();

      expect(result).toBe(false);
    });
  });

  // --- Error Handling ---

  describe('error handling', () => {
    it('throws SelemeneApiError with errorCode and statusCode on non-2xx', async () => {
      const errorBody = { error: 'Not Found', error_code: 'ENGINE_NOT_FOUND' };
      mockFetch.mockResolvedValueOnce(mockResponse(errorBody, 404));

      try {
        await client.listEngines();
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(SelemeneApiError);
        const apiErr = err as SelemeneApiError;
        expect(apiErr.message).toBe('Not Found');
        expect(apiErr.errorCode).toBe('ENGINE_NOT_FOUND');
        expect(apiErr.statusCode).toBe(404);
        expect(apiErr.name).toBe('SelemeneApiError');
      }
    });

    it('constructs fallback error when response body is not JSON', async () => {
      mockFetch.mockResolvedValueOnce(mockResponseJsonFail(502));

      try {
        await client.listEngines();
        expect.unreachable('should have thrown');
      } catch (err) {
        const apiErr = err as SelemeneApiError;
        expect(apiErr.errorCode).toBe('HTTP_ERROR');
        expect(apiErr.statusCode).toBe(502);
        expect(apiErr.message).toBe('HTTP 502: Error');
      }
    });

    it('preserves details from error body', async () => {
      const errorBody = {
        error: 'Validation failed',
        error_code: 'VALIDATION_ERROR',
        details: { field: 'datetime', reason: 'required' },
      };
      mockFetch.mockResolvedValueOnce(mockResponse(errorBody, 422));

      try {
        await client.calculate('panchanga', {} as any);
        expect.unreachable('should have thrown');
      } catch (err) {
        const apiErr = err as SelemeneApiError;
        expect(apiErr.details).toEqual({ field: 'datetime', reason: 'required' });
      }
    });
  });

  // --- SelemeneApiError Helpers ---

  describe('SelemeneApiError helpers', () => {
    it('isPhaseAccessDenied returns true for PHASE_ACCESS_DENIED', () => {
      const err = new SelemeneApiError(
        { error: 'Phase access denied', error_code: 'PHASE_ACCESS_DENIED' },
        403,
      );
      expect(err.isPhaseAccessDenied).toBe(true);
      expect(err.isAuthRequired).toBe(false);
      expect(err.isRateLimited).toBe(false);
    });

    it('isAuthRequired returns true for AUTH_REQUIRED', () => {
      const err = new SelemeneApiError(
        { error: 'Auth required', error_code: 'AUTH_REQUIRED' },
        401,
      );
      expect(err.isAuthRequired).toBe(true);
      expect(err.isPhaseAccessDenied).toBe(false);
      expect(err.isRateLimited).toBe(false);
    });

    it('isRateLimited returns true for RATE_LIMITED', () => {
      const err = new SelemeneApiError(
        { error: 'Too many requests', error_code: 'RATE_LIMITED' },
        429,
      );
      expect(err.isRateLimited).toBe(true);
      expect(err.isPhaseAccessDenied).toBe(false);
      expect(err.isAuthRequired).toBe(false);
    });

    it('all helpers return false for unrelated error codes', () => {
      const err = new SelemeneApiError(
        { error: 'Server error', error_code: 'INTERNAL_ERROR' },
        500,
      );
      expect(err.isPhaseAccessDenied).toBe(false);
      expect(err.isAuthRequired).toBe(false);
      expect(err.isRateLimited).toBe(false);
    });
  });
});
