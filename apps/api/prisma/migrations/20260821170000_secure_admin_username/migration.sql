-- Admin authentication uses a dedicated, normalized username. Existing
-- installations receive a deterministic temporary value; the platform seed
-- replaces it with ADMIN_INITIAL_USERNAME after deployment.
ALTER TABLE "admin_users" ADD COLUMN "username" TEXT;

UPDATE "admin_users"
SET "username" = 'admin_' || regexp_replace("mobile", '[^0-9]', '', 'g');

ALTER TABLE "admin_users" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");
