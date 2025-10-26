# Attendee Import Guide

## CSV/XLSX Import Feature

You can bulk import attendees using CSV or XLSX files.

### Required Columns
- **name**: Full name of the attendee
- **organization**: Company or organization name
- **role**: Job title or role

### Optional Columns
- **email**: Email address (can be left empty)

### File Format Examples

#### CSV Format
```csv
name,organization,role,email
John Doe,Acme Corp,Software Engineer,john@example.com
Jane Smith,Tech Inc,Product Manager,jane@example.com
Bob Johnson,StartUp LLC,Designer,bob@example.com
```

#### Excel Format
Create an Excel file with the same columns as headers in the first row.

### Features
- ✅ Automatic duplicate detection (case-insensitive name matching)
- ✅ Skips duplicate entries automatically
- ✅ Shows import summary with success/duplicate/error counts
- ✅ Supports both CSV and XLSX formats
- ✅ Template download available in the import dialog

### How to Use
1. Click "Import CSV" button in the Attendees page
2. Download the template if needed
3. Prepare your file with required columns
4. Click "Choose File" and select your CSV or XLSX file
5. The import will process automatically
6. View the summary of imported attendees

### Notes
- Duplicate names (case-insensitive) will be automatically skipped
- Missing required fields will result in errors for those rows
- Random avatars are assigned to imported attendees
- All attendees start with "Not Checked-in" status
