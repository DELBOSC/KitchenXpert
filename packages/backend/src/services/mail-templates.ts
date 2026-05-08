/**
 * Mail Templates
 * HTML email templates for various transactional emails
 */

/**
 * Order details interface for order confirmation emails
 */
export interface OrderDetails {
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  shippingAddress: Address;
  billingAddress?: Address;
  estimatedDelivery?: string;
  orderUrl?: string;
}

export interface OrderItem {
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface Address {
  name: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

/**
 * Base email layout wrapper
 */
function baseLayout(content: string, footerText?: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KitchenXpert</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-wrapper {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background-color: #2c3e50;
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header .logo {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .content {
      padding: 30px 20px;
    }
    .content h2 {
      color: #2c3e50;
      margin-top: 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background-color: #3498db;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .btn:hover {
      background-color: #2980b9;
    }
    .btn-primary {
      background-color: #3498db;
    }
    .btn-success {
      background-color: #27ae60;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .footer a {
      color: #3498db;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #e9ecef;
      margin: 20px 0;
    }
    .info-box {
      background-color: #f8f9fa;
      border-radius: 6px;
      padding: 15px;
      margin: 15px 0;
    }
    .warning-text {
      color: #856404;
      background-color: #fff3cd;
      padding: 10px 15px;
      border-radius: 4px;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    table th, table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }
    table th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .text-muted {
      color: #6c757d;
    }
    .text-success {
      color: #27ae60;
    }
    .text-large {
      font-size: 18px;
    }
    .mt-20 {
      margin-top: 20px;
    }
    .mb-20 {
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <div class="logo">KitchenXpert</div>
        <h1>Votre cuisine de reve</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        ${footerText || `
          <p>KitchenXpert - Configurateur de cuisines intelligentes</p>
          <p>
            <a href="https://kitchenxpert.com">Site web</a> |
            <a href="https://kitchenxpert.com/aide">Aide</a> |
            <a href="https://kitchenxpert.com/contact">Contact</a>
          </p>
          <p class="text-muted">
            Vous recevez cet email car vous avez un compte KitchenXpert.<br>
            Si vous n'avez pas demande cet email, veuillez l'ignorer.
          </p>
        `}
      </div>
    </div>
  </div>
</body>
</html>
`.trim();
}

/**
 * Welcome email template
 * Sent when a new user registers
 */
export function welcomeEmail(userName: string): string {
  const content = `
    <h2>Bienvenue sur KitchenXpert, ${escapeHtml(userName)} !</h2>

    <p>Nous sommes ravis de vous compter parmi nous. KitchenXpert est votre partenaire ideal pour concevoir la cuisine de vos reves.</p>

    <div class="info-box">
      <h3 style="margin-top: 0;">Ce que vous pouvez faire :</h3>
      <ul>
        <li><strong>Concevoir votre cuisine</strong> - Utilisez notre configurateur 3D intuitif</li>
        <li><strong>Explorer le catalogue</strong> - Des milliers de produits de qualite</li>
        <li><strong>Obtenir des devis</strong> - Estimations instantanees et personnalisees</li>
        <li><strong>Collaborer</strong> - Partagez vos projets avec famille et amis</li>
      </ul>
    </div>

    <div class="text-center">
      <a href="https://kitchenxpert.com/dashboard" class="btn btn-primary">
        Commencer maintenant
      </a>
    </div>

    <div class="divider"></div>

    <p class="text-muted text-center">
      Besoin d'aide ? Notre equipe support est la pour vous aider.<br>
      <a href="mailto:support@kitchenxpert.com">support@kitchenxpert.com</a>
    </p>
  `;

  return baseLayout(content);
}

/**
 * Email verification template
 * Sent to verify user's email address
 */
export function verificationEmail(userName: string, verificationLink: string): string {
  const content = `
    <h2>Verifiez votre adresse email</h2>

    <p>Bonjour ${escapeHtml(userName)},</p>

    <p>Merci de vous etre inscrit sur KitchenXpert ! Pour activer votre compte et acceder a toutes les fonctionnalites, veuillez verifier votre adresse email en cliquant sur le bouton ci-dessous.</p>

    <div class="text-center">
      <a href="${escapeHtml(verificationLink)}" class="btn btn-success">
        Verifier mon email
      </a>
    </div>

    <div class="divider"></div>

    <div class="warning-text">
      <strong>Important :</strong> Ce lien expirera dans 24 heures. Si vous n'avez pas cree de compte sur KitchenXpert, veuillez ignorer cet email.
    </div>

    <p class="text-muted mt-20" style="font-size: 12px;">
      Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
      <a href="${escapeHtml(verificationLink)}">${escapeHtml(verificationLink)}</a>
    </p>
  `;

  return baseLayout(content);
}

/**
 * Password reset email template
 * Sent when user requests password reset
 */
export function passwordResetEmail(userName: string, resetLink: string): string {
  const content = `
    <h2>Reinitialisation de votre mot de passe</h2>

    <p>Bonjour ${escapeHtml(userName)},</p>

    <p>Nous avons recu une demande de reinitialisation de mot de passe pour votre compte KitchenXpert. Cliquez sur le bouton ci-dessous pour creer un nouveau mot de passe.</p>

    <div class="text-center">
      <a href="${escapeHtml(resetLink)}" class="btn btn-primary">
        Reinitialiser mon mot de passe
      </a>
    </div>

    <div class="divider"></div>

    <div class="warning-text">
      <strong>Attention :</strong> Ce lien expirera dans 1 heure pour des raisons de securite.
    </div>

    <div class="info-box mt-20">
      <p style="margin: 0;"><strong>Vous n'avez pas demande cette reinitialisation ?</strong></p>
      <p style="margin-bottom: 0;">Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email. Votre mot de passe restera inchange.</p>
    </div>

    <p class="text-muted mt-20" style="font-size: 12px;">
      Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
      <a href="${escapeHtml(resetLink)}">${escapeHtml(resetLink)}</a>
    </p>
  `;

  return baseLayout(content);
}

/**
 * Order confirmation email template
 * Sent when an order is placed
 */
export function orderConfirmationEmail(orderDetails: OrderDetails): string {
  const itemsHtml = orderDetails.items.map(item => `
    <tr>
      <td>
        ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 10px; vertical-align: middle;">` : ''}
        <span style="vertical-align: middle;">
          <strong>${escapeHtml(item.name)}</strong>
          ${item.sku ? `<br><span class="text-muted" style="font-size: 12px;">Ref: ${escapeHtml(item.sku)}</span>` : ''}
        </span>
      </td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">${formatCurrency(item.unitPrice, orderDetails.currency)}</td>
      <td class="text-right"><strong>${formatCurrency(item.totalPrice, orderDetails.currency)}</strong></td>
    </tr>
  `).join('');

  const formatAddress = (addr: Address) => `
    ${escapeHtml(addr.name)}<br>
    ${escapeHtml(addr.street)}<br>
    ${escapeHtml(addr.city)}${addr.state ? `, ${escapeHtml(addr.state)}` : ''} ${escapeHtml(addr.postalCode)}<br>
    ${escapeHtml(addr.country)}
  `;

  const content = `
    <h2 class="text-success">Commande confirmee !</h2>

    <p>Bonjour ${escapeHtml(orderDetails.customerName)},</p>

    <p>Merci pour votre commande ! Nous avons bien recu votre commande et nous allons la traiter dans les plus brefs delais.</p>

    <div class="info-box">
      <table style="margin: 0;">
        <tr>
          <td><strong>Numero de commande</strong></td>
          <td class="text-right text-large"><strong>#${escapeHtml(orderDetails.orderNumber)}</strong></td>
        </tr>
        ${orderDetails.estimatedDelivery ? `
        <tr>
          <td><strong>Livraison estimee</strong></td>
          <td class="text-right">${escapeHtml(orderDetails.estimatedDelivery)}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <h3>Details de la commande</h3>

    <table>
      <thead>
        <tr>
          <th>Produit</th>
          <th class="text-center">Qte</th>
          <th class="text-right">Prix unit.</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="text-right">Sous-total</td>
          <td class="text-right">${formatCurrency(orderDetails.subtotal, orderDetails.currency)}</td>
        </tr>
        <tr>
          <td colspan="3" class="text-right">TVA</td>
          <td class="text-right">${formatCurrency(orderDetails.tax, orderDetails.currency)}</td>
        </tr>
        <tr>
          <td colspan="3" class="text-right">Livraison</td>
          <td class="text-right">${orderDetails.shipping > 0 ? formatCurrency(orderDetails.shipping, orderDetails.currency) : 'Gratuit'}</td>
        </tr>
        <tr style="background-color: #f8f9fa;">
          <td colspan="3" class="text-right text-large"><strong>Total</strong></td>
          <td class="text-right text-large text-success"><strong>${formatCurrency(orderDetails.total, orderDetails.currency)}</strong></td>
        </tr>
      </tfoot>
    </table>

    <div class="divider"></div>

    <div style="display: flex; gap: 20px;">
      <div style="flex: 1;">
        <h4 style="margin-top: 0;">Adresse de livraison</h4>
        <p>${formatAddress(orderDetails.shippingAddress)}</p>
      </div>
      ${orderDetails.billingAddress ? `
      <div style="flex: 1;">
        <h4 style="margin-top: 0;">Adresse de facturation</h4>
        <p>${formatAddress(orderDetails.billingAddress)}</p>
      </div>
      ` : ''}
    </div>

    ${orderDetails.orderUrl ? `
    <div class="text-center mt-20">
      <a href="${escapeHtml(orderDetails.orderUrl)}" class="btn btn-primary">
        Suivre ma commande
      </a>
    </div>
    ` : ''}

    <div class="divider"></div>

    <p class="text-muted text-center">
      Des questions sur votre commande ?<br>
      Contactez notre service client : <a href="mailto:commandes@kitchenxpert.com">commandes@kitchenxpert.com</a>
    </p>
  `;

  return baseLayout(content);
}

/**
 * Project shared notification email
 */
export function projectSharedEmail(
  recipientName: string,
  ownerName: string,
  projectName: string,
  projectUrl: string
): string {
  const content = `
    <h2>Un projet a ete partage avec vous</h2>

    <p>Bonjour ${escapeHtml(recipientName)},</p>

    <p><strong>${escapeHtml(ownerName)}</strong> vous a invite a collaborer sur le projet de cuisine :</p>

    <div class="info-box text-center">
      <p class="text-large" style="margin: 0;"><strong>"${escapeHtml(projectName)}"</strong></p>
    </div>

    <p>Vous pouvez maintenant voir ce projet, laisser des commentaires et faire des suggestions.</p>

    <div class="text-center">
      <a href="${escapeHtml(projectUrl)}" class="btn btn-primary">
        Voir le projet
      </a>
    </div>

    <div class="divider"></div>

    <p class="text-muted text-center">
      Si vous ne connaissez pas ${escapeHtml(ownerName)}, vous pouvez ignorer cet email.
    </p>
  `;

  return baseLayout(content);
}

/**
 * Quote ready notification email
 */
export function quoteReadyEmail(
  customerName: string,
  projectName: string,
  totalAmount: number,
  currency: string,
  quoteUrl: string,
  validUntil?: string
): string {
  const content = `
    <h2>Votre devis est pret !</h2>

    <p>Bonjour ${escapeHtml(customerName)},</p>

    <p>Bonne nouvelle ! Le devis pour votre projet de cuisine est maintenant disponible.</p>

    <div class="info-box">
      <table style="margin: 0;">
        <tr>
          <td><strong>Projet</strong></td>
          <td class="text-right">${escapeHtml(projectName)}</td>
        </tr>
        <tr>
          <td><strong>Montant total estime</strong></td>
          <td class="text-right text-large text-success"><strong>${formatCurrency(totalAmount, currency)}</strong></td>
        </tr>
        ${validUntil ? `
        <tr>
          <td><strong>Valide jusqu'au</strong></td>
          <td class="text-right">${escapeHtml(validUntil)}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div class="text-center">
      <a href="${escapeHtml(quoteUrl)}" class="btn btn-success">
        Consulter mon devis
      </a>
    </div>

    <div class="divider"></div>

    <p class="text-muted text-center">
      Vous avez des questions sur ce devis ?<br>
      Contactez notre equipe commerciale : <a href="mailto:devis@kitchenxpert.com">devis@kitchenxpert.com</a>
    </p>
  `;

  return baseLayout(content);
}

// Utility functions

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char: string) => htmlEntities[char] || char);
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Plain text versions of emails for fallback
 */
export const plainTextTemplates = {
  welcome: (userName: string): string => `
Bienvenue sur KitchenXpert, ${userName} !

Nous sommes ravis de vous compter parmi nous. KitchenXpert est votre partenaire ideal pour concevoir la cuisine de vos reves.

Ce que vous pouvez faire :
- Concevoir votre cuisine avec notre configurateur 3D intuitif
- Explorer notre catalogue de milliers de produits de qualite
- Obtenir des devis instantanes et personnalises
- Collaborer et partager vos projets avec famille et amis

Commencez maintenant : https://kitchenxpert.com/dashboard

Besoin d'aide ? Notre equipe support est la pour vous.
Email : support@kitchenxpert.com

---
KitchenXpert - Votre cuisine de reve
https://kitchenxpert.com
  `.trim(),

  verification: (userName: string, verificationLink: string): string => `
Verifiez votre adresse email

Bonjour ${userName},

Merci de vous etre inscrit sur KitchenXpert ! Pour activer votre compte, veuillez verifier votre adresse email en cliquant sur le lien ci-dessous :

${verificationLink}

Important : Ce lien expirera dans 24 heures.

Si vous n'avez pas cree de compte sur KitchenXpert, veuillez ignorer cet email.

---
KitchenXpert - Votre cuisine de reve
https://kitchenxpert.com
  `.trim(),

  passwordReset: (userName: string, resetLink: string): string => `
Reinitialisation de votre mot de passe

Bonjour ${userName},

Nous avons recu une demande de reinitialisation de mot de passe pour votre compte KitchenXpert.

Cliquez sur le lien ci-dessous pour creer un nouveau mot de passe :
${resetLink}

Attention : Ce lien expirera dans 1 heure pour des raisons de securite.

Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email. Votre mot de passe restera inchange.

---
KitchenXpert - Votre cuisine de reve
https://kitchenxpert.com
  `.trim(),

  orderConfirmation: (orderDetails: OrderDetails): string => {
    const items = orderDetails.items
      .map(item => `  - ${item.name} x${item.quantity}: ${item.totalPrice} ${orderDetails.currency}`)
      .join('\n');

    return `
Commande confirmee !

Bonjour ${orderDetails.customerName},

Merci pour votre commande ! Nous avons bien recu votre commande et nous allons la traiter dans les plus brefs delais.

Numero de commande : #${orderDetails.orderNumber}
${orderDetails.estimatedDelivery ? `Livraison estimee : ${orderDetails.estimatedDelivery}` : ''}

Details de la commande :
${items}

Sous-total : ${orderDetails.subtotal} ${orderDetails.currency}
TVA : ${orderDetails.tax} ${orderDetails.currency}
Livraison : ${orderDetails.shipping > 0 ? `${orderDetails.shipping} ${orderDetails.currency}` : 'Gratuit'}
Total : ${orderDetails.total} ${orderDetails.currency}

Adresse de livraison :
${orderDetails.shippingAddress.name}
${orderDetails.shippingAddress.street}
${orderDetails.shippingAddress.city}${orderDetails.shippingAddress.state ? `, ${orderDetails.shippingAddress.state}` : ''} ${orderDetails.shippingAddress.postalCode}
${orderDetails.shippingAddress.country}

${orderDetails.orderUrl ? `Suivre ma commande : ${orderDetails.orderUrl}` : ''}

Des questions ? Contactez-nous : commandes@kitchenxpert.com

---
KitchenXpert - Votre cuisine de reve
https://kitchenxpert.com
    `.trim();
  },
};

export default {
  welcomeEmail,
  verificationEmail,
  passwordResetEmail,
  orderConfirmationEmail,
  projectSharedEmail,
  quoteReadyEmail,
  plainTextTemplates,
};
