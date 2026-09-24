const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const allMethods = await prisma.paymentMethod.findMany();
  const maxId = allMethods.length > 0 ? Math.max(...allMethods.map(m => m.id)) : 0;
  const newId = maxId + 1;

  await prisma.paymentMethod.create({
    data: {
      id: newId,
      name: "Tata Neu Plus HDFC Bank Credit Card",
      type: "CREDIT_CARD",
      bankName: "HDFC Bank",
      last4Digits: "1234",
      limitPaise: 5200000,
      outstandingPaise: 1000000,
      statementBalancePaise: 0,
      annualFeePaise: 49900,
      feeWaiverTargetPaise: 10000000,
      rewardRuleSetId: "NEU_PLUS",
      isRewardEligible: true,
      color: "#161618", // dark premium
      sharedLimitGroupId: "HDFC_PRIMARY",
      network: "RUPAY",
      rewardCurrency: "NEUCOINS"
    }
  });
  console.log("Neu Plus card created with ID " + newId);
}

main().catch(console.error).finally(() => prisma.$disconnect());