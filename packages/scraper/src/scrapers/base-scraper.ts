/**
 * Base Scraper v2.0
 *
 * Enhanced abstract class with advanced anti-detection, stealth mode,
 * intelligent crawling, and robust error handling.
 */

import puppeteer, { Browser, Page, PuppeteerLaunchOptions, HTTPRequest } from 'puppeteer';
import * as cheerio from 'cheerio';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import robotsParser from 'robots-parser';
import UserAgent from 'user-agents';
import crypto from 'crypto';

import type { BrandScrapingConfig } from '../config/brands.config.js';
import type { ScrapeSummary, ScrapeError, ScrapeProgress } from '../models/scrape-result.js';
import type { CreateCabinetInput } from '../models/cabinet.js';
import type { CreateWorktopInput } from '../models/worktop.js';
import type { CreateFacadeInput } from '../models/facade.js';
import type { CreateHandleInput } from '../models/handle.js';
import type { CreateApplianceInput } from '../models/appliance.js';
import type { CreateAccessoryInput } from '../models/accessory.js';
import type { CreateCollectionInput } from '../models/collection.js';

import { logger, createBrandLogger } from '../utils/logger.js';
import { RateLimiter, rateLimiter } from '../utils/rate-limiter.js';
import { RetryHandler, retryHandler } from '../utils/retry-handler.js';
import { ProxyManager, proxyManager } from '../utils/proxy-manager.js';
import { takeScreenshot, takeErrorScreenshot, savePageHtml } from '../utils/screenshot.js';
import { createEmptySummary } from '../models/scrape-result.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export interface ScraperOptions {
  /** Use headless browser */
  headless: boolean;
  /** Request timeout (ms) */
  timeout: number;
  /** Page load timeout (ms) */
  pageLoadTimeout: number;
  /** Custom user agent */
  userAgent?: string;
  /** Use random user agents */
  randomUserAgent: boolean;
  /** Enable screenshots on error */
  screenshotsOnError: boolean;
  /** Test mode (scrape only first page) */
  testMode: boolean;
  /** Custom rate limiter */
  rateLimiter?: RateLimiter;
  /** Custom retry handler */
  retryHandler?: RetryHandler;
  /** Custom proxy manager */
  proxyManager?: ProxyManager;
  /** Viewport width */
  viewportWidth: number;
  /** Viewport height */
  viewportHeight: number;
  /** Accept cookies automatically */
  acceptCookies: boolean;
  /** Download images */
  downloadImages: boolean;
  /** Images directory */
  imagesDir: string;
  /** Enable stealth mode */
  stealthMode: boolean;
  /** Block trackers and ads */
  blockTrackers: boolean;
  /** Simulate human behavior */
  humanBehavior: boolean;
  /** Maximum pages to scrape (0 = unlimited) */
  maxPages: number;
  /** Maximum products to scrape (0 = unlimited) */
  maxProducts: number;
  /** Enable caching */
  enableCache: boolean;
  /** Cache TTL in seconds */
  cacheTTL: number;
  /** Save raw HTML for debugging */
  saveRawHtml: boolean;
  /** Emulate device */
  emulateDevice?: 'desktop' | 'mobile' | 'tablet';
  /** Language preference */
  language: string;
  /** Geographic location for geolocation */
  geolocation?: { latitude: number; longitude: number };
}

const DEFAULT_OPTIONS: ScraperOptions = {
  headless: true,
  timeout: 30000,
  pageLoadTimeout: 60000,
  randomUserAgent: true,
  screenshotsOnError: true,
  testMode: false,
  viewportWidth: 1920,
  viewportHeight: 1080,
  acceptCookies: true,
  downloadImages: true,
  imagesDir: './data/images',
  stealthMode: true,
  blockTrackers: true,
  humanBehavior: true,
  maxPages: 0,
  maxProducts: 0,
  enableCache: true,
  cacheTTL: 3600,
  saveRawHtml: false,
  emulateDevice: 'desktop',
  language: 'fr-FR',
};

export type ScrapedProduct =
  | { type: 'cabinet'; data: CreateCabinetInput }
  | { type: 'worktop'; data: CreateWorktopInput }
  | { type: 'facade'; data: CreateFacadeInput }
  | { type: 'handle'; data: CreateHandleInput }
  | { type: 'appliance'; data: CreateApplianceInput }
  | { type: 'accessory'; data: CreateAccessoryInput }
  | { type: 'collection'; data: CreateCollectionInput };

