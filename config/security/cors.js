/**
 * Configuration CORS (Cross-Origin Resource Sharing)
 */

const { getConfig } = require('../index');

/**
 * Origine autorisées dynamiques selon l'environnement
 */
function getAllowedOrigins() {
  const config = getConfig();

  // En développement, autoriser plus d'origines
  if (config.env === 'development') {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      config.frontendUrl,
    ];
  }

  // En production, utiliser uniquement les origines configurées
  if (Array.isArray(config.security.cors.origin)) {
    return config.security.cors.origin;
  }

  return [config.security.cors.origin];
}

/**
 * Configuration CORS pour Express
 */
function getCorsOptions() {
  const config = getConfig();
  const allowedOrigins = getAllowedOrigins();

  return {
    origin: function (origin, callback) {
      // Autoriser les requêtes sans origine (comme les apps mobiles ou Postman)
      // En production, bloquer les requêtes sans origine
      if (!origin) {
        return callback(null, process.env.NODE_ENV !== 'production');
      }

      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },

    credentials: config.security.cors.credentials,

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'Accept',
      'Accept-Language',
      'Content-Language',
    ],

    exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Current-Page', 'X-Per-Page', 'Link'],

    maxAge: config.security.cors.maxAge,

    preflightContinue: false,

    optionsSuccessStatus: 204,
  };
}

/**
 * Middleware CORS personnalisé pour les WebSockets
 */
function corsWebSocket(origin) {
  const allowedOrigins = getAllowedOrigins();

  if (!origin) {
    return true;
  }

  return allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*');
}

module.exports = {
  getAllowedOrigins,
  getCorsOptions,
  corsWebSocket,
};
