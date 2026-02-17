# CSV import format for ToothAid

Import with:
```bash
cd server
node scripts/import-csv.js path/to/children.csv path/to/visits.csv
```

Column names are **case-insensitive**. Use a header row; fields can be quoted with `"` if they contain commas.

---

## 1. Children CSV

| Column         | Required | Description |
|----------------|----------|-------------|
| **childId**    | Yes      | Unique ID (e.g. `child-abc123` or school ID). Must be unique across all children. |
| **fullName**   | Yes*     | Full name. If **firstName** and **lastName** are provided, they are used and fullName can be omitted. |
| **firstName**  | No       | First name. If present with **lastName**, used for storage and sorting by last name. |
| **lastName**   | No       | Last name. If present with **firstName**, used for storage and sorting by last name. |
| **dob**        | No       | Date of birth. ISO date preferred (e.g. `2015-03-20` or `2015-03-20T00:00:00.000Z`). |
| **sex**        | Yes*     | `M`, `F`, or `Other`. Defaults to `M` if missing. |
| **school**     | Yes      | School name. |
| **grade**      | No       | e.g. `1st Grade`, `2nd Grade`, `Kindergarten`, `SPED I`, `SPED II`, … |
| **barangay**   | Yes      | Barangay. |
| **guardianPhone** | No    | Phone number. |
| **notes**      | No       | Optional notes. |

*Import script does not read `notes` from CSV; only the columns above are used.

**Example (children.csv):**
```csv
childId,firstName,lastName,dob,sex,school,grade,barangay,guardianPhone
child-001,Maria,Santos,2014-05-12,F,Example Elementary,2nd Grade,Barangay A,09171234567
child-002,Juan,Dela Cruz,2013-08-20,M,Example Elementary,3rd Grade,Barangay B,
```
You can still use a single **fullName** column; the importer will split it into first/last (last word = last name).

---

## 2. Visits CSV

| Column          | Required | Description |
|-----------------|----------|-------------|
| **visitId**     | Yes      | Unique ID per visit (e.g. `visit-xyz789`). Must be unique. |
| **childId**     | Yes      | Must match a **childId** from the children CSV. Visits with unknown childId are skipped. |
| **date**        | Yes      | Visit date. ISO date preferred (e.g. `2025-01-15`). |
| **painFlag**    | No       | `true` or `false`. Defaults to false. |
| **swellingFlag**| No       | `true` or `false`. Defaults to false. |
| **decayedTeeth**| No       | Number (integer). Defaults to 0 in current import. |
| **missingTeeth**| No       | Number (integer). Defaults to 0. |
| **filledTeeth** | No       | Number (integer). Defaults to 0. |
| **treatmentTypes** | No     | Comma-separated list of treatment labels, e.g. `Oral Prophylaxis, Extraction (Permanent Teeth: 1)` or `Fluoride, Consultation`. |
| **notes**       | No       | Free text. |

**Example (visits.csv):**
```csv
visitId,childId,date,painFlag,swellingFlag,decayedTeeth,missingTeeth,filledTeeth,treatmentTypes,notes
visit-001,child-001,2025-01-10,false,false,2,0,1,"Oral Prophylaxis, Topical Fluoride Application",
visit-002,child-002,2025-01-12,true,false,3,0,0,"Extraction (Permanent Teeth: 1), Consultation",Patient in pain
```

**Treatment labels** (use exact text if you want them to match app filters/reports):  
Oral Prophylaxis, Topical Fluoride Application, Pits and Fissure Sealants, Extraction (…), Fillings / Restorations (…), Temporary Filling per Surface (…), Consultation, X-Rays, Silver Diamine Fluoride, Oral Examination, Others.

---

## Notes

- **Order:** Import children first; the script loads both CSVs and then inserts children, then visits. Visits whose **childId** is not in the children CSV are skipped (and a warning is printed).
- **Replace data:** The script **deletes all existing children and visits** in the database before inserting. Back up or use a test DB if needed.
- **Encoding:** Use UTF-8 for names and notes.
- **Dates:** Any format `Date()` can parse is fine; ISO (`YYYY-MM-DD` or full ISO) is safest.
