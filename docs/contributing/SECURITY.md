# Security Policy

Last Updated: 2026-01-10

## Supported Versions

We release security updates for the following versions:

| Version | Supported          | End of Support |
| ------- | ------------------ | -------------- |
| 1.0.x   | :white_check_mark: | TBD            |

**Note**: Only the latest minor version receives security updates. Please
upgrade to the latest version to ensure you have all security patches.

## Reporting a Vulnerability

The KitchenXpert team takes security vulnerabilities seriously. We appreciate
your efforts to responsibly disclose your findings.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities to:

**Email**: security@kitchenxpert.com

**PGP Key**: Available at https://kitchenxpert.com/.well-known/pgp-key.txt

### What to Include

Please include the following information in your report:

- **Type of vulnerability** (e.g., SQL injection, XSS, authentication bypass)
- **Full path of the source file(s)** related to the vulnerability
- **Location of the affected code** (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the vulnerability** (what an attacker could achieve)
- **Any potential mitigations** you've identified

### Response Timeline

We strive to respond to security reports according to the following timeline:

- **Initial Response**: Within 24-48 hours
- **Triage**: Within 1 week
- **Fix Development**: Within 2-4 weeks (depending on severity)
- **Public Disclosure**: After fix is deployed and users have time to update

### Severity Levels

We categorize vulnerabilities using the following severity levels:

#### Critical (CVSS 9.0-10.0)

- Remote code execution
- SQL injection with data exfiltration
- Authentication bypass affecting all users
- Privilege escalation to admin

**Response**: Immediate hotfix, notification sent to all users

#### High (CVSS 7.0-8.9)

- Cross-site scripting (XSS) affecting sensitive data
- Insecure direct object references
- Privilege escalation
- Sensitive data exposure

**Response**: Fix within 1 week, included in next patch release

#### Medium (CVSS 4.0-6.9)

- Cross-site request forgery (CSRF)
- Information disclosure
- Insecure cryptographic storage
- Missing security headers

**Response**: Fix within 2 weeks, included in next minor release

#### Low (CVSS 0.1-3.9)

- Minor information leaks
- Non-exploitable security misconfigurations
- Best practice violations

**Response**: Fix within 4 weeks, included in next minor release

## Security Disclosure Process

1. **Report received**: We acknowledge receipt of your report
2. **Initial triage**: We assess severity and impact
3. **Investigation**: We investigate and develop a fix
4. **Fix development**: We create and test a patch
5. **Private disclosure**: We may share details with trusted partners
6. **Public release**: We deploy the fix and publish a security advisory
7. **Recognition**: We credit the reporter (if desired) in our security
   acknowledgments

## Bug Bounty Program

We currently do not have a formal bug bounty program. However, we deeply
appreciate security research and will:

- Acknowledge security researchers in our security advisories
- Provide a KitchenXpert Premium account (1 year)
- Send KitchenXpert swag to researchers who find critical issues

We are evaluating a formal bug bounty program for the future.

## Security Best Practices for Users

### For Application Users

1. **Use Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Use a password manager
   - Enable two-factor authentication when available

2. **Keep Software Updated**
   - Update to the latest version promptly
   - Subscribe to security advisories
   - Enable automatic updates if self-hosting

3. **Protect Your Account**
   - Never share credentials
   - Log out on shared devices
   - Use unique passwords for each service
   - Monitor account activity

4. **Report Suspicious Activity**
   - Unexpected password reset emails
   - Unauthorized access to your account
   - Unusual application behavior
   - Phishing attempts

### For Developers/Self-Hosters

1. **Environment Security**

   ```bash
   # Use strong secrets (minimum 32 characters)
   JWT_SECRET=$(openssl rand -base64 32)
   SESSION_SECRET=$(openssl rand -base64 32)

   # Never commit secrets to git
   # Use .env files and add to .gitignore

   # Use environment-specific configurations
   NODE_ENV=production
   ```

2. **Database Security**

   ```bash
   # Use strong database passwords
   # Restrict database access to localhost or specific IPs
   # Enable SSL/TLS for database connections

   # PostgreSQL: Use SSL
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

   # Regular backups
   # Encrypt backups at rest
   ```

3. **API Security**

   ```bash
   # Enable rate limiting
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=100

   # Use HTTPS only in production
   # Enable CORS restrictions
   CORS_ORIGIN=https://yourdomain.com

   # Enable security headers
   # Implemented by default in KitchenXpert
   ```

4. **Network Security**

   ```bash
   # Use firewall to restrict access
   # Only expose necessary ports (443, 80)
   # Use VPN for database access
   # Implement DDoS protection
   ```

5. **Monitoring and Logging**

   ```bash
   # Enable comprehensive logging
   ENABLE_LOGGING=true
   LOG_LEVEL=info

   # Monitor for suspicious activity
   # Set up alerts for failed login attempts
   # Regular security audits
   ```

6. **Regular Updates**

   ```bash
   # Check for dependency vulnerabilities
   npm audit
   npm audit fix

   # Update dependencies regularly
   npm update

   # Subscribe to security advisories
   # https://github.com/kitchenxpert/kitchenxpert/security/advisories
   ```

## Known Security Considerations

### Current Security Measures

KitchenXpert implements the following security measures:

1. **Authentication & Authorization**
   - JWT-based authentication
   - OAuth2 integration (Google, GitHub)
   - Role-based access control (RBAC)
   - Session management with Redis
   - Password hashing with bcrypt (cost factor: 12)
   - Rate limiting on authentication endpoints

2. **Data Protection**
   - Encryption at rest: AES-256-GCM
   - Encryption in transit: TLS 1.3
   - Secure session cookies (httpOnly, secure, sameSite)
   - Input validation and sanitization
   - SQL injection prevention (parameterized queries)
   - XSS protection (Content Security Policy)

3. **API Security**
   - Rate limiting (configurable per tier)
   - Request size limits
   - CORS restrictions
   - API key authentication for server-to-server
   - Request signing for webhooks

4. **Infrastructure Security**
   - Security headers (HSTS, X-Frame-Options, etc.)
   - Regular dependency updates
   - Automated vulnerability scanning
   - Penetration testing (annual)
   - Security-focused code reviews

5. **Privacy & Compliance**
   - GDPR compliance measures
   - Data minimization
   - Right to erasure (delete account)
   - Data export functionality
   - Privacy policy and terms of service
   - Cookie consent management

### Known Limitations

1. **Two-Factor Authentication (2FA)**
   - Status: Planned for v1.1
   - Current: Email-based verification only
   - Mitigation: Strong password requirements, account lockout after failed
     attempts

2. **API Key Rotation**
   - Status: Manual process
   - Improvement: Automatic rotation planned for v1.2
   - Current: Users must manually regenerate API keys

3. **Webhook Signature Validation**
   - Status: Implemented
   - Note: Ensure webhook secrets are kept secure

4. **File Upload Validation**
   - File types: Limited to images and 3D models
   - Size limit: 10MB per file
   - Virus scanning: Recommended for production deployments
   - Mitigation: Strict file type checking, size limits, isolated storage

## Security Audit History

| Date       | Type           | Conducted By  | Severity Found | Status   |
| ---------- | -------------- | ------------- | -------------- | -------- |
| 2026-01-10 | Internal Audit | Security Team | None           | Complete |

**Note**: We conduct internal security audits quarterly and external penetration
testing annually.

## Security Contacts

- **Security Issues**: security@kitchenxpert.com
- **General Security Questions**: security@kitchenxpert.com
- **Security Team Lead**: security-lead@kitchenxpert.com

## Security Acknowledgments

We thank the following researchers for responsibly disclosing security
vulnerabilities:

- None yet (initial release)

Want to be listed here? Report a valid security vulnerability!

## Legal

### Safe Harbor

KitchenXpert supports safe harbor for security researchers who:

- Make a good faith effort to avoid privacy violations, data destruction, and
  service interruption
- Only interact with accounts you own or with explicit permission from the
  account holder
- Do not exploit a vulnerability beyond the minimum necessary to demonstrate it
- Report vulnerabilities promptly
- Keep vulnerability details confidential until we've resolved the issue

We will not pursue legal action against researchers who follow these guidelines.

### Scope

The following are **in scope** for security testing:

- KitchenXpert web application (https://app.kitchenxpert.com)
- KitchenXpert API (https://api.kitchenxpert.com)
- Self-hosted installations (on your own infrastructure)

The following are **out of scope**:

- Third-party services and integrations
- Physical security testing
- Social engineering attacks
- Denial of service attacks
- Spam or bulk email testing
- Automated scanning without prior approval

### Exclusions

The following issues are **not considered vulnerabilities**:

- Missing security headers on non-sensitive pages
- Lack of DNSSEC
- SSL/TLS configuration issues on third-party services
- Clickjacking on non-sensitive pages
- Cross-Site Request Forgery (CSRF) on forms without sensitive actions
- Missing rate limiting on non-authentication endpoints
- Descriptive error messages without sensitive data
- Version disclosure
- Open redirects (unless exploitable for auth bypass)
- Reports from automated scanners without proof of exploitability

## Additional Resources

- **Security Best Practices Guide**: https://docs.kitchenxpert.com/security
- **Architecture Security Documentation**:
  [docs/architecture/security.md](./docs/architecture/security.md)
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **CWE/SANS Top 25**: https://cwe.mitre.org/top25/

## Updates to This Policy

We may update this security policy from time to time. Changes will be posted on
this page with an updated "Last Updated" date.

For significant changes, we will notify users via:

- Email to registered users
- Announcement on our blog
- GitHub security advisory

---

**Thank you for helping keep KitchenXpert secure!**

If you have any questions about this security policy, please contact
security@kitchenxpert.com.
