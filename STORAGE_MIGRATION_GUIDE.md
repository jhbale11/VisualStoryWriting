# Storage Migration Guide

## Overview

The translation system now uses a hybrid storage approach to prevent `QuotaExceededError` from localStorage:

- **Active Projects**: Stored in localStorage (small, fast access)
- **Completed Projects**: Automatically archived to Prisma DB (unlimited storage)
- **Backup**: Export/Import functionality for JSON backups

## Key Features

### 1. Automatic Archiving
When a project reaches completion status (`glossary_completed`, `translation_completed`, or `review_completed`), it is automatically archived to the database and removed from localStorage.

### 2. Archive Management
- **View Archived Projects**: Toggle "Show Archived" in the project list
- **Restore Projects**: Click the restore button on archived projects to bring them back to active
- **Manual Archive**: Click "Archive Completed" button to manually archive all completed projects

### 3. Export/Import
- **Export**: Click the download icon on any project to export it as JSON
- **Import**: Click the "Import" button in the main header to import a JSON project file

## Architecture

### Components

1. **TranslationStore** (`src/translation/store/TranslationStore.ts`)
   - Manages active projects in localStorage
   - Auto-archives completed projects
   - Loads archived projects on demand

2. **ProjectStorage** (`src/translation/services/ProjectStorage.ts`)
   - Handles all database operations
   - Provides export/import functionality
   - Manages project lifecycle

3. **Prisma Schema** (`prisma/schema.prisma`)
   - Defines database models
   - Supports SQLite (default) and other databases

### Database Models

```prisma
model TranslationProject {
  id                    String   @id
  name                  String
  type                  String
  status                String
  // ... other fields
  is_archived           Boolean  @default(false)
}

model ProjectExport {
  id          Int      @id @default(autoincrement())
  project_id  String
  export_path String
  created_at  DateTime @default(now())
}
```

## Setup

### 1. Environment Variables

Create a `.env` file in the project root (or copy from `.env.example`):

```bash
DATABASE_URL="file:./prisma/translation.db"
```

### 2. Generate Prisma Client

```bash
npm run prisma:generate
# or
npx prisma generate
```

### 3. Initialize Database

```bash
npm run prisma:push
# or
npx prisma db push
```

## Usage

### Viewing Projects

1. **Active Projects**: Displayed by default in the project list
2. **Archived Projects**: Toggle "Show Archived" switch to view
3. **Statistics**: View count of active vs archived projects in the control panel

### Archiving Projects

**Automatic**: Projects are automatically archived when they reach completion status.

**Manual**: Click "Archive Completed" button to manually archive all completed projects at once.

### Restoring Projects

1. Toggle "Show Archived" to view archived projects
2. Find the project you want to restore
3. Click the restore icon (↻)
4. The project will be moved back to active projects

### Export/Import

**Export a Project**:
1. Click the download icon (↓) on any active project
2. Project will be exported as `[project-name]_[timestamp].json`
3. File is saved to `./exports/` directory

**Import a Project**:
1. Click "Import" button in the main header
2. Select a JSON file from your computer
3. Project will be imported with a new ID and "(imported)" suffix

## Storage Limits

### LocalStorage
- **Before**: All projects stored in localStorage (5-10MB limit)
- **After**: Only active projects in localStorage (~1-2MB typical)

### Database
- **SQLite**: Virtually unlimited (limited only by disk space)
- **Other databases**: Configure via `DATABASE_URL` in `.env`

## Migration from Old Storage

When you first load the app after this update:

1. Existing completed projects in localStorage will be automatically detected
2. They will be migrated to the database
3. LocalStorage will be cleaned up automatically

**No action required** - the migration happens automatically on first load.

## Troubleshooting

### QuotaExceededError Still Occurs

If you still see this error:

1. Click "Archive Completed" to manually archive completed projects
2. Check if there are any large projects still in progress
3. Consider breaking large projects into smaller chunks

### Cannot Load Archived Projects

1. Check that Prisma client is generated: `npx prisma generate`
2. Verify database file exists: `./prisma/translation.db`
3. Check browser console for errors

### Export/Import Issues

**Export fails**:
- Ensure `./exports/` directory exists (created automatically)
- Check browser console for errors

**Import fails**:
- Verify JSON file format is correct (should be a TranslationProject object)
- Check that all required fields are present

## Best Practices

1. **Regular Exports**: Export important projects as backup
2. **Clean Up**: Periodically delete old archived projects from database
3. **Monitor Storage**: Use the statistics panel to track storage usage
4. **Chunk Size**: Keep chunk sizes reasonable (default: 1000 chars)

## API Reference

### TranslationStore Methods

```typescript
// Archive management
archiveCompletedProjects(): Promise<void>
loadArchivedProjects(): Promise<void>
toggleShowArchived(): void
restoreProject(projectId: string): Promise<void>

// Export/Import
exportProject(projectId: string, path: string): Promise<void>
importProject(path: string): Promise<void>
```

### ProjectStorage Methods

```typescript
// CRUD operations
saveProject(project: TranslationProject): Promise<void>
getProject(projectId: string): Promise<TranslationProject | null>
listProjects(options?): Promise<TranslationProject[]>
deleteProject(projectId: string): Promise<void>

// Archive management
archiveProject(project: TranslationProject): Promise<void>
listArchivedProjects(options?): Promise<TranslationProject[]>

// Export/Import
exportProjectToJson(projectId: string, exportPath: string): Promise<void>
importProjectFromJson(jsonPath: string): Promise<TranslationProject>

// Maintenance
cleanupOldProjects(keepCount: number): Promise<number>
getStorageStats(): Promise<StorageStats>
```

## Performance

### LocalStorage Access
- **Before**: O(n) with all projects
- **After**: O(1) with active projects only

### Database Access
- Indexed queries for fast lookups
- Lazy loading of archived projects
- Efficient pagination support

## Future Enhancements

1. **Cloud Sync**: Sync projects across devices
2. **Compression**: Compress large projects in database
3. **Auto-cleanup**: Automatically delete projects older than X days
4. **Batch Operations**: Archive/restore multiple projects at once
5. **Search**: Full-text search across archived projects

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Prisma client is up to date
3. Review this guide for common solutions
4. Check project documentation

