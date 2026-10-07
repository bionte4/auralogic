-- Convert courses.track from Postgres enum "Track" to text before prisma db push.
-- Safe to re-run: no-ops when the column is already text or the enum is gone.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'courses'
      AND column_name = 'track'
      AND udt_name = 'Track'
  ) THEN
    ALTER TABLE "courses" ALTER COLUMN "track" TYPE TEXT USING "track"::text;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Track')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_attribute a
       JOIN pg_class c ON a.attrelid = c.oid
       JOIN pg_type t ON a.atttypid = t.oid
       WHERE c.relkind = 'r'
         AND t.typname = 'Track'
         AND a.attnum > 0
         AND NOT a.attisdropped
     ) THEN
    DROP TYPE "Track";
  END IF;
END $$;
