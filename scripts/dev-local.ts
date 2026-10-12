import dotenv from 'dotenv';

// Load the checked-in dotenv convention used by the server, then allow local
// overrides. Values explicitly supplied by the PowerShell session win last.
const inheritedEnv = { ...process.env };
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
for (const [key, value] of Object.entries(inheritedEnv)) {
  if (value !== undefined) process.env[key] = value;
}

process.env.NODE_ENV ||= 'development';
process.env.PORT ||= '3000';
process.env.APP_URL ||= `http://localhost:${process.env.PORT}`;

await import('../server.ts');
