ALTER TABLE "MediaAsset" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "MediaAsset_status_idx" ON "MediaAsset"("status");
