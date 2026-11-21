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
    console.log("Demo seed data ready:");
    console.log(`Training Centre: ${trainingCentre.name}`);
    console.log(`Training Centre ID: ${trainingCentre.id}`);
    console.log(`Training Centre Code: ${trainingCentre.code}`);
    console.log(`Demo User: ${user.name}`);
    console.log(`Demo User ID: ${user.id}`);
    console.log(`Demo User Email: ${user.email}`);
    console.log(`User Role: ${user.role}`);
}
main()
    .catch((error) => {
    console.error("Failed to seed demo data:", error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
