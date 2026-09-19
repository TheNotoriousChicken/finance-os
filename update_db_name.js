const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.paymentMethod.updateMany({
    where: { name: 'HDFC FD-backed' },
    data: { name: 'FD backed cc' }
  });
  console.log("Updated live DB!");
}

main().catch(console.error).finally(() => prisma.$disconnect());