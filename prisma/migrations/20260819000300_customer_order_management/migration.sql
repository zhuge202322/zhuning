ALTER TABLE "Customer" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Order" ADD COLUMN "convertedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "paidAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "cancelledAt" DATETIME;

CREATE INDEX "Customer_status_idx" ON "Customer"("status");
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");
CREATE INDEX "Order_orderType_status_idx" ON "Order"("orderType", "status");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

UPDATE "Customer" SET "status" = 'ACTIVE' WHERE lower("status") = 'active';
UPDATE "Customer" SET "status" = 'INQUIRY' WHERE lower("status") = 'inquiry';
UPDATE "Order" SET "status" = 'PENDING_INQUIRY' WHERE lower("status") IN ('pending', 'new inquiry');
UPDATE "Order" SET "status" = 'CONTACTED' WHERE "status" = 'QUOTING';
UPDATE "Order" SET "status" = CASE WHEN "orderType" = 'FORMAL' THEN 'COMPLETED' ELSE 'QUOTED' END WHERE "status" = 'CLOSED';
UPDATE "Order" SET "status" = 'CONFIRMED' WHERE "status" = 'PENDING_PAYMENT';
UPDATE "Order" SET "status" = 'PROCESSING' WHERE "status" = 'PAID';
UPDATE "Order" SET "paymentStatus" = 'NOT_REQUIRED' WHERE lower("paymentStatus") = 'not required';
UPDATE "Order" SET "fulfillmentStatus" = 'NOT_REQUIRED' WHERE lower("fulfillmentStatus") = 'awaiting quote';
UPDATE "Order" SET "paymentStatus" = upper("paymentStatus") WHERE lower("paymentStatus") IN ('unpaid', 'pending', 'paid', 'refunded');
UPDATE "Order" SET "fulfillmentStatus" = upper("fulfillmentStatus") WHERE lower("fulfillmentStatus") IN ('unfulfilled', 'processing', 'shipped', 'fulfilled', 'cancelled');
UPDATE "Order" SET "fulfillmentStatus" = 'UNFULFILLED' WHERE "orderType" = 'FORMAL' AND "status" = 'CONFIRMED';
UPDATE "Order" SET "fulfillmentStatus" = 'PROCESSING' WHERE "orderType" = 'FORMAL' AND "status" = 'PROCESSING';
UPDATE "Order" SET "fulfillmentStatus" = 'SHIPPED' WHERE "orderType" = 'FORMAL' AND "status" = 'SHIPPED';
UPDATE "Order" SET "fulfillmentStatus" = 'FULFILLED' WHERE "orderType" = 'FORMAL' AND "status" = 'COMPLETED';
UPDATE "Order" SET "fulfillmentStatus" = 'CANCELLED' WHERE "orderType" = 'FORMAL' AND "status" = 'CANCELLED';
