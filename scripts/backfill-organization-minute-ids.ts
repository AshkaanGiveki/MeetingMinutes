import dotenv from 'dotenv';
import { connectMongoDB } from '../src/server/db/mongodb';

dotenv.config();

const main = async () => {
  const { db, client } = await connectMongoDB();
  if (!db || !client) throw new Error('MongoDB connection failed; no minute numbers were changed.');

  try {
    const meetings = await db.collection('meetings')
      .find({}, { projection: { _id: 1, id: 1, organizationId: 1, organizationMinuteId: 1, createdAt: 1, updatedAt: 1 } })
      .sort({ organizationId: 1, createdAt: 1, updatedAt: 1, id: 1 })
      .toArray();

    const byOrganization = new Map<string, typeof meetings>();
    for (const meeting of meetings) {
      const organizationId = typeof meeting.organizationId === 'string' && meeting.organizationId.trim()
        ? meeting.organizationId
        : '';
      if (!organizationId) continue;
      const group = byOrganization.get(organizationId) || [];
      group.push(meeting);
      byOrganization.set(organizationId, group);
    }

    let updated = 0;
    let skippedWithoutOrganization = meetings.filter((meeting) => !meeting.organizationId).length;
    for (const [organizationId, organizationMeetings] of byOrganization) {
      const used = new Set<number>();
      for (const meeting of organizationMeetings) {
        if (Number.isInteger(meeting.organizationMinuteId) && meeting.organizationMinuteId > 0) used.add(meeting.organizationMinuteId);
      }

      let next = 1;
      for (const meeting of organizationMeetings) {
        if (Number.isInteger(meeting.organizationMinuteId) && meeting.organizationMinuteId > 0) continue;
        while (used.has(next)) next += 1;
        await db.collection('meetings').updateOne(
          { _id: meeting._id, organizationId, organizationMinuteId: { $exists: false } },
          { $set: { organizationMinuteId: next, updatedAt: new Date().toISOString() } },
        );
        used.add(next);
        next += 1;
        updated += 1;
      }
    }

    await db.collection('meetings').createIndex(
      { organizationId: 1, organizationMinuteId: 1 },
      { unique: true, sparse: true, name: 'organization_minute_id_unique' },
    );

    const indexes = await db.collection('meetings').listIndexes().toArray();
    console.log(JSON.stringify({ updated, totalMeetings: meetings.length, skippedWithoutOrganization, uniqueIndexCreated: indexes.some((index) => index.name === 'organization_minute_id_unique') }));
  } finally {
    await client.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
