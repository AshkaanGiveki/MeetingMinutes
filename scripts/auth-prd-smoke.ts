const baseUrl = (process.env.AUTH_SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

async function expectStatus(path: string, expected: number, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (response.status !== expected) throw new Error(`${path}: expected ${expected}, received ${response.status}`);
  return response;
}

async function main() {
  await expectStatus('/api/health', 200);
  await expectStatus('/api/ready', 200);
  await expectStatus('/api/auth/me', 401);
  await expectStatus('/api/projects', 401);
  await expectStatus('/api/admin/organizations', 401);
  await expectStatus('/api/invitations/not-a-token', 404);
  await expectStatus('/api/auth/register', 410, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  console.log(`Auth PRD smoke checks passed against ${baseUrl}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
