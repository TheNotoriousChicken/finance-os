const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function check() {
  const cards = await prisma.paymentMethod.findMany();
  cards.forEach(c => console.log(`${c.name} - Limit: ${c.limitPaise} - Out: ${c.outstandingPaise} - Group: ${c.sharedLimitGroupId}`));
}
check().finally(() => prisma.$disconnect());