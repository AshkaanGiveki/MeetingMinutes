import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { logger } from '../services/logger';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let hasAttempted = false;

export async function connectMongoDB(): Promise<{ client: MongoClient | null; db: Db | null }> {
  if (hasAttempted && !isConnected) {
    return { client: null, db: null };
  }

  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('<user>') || uri.includes('<password>')) {
    logger.warn('MONGODB_URI is not set or contains placeholder credentials. Persistent database access is unavailable.');
    hasAttempted = true;
    return { client: null, db: null };
  }

  if (isConnected && db) {
    return { client, db };
  }

  hasAttempted = true;

  try {
    logger.info('Connecting to MongoDB Atlas / cluster...');

    const isTls = uri.startsWith('mongodb+srv://') || uri.includes('ssl=true') || uri.includes('tls=true');

    const options: MongoClientOptions = {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
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

    // Create indexes asynchronously
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

async function setupIndexes(database: Db) {
  try {
    await database.collection('meetings').createIndex({ id: 1 }, { unique: true });
    await database.collection('meetings').createIndex({ status: 1 });
    await database.collection('meetings').createIndex({ 'organizer.id': 1 });
    await database.collection('meetings').createIndex({ organizationId: 1, updatedAt: -1 });
    await database.collection('audit_logs').createIndex({ meetingId: 1, timestamp: -1 });
    await database.collection('users').createIndex({ email: 1 }, { unique: true });
    await database.collection('users').createIndex({ phoneNumber: 1 }, { unique: true, sparse: true });
    await database.collection('users').createIndex({ organizationId: 1, email: 1 });
    await database.collection('sessions').createIndex({ token: 1 }, { unique: true });
    await database.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await database.collection('guest_signing_tokens').createIndex({ token: 1 }, { unique: true });
    await database.collection('guest_signing_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await database.collection('invitations').createIndex({ token: 1 }, { unique: true });
    await database.collection('invitations').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await database.collection('notifications').createIndex({ userId: 1, createdAt: -1 });
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
