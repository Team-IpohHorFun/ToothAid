import mongoose from 'mongoose';

const childSchema = new mongoose.Schema({
  childId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true,
    default: null
  },
  lastName: {
    type: String,
    trim: true,
    default: null
  },
  dob: {
    type: Date,
    default: null
  },
  age: {
    type: Number,
    default: null
  },
  sex: {
    type: String,
    enum: ['M', 'F', 'Other'],
    required: true
  },
  school: {
    type: String,
    required: true,
    trim: true
  },
  grade: {
    type: String,
    trim: true
  },
  barangay: {
    type: String,
    required: true,
    trim: true
  },
  guardianPhone: {
    type: String,
    trim: true,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    default: null
  },
  createdBy: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  updatedBy: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Compound index for duplicate detection
childSchema.index({ school: 1, fullName: 1 });
childSchema.index({ school: 1, dob: 1 });

// Update updatedAt on save
childSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Child', childSchema);
