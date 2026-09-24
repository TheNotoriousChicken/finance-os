const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const mbCard = await prisma.paymentMethod.findFirst({ where: { name: { contains: "MoneyBack+" } } });
  
  if (mbCard) {
    await prisma.paymentMethod.update({
      where: { id: mbCard.id },
      data: {
        sharedLimitGroupId: "HDFC_PRIMARY",
        network: "VISA",
        rewardCurrency: "CASHPOINTS"
      }
    });
    
    // Add Neu Plus Card
    await prisma.paymentMethod.create({
      data: {
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
    console.log("Neu Plus card created and MoneyBack+ updated to shared group HDFC_PRIMARY");
  }

  // Update AI classification
  // (We skip inserting reward rules rows for now, the prompt allows deterministic code logic)
}

main().catch(console.error).finally(() => prisma.$disconnect());