-- Run once on a database created for the English LMS, before `npx prisma db push`.
-- Back up first. New databases can skip this file and use `npx prisma db push` alone.

CREATE TYPE "SkillBand" AS ENUM ('FOUNDATION', 'PRACTITIONER', 'ADVANCED');
CREATE TYPE "Track" AS ENUM ('NETWORK', 'CYBERSECURITY', 'DATA_SCIENCE', 'AI');
CREATE TYPE "ContentLocale" AS ENUM ('ID', 'EN');
CREATE TYPE "UiLocale" AS ENUM ('ID', 'EN');
CREATE TYPE "ProjectKind_new" AS ENUM ('LAB_REPORT', 'ANALYSIS', 'DESIGN', 'NOTEBOOK');

ALTER TABLE "courses" ADD COLUMN "track" "Track";
ALTER TABLE "courses" ADD COLUMN "contentLocale" "ContentLocale" NOT NULL DEFAULT 'ID';
ALTER TABLE "courses" ADD COLUMN "pairedCourseId" UUID;
ALTER TABLE "courses" ADD COLUMN "level_new" "SkillBand";

UPDATE "courses"
SET "level_new" = (
  CASE "level"::text
    WHEN 'A1' THEN 'FOUNDATION'
    WHEN 'A2' THEN 'FOUNDATION'
    WHEN 'B1' THEN 'PRACTITIONER'
    WHEN 'B2' THEN 'PRACTITIONER'
    WHEN 'C1' THEN 'ADVANCED'
    WHEN 'C2' THEN 'ADVANCED'
    ELSE 'FOUNDATION'
  END
)::"SkillBand",
"track" = 'NETWORK';

ALTER TABLE "courses" DROP COLUMN "level";
ALTER TABLE "courses" RENAME COLUMN "level_new" TO "level";
ALTER TABLE "courses" ALTER COLUMN "level" SET NOT NULL;
ALTER TABLE "courses" ALTER COLUMN "track" SET NOT NULL;
ALTER TABLE "courses" DROP COLUMN "phase";

DROP TYPE "CefrLevel";
DROP TYPE "LearningPhase";

ALTER TABLE "phase_projects"
  ALTER COLUMN "kind" TYPE "ProjectKind_new"
  USING (
    CASE "kind"::text
      WHEN 'SPEAKING' THEN 'ANALYSIS'
      ELSE 'LAB_REPORT'
    END
  )::"ProjectKind_new";

DROP TYPE "ProjectKind";
ALTER TYPE "ProjectKind_new" RENAME TO "ProjectKind";

ALTER TABLE "users" ADD COLUMN "locale" "UiLocale" NOT NULL DEFAULT 'ID';
