-- Link cash refunds to the shift whose drawer paid them out
ALTER TABLE "Return" ADD COLUMN "shiftId" TEXT;
CREATE INDEX "Return_shiftId_idx" ON "Return"("shiftId");
ALTER TABLE "Return" ADD CONSTRAINT "Return_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data fix: cash payment entries used to store the amount handed over, including change.
-- Store the amount actually kept instead. Only touches orders with exactly one cash entry
-- that covers the overpayment (the normal case); anything else is left as it was.
UPDATE "PaymentEntry" pe
SET "amount" = pe."amount" - over."excess"
FROM (
    SELECT o."id" AS "orderId", SUM(e."amount") - o."total" AS "excess"
    FROM "Order" o
    JOIN "PaymentEntry" e ON e."orderId" = o."id"
    GROUP BY o."id", o."total"
    HAVING SUM(e."amount") > o."total"
) over
WHERE pe."orderId" = over."orderId"
  AND pe."method" = 'CASH'
  AND pe."amount" >= over."excess"
  AND (SELECT COUNT(*) FROM "PaymentEntry" c WHERE c."orderId" = pe."orderId" AND c."method" = 'CASH') = 1;
