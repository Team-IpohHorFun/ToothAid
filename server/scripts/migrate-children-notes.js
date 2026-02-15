import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Child from '../models/Child.js';
import { connectDB } from '../db.js';

dotenv.config();

const migrateChildrenNotes = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const childrenWithoutNotes = await Child.countDocuments({
      notes: { $exists: false }
    });

    console.log(`📊 Found ${childrenWithoutNotes} child(ren) without a "notes" field\n`);

    if (childrenWithoutNotes === 0) {
      console.log('✅ No migration needed. All children already have the notes field.');
      process.exit(0);
    }

    const result = await Child.updateMany(
      { notes: { $exists: false } },
      { $set: { notes: null } }
    );

    console.log(`✅ Migration completed!`);
    console.log(`   - Matched ${result.matchedCount} child(ren)`);
    console.log(`   - Modified ${result.modifiedCount} child(ren)`);
    console.log(`   - Set notes: null where missing\n`);

    const stillMissing = await Child.countDocuments({ notes: { $exists: false } });
    if (stillMissing === 0) {
      console.log('✅ Verification: All children now have the notes field in MongoDB.');
    } else {
      console.log(`⚠️  Warning: ${stillMissing} child(ren) still missing notes field.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

migrateChildrenNotes();
