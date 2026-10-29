/**
 * Blindspot — Seed SLA Stage Policies and Demonstration Data
 *
 * Usage:
 *   node scripts/seed-stage-policies.js [--demo]
 */
import { db } from '../src/config/firebase.js';
import { COLLECTIONS, STAGES, DEFAULT_STAGE_POLICIES } from '../src/constants/index.js';
import { serverTimestamp } from '../src/utils/index.js';

async function seed() {
  const includeDemo = process.argv.includes('--demo');

  console.log('[seed] Seeding application settings and SLA policies...');

  const settingsRef = db.collection(COLLECTIONS.SETTINGS).doc('app');
  await settingsRef.set(
    {
      stagePolicies: DEFAULT_STAGE_POLICIES,
      publicDashboard: {
        showProjectName: true,
        showExpectedDelivery: true,
        showCustomerName: false,
      },
      timezone: 'Asia/Kolkata',
      weekStartDay: 'monday',
      defaultReportPeriod: 'this_week',
      updatedAt: serverTimestamp(),
      updatedBy: 'SYSTEM_SEED',
    },
    { merge: true }
  );

  console.log('[seed] SLA policies seeded successfully.');

  if (includeDemo) {
    console.log('[seed] Generating sample demonstration packages across workflow stages...');

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    const samplePackages = [
      {
        publicReference: 'BLIND-2026-0001',
        senderName: 'Apex Electronics Ltd',
        customerName: 'TechCorp Logistics',
        origin: 'Warehouse Hub Alpha (Mumbai)',
        destination: 'Electronics Park (Bengaluru)',
        currentStage: STAGES.CONFIRMATION,
        status: 'PENDING',
        priority: 'HIGH',
        createdAt: new Date(now - 30 * oneHour).toISOString(),
        expectedDeliveryDate: new Date(now + 4 * oneDay).toISOString(),
        notes: 'High priority urgent component shipment',
        stageTimestamps: {
          CONFIRMATION: {
            enteredAt: new Date(now - 30 * oneHour).toISOString(),
            targetDeadline: new Date(now - 6 * oneHour).toISOString(), // Overdue by 6 hours!
          },
        },
        delayInfo: {
          isOverdue: true,
          overdueMinutes: 360,
          primaryReason: 'SUPPLIER_DELAY',
          delayNotes: 'Supplier delayed sending order confirmation documentation',
          flaggedAt: new Date(now - 6 * oneHour).toISOString(),
        },
      },
      {
        publicReference: 'BLIND-2026-0002',
        senderName: 'Global Fabric Solutions',
        customerName: 'Metro Garments',
        origin: 'Textile Depot (Surat)',
        destination: 'Export Terminal (Nhava Sheva)',
        currentStage: STAGES.PACKAGING,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        createdAt: new Date(now - 48 * oneHour).toISOString(),
        expectedDeliveryDate: new Date(now + 3 * oneDay).toISOString(),
        stageTimestamps: {
          CONFIRMATION: {
            enteredAt: new Date(now - 48 * oneHour).toISOString(),
            completedAt: new Date(now - 40 * oneHour).toISOString(),
            completedBy: 'EMP-CONFIRM-01',
          },
          PACKAGING: {
            enteredAt: new Date(now - 40 * oneHour).toISOString(),
            targetDeadline: new Date(now + 8 * oneHour).toISOString(),
          },
        },
        delayInfo: {
          isOverdue: false,
        },
      },
      {
        publicReference: 'BLIND-2026-0003',
        senderName: 'Precision Engineering Tools',
        customerName: 'Tata AutoTech',
        origin: 'Industrial Area (Pune)',
        destination: 'Assembly Plant (Chennai)',
        currentStage: STAGES.DOCUMENTATION,
        status: 'DELAYED',
        priority: 'CRITICAL',
        createdAt: new Date(now - 72 * oneHour).toISOString(),
        expectedDeliveryDate: new Date(now + 2 * oneDay).toISOString(),
        stageTimestamps: {
          CONFIRMATION: {
            enteredAt: new Date(now - 72 * oneHour).toISOString(),
            completedAt: new Date(now - 60 * oneHour).toISOString(),
          },
          PACKAGING: {
            enteredAt: new Date(now - 60 * oneHour).toISOString(),
            completedAt: new Date(now - 36 * oneHour).toISOString(),
          },
          DOCUMENTATION: {
            enteredAt: new Date(now - 36 * oneHour).toISOString(),
            targetDeadline: new Date(now - 12 * oneHour).toISOString(), // Overdue by 12 hours!
          },
        },
        delayInfo: {
          isOverdue: true,
          overdueMinutes: 720,
          primaryReason: 'CUSTOMS_OR_REGULATORY',
          delayNotes: 'Customs e-way clearance API timeout and tax revision verification hold',
          flaggedAt: new Date(now - 12 * oneHour).toISOString(),
        },
      },
      {
        publicReference: 'BLIND-2026-0004',
        senderName: 'MedLife Pharma Supplies',
        customerName: 'CarePlus Hospital Network',
        origin: 'Pharma Zone (Hyderabad)',
        destination: 'Central Medical Store (Delhi)',
        currentStage: STAGES.DELIVERY,
        status: 'OUT_FOR_DELIVERY',
        priority: 'HIGH',
        createdAt: new Date(now - 90 * oneHour).toISOString(),
        expectedDeliveryDate: new Date(now + 12 * oneHour).toISOString(),
        stageTimestamps: {
          CONFIRMATION: {
            enteredAt: new Date(now - 90 * oneHour).toISOString(),
            completedAt: new Date(now - 80 * oneHour).toISOString(),
          },
          PACKAGING: {
            enteredAt: new Date(now - 80 * oneHour).toISOString(),
            completedAt: new Date(now - 50 * oneHour).toISOString(),
          },
          DOCUMENTATION: {
            enteredAt: new Date(now - 50 * oneHour).toISOString(),
            completedAt: new Date(now - 30 * oneHour).toISOString(),
          },
          DELIVERY: {
            enteredAt: new Date(now - 30 * oneHour).toISOString(),
            targetDeadline: new Date(now + 42 * oneHour).toISOString(),
          },
        },
        delayInfo: {
          isOverdue: false,
        },
      },
    ];

    for (const pkg of samplePackages) {
      await db.collection(COLLECTIONS.PACKAGES).doc(pkg.publicReference).set(pkg, { merge: true });
    }
    console.log(`[seed] Seeded ${samplePackages.length} sample packages.`);
  }

  console.log('[seed] Seeding completed successfully.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] Error seeding:', err);
    process.exit(1);
  });
