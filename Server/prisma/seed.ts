import "dotenv/config";
import prisma from "../src/lib/prisma.js";

async function main() {
  const trainingCentre = await prisma.trainingCentre.upsert({
    where: { code: "DTC001" },
    update: { name: "Demo Training Centre" },
    create: {
      name: "Demo Training Centre",
      code: "DTC001",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@certiflow.com" },
    update: {
      name: "Demo Training Centre User",
      role: "TRAINING_CENTRE",
      trainingCentreId: trainingCentre.id,
    },
    create: {
      name: "Demo Training Centre User",
      email: "demo@certiflow.com",
      // Deliberately unusable placeholder; this seed does not implement authentication.
      passwordHash: "DEMO_ONLY_NO_AUTHENTICATION",
      role: "TRAINING_CENTRE",
      trainingCentreId: trainingCentre.id,
    },
  });

  const qualityOfficer = await prisma.user.upsert({
    where: { email: "quality@certiflow.com" },
    update: { name: "Demo Quality Officer", role: "QUALITY_OFFICER", trainingCentreId: null },
    create: {
      id: "ca501f49-29db-4cf7-855f-7bb77f688751",
      name: "Demo Quality Officer",
      email: "quality@certiflow.com",
      passwordHash: "DEMO_ONLY_NO_AUTHENTICATION",
      role: "QUALITY_OFFICER",
    },
  });

  const stateOfficer = await prisma.user.upsert({
    where: { email: "state@certiflow.com" },
    update: { name: "Demo State Officer", role: "STATE_OFFICER", trainingCentreId: null },
    create: {
      id: "02ad0283-1a5a-41d1-9862-8cf5f33d8d71",
      name: "Demo State Officer",
      email: "state@certiflow.com",
      passwordHash: "DEMO_ONLY_NO_AUTHENTICATION",
      role: "STATE_OFFICER",
    },
  });

  console.log("Demo seed data ready:");
  console.log(`Training Centre: ${trainingCentre.name}`);
  console.log(`Training Centre ID: ${trainingCentre.id}`);
  console.log(`Training Centre Code: ${trainingCentre.code}`);
  console.log(`Demo User: ${user.name}`);
  console.log(`Demo User ID: ${user.id}`);
  console.log(`Demo User Email: ${user.email}`);
  console.log(`User Role: ${user.role}`);
  console.log(`Quality Officer: ${qualityOfficer.name} (${qualityOfficer.id})`);
  console.log(`Quality Officer Email: ${qualityOfficer.email}`);
  console.log(`State Officer: ${stateOfficer.name} (${stateOfficer.id})`);
  console.log(`State Officer Email: ${stateOfficer.email}`);
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed demo data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
