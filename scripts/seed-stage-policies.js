/**
 * Blindspot — Seed Realistic Enterprise Supply Chain Data & SLA Policies
 */
import { db } from '../src/config/firebase.js';
import { COLLECTIONS, STAGES, DEFAULT_STAGE_POLICIES } from '../src/constants/index.js';
import { serverTimestamp } from '../src/utils/index.js';

async function seed() {
  console.log('[seed] Seeding enterprise application settings and SLA policies...');

  const settingsRef = db.collection(COLLECTIONS.SETTINGS).doc('app');
  await settingsRef.set(
    {
      stagePolicies: DEFAULT_STAGE_POLICIES,
      publicDashboard: {
        showProjectName: true,
        showExpectedDelivery: true,
        showCustomerName: true,
      },
      timezone: 'Asia/Kolkata',
      weekStartDay: 'monday',
      defaultReportPeriod: 'this_week',
      updatedAt: serverTimestamp(),
      updatedBy: 'SYSTEM_SEED',
    },
    { merge: true }
  );

  console.log('[seed] Generating comprehensive enterprise consignments across fulfillment stages...');

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  const mockPackages = [
    {
      publicReference: 'BLIND-2026-1081',
      senderName: 'Pfizer Global Supply',
      customerName: 'Apollo Hospitals Central Hub',
      origin: 'Frankfurt CargoCity (FRA)',
      destination: 'Central Medical Depot (BOM)',
      currentStage: STAGES.DOCUMENTATION,
      status: 'DELAYED',
      priority: 'CRITICAL',
      createdAt: new Date(now - 38 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now + 1 * oneDay).toISOString(),
      publicDisplayEnabled: true,
      notes: 'Cold-chain ultra-low temperature (-70C) vaccine consignment. Requires expedited customs release.',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 38 * oneHour).toISOString(),
          completedAt: new Date(now - 34 * oneHour).toISOString(),
          completedBy: 'veBNqoUO9KhAlTPsXqFmWuNxQ3p2',
        },
        PACKAGING: {
          enteredAt: new Date(now - 34 * oneHour).toISOString(),
          completedAt: new Date(now - 22 * oneHour).toISOString(),
          completedBy: 'EMP-PACK-02',
        },
        DOCUMENTATION: {
          enteredAt: new Date(now - 22 * oneHour).toISOString(),
          targetDeadline: new Date(now - 6 * oneHour).toISOString(),
        },
      },
      delayInfo: {
        isOverdue: true,
        overdueMinutes: 360,
        stageElapsedMinutes: 1320,
        stageTargetMinutes: 960,
        primaryReason: 'CUSTOMS_OR_REGULATORY',
        delayNotes: 'Customs ICEGATE digital gateway server timeout during port of entry clearance.',
        flaggedAt: new Date(now - 6 * oneHour).toISOString(),
      },
    },
    {
      publicReference: 'BLIND-2026-1082',
      senderName: 'Tesla Energy Systems',
      customerName: 'Tata Power Renewable Microgrid',
      origin: 'Fremont Gigafactory (SFO)',
      destination: 'Solar Park Station (Pune)',
      currentStage: STAGES.PACKAGING,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      createdAt: new Date(now - 14 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now + 3 * oneDay).toISOString(),
      publicDisplayEnabled: true,
      notes: 'Megapack high-voltage battery modules. Verified vibration-damped packaging required.',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 14 * oneHour).toISOString(),
          completedAt: new Date(now - 10 * oneHour).toISOString(),
          completedBy: 'veBNqoUO9KhAlTPsXqFmWuNxQ3p2',
        },
        PACKAGING: {
          enteredAt: new Date(now - 10 * oneHour).toISOString(),
          targetDeadline: new Date(now + 38 * oneHour).toISOString(),
        },
      },
      delayInfo: {
        isOverdue: false,
        stageElapsedMinutes: 600,
        stageTargetMinutes: 2880,
      },
    },
    {
      publicReference: 'BLIND-2026-1083',
      senderName: 'TSMC Advanced Packaging',
      customerName: 'Foxconn Electronic Assemblies',
      origin: 'Hsinchu Science Park (TPE)',
      destination: 'Hi-Tech SEZ (Sriperumbudur)',
      currentStage: STAGES.DOCUMENTATION,
      status: 'DELAYED',
      priority: 'CRITICAL',
      createdAt: new Date(now - 52 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now + 2 * oneDay).toISOString(),
      publicDisplayEnabled: true,
      notes: '3nm automotive semiconductor wafers in pressurized nitrogen containers.',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 52 * oneHour).toISOString(),
          completedAt: new Date(now - 46 * oneHour).toISOString(),
        },
        PACKAGING: {
          enteredAt: new Date(now - 46 * oneHour).toISOString(),
          completedAt: new Date(now - 28 * oneHour).toISOString(),
        },
        DOCUMENTATION: {
          enteredAt: new Date(now - 28 * oneHour).toISOString(),
          targetDeadline: new Date(now - 4 * oneHour).toISOString(),
        },
      },
      delayInfo: {
        isOverdue: true,
        overdueMinutes: 240,
        stageElapsedMinutes: 1680,
        stageTargetMinutes: 1440,
        primaryReason: 'CARRIER_UNAVAILABLE',
        delayNotes: 'Designated air-cargo flight cancelled due to mechanical hold at Taipei Taoyuan.',
        flaggedAt: new Date(now - 4 * oneHour).toISOString(),
      },
    },
    {
      publicReference: 'BLIND-2026-1084',
      senderName: 'Siemens Healthineers',
      customerName: 'Max Super Speciality Hospital',
      origin: 'Erlangen Logistics Park (MUC)',
      destination: 'Diagnostic Center (New Delhi)',
      currentStage: STAGES.CONFIRMATION,
      status: 'PENDING',
      priority: 'HIGH',
      createdAt: new Date(now - 3 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now + 5 * oneDay).toISOString(),
      publicDisplayEnabled: true,
      notes: 'Superconducting magnet components for MRI suite installation.',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 3 * oneHour).toISOString(),
          targetDeadline: new Date(now + 21 * oneHour).toISOString(),
        },
      },
      delayInfo: {
        isOverdue: false,
        stageElapsedMinutes: 180,
        stageTargetMinutes: 1440,
      },
    },
    {
      publicReference: 'BLIND-2026-1085',
      senderName: 'Boeing Aerostructures',
      customerName: 'Hindustan Aeronautics Ltd (HAL)',
      origin: 'Everett Manufacturing Hub (SEA)',
      destination: 'Aerospace Division (Bengaluru)',
      currentStage: STAGES.DELIVERY,
      status: 'IN_TRANSIT',
      priority: 'CRITICAL',
      createdAt: new Date(now - 78 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now + 8 * oneHour).toISOString(),
      publicDisplayEnabled: true,
      notes: 'Carbon-composite wing fairing assembly. Heavy-lift low-bed trailer transport.',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 78 * oneHour).toISOString(),
          completedAt: new Date(now - 70 * oneHour).toISOString(),
        },
        PACKAGING: {
          enteredAt: new Date(now - 70 * oneHour).toISOString(),
          completedAt: new Date(now - 42 * oneHour).toISOString(),
        },
        DOCUMENTATION: {
          enteredAt: new Date(now - 42 * oneHour).toISOString(),
          completedAt: new Date(now - 20 * oneHour).toISOString(),
        },
        DELIVERY: {
          enteredAt: new Date(now - 20 * oneHour).toISOString(),
          targetDeadline: new Date(now + 52 * oneHour).toISOString(),
        },
      },
      delayInfo: {
        isOverdue: false,
        stageElapsedMinutes: 1200,
        stageTargetMinutes: 4320,
      },
    },
    {
      publicReference: 'BLIND-2026-1086',
      senderName: 'Unilever Supply Operations',
      customerName: 'Reliance Retail Logistics',
      origin: 'Port of Rotterdam (RTM)',
      destination: 'Nhava Sheva Terminal (JNPT)',
      currentStage: STAGES.CONFIRMATION,
      status: 'DELAYED',
      priority: 'MEDIUM',
      createdAt: new Date(now - 32 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now + 6 * oneDay).toISOString(),
      publicDisplayEnabled: true,
      notes: 'Bulk consumer goods ingredients container consignment.',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 32 * oneHour).toISOString(),
          targetDeadline: new Date(now - 8 * oneHour).toISOString(),
        },
      },
      delayInfo: {
        isOverdue: true,
        overdueMinutes: 480,
        stageElapsedMinutes: 1920,
        stageTargetMinutes: 1440,
        primaryReason: 'SUPPLIER_DELAY',
        delayNotes: 'Supplier invoice mismatch against purchase order revision 4B.',
        flaggedAt: new Date(now - 8 * oneHour).toISOString(),
      },
    },
    {
      publicReference: 'BLIND-2026-1087',
      senderName: 'Samsung Electronics Display',
      customerName: 'Dixon Technologies Manufacturing',
      origin: 'Asan Display City (ICN)',
      destination: 'Noida Electronics Cluster (DEL)',
      currentStage: 'COMPLETED',
      status: 'DELIVERED',
      priority: 'HIGH',
      createdAt: new Date(now - 96 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now - 6 * oneHour).toISOString(),
      publicDisplayEnabled: true,
      notes: 'Ultra-thin OLED panels. Delivered and signed on arrival.',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 96 * oneHour).toISOString(),
          completedAt: new Date(now - 88 * oneHour).toISOString(),
        },
        PACKAGING: {
          enteredAt: new Date(now - 88 * oneHour).toISOString(),
          completedAt: new Date(now - 62 * oneHour).toISOString(),
        },
        DOCUMENTATION: {
          enteredAt: new Date(now - 62 * oneHour).toISOString(),
          completedAt: new Date(now - 38 * oneHour).toISOString(),
        },
        DELIVERY: {
          enteredAt: new Date(now - 38 * oneHour).toISOString(),
          completedAt: new Date(now - 4 * oneHour).toISOString(),
          completedBy: 'DEL-DRIVER-12',
        },
      },
      delayInfo: {
        isOverdue: false,
      },
    },
    {
      publicReference: 'BLIND-2026-1088',
      senderName: 'Bosch Mobility Solutions',
      customerName: 'Tata Motors Commercial Vehicles',
      origin: 'Feuerbach Facility (STR)',
      destination: 'Automotive Plant (Sanand)',
      currentStage: STAGES.PACKAGING,
      status: 'DELAYED',
      priority: 'CRITICAL',
      createdAt: new Date(now - 64 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now + 2 * oneDay).toISOString(),
      publicDisplayEnabled: true,
      notes: 'Anti-lock braking control modules (ABS Generation 10).',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 64 * oneHour).toISOString(),
          completedAt: new Date(now - 58 * oneHour).toISOString(),
        },
        PACKAGING: {
          enteredAt: new Date(now - 58 * oneHour).toISOString(),
          targetDeadline: new Date(now - 10 * oneHour).toISOString(),
        },
      },
      delayInfo: {
        isOverdue: true,
        overdueMinutes: 600,
        stageElapsedMinutes: 3480,
        stageTargetMinutes: 2880,
        primaryReason: 'MATERIAL_SHORTAGE',
        delayNotes: 'Specialized electrostatic discharge (ESD) cushioning reels out of stock.',
        flaggedAt: new Date(now - 10 * oneHour).toISOString(),
      },
    },
    {
      publicReference: 'BLIND-2026-1089',
      senderName: 'Schneider Electric Grid',
      customerName: 'Adani Transmission Substation',
      origin: 'Le Vaudreuil (CDG)',
      destination: 'Mundra Mega Substation (MUN)',
      currentStage: STAGES.DELIVERY,
      status: 'OUT_FOR_DELIVERY',
      priority: 'HIGH',
      createdAt: new Date(now - 54 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now + 6 * oneHour).toISOString(),
      publicDisplayEnabled: true,
      notes: 'SF6 gas-insulated smart switchgear telemetry sensors.',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 54 * oneHour).toISOString(),
          completedAt: new Date(now - 48 * oneHour).toISOString(),
        },
        PACKAGING: {
          enteredAt: new Date(now - 48 * oneHour).toISOString(),
          completedAt: new Date(now - 28 * oneHour).toISOString(),
        },
        DOCUMENTATION: {
          enteredAt: new Date(now - 28 * oneHour).toISOString(),
          completedAt: new Date(now - 12 * oneHour).toISOString(),
        },
        DELIVERY: {
          enteredAt: new Date(now - 12 * oneHour).toISOString(),
          targetDeadline: new Date(now + 60 * oneHour).toISOString(),
        },
      },
      delayInfo: {
        isOverdue: false,
        stageElapsedMinutes: 720,
        stageTargetMinutes: 4320,
      },
    },
    {
      publicReference: 'BLIND-2026-1090',
      senderName: 'Novartis Biologics',
      customerName: 'Tata Memorial Cancer Center',
      origin: 'Basel BioCampus (BSL)',
      destination: 'Hospital Pharmacy Hub (Parel, Mumbai)',
      currentStage: STAGES.CONFIRMATION,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      createdAt: new Date(now - 21 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now + 3 * oneDay).toISOString(),
      publicDisplayEnabled: true,
      notes: 'Targeted oncology monoclonal antibodies. Time-critical delivery window.',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 21 * oneHour).toISOString(),
          targetDeadline: new Date(now + 3 * oneHour).toISOString(), // Approaching warning zone!
        },
      },
      delayInfo: {
        isOverdue: false,
        stageElapsedMinutes: 1260,
        stageTargetMinutes: 1440,
      },
    },
    {
      publicReference: 'BLIND-2026-1091',
      senderName: 'Medtronic Cardiovascular',
      customerName: 'Fortis Escorts Heart Institute',
      origin: 'Minneapolis Logistics Hub (MSP)',
      destination: 'Cath Lab Store (Okhla, Delhi)',
      currentStage: 'COMPLETED',
      status: 'DELIVERED',
      priority: 'HIGH',
      createdAt: new Date(now - 86 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now - 14 * oneHour).toISOString(),
      publicDisplayEnabled: true,
      notes: 'Drug-eluting coronary stent packages. Handed over with tamper seals verified.',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 86 * oneHour).toISOString(),
          completedAt: new Date(now - 80 * oneHour).toISOString(),
        },
        PACKAGING: {
          enteredAt: new Date(now - 80 * oneHour).toISOString(),
          completedAt: new Date(now - 55 * oneHour).toISOString(),
        },
        DOCUMENTATION: {
          enteredAt: new Date(now - 55 * oneHour).toISOString(),
          completedAt: new Date(now - 32 * oneHour).toISOString(),
        },
        DELIVERY: {
          enteredAt: new Date(now - 32 * oneHour).toISOString(),
          completedAt: new Date(now - 12 * oneHour).toISOString(),
          completedBy: 'DEL-OFFICER-04',
        },
      },
      delayInfo: {
        isOverdue: false,
      },
    },
    {
      publicReference: 'BLIND-2026-1092',
      senderName: 'ASML Lithography Tech',
      customerName: 'Applied Materials India R&D',
      origin: 'Veldhoven Tech Park (AMS)',
      destination: 'Whitefield Nano Fabrication (Bengaluru)',
      currentStage: STAGES.PACKAGING,
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      createdAt: new Date(now - 8 * oneHour).toISOString(),
      expectedDeliveryDate: new Date(now + 4 * oneDay).toISOString(),
      publicDisplayEnabled: true,
      notes: 'Extreme ultraviolet (EUV) optical mirror spares. Specialized air-suspension crating.',
      stageTimestamps: {
        CONFIRMATION: {
          enteredAt: new Date(now - 8 * oneHour).toISOString(),
          completedAt: new Date(now - 4 * oneHour).toISOString(),
        },
        PACKAGING: {
          enteredAt: new Date(now - 4 * oneHour).toISOString(),
          targetDeadline: new Date(now + 44 * oneHour).toISOString(),
        },
      },
      delayInfo: {
        isOverdue: false,
        stageElapsedMinutes: 240,
        stageTargetMinutes: 2880,
      },
    },
  ];

  for (const pkg of mockPackages) {
    await db.collection(COLLECTIONS.PACKAGES).doc(pkg.publicReference).set(pkg, { merge: true });
  }
  console.log(`[seed] Successfully seeded ${mockPackages.length} realistic enterprise consignments.`);

  // Seed sample corrective actions
  console.log('[seed] Seeding sample systemic corrective actions...');
  const mockActions = [
    {
      title: 'Automated E-Way Bill API Integration for Customs Clearance',
      description: 'Replaced manual PDF filing with automated ICEGATE/GSTN API webhook integration to eliminate customs documentation timeouts.',
      stage: 'DOCUMENTATION',
      delayReason: 'CUSTOMS_OR_REGULATORY',
      actionType: 'SYSTEM_AUTOMATION',
      owner: 'Vikram Mehta (VP Logistics Tech)',
      targetCompletionDate: new Date(now + 14 * oneDay).toISOString(),
      status: 'VERIFIED',
      verification: {
        preDelayRate: 34.2,
        postDelayRate: 6.8,
        verifiedNotes: '30-day post-implementation monitoring showed 27.4% reduction in documentation bottlenecks across international freight.',
        verifiedAt: new Date(now - 2 * oneDay).toISOString(),
        verifiedBy: 'veBNqoUO9KhAlTPsXqFmWuNxQ3p2',
      },
      createdAt: new Date(now - 35 * oneDay).toISOString(),
    },
    {
      title: 'Secondary Air-Cargo Express Carrier Service Level Agreement',
      description: 'Contracted backup guaranteed air-freight allocation with BlueDart Aviation and Emirates SkyCargo for critical shipments.',
      stage: 'DOCUMENTATION',
      delayReason: 'CARRIER_UNAVAILABLE',
      actionType: 'SUPPLIER_ESCALATION',
      owner: 'Ananya Deshmukh (Head of Carrier Operations)',
      targetCompletionDate: new Date(now + 21 * oneDay).toISOString(),
      status: 'IN_PROGRESS',
      createdAt: new Date(now - 12 * oneDay).toISOString(),
    },
    {
      title: 'ESD Packaging Buffer Stock Automated Reorder Trigger',
      description: 'Configured automated ERP min-max inventory triggers for anti-static and cold-chain packaging materials.',
      stage: 'PACKAGING',
      delayReason: 'MATERIAL_SHORTAGE',
      actionType: 'PROCESS_CHANGE',
      owner: 'Sanjay Verma (Warehouse Director)',
      targetCompletionDate: new Date(now + 7 * oneDay).toISOString(),
      status: 'OPEN',
      createdAt: new Date(now - 4 * oneDay).toISOString(),
    },
  ];

  for (let i = 0; i < mockActions.length; i++) {
    await db.collection(COLLECTIONS.CORRECTIVE_ACTIONS).doc(`ACT-2026-000${i + 1}`).set(mockActions[i], { merge: true });
  }

  console.log(`[seed] Seeded ${mockActions.length} corrective actions.`);
  console.log('[seed] All data generation completed successfully.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] Error seeding:', err);
    process.exit(1);
  });
