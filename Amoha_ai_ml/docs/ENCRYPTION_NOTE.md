# AMOHA Green AI Encryption Note

## 1. TLS for Data in Transit

- All data transmitted between Orange (frontend) and Yellow (backend) must use TLS 1.2 or higher.
- The `/analyze` endpoint must enforce HTTPS.
- Client certificates or mutual TLS are not required for demo but recommended for production.

## 2. Encryption at Rest

- Stored AI analysis outputs (responses from `/analyze`) must be encrypted at rest.
- Use AES-256 or equivalent encryption for stored payload files.
- Encryption keys must be managed via environment variables or secret management service (e.g., HashiCorp Vault, AWS KMS).
- Never store encryption keys in source code, environment files committed to version control, or client devices.

## 3. Secret Management

- No secrets (API keys, encryption keys, passwords) may be committed to source code.
- Use `.env` files or environment variables for any required secrets.
- Add `.env*` to `.gitignore` to prevent accidental commits.
- Rotate secrets periodically according to security policy.

## 4. No Sensitive Logs

- Raw care-log text must be redacted before any debug logging.
- Assistance probabilities and alert levels may be logged in aggregated form.
- Raw PII (names, IDs, addresses) must never appear in log output.

## 5. Key Rotation

- Encryption keys must be rotated at least every 90 days.
- Key rotation must not break existing stored data (use re-encryption or re-keying procedures).
- Automated key rotation scripts should be tested in staging before production deployment.

## 6. Production Compliance

- Encryption standards must meet relevant regulations (e.g., HIPAA, PDPP Act for India).
- Regular security audits of encryption implementation.
- Documented key management procedures.