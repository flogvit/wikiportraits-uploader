# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | Yes                |

## Reporting a Vulnerability

If you discover a security vulnerability in WikiPortraits, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please use one of the following methods:

1. **GitHub Security Advisories**: Report via [GitHub Security Advisories](https://github.com/flogvit/wikiportraits-uploader/security/advisories/new)
2. **Email**: Contact the maintainers directly

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix timeline**: Depends on severity, typically within 2 weeks for critical issues

### Scope

The following are in scope:
- Authentication and OAuth token handling
- API route security
- Cross-site scripting (XSS) vulnerabilities
- Data exposure or leakage
- Dependencies with known vulnerabilities

### Out of Scope

- Issues in third-party Wikimedia APIs
- Social engineering attacks
- Denial of service attacks

## Security Best Practices for Contributors

- Never commit secrets, API keys, or tokens
- Use environment variables for all sensitive configuration
- Validate and sanitize all user input
- Keep dependencies up to date
- Follow the principle of least privilege for API access
