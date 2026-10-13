import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { logger } from '../services/logger';
import { normalizeIranianPhoneNumber } from '../utils/phone';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let hasAttempted = false;
let lastAttemptAt = 0;
const RETRY_INTERVAL_MS = 5000;

export async function connectMongoDB(): Promise<{ client: MongoClient | null; db: Db | null }> {
  if (isConnected && db) {
    return { client, db };
  }

  if (hasAttempted && Date.now() - lastAttemptAt < RETRY_INTERVAL_MS) {
    return { client: null, db: null };
  }

  // Vercel environment values can arrive with accidental surrounding quotes or whitespace
  // when copied from a local dotenv file. Normalize only the wrapper, never the credentials.
  const rawUri = process.env.MONGODB_URI;
  const uri = rawUri?.trim().replace(/^(["'])(.*)\1$/, '$2');

  if (!uri || uri.includes('<user>') || uri.includes('<password>')) {
    logger.warn('MONGODB_URI is not set or contains placeholder credentials. Persistent database access is unavailable.');
    hasAttempted = true;
    return { client: null, db: null };
  }

  hasAttempted = true;
  lastAttemptAt = Date.now();

  try {
    logger.info('Connecting to MongoDB Atlas / cluster...');

    const isTls = uri.startsWith('mongodb+srv://') || uri.includes('ssl=true') || uri.includes('tls=true');

    const options: MongoClientOptions = {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      ...(isTls
        ? {
            tls: true,
            tlsAllowInvalidCertificates: process.env.NODE_ENV !== 'production',
            tlsAllowInvalidHostnames: process.env.NODE_ENV !== 'production',
          }
        : {}),
    };

    client = new MongoClient(uri, options);
    await client.connect();

    db = client.db('metameet');
    isConnected = true;
    logger.info('Successfully connected to MongoDB database (metameet).');

    await normalizeIranianPhoneData(db);
    setupIndexes(db).catch((err) => {
      logger.warn('Index verification note:', { metadata: { error: String(err) } });
    });

    return { client, db };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn(
      'MongoDB connection could not be established (TLS/SSL handshake or Atlas IP Access List). Database-backed features are unavailable until the connection is restored.',
      { metadata: { note: errorMsg.slice(0, 120) } }
    );
    if (client) {
      try {
        await client.close();
      } catch {
        // pass
      }
      client = null;
    }
    db = null;
    isConnected = false;
    return { client: null, db: null };
  }
}

/**
 * Marks the current MongoDB connection as unusable after a network/topology
 * failure. The next API request can then trigger a fresh connection attempt.
 */
export function markMongoUnavailable(): void {
  const staleClient = client;
  client = null;
  db = null;
  isConnected = false;
  hasAttempted = false;
  lastAttemptAt = 0;

  if (staleClient) {
    void staleClient.close().catch(() => undefined);
  }
}

async function normalizeIranianPhoneData(database: Db) {
  const collections = ['users', 'organization_invitations', 'sessions'];
  let updated = 0;
  for (const collectionName of collections) {
    const collection = database.collection<{ _id?: unknown; phoneNumber?: unknown }>(collectionName);
    const records = await collection.find({ phoneNumber: { $type: 'string' } }, { projection: { _id: 1, phoneNumber: 1 } }).toArray();
    for (const record of records) {
      if (typeof record.phoneNumber !== 'string') continue;
      try {
        const normalized = normalizeIranianPhoneNumber(record.phoneNumber);
        if (normalized !== record.phoneNumber) {
          await collection.updateOne({ _id: record._id }, { $set: { phoneNumber: normalized } });
          updated += 1;
        }
      } catch {
        logger.warn(`Skipped invalid phone number during ${collectionName} normalization.`);
      }
    }
  }
  if (updated > 0) logger.info(`Normalized ${updated} Iranian phone number record(s) to 09xxxxxxxxx.`);
}

async function setupIndexes(database: Db) {
  try {
    await database.collection('meetings').createIndex({ id: 1 }, { unique: true });
    await database.collection('meetings').createIndex({ status: 1 });
    await database.collection('meetings').createIndex({ 'organizer.id': 1 });
    await database.collection('meetings').createIndex({ organizationId: 1, updatedAt: -1 });
    await database.collection('meetings').createIndex(
      { organizationId: 1, organizationMinuteId: 1 },
      { unique: true, sparse: true, name: 'organization_minute_id_unique' }
    );
    await database.collection('organizations').createIndex({ id: 1 }, { unique: true });
    await database.collection('organizations').createIndex({ createdBy: 1, createdAt: -1 });
    await database.collection('organization_memberships').createIndex({ organizationId: 1, userId: 1 }, { unique: true });
    await database.collection('organization_memberships').createIndex({ userId: 1, status: 1 });
    await database.collection('organization_memberships').createIndex({ organizationId: 1, status: 1 });
    await database.collection('organization_invitations').createIndex({ token: 1 }, { unique: true });
    await database.collection('organization_invitations').createIndex({ organizationId: 1, status: 1 });
    await database.collection('organization_invitations').createIndex({ phoneNumber: 1, status: 1 });
    await database.collection('organization_invitations').createIndex({ email: 1, status: 1 });
    await database.collection('meeting_members').createIndex({ meetingId: 1, userId: 1 }, { unique: true });
    await database.collection('meeting_members').createIndex({ organizationId: 1, userId: 1 });
    await database.collection('audit_logs').createIndex({ meetingId: 1, timestamp: -1 });
    await database.collection('users').createIndex({ email: 1 }, { unique: true });
    await database.collection('users').createIndex({ phoneNumber: 1 }, { unique: true, sparse: true });
    await database.collection('sessions').createIndex({ token: 1 }, { unique: true });
    await database.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await database.collection('guest_signing_tokens').createIndex({ token: 1 }, { unique: true });
    await database.collection('guest_signing_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await database.collection('invitations').createIndex({ token: 1 }, { unique: true });
    await database.collection('invitations').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await database.collection('notifications').createIndex({ userId: 1, organizationId: 1, createdAt: -1 });
    await database.collection('ai_suggestions').createIndex({ meetingId: 1, createdAt: -1 });
    await database.collection('queue_dead_letters').createIndex({ id: 1 }, { unique: true });
    await database.collection('email_deliveries').createIndex({ createdAt: -1 });
  } catch (err) {
    logger.warn('Index setup note:', { metadata: { error: String(err) } });
  }
}

export function getDb(): Db | null {
  return isConnected ? db : null;
}
