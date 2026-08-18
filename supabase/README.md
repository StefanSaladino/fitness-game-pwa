# Supabase directory

- `migrations/`: authoritative versioned schema changes
- `tests/`: pgTAP database/RLS tests (`npx supabase test db`)
- `seed.sql`: reproducible local exercise seed data
- `functions/`: reserved for Edge Functions when a real use case requires them

First local setup:

```bash
npx supabase init
npx supabase start
npx supabase db reset
npx supabase test db
```

See `docs/SUPABASE-SETUP.md` for the full walkthrough.
