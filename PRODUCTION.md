# MetaMeet production runbook

## Required configuration

Copy `.env.example` to the deployment secret store and provide real values for `APP_URL`, `MONGODB_URI`, and `AUTH_SECRET`. Configure `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` for shared rate limits, locks, OTPs, and cache. Configure `QSTASH_TOKEN` plus both QStash signing keys when using external queues.

Production does not seed the development owner account or its known password. For a first deployment, provide `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PHONE`, and `BOOTSTRAP_ADMIN_PASSWORD` once; the owner is created only if that email does not already exist.

Choose `EMAIL_PROVIDER=resend` with `EMAIL_API_KEY`, or `EMAIL_PROVIDER=smtp` with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD`. Configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` only when Telegram is enabled. Set `DOCUMENT_STORAGE_PATH` to durable mounted storage for generated PDFs.

Phone login and legal-signature/password-reset OTPs use SMS.ir. Configure `SMS_PROVIDER=sms.ir`, `SMS_API_KEY`, and `SMS_LINE_NUMBER` in the deployment secret store before enabling production sign-in. `SMS_USERNAME` is retained for compatibility with the existing SMS.ir account configuration. Without an SMS provider, production OTP requests fail safely.

## Verification

Run:

```text
npm ci
npm run lint
npm test -- --run
npm run build
```

Use `/api/health` for liveness and `/api/ready` for readiness. Readiness requires MongoDB in production and reports queue diagnostics.

## Deployment and rollback

Deploy the built application and run `npm start` with production environment variables. Take a MongoDB backup before schema/index changes. Roll back by restoring the previous application artifact and environment version; do not delete sessions or meeting data during rollback.

Generated PDFs are currently written to local durable storage. Use a persistent volume and back it up with MongoDB. Cloud object-storage URL generation remains a future provider-specific task.

## Security operations

Use HTTPS, rotate `AUTH_SECRET` only with a planned session invalidation, restrict MongoDB network access, keep QStash signing keys private, and monitor `/api/ready`, failed queue jobs, email delivery errors, and repeated authentication failures.
