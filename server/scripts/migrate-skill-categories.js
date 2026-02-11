/**
 * Migration: Add category field to existing SkillCatalog documents.
 *
 * Sets category to 'technology' for all documents that don't have one yet.
 *
 * Usage:
 *   node server/scripts/migrate-skill-categories.js
 *   MONGODB_URI=<prod-uri> node server/scripts/migrate-skill-categories.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/code-dojo';

async function migrate() {
  console.log(`Connecting to ${uri.replace(/\/\/[^@]+@/, '//***@')}...`);
  await mongoose.connect(uri);

  const result = await mongoose.connection.db
    .collection('skillcatalogs')
    .updateMany(
      { category: { $exists: false } },
      { $set: { category: 'technology' } },
    );

  console.log(`Updated ${result.modifiedCount} SkillCatalog document(s) with category: 'technology'`);

  await mongoose.disconnect();
  console.log('Done.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
