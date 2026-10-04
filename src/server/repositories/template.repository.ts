import { sampleTemplates } from '../../data/mockData';
import { Template } from '../../types';
import { logger } from '../services/logger';
import { getDb } from '../db/mongodb';

export class TemplateRepository {
  private templates: Map<string, Template> = new Map();

  private get allowsLocalFallback() {
    return process.env.NODE_ENV !== 'production';
  }

  constructor() {
    sampleTemplates.forEach((t) => this.templates.set(t.id, { ...t }));
    logger.info(`Template repository initialized with ${this.templates.size} default templates.`);
  }

  async getAll(): Promise<Template[]> {
    const db = getDb();
    if (db) {
      try {
        const docs = await db.collection('templates').find({}).toArray();
        return docs.map((d) => {
          const { _id, ...rest } = d;
          return rest as unknown as Template;
        });
      } catch (err) {
        logger.warn('Failed to fetch templates from MongoDB:', { metadata: { error: String(err) } });
      }
    }
    return this.allowsLocalFallback ? Array.from(this.templates.values()) : [];
  }

  async create(template: Template): Promise<Template> {
    this.templates.set(template.id, { ...template });
    const db = getDb();
    if (db) {
      try {
        await db.collection('templates').insertOne({ ...template });
      } catch (err) {
        if (!this.allowsLocalFallback) throw err;
        logger.warn('Failed to write template to MongoDB:', { metadata: { error: String(err) } });
      }
    }
    if (!getDb() && !this.allowsLocalFallback) {
      throw new Error('Persistent database is required in production.');
    }
    logger.info(`Created template ${template.id}: ${template.title}`);
    return { ...template };
  }

  async delete(id: string): Promise<boolean> {
    this.templates.delete(id);
    const db = getDb();
    if (db) {
      try {
        await db.collection('templates').deleteOne({ id });
      } catch (err) {
        if (!this.allowsLocalFallback) throw err;
        logger.warn('Failed to delete template from MongoDB:', { metadata: { error: String(err) } });
      }
    }
    return true;
  }
}

export const templateRepository = new TemplateRepository();
