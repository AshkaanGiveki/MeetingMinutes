import dotenv from 'dotenv';

// Load the checked-in dotenv convention used by the server, then allow local
// overrides. Values explicitly supplied by the PowerShell session win last.
const inheritedEnv = { ...process.env };
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
for (const [key, value] of Object.entries(inheritedEnv)) {
  if (value !== undefined) process.env[key] = value;
}

// This entry point is explicitly for local development. Do not let a
// production value from .env turn the local QStash callback into a 503.
process.env.NODE_ENV = 'development';
process.env.PORT ||= '3000';
process.env.APP_URL ||= `http://localhost:${process.env.PORT}`;

await import('../server.ts');