export interface PageCache {
  url: string;
  html: string;
  hash: string;
  timestamp: number;
}

export interface CrawlState {
  visitedUrls: Set<string>;
  pendingUrls: string[];
  failedUrls: Map<string, number>;
  productUrls: Set<string>;
  collectionUrls: Set<string>;
}

// Blocked domains for trackers/ads
const BLOCKED_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.com',
  'facebook.net',
  'doubleclick.net',
  'googlesyndication.com',
  'adservice.google.com',
  'analytics.',
  'tracking.',
  'pixel.',
  'ads.',
  'criteo.',
  'hotjar.',
  'mouseflow.',
  'clarity.ms',
  'newrelic.',
  'sentry.',
];

// ═══════════════════════════════════════════════════════════════════════════
// Base Scraper Class
// ═══════════════════════════════════════════════════════════════════════════

export abstract class BaseScraper {
  protected config: BrandScrapingConfig;
  protected options: ScraperOptions;
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected axiosInstance: AxiosInstance;
  protected logger: ReturnType<typeof createBrandLogger>;
  protected rateLimiter: RateLimiter;
  protected retryHandler: RetryHandler;
  protected proxyManager: ProxyManager;
  protected summary: ScrapeSummary;
  protected robotsTxt: ReturnType<typeof robotsParser> | null = null;
  protected userAgentGenerator: UserAgent;
  protected isRunning = false;
  protected shouldStop = false;
  protected crawlState: CrawlState;
  protected pageCache: Map<string, PageCache> = new Map();
  protected currentUserAgent: string = '';
  protected sessionFingerprint: string = '';

  // Event callbacks
  protected onProductCallback?: (product: ScrapedProduct) => void | Promise<void>;
  protected onProgressCallback?: (progress: ScrapeProgress) => void;
  protected onErrorCallback?: (error: ScrapeError) => void;

  constructor(config: BrandScrapingConfig, options: Partial<ScraperOptions> = {}) {
    this.config = config;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.logger = createBrandLogger(config.slug);
    this.rateLimiter = options.rateLimiter || rateLimiter;
    this.retryHandler = options.retryHandler || retryHandler;
    this.proxyManager = options.proxyManager || proxyManager;
    this.summary = createEmptySummary(config.id, config.name);
    this.userAgentGenerator = new UserAgent({
      deviceCategory: this.options.emulateDevice || 'desktop',
    });
    this.sessionFingerprint = this.generateFingerprint();

    // Initialize crawl state
    this.crawlState = {
      visitedUrls: new Set(),
      pendingUrls: [],
      failedUrls: new Map(),
      productUrls: new Set(),
      collectionUrls: new Set(),
    };

    // Create axios instance with interceptors
    this.axiosInstance = this.createAxiosInstance();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Abstract methods to implement in brand-specific scrapers
  // ═══════════════════════════════════════════════════════════════════════════

  protected abstract getCollectionUrls(): Promise<string[]>;
  protected abstract getProductUrls(collectionUrl: string): Promise<string[]>;
  protected abstract scrapeProduct(url: string): Promise<ScrapedProduct | null>;
  protected abstract scrapeCollection(url: string): Promise<CreateCollectionInput | null>;

  // Optional methods that can be overridden
  protected async beforeScrape(): Promise<void> {}
  protected async afterScrape(): Promise<void> {}
  protected async onPageLoad(url: string): Promise<void> {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Axios Configuration
  // ═══════════════════════════════════════════════════════════════════════════

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      timeout: this.options.timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });

    // Request interceptor
    instance.interceptors.request.use((config) => {
      config.headers.set(
        'Accept',
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      );
      config.headers.set('Accept-Language', `${this.options.language},en-US;q=0.9,en;q=0.8`);
      config.headers.set('Accept-Encoding', 'gzip, deflate, br');
      config.headers.set('Connection', 'keep-alive');
      config.headers.set('Upgrade-Insecure-Requests', '1');
      config.headers.set('Sec-Fetch-Dest', 'document');
      config.headers.set('Sec-Fetch-Mode', 'navigate');
      config.headers.set('Sec-Fetch-Site', 'none');
      config.headers.set('Sec-Fetch-User', '?1');
      config.headers.set('Cache-Control', 'max-age=0');
      config.headers.set(
        'User-Agent',
        this.currentUserAgent || this.userAgentGenerator.random().toString()
      );
      return config;
    });

