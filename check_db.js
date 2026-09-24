const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const cards = await prisma.paymentMethod.findMany({
    where: { type: 'CREDIT_CARD' }
  });
  console.log(cards.map(c => ({ name: c.name, sharedLimitGroupId: c.sharedLimitGroupId })));
}
check().finally(() => prisma.$disconnect());