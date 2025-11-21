# Quick Start: Storage System

## Problem Solved

The translation system was experiencing `QuotaExceededError` because all projects were stored in browser localStorage (5-10MB limit). This has been resolved with a hybrid storage solution.

## Solution Overview

### Before
```
All Projects → localStorage (5-10MB limit) → QuotaExceededError ❌
```

### After
```
Active Projects → localStorage (1-2MB) ✅
Completed Projects → Prisma DB (unlimited) ✅
Backups → JSON Export/Import ✅
```

## Quick Setup

### ✅ Already Done!
The database has been set up and is ready to use at `./prisma/translation.db`.

### Just Start the App:
```bash
npm run dev
```

That's it! No environment variables or additional setup needed.

### Optional: Rebuild Database (if needed)
If you ever need to reset or rebuild:
```bash
# Regenerate Prisma client
npm run prisma:generate

# Sync database schema
npm run prisma:push
```

## How It Works

### 🔄 Automatic Archiving
- When a project reaches "completed" status, it's **automatically** moved to the database
- LocalStorage only keeps active (in-progress) projects
- No manual action needed!

### 📦 Archive Management UI

**View Archived Projects:**
- Toggle the "Show Archived" switch in the project list
- Archived projects appear with lower opacity and an "Archived" badge

**Restore a Project:**
- Click the restore icon (↻) on any archived project
- It will be moved back to active projects

**Manual Archive:**
- Click "Archive Completed" button to archive all completed projects at once

### 💾 Export/Import

**Export (Backup):**
- Click the download icon (↓) on any active project
- JSON file is saved to `./exports/` folder
- Use this for backup or sharing projects

**Import (Restore):**
- Click "Import" button in the main header
- Select a JSON file from your computer
- Project will be imported with a new ID

## Storage Breakdown

| Storage Type | What's Stored | Size Limit |
|--------------|---------------|------------|
| **localStorage** | Active projects only | 5-10MB (browser limit) |
| **Prisma DB** | Completed/archived projects | Unlimited (disk space) |
| **JSON Export** | Manual backups | N/A (file system) |

## Typical Storage Usage

### Before (All in localStorage)
```
10 small projects:  ~2MB
20 small projects:  ~4MB
30 small projects:  ~6MB ⚠️ 
40+ projects:       QuotaExceededError ❌
```

### After (Active in localStorage, Rest in DB)
```
5 active projects:    ~1MB ✅
100 archived projects: 0MB (in DB) ✅
Total localStorage:   ~1MB ✅
```

## Migration from Old Storage

**First Time Loading:**
1. App detects completed projects in localStorage
2. Automatically moves them to database
3. Cleans up localStorage
4. You'll see a console message: "Archiving X completed projects"

**Already Completed:**
- ✅ Prisma schema defined
- ✅ Database created
- ✅ Automatic migration enabled
- ✅ No manual action needed!

## Features

### ✅ What's New
- **Automatic archiving** of completed projects
- **View archived projects** with toggle switch
- **Restore archived projects** back to active
- **Export projects** to JSON for backup
- **Import projects** from JSON files
- **Manual archive button** for batch operations
- **Storage statistics** in the UI

### 🎯 Benefits
- No more QuotaExceededError
- Unlimited project storage
- Faster app performance (less localStorage access)
- Easy backup/restore workflow
- Keep all your projects forever

## Common Questions

**Q: Will I lose my existing projects?**
A: No! Existing projects will be automatically migrated on first load.

**Q: Can I access archived projects?**
A: Yes! Toggle "Show Archived" to view and restore them anytime.

**Q: Do I need to manually archive projects?**
A: No, it happens automatically when a project is completed. But you can also archive manually if needed.

**Q: What if I want to back up everything?**
A: Use the Export button on each project, or access the database file directly at `./prisma/translation.db`.

**Q: Can I use a different database?**
A: Yes! Change `DATABASE_URL` in `.env` to use PostgreSQL, MySQL, etc.

## Troubleshooting

### Still seeing QuotaExceededError?
1. Click "Archive Completed" to manually archive all completed projects
2. Check if you have very large active projects
3. Consider reducing chunk sizes for new projects

### Can't see archived projects?
1. Make sure you toggled "Show Archived" switch
2. Check browser console for errors
3. Verify database file exists: `./prisma/translation.db`

### Export/Import not working?
1. Check browser console for errors
2. Make sure `./exports/` directory exists
3. Verify JSON file format (should be a valid TranslationProject)

## File Structure

```
VisualStoryWriting/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── translation.db         # SQLite database
├── src/
│   ├── translation/
│   │   ├── services/
│   │   │   └── ProjectStorage.ts  # DB operations
│   │   └── store/
│   │       └── TranslationStore.ts # State management
│   └── view/
│       └── translation/
│           ├── ProjectList.tsx     # UI with archive toggle
│           └── TranslationMain.tsx # UI with import button
├── .env                       # Environment variables
└── STORAGE_MIGRATION_GUIDE.md # Detailed guide
```

## Next Steps

1. ✅ **You're all set!** The storage system is now working
2. 📚 Read `STORAGE_MIGRATION_GUIDE.md` for detailed documentation
3. 🚀 Start creating projects without worrying about storage limits!

## Support

For detailed API documentation and advanced features, see:
- `STORAGE_MIGRATION_GUIDE.md` - Complete technical guide
- `src/translation/services/ProjectStorage.ts` - Source code
- `src/translation/store/TranslationStore.ts` - State management

---

**Status**: ✅ Ready to use  
**Migration**: ✅ Automatic  
**Action Required**: None - just start using the app!

