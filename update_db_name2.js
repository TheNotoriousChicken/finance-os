const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.paymentMethod.updateMany({
    where: { name: 'FD backed cc' },
    data: { name: 'ZET FD Backed' }
  });
  console.log("Updated live DB!");
}

main().catch(console.error).finally(() => prisma.$disconnect());