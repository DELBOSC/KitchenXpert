/**
 * Proxy Manager
 *
 * Manages proxy rotation for web scraping
 */

import { logger } from './logger.js';

export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
  country?: string;
  lastUsed?: Date;
  failCount: number;
  successCount: number;
  avgResponseTime?: number;
  isHealthy: boolean;
}

interface ProxyManagerOptions {
  /** Enable proxy rotation */
  enabled: boolean;
  /** Rotate proxy after each request */
  rotateOnEachRequest: boolean;
  /** Rotate proxy after N failures */
  rotateAfterFailures: number;
  /** Maximum failures before marking proxy as unhealthy */
  maxFailures: number;
  /** Health check interval (ms) */
  healthCheckInterval: number;
  /** Proxy list (comma-separated or array) */
  proxyList?: string | string[];
}

const DEFAULT_OPTIONS: ProxyManagerOptions = {
  enabled: false,
  rotateOnEachRequest: false,
  rotateAfterFailures: 3,
  maxFailures: 5,
  healthCheckInterval: 300000, // 5 minutes
};

export class ProxyManager {
  private options: ProxyManagerOptions;
  private proxies: ProxyConfig[] = [];
  private currentIndex = 0;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(options: Partial<ProxyManagerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (this.options.proxyList) {
      this.loadProxies(this.options.proxyList);
    }
  }

  /**
   * Load proxies from string or array
   */
  loadProxies(proxyList: string | string[]): void {
    const list = typeof proxyList === 'string' ? proxyList.split(',') : proxyList;

    this.proxies = list
      .map((proxy) => proxy.trim())
      .filter((proxy) => proxy.length > 0)
      .map((proxy) => this.parseProxy(proxy));

    logger.info(`Loaded ${this.proxies.length} proxies`);
  }

  /**
   * Parse a proxy string into ProxyConfig
   * Formats: host:port, protocol://host:port, protocol://user:pass@host:port
   */
  private parseProxy(proxyString: string): ProxyConfig {
    let protocol: ProxyConfig['protocol'] = 'http';
    let auth: { username?: string; password?: string } = {};
    let host: string;
    let port: number;

    // Check for protocol
    const protocolMatch = proxyString.match(/^(https?|socks[45]):\/\//);
    if (protocolMatch) {
      protocol = protocolMatch[1] as ProxyConfig['protocol'];
      proxyString = proxyString.substring(protocolMatch[0].length);
    }

    // Check for authentication
    const authMatch = proxyString.match(/^([^:]+):([^@]+)@/);
    if (authMatch) {
      auth = { username: authMatch[1], password: authMatch[2] };
      proxyString = proxyString.substring(authMatch[0].length);
    }

    // Parse host and port
    const [hostPart, portPart] = proxyString.split(':');
    host = hostPart || '';
    port = parseInt(portPart || '80', 10);

    return {
      host,
      port,
      protocol,
      ...auth,
      failCount: 0,
      successCount: 0,
      isHealthy: true,
    };
  }

  /**
   * Get the current proxy
   */
  getCurrentProxy(): ProxyConfig | null {
    if (!this.options.enabled || this.proxies.length === 0) {
      return null;
    }

    const healthyProxies = this.proxies.filter((p) => p.isHealthy);
    if (healthyProxies.length === 0) {
      logger.warn('No healthy proxies available, resetting all proxies');
      this.proxies.forEach((p) => {
        p.isHealthy = true;
        p.failCount = 0;
      });
      return this.proxies[0] || null;
    }

    return healthyProxies[this.currentIndex % healthyProxies.length] || null;
  }

  /**
   * Get proxy URL for Puppeteer/Playwright
   */
  getProxyUrl(): string | null {
    const proxy = this.getCurrentProxy();
    if (!proxy) return null;

    let url = `${proxy.protocol}://`;
    if (proxy.username && proxy.password) {
      url += `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`;
    }
    url += `${proxy.host}:${proxy.port}`;

    return url;
  }

  /**
   * Rotate to the next proxy
   */
  rotate(): ProxyConfig | null {
    if (this.proxies.length === 0) return null;

    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    const newProxy = this.getCurrentProxy();

    if (newProxy) {
      logger.debug(`Rotated to proxy: ${newProxy.host}:${newProxy.port}`);
    }

    return newProxy;
  }

  /**
   * Mark current proxy as successful
   */
  markSuccess(responseTime?: number): void {
    const proxy = this.getCurrentProxy();
    if (!proxy) return;

    proxy.successCount++;
    proxy.failCount = 0;
    proxy.lastUsed = new Date();

    if (responseTime !== undefined) {
      proxy.avgResponseTime = proxy.avgResponseTime
        ? (proxy.avgResponseTime + responseTime) / 2
        : responseTime;
    }

    if (this.options.rotateOnEachRequest) {
      this.rotate();
    }
  }

  /**
   * Mark current proxy as failed
   */
  markFailure(): void {
    const proxy = this.getCurrentProxy();
    if (!proxy) return;

    proxy.failCount++;
    proxy.lastUsed = new Date();

    if (proxy.failCount >= this.options.maxFailures) {
      proxy.isHealthy = false;
      logger.warn(`Proxy ${proxy.host}:${proxy.port} marked as unhealthy`);
    }

    if (proxy.failCount >= this.options.rotateAfterFailures) {
      this.rotate();
    }
  }

  /**
   * Get proxy statistics
   */
  getStats(): {
    total: number;
    healthy: number;
    unhealthy: number;
    current: ProxyConfig | null;
  } {
    return {
      total: this.proxies.length,
      healthy: this.proxies.filter((p) => p.isHealthy).length,
      unhealthy: this.proxies.filter((p) => !p.isHealthy).length,
      current: this.getCurrentProxy(),
    };
  }

  /**
   * Check if proxies are enabled and available
   */
  isEnabled(): boolean {
    return this.options.enabled && this.proxies.length > 0;
  }

  /**
   * Reset all proxy statistics
   */
  reset(): void {
    this.proxies.forEach((proxy) => {
      proxy.failCount = 0;
      proxy.successCount = 0;
      proxy.isHealthy = true;
      proxy.avgResponseTime = undefined;
    });
    this.currentIndex = 0;
  }

  /**
   * Stop health check timer
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}

// Singleton instance with environment-based configuration
export const proxyManager = new ProxyManager({
  enabled: process.env.PROXY_ENABLED === 'true',
  rotateOnEachRequest: process.env.PROXY_ROTATION_ENABLED === 'true',
  proxyList: process.env.PROXY_LIST || undefined,
});

export default proxyManager;
