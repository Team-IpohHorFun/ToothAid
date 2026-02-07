/**
 * Import children and visits from CSV files into MongoDB.
 *
 * Usage:
 *   node scripts/import-csv.js [children.csv] [visits.csv]
 *
 * If paths are omitted, uses server/data/children_philippine_names_full.csv
 * and server/data/visits (1).csv
 *
 * Example with your Downloads files:
 *   node scripts/import-csv.js "/Users/zhihong/Downloads/children_philippine_names_full.csv" "/Users/zhihong/Downloads/visits (1).csv"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Child from '../models/Child.js';
import Visit from '../models/Visit.js';
import { connectDB } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

/** Parse a single CSV line respecting double-quoted fields */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (!inQuotes && c === ',') {
      result.push(current.trim());
      current = '';
    } else if (c !== '\r') current += c;
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCSVLine(line));
  return { headers, rows };
}

/** Get value from row by header name (case-insensitive, trim header) */
function get(row, headers, name) {
  const i = headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  return i >= 0 && row[i] !== undefined ? (row[i] || '').trim() : '';
}

async function run() {
  const defaultChildren = path.join(__dirname, '..', 'data', 'children_philippine_names_full.csv');
  const defaultVisits = path.join(__dirname, '..', 'data', 'visits (1).csv');

  const childrenPath = process.argv[2] || defaultChildren;
  const visitsPath = process.argv[3] || defaultVisits;

  if (!fs.existsSync(childrenPath)) {
    console.error('Children CSV not found:', childrenPath);
    process.exit(1);
  }
  if (!fs.existsSync(visitsPath)) {
    console.error('Visits CSV not found:', visitsPath);
    process.exit(1);
  }

  console.log('Reading', childrenPath);
  const { headers: childHeaders, rows: childRows } = parseCSV(childrenPath);
  console.log('Reading', visitsPath);
  const { headers: visitHeaders, rows: visitRows } = parseCSV(visitsPath);

  const createdBy = 'import';

  const children = childRows
    .filter((row) => row.length >= 6)
    .map((row) => {
      const childId = get(row, childHeaders, 'childId');
      const fullName = get(row, childHeaders, 'fullName');
      const dobStr = get(row, childHeaders, 'dob');
      const sexStr = get(row, childHeaders, 'sex') || 'M';
      const school = get(row, childHeaders, 'school');
      const grade = get(row, childHeaders, 'grade');
      const barangay = get(row, childHeaders, 'barangay');
      const guardianPhone = get(row, childHeaders, 'guardianPhone');
      const sex = sexStr.toUpperCase() === 'F' ? 'F' : sexStr.toUpperCase() === 'Other' ? 'Other' : 'M';
      return {
        childId,
        fullName,
        dob: dobStr ? new Date(dobStr) : null,
        sex,
        school,
        grade,
        barangay,
        guardianPhone: guardianPhone || null,
        createdBy,
        updatedBy: createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    })
    .filter((c) => c.childId && c.fullName && c.school && c.barangay);

  const visits = visitRows
    .filter((row) => row.length >= 9)
    .map((row) => {
      const visitId = get(row, visitHeaders, 'visitId');
      const childId = get(row, visitHeaders, 'childId');
      const dateStr = get(row, visitHeaders, 'date');
      const typeStr = get(row, visitHeaders, 'type') || 'SCREENING';
      const painFlag = get(row, visitHeaders, 'painFlag');
      const swellingFlag = get(row, visitHeaders, 'swellingFlag');
      const decayedTeeth = get(row, visitHeaders, 'decayedTeeth');
      const missingTeeth = get(row, visitHeaders, 'missingTeeth');
      const filledTeeth = get(row, visitHeaders, 'filledTeeth');
      const treatmentTypes = get(row, visitHeaders, 'treatmentTypes');
      const notes = get(row, visitHeaders, 'notes');
      const rawType = typeStr.trim().toUpperCase();
      const visitType = ['SCREENING', 'TREATMENT', 'FOLLOWUP'].includes(rawType) ? rawType : 'SCREENING';
      const treatments = treatmentTypes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        visitId,
        childId,
        date: new Date(dateStr || Date.now()),
        type: visitType,
        painFlag: painFlag.toLowerCase() === 'true',
        swellingFlag: swellingFlag.toLowerCase() === 'true',
        decayedTeeth: parseInt(decayedTeeth, 10) || 0,
        missingTeeth: parseInt(missingTeeth, 10) || 0,
        filledTeeth: parseInt(filledTeeth, 10) || 0,
        treatmentTypes: treatments,
        notes: notes || null,
        createdBy,
        createdAt: new Date()
      };
    })
    .filter((v) => v.visitId && v.childId);

  const childIds = new Set(children.map((c) => c.childId));
  const visitsWithValidChild = visits.filter((v) => childIds.has(v.childId));
  const skippedVisits = visits.length - visitsWithValidChild.length;
  if (skippedVisits > 0) {
    console.warn(`Skipping ${skippedVisits} visits with childId not in children CSV`);
  }

  await connectDB();

  console.log('Clearing existing children and visits...');
  await Child.deleteMany({});
  await Visit.deleteMany({});

  console.log('Inserting', children.length, 'children...');
  await Child.insertMany(children);

  console.log('Inserting', visitsWithValidChild.length, 'visits...');
  await Visit.insertMany(visitsWithValidChild);

  console.log('Import done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
