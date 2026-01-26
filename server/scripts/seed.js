import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Child from '../models/Child.js';
import Visit from '../models/Visit.js';
import User from '../models/User.js';
import { connectDB } from '../db.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Child.deleteMany({});
    await Visit.deleteMany({});

    // Create demo user
    const existingUser = await User.findOne({ username: 'demo' });
    if (!existingUser) {
      await User.create({ username: 'demo', password: 'demo' });
      console.log('Created demo user (username: demo, password: demo)');
    }

    // Sample children
    const children = [
      {
        childId: 'child-001',
        fullName: 'Maria Santos',
        dob: new Date('2015-03-15'),
        sex: 'F',
        school: 'Boctol Elementary School',
        grade: 'Grade 3',
        barangay: 'Boctol',
        guardianPhone: '09123456789',
        createdBy: 'demo',
        updatedBy: 'demo',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        childId: 'child-002',
        fullName: 'Juan Dela Cruz',
        age: 8,
        sex: 'M',
        school: 'Boctol Elementary School',
        grade: 'Grade 2',
        barangay: 'Boctol',
        guardianPhone: '09187654321',
        createdBy: 'demo',
        updatedBy: 'demo',
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16')
      },
      {
        childId: 'child-003',
        fullName: 'Ana Garcia',
        dob: new Date('2016-07-20'),
        sex: 'F',
        school: 'Upland Jagna Primary',
        grade: 'Grade 1',
        barangay: 'Upland',
        createdBy: 'demo',
        updatedBy: 'demo',
        createdAt: new Date('2024-01-17'),
        updatedAt: new Date('2024-01-17')
      }
    ];

    const createdChildren = await Child.insertMany(children);
    console.log(`Created ${createdChildren.length} children`);

    // Sample visits
    const visits = [
      {
        visitId: 'visit-001',
        childId: 'child-001',
        date: new Date('2024-01-20'),
        type: 'SCREENING',
        painFlag: true,
        swellingFlag: false,
        decayedTeeth: 2,
        missingTeeth: 0,
        filledTeeth: 1,
        treatmentTypes: ['Cleaning', 'Fluoride'],
        followUpDate: new Date('2024-02-20'),
        notes: 'Initial screening completed',
        createdBy: 'demo',
        createdAt: new Date('2024-01-20')
      },
      {
        visitId: 'visit-002',
        childId: 'child-001',
        date: new Date('2024-02-20'),
        type: 'TREATMENT',
        painFlag: false,
        swellingFlag: false,
        decayedTeeth: 1,
        missingTeeth: 0,
        filledTeeth: 2,
        treatmentTypes: ['Filling'],
        followUpDate: new Date('2024-03-20'),
        notes: 'Cavity filled',
        createdBy: 'demo',
        createdAt: new Date('2024-02-20')
      },
      {
        visitId: 'visit-003',
        childId: 'child-002',
        date: new Date('2024-01-25'),
        type: 'SCREENING',
        painFlag: true,
        swellingFlag: true,
        decayedTeeth: 4,
        missingTeeth: 1,
        filledTeeth: 0,
        treatmentTypes: [],
        followUpDate: new Date('2024-02-25'),
        notes: 'Severe case, needs attention',
        createdBy: 'demo',
        createdAt: new Date('2024-01-25')
      },
      {
        visitId: 'visit-004',
        childId: 'child-003',
        date: new Date('2024-01-30'),
        type: 'SCREENING',
        painFlag: false,
        swellingFlag: false,
        decayedTeeth: 0,
        missingTeeth: 0,
        filledTeeth: 0,
        treatmentTypes: ['Cleaning'],
        followUpDate: null,
        notes: 'Healthy teeth',
        createdBy: 'demo',
        createdAt: new Date('2024-01-30')
      }
    ];

    const createdVisits = await Visit.insertMany(visits);
    console.log(`Created ${createdVisits.length} visits`);

    console.log('Seed data created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
