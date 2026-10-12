import dotenv from 'dotenv';

const inheritedEnv = { ...process.env };
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
for (const [key, value] of Object.entries(inheritedEnv)) {
  if (value !== undefined) process.env[key] = value;
}

process.env.NODE_ENV ||= 'development';

await import('../apps/worker/index.ts');
