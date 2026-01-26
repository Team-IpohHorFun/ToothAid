import mongoose from 'mongoose';
import Child from '../models/Child.js';
import Visit from '../models/Visit.js';
import ProcessedOp from '../models/ProcessedOp.js';
import dotenv from 'dotenv';

dotenv.config();

const viewData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const childCount = await Child.countDocuments();
    const visitCount = await Visit.countDocuments();
    const processedOpsCount = await ProcessedOp.countDocuments();
    
    console.log('📊 Database Statistics:');
    console.log(`   Children: ${childCount}`);
    console.log(`   Visits: ${visitCount}`);
    console.log(`   Processed Operations: ${processedOpsCount}\n`);
    
    if (childCount > 0) {
      console.log('👶 Sample Children (first 5):');
      const children = await Child.find().limit(5).sort({ createdAt: -1 }).lean();
      children.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.fullName}`);
        console.log(`      School: ${c.school}, Barangay: ${c.barangay}`);
        console.log(`      Created: ${new Date(c.createdAt).toLocaleString()}\n`);
      });
    }
    
    if (visitCount > 0) {
      console.log('🦷 Sample Visits (first 5):');
      const visits = await Visit.find().limit(5).sort({ date: -1 }).lean();
      for (const v of visits) {
        const child = await Child.findOne({ childId: v.childId }).lean();
        console.log(`   - ${v.type} on ${new Date(v.date).toLocaleDateString()}`);
        console.log(`     Child: ${child ? child.fullName : 'Unknown'}`);
        if (v.painFlag || v.swellingFlag) {
          const flags = [];
          if (v.painFlag) flags.push('Pain');
          if (v.swellingFlag) flags.push('Swelling');
          console.log(`     Flags: ${flags.join(', ')}`);
        }
        if (v.decayedTeeth !== null || v.missingTeeth !== null || v.filledTeeth !== null) {
          const teeth = [];
          if (v.decayedTeeth !== null) teeth.push(`Decayed: ${v.decayedTeeth}`);
          if (v.missingTeeth !== null) teeth.push(`Missing: ${v.missingTeeth}`);
          if (v.filledTeeth !== null) teeth.push(`Filled: ${v.filledTeeth}`);
          console.log(`     Teeth: ${teeth.join(', ')}`);
        }
        console.log('');
      }
    }
    
    if (processedOpsCount > 0) {
      console.log('🔄 Recent Sync Operations (last 5):');
      const ops = await ProcessedOp.find().limit(5).sort({ processedAt: -1 }).lean();
      ops.forEach((op, i) => {
        console.log(`   ${i + 1}. ${op.opId.substring(0, 8)}... at ${new Date(op.processedAt).toLocaleString()}`);
      });
    }
    
    if (childCount === 0 && visitCount === 0) {
      console.log('⚠️  No data found. Make sure you:');
      console.log('   1. Have synced data from the app');
      console.log('   2. Or run: npm run seed (to create sample data)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

viewData();
