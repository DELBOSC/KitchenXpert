/**
 * Codes d'erreur standardisés pour l'application
 */

export const ERROR_CODES = {
  // Erreurs d'authentification (1xxx)
  AUTH_INVALID_CREDENTIALS: 'AUTH_1001',
  AUTH_TOKEN_EXPIRED: 'AUTH_1002',
  AUTH_TOKEN_INVALID: 'AUTH_1003',
  AUTH_REFRESH_TOKEN_EXPIRED: 'AUTH_1004',
  AUTH_ACCOUNT_LOCKED: 'AUTH_1005',
  AUTH_ACCOUNT_NOT_VERIFIED: 'AUTH_1006',
  AUTH_MFA_REQUIRED: 'AUTH_1007',
  AUTH_MFA_INVALID: 'AUTH_1008',
  AUTH_SESSION_EXPIRED: 'AUTH_1009',
  AUTH_PASSWORD_RESET_EXPIRED: 'AUTH_1010',

  // Erreurs d'autorisation (2xxx)
  AUTHZ_FORBIDDEN: 'AUTHZ_2001',
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'AUTHZ_2002',
  AUTHZ_ROLE_NOT_ALLOWED: 'AUTHZ_2003',
  AUTHZ_RESOURCE_ACCESS_DENIED: 'AUTHZ_2004',
  AUTHZ_IP_NOT_ALLOWED: 'AUTHZ_2005',

  // Erreurs de validation (3xxx)
  VALIDATION_FAILED: 'VAL_3001',
  VALIDATION_REQUIRED_FIELD: 'VAL_3002',
  VALIDATION_INVALID_FORMAT: 'VAL_3003',
  VALIDATION_MIN_LENGTH: 'VAL_3004',
  VALIDATION_MAX_LENGTH: 'VAL_3005',
  VALIDATION_MIN_VALUE: 'VAL_3006',
  VALIDATION_MAX_VALUE: 'VAL_3007',
  VALIDATION_INVALID_EMAIL: 'VAL_3008',
  VALIDATION_INVALID_PHONE: 'VAL_3009',
  VALIDATION_INVALID_URL: 'VAL_3010',
  VALIDATION_INVALID_DATE: 'VAL_3011',
  VALIDATION_PASSWORD_WEAK: 'VAL_3012',
  VALIDATION_PASSWORDS_NOT_MATCH: 'VAL_3013',
  VALIDATION_INVALID_FILE_TYPE: 'VAL_3014',
  VALIDATION_FILE_TOO_LARGE: 'VAL_3015',

  // Erreurs de ressources (4xxx)
  RESOURCE_NOT_FOUND: 'RES_4001',
  RESOURCE_ALREADY_EXISTS: 'RES_4002',
  RESOURCE_CONFLICT: 'RES_4003',
  RESOURCE_DELETED: 'RES_4004',
  RESOURCE_LOCKED: 'RES_4005',
  RESOURCE_DEPENDENCY: 'RES_4006',

  // Erreurs utilisateur (5xxx)
  USER_NOT_FOUND: 'USER_5001',
  USER_ALREADY_EXISTS: 'USER_5002',
  USER_EMAIL_TAKEN: 'USER_5003',
  USER_INACTIVE: 'USER_5004',
  USER_SUSPENDED: 'USER_5005',
  USER_PROFILE_INCOMPLETE: 'USER_5006',

  // Erreurs projet cuisine (6xxx)
  PROJECT_NOT_FOUND: 'PROJ_6001',
  PROJECT_ACCESS_DENIED: 'PROJ_6002',
  PROJECT_LIMIT_REACHED: 'PROJ_6003',
  PROJECT_INVALID_STATE: 'PROJ_6004',
  PROJECT_SAVE_FAILED: 'PROJ_6005',
  PROJECT_EXPORT_FAILED: 'PROJ_6006',

  // Erreurs catalogue/produit (7xxx)
  PRODUCT_NOT_FOUND: 'PROD_7001',
  PRODUCT_OUT_OF_STOCK: 'PROD_7002',
  PRODUCT_DISCONTINUED: 'PROD_7003',
  PRODUCT_INVALID_VARIANT: 'PROD_7004',
  CATALOG_SYNC_FAILED: 'PROD_7005',
  CATALOG_PROVIDER_ERROR: 'PROD_7006',

  // Erreurs commande (8xxx)
  ORDER_NOT_FOUND: 'ORD_8001',
  ORDER_INVALID_STATE: 'ORD_8002',
  ORDER_PAYMENT_FAILED: 'ORD_8003',
  ORDER_ALREADY_CANCELLED: 'ORD_8004',
  ORDER_CANNOT_MODIFY: 'ORD_8005',
  ORDER_SHIPPING_FAILED: 'ORD_8006',

  // Erreurs partenaire (9xxx)
  PARTNER_NOT_FOUND: 'PART_9001',
  PARTNER_INACTIVE: 'PART_9002',
  PARTNER_SUSPENDED: 'PART_9003',
  PARTNER_LIMIT_REACHED: 'PART_9004',
  PARTNER_API_KEY_INVALID: 'PART_9005',

  // Erreurs serveur (10xxx)
  SERVER_INTERNAL_ERROR: 'SRV_10001',
  SERVER_SERVICE_UNAVAILABLE: 'SRV_10002',
  SERVER_TIMEOUT: 'SRV_10003',
  SERVER_RATE_LIMIT: 'SRV_10004',
  SERVER_MAINTENANCE: 'SRV_10005',

  // Erreurs externes (11xxx)
  EXTERNAL_API_ERROR: 'EXT_11001',
  EXTERNAL_TIMEOUT: 'EXT_11002',
  EXTERNAL_UNAVAILABLE: 'EXT_11003',
  EXTERNAL_INVALID_RESPONSE: 'EXT_11004',

  // Erreurs fichiers/storage (12xxx)
  FILE_NOT_FOUND: 'FILE_12001',
  FILE_UPLOAD_FAILED: 'FILE_12002',
  FILE_TYPE_NOT_ALLOWED: 'FILE_12003',
  FILE_SIZE_EXCEEDED: 'FILE_12004',
  STORAGE_QUOTA_EXCEEDED: 'FILE_12005',
  FILE_PROCESSING_FAILED: 'FILE_12006',

  // Erreurs webhook (13xxx)
  WEBHOOK_DELIVERY_FAILED: 'HOOK_13001',
  WEBHOOK_INVALID_SIGNATURE: 'HOOK_13002',
  WEBHOOK_ENDPOINT_UNREACHABLE: 'HOOK_13003',
  WEBHOOK_RATE_LIMITED: 'HOOK_13004',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Messages d'erreur par défaut en français
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Identifiants invalides',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Votre session a expiré',
  [ERROR_CODES.AUTH_TOKEN_INVALID]: "Token d'authentification invalide",
  [ERROR_CODES.AUTH_REFRESH_TOKEN_EXPIRED]: 'Veuillez vous reconnecter',
  [ERROR_CODES.AUTH_ACCOUNT_LOCKED]: 'Compte temporairement verrouillé',
  [ERROR_CODES.AUTH_ACCOUNT_NOT_VERIFIED]: 'Veuillez vérifier votre email',
  [ERROR_CODES.AUTH_MFA_REQUIRED]: 'Authentification à deux facteurs requise',
  [ERROR_CODES.AUTH_MFA_INVALID]: 'Code de vérification invalide',
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: 'Session expirée',
  [ERROR_CODES.AUTH_PASSWORD_RESET_EXPIRED]: 'Lien de réinitialisation expiré',

  [ERROR_CODES.AUTHZ_FORBIDDEN]: 'Accès interdit',
  [ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS]: 'Permissions insuffisantes',
  [ERROR_CODES.AUTHZ_ROLE_NOT_ALLOWED]: 'Rôle non autorisé pour cette action',
  [ERROR_CODES.AUTHZ_RESOURCE_ACCESS_DENIED]: 'Accès à la ressource refusé',
  [ERROR_CODES.AUTHZ_IP_NOT_ALLOWED]: 'Accès non autorisé depuis cette adresse IP',

  [ERROR_CODES.VALIDATION_FAILED]: 'Données invalides',
  [ERROR_CODES.VALIDATION_REQUIRED_FIELD]: 'Champ requis',
  [ERROR_CODES.VALIDATION_INVALID_FORMAT]: 'Format invalide',
  [ERROR_CODES.VALIDATION_MIN_LENGTH]: 'Longueur minimale non atteinte',
  [ERROR_CODES.VALIDATION_MAX_LENGTH]: 'Longueur maximale dépassée',
  [ERROR_CODES.VALIDATION_MIN_VALUE]: 'Valeur minimale non atteinte',
  [ERROR_CODES.VALIDATION_MAX_VALUE]: 'Valeur maximale dépassée',
  [ERROR_CODES.VALIDATION_INVALID_EMAIL]: 'Adresse email invalide',
  [ERROR_CODES.VALIDATION_INVALID_PHONE]: 'Numéro de téléphone invalide',
  [ERROR_CODES.VALIDATION_INVALID_URL]: 'URL invalide',
  [ERROR_CODES.VALIDATION_INVALID_DATE]: 'Date invalide',
  [ERROR_CODES.VALIDATION_PASSWORD_WEAK]: 'Mot de passe trop faible',
  [ERROR_CODES.VALIDATION_PASSWORDS_NOT_MATCH]: 'Les mots de passe ne correspondent pas',
  [ERROR_CODES.VALIDATION_INVALID_FILE_TYPE]: 'Type de fichier non autorisé',
  [ERROR_CODES.VALIDATION_FILE_TOO_LARGE]: 'Fichier trop volumineux',

  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'Ressource introuvable',
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: 'Cette ressource existe déjà',
  [ERROR_CODES.RESOURCE_CONFLICT]: 'Conflit de ressource',
  [ERROR_CODES.RESOURCE_DELETED]: 'Ressource supprimée',
  [ERROR_CODES.RESOURCE_LOCKED]: 'Ressource verrouillée',
  [ERROR_CODES.RESOURCE_DEPENDENCY]: "Ressource liée à d'autres éléments",

  [ERROR_CODES.USER_NOT_FOUND]: 'Utilisateur introuvable',
  [ERROR_CODES.USER_ALREADY_EXISTS]: 'Cet utilisateur existe déjà',
  [ERROR_CODES.USER_EMAIL_TAKEN]: 'Cette adresse email est déjà utilisée',
  [ERROR_CODES.USER_INACTIVE]: 'Compte utilisateur inactif',
  [ERROR_CODES.USER_SUSPENDED]: 'Compte utilisateur suspendu',
  [ERROR_CODES.USER_PROFILE_INCOMPLETE]: 'Profil utilisateur incomplet',

  [ERROR_CODES.PROJECT_NOT_FOUND]: 'Projet introuvable',
  [ERROR_CODES.PROJECT_ACCESS_DENIED]: 'Accès au projet refusé',
  [ERROR_CODES.PROJECT_LIMIT_REACHED]: 'Limite de projets atteinte',
  [ERROR_CODES.PROJECT_INVALID_STATE]: 'État du projet invalide',
  [ERROR_CODES.PROJECT_SAVE_FAILED]: 'Échec de la sauvegarde du projet',
  [ERROR_CODES.PROJECT_EXPORT_FAILED]: "Échec de l'export du projet",

  [ERROR_CODES.PRODUCT_NOT_FOUND]: 'Produit introuvable',
  [ERROR_CODES.PRODUCT_OUT_OF_STOCK]: 'Produit en rupture de stock',
  [ERROR_CODES.PRODUCT_DISCONTINUED]: 'Produit discontinué',
  [ERROR_CODES.PRODUCT_INVALID_VARIANT]: 'Variante de produit invalide',
  [ERROR_CODES.CATALOG_SYNC_FAILED]: 'Échec de la synchronisation du catalogue',
  [ERROR_CODES.CATALOG_PROVIDER_ERROR]: 'Erreur du fournisseur de catalogue',

  [ERROR_CODES.ORDER_NOT_FOUND]: 'Commande introuvable',
  [ERROR_CODES.ORDER_INVALID_STATE]: 'État de la commande invalide',
  [ERROR_CODES.ORDER_PAYMENT_FAILED]: 'Échec du paiement',
  [ERROR_CODES.ORDER_ALREADY_CANCELLED]: 'Commande déjà annulée',
  [ERROR_CODES.ORDER_CANNOT_MODIFY]: 'Impossible de modifier cette commande',
  [ERROR_CODES.ORDER_SHIPPING_FAILED]: "Échec de l'expédition",

  [ERROR_CODES.PARTNER_NOT_FOUND]: 'Partenaire introuvable',
  [ERROR_CODES.PARTNER_INACTIVE]: 'Partenaire inactif',
  [ERROR_CODES.PARTNER_SUSPENDED]: 'Partenaire suspendu',
  [ERROR_CODES.PARTNER_LIMIT_REACHED]: 'Limite partenaire atteinte',
  [ERROR_CODES.PARTNER_API_KEY_INVALID]: 'Clé API partenaire invalide',

  [ERROR_CODES.SERVER_INTERNAL_ERROR]: 'Erreur interne du serveur',
  [ERROR_CODES.SERVER_SERVICE_UNAVAILABLE]: 'Service temporairement indisponible',
  [ERROR_CODES.SERVER_TIMEOUT]: "Délai d'attente dépassé",
  [ERROR_CODES.SERVER_RATE_LIMIT]: 'Trop de requêtes, veuillez réessayer plus tard',
  [ERROR_CODES.SERVER_MAINTENANCE]: 'Service en maintenance',

  [ERROR_CODES.EXTERNAL_API_ERROR]: 'Erreur de service externe',
  [ERROR_CODES.EXTERNAL_TIMEOUT]: 'Service externe non disponible',
  [ERROR_CODES.EXTERNAL_UNAVAILABLE]: 'Service externe indisponible',
  [ERROR_CODES.EXTERNAL_INVALID_RESPONSE]: 'Réponse externe invalide',

  [ERROR_CODES.FILE_NOT_FOUND]: 'Fichier introuvable',
  [ERROR_CODES.FILE_UPLOAD_FAILED]: "Échec de l'upload",
  [ERROR_CODES.FILE_TYPE_NOT_ALLOWED]: 'Type de fichier non autorisé',
  [ERROR_CODES.FILE_SIZE_EXCEEDED]: 'Taille de fichier dépassée',
  [ERROR_CODES.STORAGE_QUOTA_EXCEEDED]: 'Quota de stockage dépassé',
  [ERROR_CODES.FILE_PROCESSING_FAILED]: 'Échec du traitement du fichier',

  [ERROR_CODES.WEBHOOK_DELIVERY_FAILED]: 'Échec de livraison du webhook',
  [ERROR_CODES.WEBHOOK_INVALID_SIGNATURE]: 'Signature de webhook invalide',
  [ERROR_CODES.WEBHOOK_ENDPOINT_UNREACHABLE]: 'Point de terminaison webhook inaccessible',
  [ERROR_CODES.WEBHOOK_RATE_LIMITED]: 'Limite de débit webhook atteinte',
};

/**
 * Obtient le message d'erreur pour un code donné
 */
export function getErrorMessage(code: ErrorCode, fallback?: string): string {
  return ERROR_MESSAGES[code] || fallback || 'Une erreur est survenue';
}

/**
 * HTTP status codes associés aux erreurs
 */
export const ERROR_HTTP_STATUS: Partial<Record<ErrorCode, number>> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 401,
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 401,
  [ERROR_CODES.AUTH_TOKEN_INVALID]: 401,
  [ERROR_CODES.AUTHZ_FORBIDDEN]: 403,
  [ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS]: 403,
  [ERROR_CODES.VALIDATION_FAILED]: 400,
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 404,
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: 409,
  [ERROR_CODES.RESOURCE_CONFLICT]: 409,
  [ERROR_CODES.SERVER_INTERNAL_ERROR]: 500,
  [ERROR_CODES.SERVER_SERVICE_UNAVAILABLE]: 503,
  [ERROR_CODES.SERVER_RATE_LIMIT]: 429,
};
