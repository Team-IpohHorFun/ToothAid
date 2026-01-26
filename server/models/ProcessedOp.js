import mongoose from 'mongoose';

const processedOpSchema = new mongoose.Schema({
  opId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  processedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

export default mongoose.model('ProcessedOp', processedOpSchema);
