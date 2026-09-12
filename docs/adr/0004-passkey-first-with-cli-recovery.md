---
status: accepted
---

# Use passkey-first identity with non-web recovery

The bootstrap owner and invited contributors create passkeys without requiring email or SMTP, and password fallback is disabled unless deployment configuration enables it. Catastrophic recovery is deliberately restricted to a rotating high-entropy secret used through authenticated cPanel/CLI so the public application never exposes a master recovery route.
