import { Template } from '../../types';
import { logger } from '../services/logger';
import { getDb } from '../db/mongodb';

function requireDb() {
  const db = getDb();
  if (!db) throw new Error('Persistent MongoDB connection is required.');
  return db;
}

export class TemplateRepository {
  async getAll(organizationId?: string): Promise<Template[]> {
    const docs = await requireDb().collection('templates').find(organizationId ? { organizationId } : {}).sort({ title: 1 }).toArray();
    return docs.map(({ _id, ...rest }) => rest as unknown as Template);
  }

  async create(template: Template): Promise<Template> {
    await requireDb().collection('templates').updateOne({ id: template.id }, { $set: template }, { upsert: true });
    logger.info(`Saved template ${template.id}: ${template.title}`);
    return { ...template };
  }

  async delete(id: string, organizationId?: string): Promise<boolean> {
    const result = await requireDb().collection('templates').deleteOne({ id, ...(organizationId ? { organizationId } : {}) });
    return result.deletedCount > 0;
  }
}

export const templateRepository = new TemplateRepository();
