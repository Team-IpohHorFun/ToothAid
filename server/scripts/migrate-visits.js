import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Visit from '../models/Visit.js';
import { connectDB } from '../db.js';

dotenv.config();

const migrateVisits = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Count visits with old fields
    const visitsWithOldFields = await Visit.countDocuments({
      $or: [
        { dmft: { $exists: true } },
        { DMFT: { $exists: true } },
        { referralFlag: { $exists: true } }
      ]
    });

    console.log(`📊 Found ${visitsWithOldFields} visits with old fields (dmft, DMFT, or referralFlag)\n`);

    if (visitsWithOldFields === 0) {
      console.log('✅ No visits need migration. All visits are already using the new schema.');
      process.exit(0);
    }

    // Remove old fields from all visits
    const result = await mongoose.connection.db.collection('visits').updateMany(
      {},
      {
        $unset: {
          dmft: '',
          DMFT: '',
          referralFlag: ''
        }
      }
    );

    console.log(`✅ Migration completed!`);
    console.log(`   - Matched ${result.matchedCount} visit(s)`);
    console.log(`   - Modified ${result.modifiedCount} visit(s)`);
    console.log(`   - Removed fields: dmft, DMFT, referralFlag\n`);

    // Verify migration
    const remainingOldFields = await Visit.countDocuments({
      $or: [
        { dmft: { $exists: true } },
        { DMFT: { $exists: true } },
        { referralFlag: { $exists: true } }
      ]
    });

    if (remainingOldFields === 0) {
      console.log('✅ Verification: All old fields have been removed successfully!');
    } else {
      console.log(`⚠️  Warning: ${remainingOldFields} visit(s) still have old fields.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

migrateVisits();
