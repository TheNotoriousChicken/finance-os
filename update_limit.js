const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.paymentMethod.updateMany({
    where: { name: 'ZET FD Backed' },
    data: { limitPaise: 450000 }
  });
  console.log("Updated limit!");
}

main().catch(console.error).finally(() => prisma.$disconnect());