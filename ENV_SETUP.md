# Environment Setup Guide

## ✅ Setup Complete!

The database is now configured and ready to use at `./prisma/translation.db`. 

**No `.env` file needed!** The system uses a hardcoded path for simplicity.

## Database Configuration

The application uses Prisma with SQLite by default. The database is located at:
```
./prisma/translation.db
```

This path is **hardcoded in the schema** - no environment variables required!

## Option 2: Custom Database Path (Optional)

If you want to customize the database location or use a different database:

1. Create a `.env` file in the project root:

```bash
# In the project root directory
touch .env
```

2. Add your database configuration:

```env
# For local SQLite (custom path)
DATABASE_URL="file:./path/to/your/database.db"

# OR for PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/translation"

# OR for MySQL
DATABASE_URL="mysql://user:password@localhost:3306/translation"
```

3. Restart your development server

## Quick Start (No .env file needed)

```bash
# Generate Prisma client
npm run prisma:generate

# Initialize database
npm run prisma:push

# Start the app
npm run dev
```

The database will be created at `./prisma/translation.db` automatically.

## Verifying Setup

After running the commands above, you should see:
- ✅ `./prisma/translation.db` file created
- ✅ `./src/generated/prisma` directory with Prisma client
- ✅ No errors when starting the app

## Troubleshooting

### "Missing required environment variable: DATABASE_URL"

This error should no longer occur as we've set a default value. If you still see it:

1. Make sure you're using the latest `prisma.config.ts`
2. Try running: `export DATABASE_URL="file:./prisma/translation.db" && npm run prisma:generate`

### "Can't reach database server"

- For SQLite: Ensure the `./prisma/` directory exists
- For other databases: Verify connection string and database is running

### Permission Errors

```bash
# Make sure prisma directory is writable
chmod -R 755 ./prisma/
```

## Development vs Production

### Development (Current Setup)
- Uses local SQLite database
- File: `./prisma/translation.db`
- No external dependencies
- Easy backup (just copy the .db file)

### Production (Future)
For production deployment, consider:
- PostgreSQL or MySQL for better concurrent access
- Set `DATABASE_URL` in production environment
- Regular database backups
- Connection pooling

## Database Management

### View Database Contents
```bash
npm run prisma:studio
```
This opens a web interface at `http://localhost:5555`

### Reset Database (⚠️ Deletes all data)
```bash
rm ./prisma/translation.db
npm run prisma:push
```

### Backup Database
```bash
# Simple file copy
cp ./prisma/translation.db ./backups/translation-backup-$(date +%Y%m%d).db
```

### Restore Database
```bash
cp ./backups/translation-backup-YYYYMMDD.db ./prisma/translation.db
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./prisma/translation.db` | Database connection string |

## Security Notes

- ✅ `.env` file is in `.gitignore` (your credentials are safe)
- ✅ SQLite database is local (no network exposure)
- ✅ No sensitive data in config files

## Next Steps

1. ✅ Configuration is complete with defaults
2. 📚 See `QUICK_START_STORAGE.md` for storage system usage
3. 🚀 Start using the app - everything is ready!

---

**Need help?** Check the main documentation or the error messages in the browser console.

