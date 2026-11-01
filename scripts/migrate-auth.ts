import dotenv from 'dotenv';
import { connectMongoDB } from '../src/server/db/mongodb';
import { normalizeIranianPhoneNumber } from '../src/server/utils/phone';

dotenv.config();

/**
 * Idempotent, additive migration for the authentication PRD.
 * It never deletes users, memberships, meetings, signatures, or invitations.
 */
async function main() {
  const { db, client } = await connectMongoDB();
  if (!db || !client) throw new Error('MongoDB connection failed; no migration was written.');
  try {
    const users = await db.collection<any>('users').find({}).toArray();
    let normalized = 0;
    let identityCompleted = 0;
    for (const user of users) {
      const set: Record<string, unknown> = {};
      if (user.phoneNumber) {
        try {
          const phoneNumber = normalizeIranianPhoneNumber(user.phoneNumber);
          if (phoneNumber !== user.phoneNumber) set.phoneNumber = phoneNumber;
        } catch {
          // Preserve invalid legacy data for support review instead of guessing.
        }
      }
      const parts = String(user.name || '').trim().split(/\s+/).filter(Boolean);
      if (!user.firstName && parts[0]) set.firstName = parts[0];
      if (!user.lastName && parts.slice(1).join(' ')) set.lastName = parts.slice(1).join(' ');
      if (!user.accountStatus) set.accountStatus = 'active';
      if (!user.createdAt) set.createdAt = new Date().toISOString();
      if (!user.updatedAt) set.updatedAt = new Date().toISOString();
      if (Object.keys(set).length) {
        await db.collection('users').updateOne({ _id: user._id }, { $set: set });
        if (set.phoneNumber) normalized += 1;
        if (set.firstName || set.lastName) identityCompleted += 1;
      }
    }
    await db.collection('auth_migration_runs').insertOne({ id: `auth_migration_${Date.now()}`, normalized, identityCompleted, userCount: users.length, completedAt: new Date().toISOString() });
    console.log(JSON.stringify({ ok: true, userCount: users.length, normalized, identityCompleted }));
  } finally {
    await client.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
