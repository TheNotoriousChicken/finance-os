const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.paymentMethod.updateMany({
    where: { name: 'HDFC MoneyBack+' },
    data: { outstandingPaise: 88052 }
  });
  console.log("Restored outstanding balance!");
}

main().catch(console.error).finally(() => prisma.$disconnect());