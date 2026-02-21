/**
 * OAuth Configuration
 * OAuth 2.0 providers configuration for social authentication
 *
 * Dependencies: passport-google-oauth20, passport-github2, passport-oauth2
 * Usage: Social authentication strategies
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

/**
 * Base URL for OAuth callbacks
 * Should be your application's domain
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Google OAuth 2.0 Configuration
 * https://console.cloud.google.com/apis/credentials
 */
const googleConfig = {
  enabled: process.env.GOOGLE_OAUTH_ENABLED === 'true',
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: `${BASE_URL}/auth/google/callback`,
  scope: ['profile', 'email'],
  // Additional options
  accessType: 'offline', // Get refresh token
  prompt: 'consent', // Force consent screen to get refresh token
  state: true // Enable state parameter for CSRF protection
};

/**
 * GitHub OAuth Configuration
 * https://github.com/settings/developers
 */
const githubConfig = {
  enabled: process.env.GITHUB_OAUTH_ENABLED === 'true',
  clientID: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  callbackURL: `${BASE_URL}/auth/github/callback`,
  scope: ['user:email'],
  // Additional options
  state: true // Enable state parameter for CSRF protection
};

/**
 * Microsoft OAuth Configuration
 * https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
 */
const microsoftConfig = {
  enabled: process.env.MICROSOFT_OAUTH_ENABLED === 'true',
  clientID: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  callbackURL: `${BASE_URL}/auth/microsoft/callback`,
  scope: ['user.read'],
  tenant: process.env.MICROSOFT_TENANT || 'common', // 'common', 'organizations', 'consumers', or tenant ID
  authorizationURL: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT || 'common'}/oauth2/v2.0/authorize`,
  tokenURL: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT || 'common'}/oauth2/v2.0/token`
};

/**
 * Facebook OAuth Configuration
 * https://developers.facebook.com/apps/
 */
const facebookConfig = {
  enabled: process.env.FACEBOOK_OAUTH_ENABLED === 'true',
  clientID: process.env.FACEBOOK_APP_ID || '',
  clientSecret: process.env.FACEBOOK_APP_SECRET || '',
  callbackURL: `${BASE_URL}/auth/facebook/callback`,
  scope: ['email', 'public_profile'],
  profileFields: ['id', 'emails', 'name', 'picture.type(large)']
};

/**
 * Twitter OAuth Configuration
 * https://developer.twitter.com/en/portal/dashboard
 */
const twitterConfig = {
  enabled: process.env.TWITTER_OAUTH_ENABLED === 'true',
  consumerKey: process.env.TWITTER_CONSUMER_KEY || '',
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET || '',
  callbackURL: `${BASE_URL}/auth/twitter/callback`,
  includeEmail: true
};

/**
 * LinkedIn OAuth Configuration
 * https://www.linkedin.com/developers/apps
 */
const linkedinConfig = {
  enabled: process.env.LINKEDIN_OAUTH_ENABLED === 'true',
  clientID: process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
  callbackURL: `${BASE_URL}/auth/linkedin/callback`,
  scope: ['r_emailaddress', 'r_liteprofile']
};

/**
 * Validate OAuth configuration
 * @param {Object} config - OAuth provider config
 * @param {string} provider - Provider name
 * @returns {boolean}
 */
const validateOAuthConfig = (config, provider) => {
  if (!config.enabled) {
    return false;
  }

  const requiredFields = ['clientID', 'clientSecret'];
  const missing = requiredFields.filter(field => !config[field]);

  if (missing.length > 0) {
    console.warn(`${provider} OAuth: Missing configuration: ${missing.join(', ')}`);
    return false;
  }

  return true;
};

/**
 * Configure Google OAuth Strategy
 * @param {Function} findOrCreateUser - Callback to find or create user
 */
