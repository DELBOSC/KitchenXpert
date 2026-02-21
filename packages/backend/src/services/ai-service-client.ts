/**
 * AI Service Client
 *
 * HTTP bridge between Express backend and Python FastAPI AI service.
 * Handles communication with the AI modules running on port 5000.
 */

import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('ai-service-client');

const AI_BASE_URL = process.env['AI_MODULES_ENDPOINT'] || 'http://localhost:5000';
const DEFAULT_TIMEOUT = 30_000;
const LAYOUT_TIMEOUT = 60_000; // Layout optimization can take longer (genetic algorithm)
const MAX_RETRIES = 3;

export interface AiHealthResponse {
  status: string;
  service: string;
  version: string;
  services_available: Record<string, boolean>;
}

export interface AiServiceError {
  error: string;
  detail: string;
}

class AiServiceClient {
  private baseUrl: string;
  private healthy: boolean | null = null;

  constructor(baseUrl: string = AI_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an HTTP request to the AI service with retry and timeout
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    timeoutMs: number = DEFAULT_TIMEOUT,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          let detail = errorBody;
          try {
            const parsed = JSON.parse(errorBody);
            detail = parsed.detail || parsed.error || errorBody;
          } catch {
            // keep raw text
          }
          throw new Error(`AI service returned ${response.status}: ${detail}`);
        }

        return (await response.json()) as T;
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        const err = error instanceof Error ? error : new Error(String(error));

        if (err.name === 'AbortError') {
          lastError = new Error(`AI service timeout after ${timeoutMs}ms on ${path}`);
        } else {
          lastError = err;
        }

        if (attempt < MAX_RETRIES - 1) {
          const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
          logger.warn(`AI service request failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms`, {
            path,
            error: lastError.message,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('AI service request failed');
  }

  /**
   * Check if the AI service is healthy
   */
  async healthCheck(): Promise<AiHealthResponse> {
    const result = await this.request<AiHealthResponse>('GET', '/api/health');
    this.healthy = result.status === 'healthy';
    return result;
  }

  /**
   * Returns whether the AI service is available.
   * Performs a health check if status is unknown.
   */
  async isAvailable(): Promise<boolean> {
    if (this.healthy !== null) return this.healthy;
    try {
      await this.healthCheck();
      return this.healthy === true;
    } catch {
      this.healthy = false;
      return false;
    }
  }

  /**
   * Reset health status (force re-check on next call)
   */
  resetHealth(): void {
    this.healthy = null;
  }

  /**
   * POST /api/optimize-layout
   * Optimize kitchen layout using genetic algorithms
   */
  async optimizeLayout(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('POST', '/api/optimize-layout', request, LAYOUT_TIMEOUT);
  }

  /**
   * POST /api/recommend-style
   * Get ML-based style recommendations
   */
  async recommendStyle(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('POST', '/api/recommend-style', request);
  }

  /**
   * POST /api/optimize-budget
   * Optimize kitchen budget allocation
   */
  async optimizeBudget(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('POST', '/api/optimize-budget', request);
  }

  /**
   * POST /api/analyze-space
   * Perform 3D space analysis
   */
  async analyzeSpace(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('POST', '/api/analyze-space', request);
  }
}

// Singleton instance
export const aiServiceClient = new AiServiceClient();
export default aiServiceClient;
