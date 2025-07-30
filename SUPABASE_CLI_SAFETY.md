# Supabase CLI Safety Guide

## Important: Protecting Your Environment

This guide helps prevent accidentally overwriting your Supabase environment settings when using the Supabase CLI.

## Current Environment

Your project uses the following Supabase configuration:
- **URL**: `https://ecjwszfrantxpvuzfvwl.supabase.co`
- **Environment**: Development (as specified in `.env`)

## Safe CLI Usage

### 1. Always Use Local Development First
```bash
# Start local Supabase instance
supabase start

# This creates a local PostgreSQL database that won't affect production
```

### 2. Explicitly Specify Project When Linking
```bash
# When linking, always double-check the project ID
supabase link --project-ref ecjwszfrantxpvuzfvwl

# Verify current linked project
supabase projects list
```

### 3. Use Dry-Run for Migrations
```bash
# Always preview changes before applying
supabase db push --dry-run

# Review the output carefully before running without --dry-run
```

### 4. Backup Before Major Changes
```bash
# Create a backup before running migrations
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql
```

### 5. Environment Variable Protection
- Never run `supabase secrets set` without careful review
- Keep `.env` file in `.gitignore` (already configured)
- Use `supabase secrets list` to view current secrets without modifying

### 6. Database Migration Safety
```bash
# Generate migrations locally first
supabase migration new your_migration_name

# Test on local instance
supabase db reset

# Only push to remote after thorough testing
supabase db push
```

## Commands to Avoid in Production

⚠️ **Use with extreme caution:**
- `supabase db reset` - This will wipe your database
- `supabase secrets set` - Can overwrite environment variables
- `supabase functions delete` - Removes deployed functions
- `supabase db push --force` - Bypasses safety checks

## Recommended Workflow

1. **Development**: Always work with local Supabase first
2. **Testing**: Run migrations on local database
3. **Review**: Use `--dry-run` flags
4. **Backup**: Create backups before production changes
5. **Deploy**: Apply changes with explicit confirmation

## Quick Reference

```bash
# Safe commands for checking status
supabase status          # Show local dev status
supabase projects list   # List linked projects
supabase secrets list    # View secrets without modifying
supabase db dump         # Create backup

# Always use --dry-run first
supabase db push --dry-run
supabase functions deploy --dry-run
```

## Emergency Recovery

If you accidentally modify production:
1. Check your latest backup: `ls backup-*.sql`
2. Contact Supabase support if needed
3. Restore from Supabase dashboard's backup feature

Remember: When in doubt, use the Supabase Dashboard UI for production changes!