const configureGoogleStrategy = (findOrCreateUser) => {
  if (!validateOAuthConfig(googleConfig, 'Google')) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      googleConfig,
      async (accessToken, refreshToken, profile, done) => {
        try {
          const userData = {
            provider: 'google',
            providerId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            picture: profile.photos?.[0]?.value,
            emailVerified: profile.emails?.[0]?.verified || false,
            accessToken,
            refreshToken
          };

          const user = await findOrCreateUser(userData);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  console.log('Google OAuth strategy configured');
};

/**
 * Configure GitHub OAuth Strategy
 * @param {Function} findOrCreateUser - Callback to find or create user
 */
const configureGitHubStrategy = (findOrCreateUser) => {
  if (!validateOAuthConfig(githubConfig, 'GitHub')) {
    return;
  }

  passport.use(
    new GitHubStrategy(
      githubConfig,
      async (accessToken, refreshToken, profile, done) => {
        try {
          const userData = {
            provider: 'github',
            providerId: profile.id,
            username: profile.username,
            email: profile.emails?.[0]?.value,
            name: profile.displayName || profile.username,
            picture: profile.photos?.[0]?.value,
            profileUrl: profile.profileUrl,
            emailVerified: true, // GitHub emails are verified
            accessToken,
            refreshToken
          };

          const user = await findOrCreateUser(userData);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  console.log('GitHub OAuth strategy configured');
};

/**
 * Configure Microsoft OAuth Strategy
 * @param {Function} findOrCreateUser - Callback to find or create user
 */
const configureMicrosoftStrategy = (findOrCreateUser) => {
  if (!validateOAuthConfig(microsoftConfig, 'Microsoft')) {
    return;
  }

  // Microsoft uses OAuth2Strategy
  const OAuth2Strategy = require('passport-oauth2').Strategy;

  const strategy = new OAuth2Strategy(
    {
      authorizationURL: microsoftConfig.authorizationURL,
      tokenURL: microsoftConfig.tokenURL,
      clientID: microsoftConfig.clientID,
      clientSecret: microsoftConfig.clientSecret,
      callbackURL: microsoftConfig.callbackURL,
      scope: microsoftConfig.scope
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const userData = {
          provider: 'microsoft',
          providerId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
          accessToken,
          refreshToken
        };

        const user = await findOrCreateUser(userData);
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  );

  // Override userProfile to use Microsoft Graph API
  strategy.userProfile = function(accessToken, done) {
    this._oauth2._request(
      'GET',
      'https://graph.microsoft.com/v1.0/me',
      { 'Authorization': `Bearer ${accessToken}` },
      null,
      null,
      (err, body) => {
        if (err) return done(err);

        try {
          const json = JSON.parse(body);
          const profile = {
            provider: 'microsoft',
            id: json.id,
            displayName: json.displayName,
            emails: [{ value: json.mail || json.userPrincipalName }],
            photos: [{ value: `https://graph.microsoft.com/v1.0/users/${json.id}/photo/$value` }]
          };
          done(null, profile);
        } catch (e) {
          done(e);
        }
      }
    );
  };

  passport.use('microsoft', strategy);
  console.log('Microsoft OAuth strategy configured');
};

/**
 * OAuth error handler
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const oauthErrorHandler = (err, req, res, next) => {
  console.error('OAuth Error:', err);

  // Redirect to login with error message
  const errorMessage = encodeURIComponent(
    err.message || 'Authentication failed. Please try again.'
  );
  res.redirect(`/login?error=${errorMessage}`);
};

/**
 * Generate state parameter for CSRF protection
 * @returns {string}
 */
const generateState = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

/**
 * Verify state parameter
 * @param {string} state - State from OAuth callback
 * @param {string} storedState - State from session
 * @returns {boolean}
 */
const verifyState = (state, storedState) => {
  return state === storedState;
};

/**
 * Get OAuth authorization URL
 * @param {string} provider - Provider name (google, github, microsoft)
 * @param {string} state - State parameter for CSRF protection
 * @returns {string|null} Authorization URL or null if provider not configured
 */
const getAuthorizationUrl = (provider, state) => {
  const configs = {
    google: googleConfig,
    github: githubConfig,
    microsoft: microsoftConfig
  };

  const config = configs[provider];
  if (!config || !config.enabled) {
    return null;
  }

  // Build authorization URL based on provider
  const params = new URLSearchParams({
    client_id: config.clientID,
    redirect_uri: config.callbackURL,
    scope: Array.isArray(config.scope) ? config.scope.join(' ') : config.scope,
    state: state,
    response_type: 'code'
  });

  const authUrls = {
    google: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    github: `https://github.com/login/oauth/authorize?${params}`,
    microsoft: `${config.authorizationURL}?${params}`
  };

  return authUrls[provider];
};

/**
 * Initialize all configured OAuth strategies
 * @param {Function} findOrCreateUser - Callback to find or create user
 */
const initializeOAuthStrategies = (findOrCreateUser) => {
  if (googleConfig.enabled) {
    configureGoogleStrategy(findOrCreateUser);
  }

  if (githubConfig.enabled) {
    configureGitHubStrategy(findOrCreateUser);
  }

  if (microsoftConfig.enabled) {
    configureMicrosoftStrategy(findOrCreateUser);
  }

  console.log('OAuth strategies initialized');
};

/**
 * Get list of enabled OAuth providers
 * @returns {Array<string>}
 */
const getEnabledProviders = () => {
  const providers = [];

  if (googleConfig.enabled) providers.push('google');
  if (githubConfig.enabled) providers.push('github');
  if (microsoftConfig.enabled) providers.push('microsoft');
  if (facebookConfig.enabled) providers.push('facebook');
  if (twitterConfig.enabled) providers.push('twitter');
  if (linkedinConfig.enabled) providers.push('linkedin');

  return providers;
};

module.exports = {
  // Configuration
  googleConfig,
  githubConfig,
  microsoftConfig,
  facebookConfig,
  twitterConfig,
  linkedinConfig,

  // Strategy configuration
  configureGoogleStrategy,
  configureGitHubStrategy,
  configureMicrosoftStrategy,
  initializeOAuthStrategies,

  // Utilities
  validateOAuthConfig,
  getAuthorizationUrl,
  getEnabledProviders,
  generateState,
  verifyState,
  oauthErrorHandler,

  // Base URL
  BASE_URL
};
