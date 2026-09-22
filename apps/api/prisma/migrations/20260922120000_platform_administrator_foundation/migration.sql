-- Platform administration foundation.
--
-- This table stores explicit platform-level administrative
-- grants independently of tenant memberships and tenant roles.
--
-- No existing account receives a platform grant automatically.
-- No administrative account is created by this migration.
--
-- Revoked grants remain stored for lifecycle tracking.
-- Authorization must also check the user's active status.
--
-- Grant creation and revocation require separately implemented
-- authorization, auditing, and session-lifecycle controls.

CREATE TABLE "platform_administrators" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by_user_id" UUID,
    "revoked_at" TIMESTAMPTZ,
    "revoked_by_user_id" UUID,

    CONSTRAINT "platform_administrators_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
    "platform_administrators_user_id_key"
ON "platform_administrators"("user_id");

CREATE INDEX
    "platform_administrators_revoked_at_idx"
ON "platform_administrators"("revoked_at");

ALTER TABLE "platform_administrators"
ADD CONSTRAINT "platform_administrators_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "users"("id")
ON DELETE RESTRICT
ON UPDATE RESTRICT;
