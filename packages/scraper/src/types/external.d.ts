/**
 * External module type declarations
 */

declare module 'user-agents' {
  interface UserAgentOptions {
    deviceCategory?: 'desktop' | 'mobile' | 'tablet';
    platform?: string;
  }

  class UserAgent {
    constructor(options?: UserAgentOptions);
    toString(): string;
    data: {
      userAgent: string;
      platform: string;
      deviceCategory: string;
    };
  }

  export = UserAgent;
}

// Extend cheerio types for newer versions
declare module 'cheerio' {
  interface Element {
    type: string;
    name: string;
    attribs: { [name: string]: string };
    children: Element[];
    parent: Element | null;
  }
}
