const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fix() {
  await prisma.paymentMethod.updateMany({
    where: { name: { contains: "Neu Plus" } },
    data: { outstandingPaise: 0 }
  });
  console.log("Fixed Neu Plus outstanding balance.");
}
fix().finally(() => prisma.$disconnect());