    // Response interceptor for error handling
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.debug('Axios error', { error: error.message, url: error.config?.url });
        throw error;
      }
    );

    return instance;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Browser Management with Stealth
  // ═══════════════════════════════════════════════════════════════════════════

  protected async launchBrowser(): Promise<Browser> {
    // Generate new user agent for this session
    this.currentUserAgent = this.options.randomUserAgent
      ? this.userAgentGenerator.random().toString()
      : this.options.userAgent || this.userAgentGenerator.random().toString();

    const launchOptions: PuppeteerLaunchOptions = {
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-position=0,0',
        `--window-size=${this.options.viewportWidth},${this.options.viewportHeight}`,
        `--lang=${this.options.language}`,
      ],
      defaultViewport: null,
      ignoreDefaultArgs: ['--enable-automation'],
    };

    // Add proxy if enabled
    if (this.proxyManager.isEnabled()) {
      const proxyUrl = this.proxyManager.getProxyUrl();
      if (proxyUrl) {
        try {
          const parsed = new URL(proxyUrl);
          if (['http:', 'https:', 'socks5:'].includes(parsed.protocol)) {
            launchOptions.args?.push(`--proxy-server=${proxyUrl}`);
            this.logger.debug('Using proxy', { proxy: parsed.host });
          } else {
            this.logger.warn('Invalid proxy protocol, skipping', { protocol: parsed.protocol });
          }
        } catch {
          this.logger.warn('Invalid proxy URL, skipping');
        }
      }
    }

    const BROWSER_LAUNCH_TIMEOUT = 30000;
    this.browser = await Promise.race([
      puppeteer.launch(launchOptions),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Browser launch timed out after ${BROWSER_LAUNCH_TIMEOUT}ms`)),
          BROWSER_LAUNCH_TIMEOUT
        )
      ),
    ]);
    return this.browser;
  }

  protected async createPage(): Promise<Page> {
    if (!this.browser) {
      await this.launchBrowser();
    }

    this.page = await this.browser!.newPage();

    // Apply stealth techniques
    if (this.options.stealthMode) {
      await this.applyStealthMode();
    }

    // Set viewport
    await this.page.setViewport({
      width: this.options.viewportWidth,
      height: this.options.viewportHeight,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false,
    });

    // Set user agent
    await this.page.setUserAgent(this.currentUserAgent);

    // Set extra headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': `${this.options.language},en-US;q=0.9,en;q=0.8`,
      'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    });

    // Set geolocation if provided
    if (this.options.geolocation) {
      await this.page.setGeolocation(this.options.geolocation);
    }

    // Request interception
    await this.page.setRequestInterception(true);
    this.page.on('request', (request: HTTPRequest) => this.handleRequest(request));

    // Handle dialogs
    this.page.on('dialog', async (dialog: import('puppeteer').Dialog) => {
      await dialog.accept();
    });

    // Log console messages in debug mode
    this.page.on('console', (msg: import('puppeteer').ConsoleMessage) => {
      if (msg.type() === 'error') {
        this.logger.debug('Browser console error', { text: msg.text() });
      }
    });

    return this.page;
  }

  /**
   * Apply stealth mode to avoid bot detection
   */
  private async applyStealthMode(): Promise<void> {
    if (!this.page) return;

    // Override navigator.webdriver
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override navigator.plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ],
      });

      // Override navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['fr-FR', 'fr', 'en-US', 'en'],
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
      window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : originalQuery(parameters);

      // Add chrome object
      // @ts-ignore
      window.chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
        app: {},
      };

      // Override iframe contentWindow
      const originalAttachShadow = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (init: ShadowRootInit) {
        if (init.mode === 'closed') {
          init = { ...init, mode: 'open' };
        }
        return originalAttachShadow.call(this, init);
      };
    });

    // Add WebGL fingerprint randomization
    await this.page.evaluateOnNewDocument(() => {
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
      };
    });
  }

  /**
   * Handle request interception
   */
  private handleRequest(request: HTTPRequest): void {
    const url = request.url();
    const resourceType = request.resourceType();

    // Block trackers and ads
    if (this.options.blockTrackers) {
      if (BLOCKED_DOMAINS.some((domain) => url.includes(domain))) {
        request.abort();
        return;
      }
    }

    // Block unnecessary resources
    const blockedTypes = ['font', 'media'];
    if (!this.options.downloadImages) {
      blockedTypes.push('image');
    }

    if (blockedTypes.includes(resourceType)) {
      request.abort();
      return;
    }

    // Block specific file types
    if (url.match(/\.(woff2?|ttf|otf|eot|mp4|webm|mp3|wav)(\?.*)?$/i)) {
      request.abort();
      return;
    }

    request.continue();
  }

  protected async closeBrowser(): Promise<void> {
    if (this.page) {
      // Remove all event listeners to prevent memory leaks
      this.page.removeAllListeners();
      // Disable request interception before closing
      await this.page.setRequestInterception(false).catch(() => {});
      await this.page.close().catch(() => {});
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Human-like Behavior Simulation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Simulate human-like mouse movement
   */
  protected async humanMouseMove(): Promise<void> {
    if (!this.page || !this.options.humanBehavior) return;

    const { width, height } = (await this.page.viewport()) || { width: 1920, height: 1080 };

    // Random movements
    const movements = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < movements; i++) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      await this.page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
      await this.randomDelay(50, 200);
    }
  }

  /**
   * Simulate human-like scrolling
   */
  protected async humanScroll(): Promise<void> {
    if (!this.page || !this.options.humanBehavior) return;

    const scrolls = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < scrolls; i++) {
      const distance = Math.floor(Math.random() * 500) + 100;
      await this.page.evaluate((dist: number) => {
        window.scrollBy({ top: dist, behavior: 'smooth' });
      }, distance);
      await this.randomDelay(500, 1500);
    }
  }

  /**
   * Random delay to simulate human timing
   */
  protected async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Wait with human-like variance
   */
  protected async humanWait(baseMs: number): Promise<void> {
    const variance = baseMs * 0.3;
    const delay = baseMs + (Math.random() - 0.5) * variance;
    await new Promise((resolve) => setTimeout(resolve, Math.max(100, delay)));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Navigation with Enhanced Features
  // ═══════════════════════════════════════════════════════════════════════════

  protected async navigateTo(
    url: string,
    options?: {
      waitFor?: string;
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
      skipCache?: boolean;
    }
  ): Promise<void> {
    if (!this.page) {
      await this.createPage();
    }

    // Check cache
    if (this.options.enableCache && !options?.skipCache) {
      const cached = this.pageCache.get(url);
      if (cached && Date.now() - cached.timestamp < this.options.cacheTTL * 1000) {
        this.logger.debug('Using cached page', { url });
        return;
      }
    }

    try {
      await this.rateLimiter.throttle(url, async () => {
        await this.retryHandler.execute(async () => {
          // Human-like behavior before navigation
          if (this.options.humanBehavior && this.crawlState.visitedUrls.size > 0) {
            await this.humanMouseMove();
            await this.randomDelay(500, 1500);
          }

          await this.page!.goto(url, {
            waitUntil: options?.waitUntil || 'networkidle2',
            timeout: this.options.pageLoadTimeout,
          });

          if (options?.waitFor) {
            await this.page!.waitForSelector(options.waitFor, {
              timeout: this.options.timeout,
            });
          }

          // Human-like behavior after navigation
          if (this.options.humanBehavior) {
            await this.humanScroll();
          }

          // Call onPageLoad hook
          await this.onPageLoad(url);
        }, url);
      });

      // Mark URL as visited
      this.crawlState.visitedUrls.add(url);

      // Cache the page
      if (this.options.enableCache) {
        const html = await this.getPageContent();
        this.pageCache.set(url, {
          url,
          html,
          hash: this.hashContent(html),
          timestamp: Date.now(),
        });
      }

      this.proxyManager.markSuccess();
    } catch (error) {
      this.logger.error('Navigation failed', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      // Re-throw so callers can handle the error (browser cleanup is done in run() finally block)
      throw error;
    }
  }

  /**
   * Get page HTML content
   */
  protected async getPageContent(): Promise<string> {
    if (!this.page) {
      throw new Error('No page available');
    }
    return this.page.content();
  }

  /**
   * Parse HTML with Cheerio
   */
  protected parseHtml(html: string): cheerio.CheerioAPI {
    return cheerio.load(html);
  }

  /**
   * Fetch URL with axios (for API/JSON requests)
   */
  protected async fetchUrl(url: string, config?: AxiosRequestConfig): Promise<string> {
    return this.rateLimiter.throttle(url, async () => {
      const response = await this.retryHandler.execute(
        async () => this.axiosInstance.get<string>(url, config),
        url
      );
      return response.data;
    });
  }

  /**
   * Fetch JSON from URL
   */
  protected async fetchJson<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.rateLimiter.throttle(url, async () => {
      const response = await this.retryHandler.execute(
        async () =>
          this.axiosInstance.get<T>(url, {
            ...config,
            headers: {
              ...config?.headers,
              Accept: 'application/json',
            },
          }),
        url
      );
      return response.data;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cookie & Consent Handling
  // ═══════════════════════════════════════════════════════════════════════════

  protected async acceptCookies(): Promise<void> {
    if (!this.page || !this.options.acceptCookies) return;

    // Wait a bit for cookie banners to appear
    await this.randomDelay(1000, 2000);

    const cookieSelectors = [
      // Generic
      '[id*="cookie"] button[id*="accept"]',
      '[id*="cookie"] button[class*="accept"]',
      '[class*="cookie"] button[class*="accept"]',
      'button[id*="accept-cookie"]',
      'button[class*="accept-cookie"]',
      '[data-testid*="cookie-accept"]',
      '[data-testid*="accept-cookies"]',
      '[aria-label*="Accept"]',
      '[aria-label*="Accepter"]',

      // Popular services
      '#onetrust-accept-btn-handler',
      '#didomi-notice-agree-button',
      '#tarteaucitronPersonalize2',
      '#axeptio_btn_acceptAll',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
      '.cc-btn.cc-dismiss',
      '.cc-allow',
      '#consent-accept',
      '.consent-accept',
      '[data-consent="accept"]',

      // French specific
      'button:has-text("Accepter")',
      'button:has-text("Tout accepter")',
      'button:has-text("J\'accepte")',
      'button:has-text("Accepter et fermer")',
      'button:has-text("Continuer sans accepter")',
      'a:has-text("Accepter")',

      // GDPR banners
      '.gdpr-accept',
      '#gdpr-accept',
      '[data-gdpr="accept"]',
      '.privacy-accept',
    ];

    for (const selector of cookieSelectors) {
      try {
        // Try XPath for :has-text selectors
        if (selector.includes(':has-text')) {
          const text = selector.match(/:has-text\("(.+?)"\)/)?.[1];
          if (text) {
            const safeText = text.replace(/['"\\]/g, '');
            const element = await this.page.$x(`//button[contains(text(), '${safeText}')]`);
            if (element.length > 0) {
              await (element[0] as any).click();
              this.logger.debug('Accepted cookies with XPath', { text });
              await this.randomDelay(500, 1000);
              return;
            }
          }
          continue;
        }

        const button = await this.page.$(selector);
        if (button) {
          const isVisible = await button.isIntersectingViewport();
          if (isVisible) {
            await button.click();
            this.logger.debug('Accepted cookies', { selector });
            await this.randomDelay(500, 1000);
            return;
          }
        }
      } catch {
        // Continue to next selector
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Robots.txt
  // ═══════════════════════════════════════════════════════════════════════════

  protected async checkRobotsTxt(url: string): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', this.config.website).toString();

      if (!this.robotsTxt) {
        try {
          const robotsContent = await this.fetchUrl(robotsUrl);
          this.robotsTxt = robotsParser(robotsUrl, robotsContent);
        } catch {
          return true; // If can't fetch, assume allowed
        }
      }

      return this.robotsTxt.isAllowed(url, this.currentUserAgent) ?? true;
    } catch {
      return true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Error Handling
  // ═══════════════════════════════════════════════════════════════════════════

  protected async handleError(error: Error, url?: string): Promise<void> {
    this.summary.stats.errors++;

    const scrapeError: ScrapeError = {
      url,
      message: error.message,
      code: (error as NodeJS.ErrnoException).code,
      stack: error.stack,
      timestamp: new Date(),
      retryCount: this.crawlState.failedUrls.get(url || '') || 0,
    };

    this.summary.errors.push(scrapeError);
    this.logger.error('Scraping error', { url, error: error.message });

    // Track failed URL
    if (url) {
      const failCount = (this.crawlState.failedUrls.get(url) || 0) + 1;
      this.crawlState.failedUrls.set(url, failCount);
    }

    // Take screenshot on error
    if (this.options.screenshotsOnError && this.page) {
      await takeErrorScreenshot(this.page, this.config.slug, 'error', url);
    }

    // Save HTML for debugging
    if (this.options.saveRawHtml && this.page) {
      await savePageHtml(this.page, this.config.slug, `error-${Date.now()}`);
    }

    // Mark proxy failure if using proxies
    if (this.proxyManager.isEnabled()) {
      this.proxyManager.markFailure();
    }

    // Call error callback
    if (this.onErrorCallback) {
      this.onErrorCallback(scrapeError);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Main Scraping Logic
  // ═══════════════════════════════════════════════════════════════════════════

  async run(): Promise<ScrapeSummary> {
    if (this.isRunning) {
      throw new Error('Scraper is already running');
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.summary = createEmptySummary(this.config.id, this.config.name);
    this.summary.status = 'running';
    this.summary.startedAt = new Date();

    // Reset crawl state
    this.crawlState = {
      visitedUrls: new Set(),
      pendingUrls: [],
      failedUrls: new Map(),
      productUrls: new Set(),
      collectionUrls: new Set(),
    };

    this.logger.info(`Starting scrape for ${this.config.name}`, {
      testMode: this.options.testMode,
      stealthMode: this.options.stealthMode,
    });

    try {
      await this.launchBrowser();
      await this.createPage();

      // Call beforeScrape hook
      await this.beforeScrape();

      // Navigate to main page and accept cookies
      await this.navigateTo(this.config.website);
      await this.acceptCookies();

      // Get collection URLs
      const collectionUrls = await this.getCollectionUrls();
      this.logger.info(`Found ${collectionUrls.length} collection URLs`);

      // Process collections
      for (const collectionUrl of collectionUrls) {
        if (this.shouldStop) break;
        if (this.options.maxPages > 0 && this.summary.stats.pagesScraped >= this.options.maxPages)
          break;

        // Check robots.txt
        const isAllowed = await this.checkRobotsTxt(collectionUrl);
        if (!isAllowed) {
          this.logger.warn(`Skipping ${collectionUrl} - blocked by robots.txt`);
          continue;
        }

        try {
          // Scrape collection info
          const collection = await this.scrapeCollection(collectionUrl);
          if (collection) {
            await this.onProduct({ type: 'collection', data: collection });
          }

          // Get product URLs from collection
          const productUrls = await this.getProductUrls(collectionUrl);
          this.logger.info(`Found ${productUrls.length} products in collection`);

          // Scrape each product
          for (const productUrl of productUrls) {
            if (this.shouldStop) break;
            if (
              this.options.maxProducts > 0 &&
              this.summary.stats.productsFound >= this.options.maxProducts
            )
              break;

            // Test mode: only scrape first product per collection
            if (this.options.testMode && this.summary.stats.productsFound > 0) {
              break;
            }

            // Skip already visited
            if (this.crawlState.visitedUrls.has(productUrl)) {
              continue;
            }

            try {
              const product = await this.scrapeProduct(productUrl);
              if (product) {
                await this.onProduct(product);
              }
            } catch (error) {
              await this.handleError(
                error instanceof Error ? error : new Error(String(error)),
                productUrl
              );
            }

            // Update progress
            this.updateProgress();
          }

          this.summary.stats.pagesScraped++;
        } catch (error) {
          await this.handleError(
            error instanceof Error ? error : new Error(String(error)),
            collectionUrl
          );
        }

        // Test mode: only scrape first collection
        if (this.options.testMode) {
          break;
        }
      }

      // Call afterScrape hook
      await this.afterScrape();

      this.summary.status = this.summary.stats.errors > 0 ? 'partial' : 'completed';
    } catch (error) {
      this.summary.status = 'failed';
      await this.handleError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      // Clean up page event listeners before closing browser
      if (this.page) {
        this.page.removeAllListeners();
      }
      await this.closeBrowser();

      this.summary.completedAt = new Date();
      this.summary.duration = Math.round(
        (this.summary.completedAt.getTime() - this.summary.startedAt.getTime()) / 1000
      );

      this.isRunning = false;

      this.logger.info(`Scrape completed`, {
        status: this.summary.status,
        duration: `${this.summary.duration}s`,
        products: this.summary.stats.productsFound,
        errors: this.summary.stats.errors,
      });
    }

    return this.summary;
  }

  /**
   * Stop the scraper gracefully
   */
  stop(): void {
    this.shouldStop = true;
    this.logger.info('Stop requested');
  }

  /**
   * Handle a scraped product
   */
  protected async onProduct(product: ScrapedProduct): Promise<void> {
    this.summary.stats.productsFound++;

    // Update type-specific counts
    switch (product.type) {
      case 'cabinet':
        this.summary.byType.cabinets++;
        break;
      case 'worktop':
        this.summary.byType.worktops++;
        break;
      case 'facade':
        this.summary.byType.facades++;
        break;
      case 'handle':
        this.summary.byType.handles++;
        break;
      case 'appliance':
        this.summary.byType.appliances++;
        break;
      case 'accessory':
        this.summary.byType.accessories++;
        break;
    }

    this.logger.debug(`Found product: ${product.type}`, {
      reference: 'reference' in product.data ? product.data.reference : 'N/A',
    });

    // Call callback if set
    if (this.onProductCallback) {
      await this.onProductCallback(product);
    }
  }

  /**
   * Update progress
   */
  private updateProgress(): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({
        brandId: this.config.id,
        status: this.summary.status,
        currentPage: this.page?.url(),
        pagesTotal: this.crawlState.collectionUrls.size,
        pagesCompleted: this.summary.stats.pagesScraped,
        productsFound: this.summary.stats.productsFound,
        errorsCount: this.summary.stats.errors,
        startedAt: this.summary.startedAt,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Event Handlers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set callback for product events
   */
  onProductEvent(callback: (product: ScrapedProduct) => void | Promise<void>): void {
    this.onProductCallback = callback;
  }

  /**
   * Set callback for progress events
   */
  onProgressEvent(callback: (progress: ScrapeProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Set callback for error events
   */
  onErrorEvent(callback: (error: ScrapeError) => void): void {
    this.onErrorCallback = callback;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Wait for selector and return element
   */
  protected async waitAndFind(
    selector: string,
    timeout?: number
  ): Promise<cheerio.Cheerio<cheerio.Element> | null> {
    if (!this.page) return null;

    try {
      await this.page.waitForSelector(selector, { timeout: timeout || this.options.timeout });
      const html = await this.getPageContent();
      const $ = this.parseHtml(html);
      return $(selector);
    } catch {
      return null;
    }
  }

  /**
   * Click element with human-like behavior
   */
  protected async clickElement(selector: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      const element = await this.page.$(selector);
      if (!element) return false;

      // Human-like: move to element first
      if (this.options.humanBehavior) {
        const box = await element.boundingBox();
        if (box) {
          await this.page.mouse.move(
            box.x + box.width / 2 + (Math.random() - 0.5) * 10,
            box.y + box.height / 2 + (Math.random() - 0.5) * 10,
            { steps: 10 }
          );
          await this.randomDelay(100, 300);
        }
      }

      await element.click();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Type text with human-like behavior
   */
  protected async typeText(selector: string, text: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      await this.page.waitForSelector(selector);

      if (this.options.humanBehavior) {
        await this.page.focus(selector);
        await this.randomDelay(200, 500);

        for (const char of text) {
          await this.page.type(selector, char, { delay: Math.random() * 100 + 50 });
        }
      } else {
        await this.page.type(selector, text);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract text from element
   */
  protected extractText($el: cheerio.Cheerio<cheerio.Element>): string {
    return $el.text().trim().replace(/\s+/g, ' ');
  }

  /**
   * Extract attribute from element
   */
  protected extractAttr($el: cheerio.Cheerio<cheerio.Element>, attr: string): string | undefined {
    return $el.attr(attr)?.trim();
  }

  /**
   * Parse price from string
   */
  protected parsePrice(priceStr: string): number | undefined {
    if (!priceStr) return undefined;

    let cleaned = priceStr
      .replace(/[€$£\s]/g, '')
      .replace(/\u00A0/g, '') // Non-breaking space
      .trim();

    // Handle French format (1 234,56 or 1234,56)
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '.');
    }

    // Handle format with both (1.234,56)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }

    const price = parseFloat(cleaned);
    return isNaN(price) ? undefined : price;
  }

  /**
   * Parse dimensions from string
   */
  protected parseDimensions(dimStr: string): { width?: number; height?: number; depth?: number } {
    const result: { width?: number; height?: number; depth?: number } = {};
    if (!dimStr) return result;

    // Common patterns
    // L x P x H, l x p x h, W x D x H
    const patterns = [
      /(\d+)\s*[xX×]\s*(\d+)\s*[xX×]\s*(\d+)/,
      /L\s*[:=]?\s*(\d+).*P\s*[:=]?\s*(\d+).*H\s*[:=]?\s*(\d+)/i,
      /largeur\s*[:=]?\s*(\d+)/i,
      /hauteur\s*[:=]?\s*(\d+)/i,
      /profondeur\s*[:=]?\s*(\d+)/i,
    ];

    const match3D = dimStr.match(patterns[0]!);
    if (match3D) {
      result.width = parseInt(match3D[1]!, 10);
      result.depth = parseInt(match3D[2]!, 10);
      result.height = parseInt(match3D[3]!, 10);
    } else {
      // Try individual dimensions
      const widthMatch = dimStr.match(/(?:largeur|width|l)\s*[:=]?\s*(\d+)/i);
      const heightMatch = dimStr.match(/(?:hauteur|height|h)\s*[:=]?\s*(\d+)/i);
      const depthMatch = dimStr.match(/(?:profondeur|depth|p)\s*[:=]?\s*(\d+)/i);

      if (widthMatch) result.width = parseInt(widthMatch[1]!, 10);
      if (heightMatch) result.height = parseInt(heightMatch[1]!, 10);
      if (depthMatch) result.depth = parseInt(depthMatch[1]!, 10);
    }

    // Convert to mm if in cm
    const isCm = dimStr.toLowerCase().includes('cm');
    if (isCm) {
      if (result.width) result.width *= 10;
      if (result.height) result.height *= 10;
      if (result.depth) result.depth *= 10;
    }

    return result;
  }

  /**
   * Generate unique reference
   */
  protected generateReference(url: string, prefix?: string): string {
    const urlParts = new URL(url).pathname.split('/').filter(Boolean);
    const lastPart = urlParts[urlParts.length - 1] || '';
    const slug = lastPart.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 50);
    return prefix ? `${prefix}-${slug}` : slug;
  }

  /**
   * Resolve relative URL to absolute
   */
  protected resolveUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    if (relativeUrl.startsWith('//')) return 'https:' + relativeUrl;
    return new URL(relativeUrl, this.config.website).toString();
  }

  /**
   * Generate content hash
   */
  protected hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate session fingerprint
   */
  private generateFingerprint(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create slug from string
   */
  protected slugify(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  /**
   * Get current page URL
   */
  protected getCurrentUrl(): string {
    return this.page?.url() || '';
  }

  /**
   * Take debug screenshot
   */
  protected async takeDebugScreenshot(identifier: string): Promise<string | null> {
    if (!this.page) return null;
    return takeScreenshot(this.page, this.config.slug, { filename: identifier });
  }

  /**
   * Save current page HTML
   */
  protected async saveDebugHtml(identifier: string): Promise<string | null> {
    if (!this.page) return null;
    return savePageHtml(this.page, this.config.slug, identifier);
  }

  /**
   * Get scraper status
   */
  getStatus(): { isRunning: boolean; summary: ScrapeSummary } {
    return {
      isRunning: this.isRunning,
      summary: this.summary,
    };
  }

  /**
   * Get brand configuration
   */
  getConfig(): BrandScrapingConfig {
    return this.config;
  }

  /**
   * Get crawl state
   */
  getCrawlState(): CrawlState {
    return this.crawlState;
  }
}

export default BaseScraper;
