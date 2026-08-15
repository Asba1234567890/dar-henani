-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PropertySettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "propertyName" TEXT NOT NULL DEFAULT 'Dar Henani',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TND',
    "checkInTime" TEXT NOT NULL DEFAULT '14:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '12:00',
    "cancellationPolicy" TEXT,
    "defaultDepositPercent" REAL NOT NULL DEFAULT 30,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "lowOccupancyAlerts" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PropertySettings" ("address", "cancellationPolicy", "checkInTime", "checkOutTime", "currency", "defaultDepositPercent", "email", "emailNotifications", "id", "lowOccupancyAlerts", "phone", "propertyName", "updatedAt") SELECT "address", "cancellationPolicy", "checkInTime", "checkOutTime", "currency", "defaultDepositPercent", "email", "emailNotifications", "id", "lowOccupancyAlerts", "phone", "propertyName", "updatedAt" FROM "PropertySettings";
DROP TABLE "PropertySettings";
ALTER TABLE "new_PropertySettings" RENAME TO "PropertySettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
