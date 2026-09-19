import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Finance OS database...');

  // ── User Profile ──────────────────────────────────────────────────────────
  const initialPassword = process.env.INITIAL_PASSWORD ?? 'finance123';
  const passwordHash = await bcrypt.hash(initialPassword, 12);

  await prisma.userProfile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      displayName: 'Me',
      passwordHash,
      monthlySalaryPaise: 4_000_000, // ₹40,000
      cardYearStartDate: '2024-06-01', // Example activation date — configurable in Settings
    },
  });
  console.log('✅ User profile created');

  // ── Default Settings ──────────────────────────────────────────────────────
  const defaultSettings = [
    { key: 'ai.confidence.high', value: '90' },
    { key: 'ai.confidence.mid', value: '70' },
    { key: 'app.currency', value: 'INR' },
    { key: 'notifications.due_date_days_ahead', value: '3' },
    { key: 'notifications.budget_threshold_pct', value: '90' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ Default settings created');

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { name: 'Food', icon: '🍽️', color: '#FF6B6B', displayOrder: 1 },
    { name: 'Shopping', icon: '🛍️', color: '#4ECDC4', displayOrder: 2 },
    { name: 'Transport', icon: '🚗', color: '#45B7D1', displayOrder: 3 },
    { name: 'Housing', icon: '🏠', color: '#96CEB4', displayOrder: 4 },
    { name: 'Bills', icon: '📋', color: '#FFEAA7', displayOrder: 5 },
    { name: 'Entertainment', icon: '🎭', color: '#DDA0DD', displayOrder: 6 },
    { name: 'Healthcare', icon: '🏥', color: '#98FB98', displayOrder: 7 },
    { name: 'Education', icon: '📚', color: '#F0E68C', displayOrder: 8 },
      { name: 'Government', icon: '🏛️', color: '#FFD700', displayOrder: 8.5 },
    { name: 'Travel', icon: '✈️', color: '#87CEEB', displayOrder: 9 },
    { name: 'Subscriptions', icon: '📡', color: '#DEB887', displayOrder: 10 },
    { name: 'Income', icon: '💰', color: '#00D68F', displayOrder: 11, isSystem: true },
    { name: 'Refunds', icon: '↩️', color: '#4D9EF7', displayOrder: 12, isSystem: true },
    { name: 'Transfers', icon: '↔️', color: '#A0A0A0', displayOrder: 13, isSystem: true },
    { name: 'Cash', icon: '💵', color: '#00F0FF', displayOrder: 14 },
    { name: 'Other', icon: '📦', color: '#808080', displayOrder: 15 },
  ];

  const categoryMap: Record<string, number> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { ...cat, isSystem: cat.isSystem ?? false },
    });
    categoryMap[cat.name] = created.id;
  }

  // Subcategories
  const subcategories = [
    // Food
    { name: 'Restaurants', categoryName: 'Food' },
    { name: 'Swiggy', categoryName: 'Food' },
    { name: 'Zomato', categoryName: 'Food' },
    { name: 'Groceries', categoryName: 'Food' },
    { name: 'Cafe', categoryName: 'Food' },
    // Shopping
    { name: 'Amazon', categoryName: 'Shopping' },
    { name: 'Flipkart', categoryName: 'Shopping' },
    { name: 'Electronics', categoryName: 'Shopping' },
    { name: 'Clothing', categoryName: 'Shopping' },
    { name: 'Reliance Smart', categoryName: 'Shopping' },
    { name: 'DMart', categoryName: 'Shopping' },
    // Transport
    { name: 'Train', categoryName: 'Transport' },
    { name: 'Bus', categoryName: 'Transport' },
    { name: 'Taxi / Cab', categoryName: 'Transport' },
    { name: 'Fuel', categoryName: 'Transport' },
    { name: 'Metro', categoryName: 'Transport' },
    { name: 'Auto', categoryName: 'Transport' },
    // Housing
    { name: 'Rent', categoryName: 'Housing' },
    { name: 'Maintenance', categoryName: 'Housing' },
    { name: 'Repairs', categoryName: 'Housing' },
    // Bills
    { name: 'Electricity', categoryName: 'Bills' },
    { name: 'Internet', categoryName: 'Bills' },
    { name: 'Mobile / Recharge', categoryName: 'Bills' },
    { name: 'Water', categoryName: 'Bills' },
    { name: 'Gas', categoryName: 'Bills' },
  ];

  for (const sub of subcategories) {
    const catId = categoryMap[sub.categoryName];
    if (!catId) continue;
    await prisma.subcategory.upsert({
      where: { name_categoryId: { name: sub.name, categoryId: catId } },
      update: {},
      create: { name: sub.name, categoryId: catId },
    });
  }
  console.log('✅ Categories and subcategories created');

  // ── Payment Methods (Accounts) ────────────────────────────────────────────
  const hdfc_moneyback = await prisma.paymentMethod.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'HDFC MoneyBack+',
      type: 'CREDIT_CARD',
      bankName: 'HDFC Bank',
      last4Digits: '1234',
      limitPaise: 52_000_00, // ₹52,000
      outstandingPaise: 0,
      statementBalancePaise: 0,
      statementDate: 20,
      dueDate: 8,
      annualFeePaise: 50_000, // ₹500 + GST
      feeWaiverTargetPaise: 50_00_000, // ₹50,000
      rewardRuleSetId: 'MONEYBACK_PLUS',
      isRewardEligible: true,
      cardYearStartDate: '2024-06-01',
      color: '#00F0FF',
    },
  });

  await prisma.paymentMethod.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'ZET FD Backed',
      type: 'CREDIT_CARD',
      bankName: 'HDFC Bank',
      last4Digits: '5678',
      limitPaise: 5_00_000, // ₹5,000
      outstandingPaise: 0,
      statementBalancePaise: 0,
      statementDate: 15,
      dueDate: 5,
      rewardRuleSetId: null,
      isRewardEligible: false,
      color: '#4D9EF7',
    },
  });

  await prisma.paymentMethod.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'UPI / HDFC Bank',
      type: 'UPI',
      bankName: 'HDFC Bank',
      isRewardEligible: false,
      color: '#00D68F',
    },
  });

  await prisma.paymentMethod.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4,
      name: 'Cash',
      type: 'CASH',
      isRewardEligible: false,
      color: '#A0A0A0',
    },
  });
  console.log('✅ Payment methods created');

  // ── Merchants ─────────────────────────────────────────────────────────────
  const merchants = [
    {
      normalizedName: 'RELIANCE RETAIL LTD',
      displayName: 'Reliance Smart SuperStore',
      is10xPartner: true,
      rewardRuleId: 'MB_10X_RELIANCE',
    },
    {
      normalizedName: 'DMART',
      displayName: 'DMart',
      is10xPartner: false,
      rewardRuleId: 'MB_BASE',
    },
    {
      normalizedName: 'SWIGGY',
      displayName: 'Swiggy',
      is10xPartner: true,
      rewardRuleId: 'MB_10X_SWIGGY',
    },
    {
      normalizedName: 'IRCTC',
      displayName: 'IRCTC',
      is10xPartner: false,
      rewardRuleId: 'MB_IRCTC_GOVT_EXCL',
    },
    {
      normalizedName: 'AMAZON',
      displayName: 'Amazon',
      is10xPartner: true,
      rewardRuleId: 'MB_10X_AMAZON',
    },
    {
      normalizedName: 'FLIPKART',
      displayName: 'Flipkart',
      is10xPartner: true,
      rewardRuleId: 'MB_10X_FLIPKART',
    },
    {
      normalizedName: 'BIGBASKET',
      displayName: 'BigBasket',
      is10xPartner: true,
      rewardRuleId: 'MB_10X_BIGBASKET',
    },
  ];

  const merchantMap: Record<string, number> = {};
  for (const m of merchants) {
    const created = await prisma.merchant.upsert({
      where: { normalizedName: m.normalizedName },
      update: {},
      create: m,
    });
    merchantMap[m.normalizedName] = created.id;
  }
  console.log('✅ Merchants created');

  // ── MoneyBack+ Reward Rules ───────────────────────────────────────────────
  const rewardRules = [
    {
      id: 'MB_10X_AMAZON',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'Amazon — 10X CashPoints: 20 pts per ₹200',
      merchantId: merchantMap['AMAZON'],
      multiplier: 10,
      pointsPerXPaise: 20000,
      pointsEarned: 20,
      monthlyCapPoints: 2500,
      eligibleTypes: JSON.stringify(['CREDIT_CARD']),
      source: 'HDFC Bank MoneyBack+ T&C',
      sourceUrl: 'https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?folderPath=/OtherDocuments/Cards/Credit/MoneyBack+/&siteName=hdfcbank&fileName=MB-Plus-MIT.pdf',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: false,
      effectiveFrom: new Date('2026-05-15'),
    },
    {
      id: 'MB_10X_FLIPKART',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'Flipkart — 10X CashPoints: 20 pts per ₹200',
      merchantId: merchantMap['FLIPKART'],
      multiplier: 10,
      pointsPerXPaise: 20000,
      pointsEarned: 20,
      monthlyCapPoints: 2500,
      eligibleTypes: JSON.stringify(['CREDIT_CARD']),
      source: 'HDFC Bank MoneyBack+ T&C',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: false,
      effectiveFrom: new Date('2026-05-15'),
    },
    {
      id: 'MB_10X_SWIGGY',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'Swiggy — 10X CashPoints: 20 pts per ₹200',
      merchantId: merchantMap['SWIGGY'],
      multiplier: 10,
      pointsPerXPaise: 20000,
      pointsEarned: 20,
      monthlyCapPoints: 2500,
      eligibleTypes: JSON.stringify(['CREDIT_CARD']),
      source: 'HDFC Bank MoneyBack+ T&C',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: false,
      effectiveFrom: new Date('2026-05-15'),
    },
    {
      id: 'MB_10X_BIGBASKET',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'BigBasket — 10X CashPoints: 20 pts per ₹200; grocery sub-cap 1000 pts/month',
      merchantId: merchantMap['BIGBASKET'],
      multiplier: 10,
      pointsPerXPaise: 20000,
      pointsEarned: 20,
      monthlyCapPoints: 2500,
      grocerySubCapPoints: 1000,
      eligibleTypes: JSON.stringify(['CREDIT_CARD']),
      source: 'HDFC Bank MoneyBack+ T&C',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: false,
      effectiveFrom: new Date('2026-05-15'),
    },
    {
      id: 'MB_10X_RELIANCE',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'Reliance Smart SuperStore — 10X CashPoints: 20 pts per ₹200; grocery sub-cap 1000 pts/month',
      merchantId: merchantMap['RELIANCE RETAIL LTD'],
      multiplier: 10,
      pointsPerXPaise: 20000,
      pointsEarned: 20,
      monthlyCapPoints: 2500,
      grocerySubCapPoints: 1000,
      eligibleTypes: JSON.stringify(['CREDIT_CARD']),
      source: 'HDFC Bank MoneyBack+ T&C',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: false,
      effectiveFrom: new Date('2026-05-15'),
    },
    {
      id: 'MB_BASE',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'Base rate — 2 CashPoints per ₹200 on all other spend (incl UPI-via-card)',
      multiplier: 1,
      pointsPerXPaise: 20000,
      pointsEarned: 2,
      eligibleTypes: JSON.stringify(['CREDIT_CARD']),
      source: 'HDFC Bank MoneyBack+ T&C',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: false,
      effectiveFrom: new Date('2026-05-15'),
    },
    {
      id: 'MB_EXCL_FUEL',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'Fuel transactions — 0 CashPoints (excluded)',
      categoryName: 'Fuel',
      pointsEarned: 0,
      source: 'HDFC Bank MoneyBack+ T&C',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: false,
    },
    {
      id: 'MB_EXCL_RENT',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'Rent payments — 0 CashPoints (excluded from Jan 2023)',
      categoryName: 'Rent',
      pointsEarned: 0,
      source: 'HDFC Bank MoneyBack+ T&C',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: false,
      effectiveFrom: new Date('2023-01-01'),
    },
    {
      id: 'MB_EXCL_GOVT',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'Government-related transactions — 0 CashPoints (excluded)',
      categoryName: 'Government',
      pointsEarned: 0,
      source: 'HDFC Bank MoneyBack+ T&C',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: false,
    },
    {
      id: 'MB_EMI_5X',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'UNVERIFIED: EMI spends at merchant locations — possibly 5X (pre-May 2026 rule)',
      pointsEarned: null,
      source: 'HDFC Bank MoneyBack+ historical T&C',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: true,
    },
    {
      id: 'MB_IRCTC_GOVT_EXCL',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'UNVERIFIED: IRCTC — possibly a Government-related exclusion (0 pts) or base rate. Treated as excluded pending verification.',
      merchantId: merchantMap['IRCTC'],
      pointsEarned: 0,
      source: 'HDFC Bank MoneyBack+ T&C (ambiguous)',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: true,
    },
    {
      id: 'MB_ROUNDING',
      ruleSetId: 'MONEYBACK_PLUS',
      description: 'UNVERIFIED: Rounding behavior on partial ₹200 blocks. Floor assumed (₹650 → 3 blocks = 60 pts at 10X).',
      source: 'HDFC Bank MoneyBack+ T&C (unspecified)',
      lastVerifiedDate: new Date('2026-09-16'),
      isUnverified: true,
    },
  ];

  for (const rule of rewardRules) {
    await prisma.rewardRule.upsert({
      where: { id: rule.id },
      update: {},
      create: rule,
    });
  }
  console.log('✅ MoneyBack+ reward rules created (with UNVERIFIED flags)');

  // ── Demo Transactions (§26 — with corrections applied) ────────────────────
  // All labeled with notes indicating demo status
  const month = new Date('2026-09-10');

  const demoTransactions = [
    {
      date: new Date('2026-09-02'),
      amountPaise: 400000, // ₹4,000
      type: 'EXPENSE',
      merchantRaw: 'Reliance Smart SuperStore',
      merchantId: merchantMap['RELIANCE RETAIL LTD'],
      categoryId: categoryMap['Food'],
      paymentMethodId: hdfc_moneyback.id,
      cashpointsEarned: 400, // 10X grocery, verified
      notes: '[DEMO] Grocery shopping. 10X partner — grocery sub-cap applies. 400 pts = floor(4000/200)×20',
      aiConfidence: 95,
    },
    {
      date: new Date('2026-09-03'),
      amountPaise: 400000, // ₹4,000
      type: 'EXPENSE',
      merchantRaw: 'DMart',
      merchantId: merchantMap['DMART'],
      categoryId: categoryMap['Shopping'],
      paymentMethodId: hdfc_moneyback.id,
      cashpointsEarned: 40, // Base rate only — NOT a 10X partner
      notes: '[DEMO] DMart shopping. Base rate only (NOT a 10X partner). 40 pts = floor(4000/200)×2',
      aiConfidence: 95,
    },
    {
      date: new Date('2026-09-05'),
      amountPaise: 65000, // ₹650
      type: 'EXPENSE',
      merchantRaw: 'Swiggy',
      merchantId: merchantMap['SWIGGY'],
      categoryId: categoryMap['Food'],
      paymentMethodId: hdfc_moneyback.id,
      cashpointsEarned: 60, // floor(650/200)=3 blocks × 20 pts — rounding UNVERIFIED
      notes: '[DEMO] Swiggy food delivery. 10X partner. 60 pts = floor(650/200)×20 — rounding rule UNVERIFIED',
      aiConfidence: 98,
    },
    {
      date: new Date('2026-09-06'),
      amountPaise: 120000, // ₹1,200
      type: 'EXPENSE',
      merchantRaw: 'IRCTC',
      merchantId: merchantMap['IRCTC'],
      categoryId: categoryMap['Transport'],
      paymentMethodId: hdfc_moneyback.id,
      cashpointsEarned: 0, // UNVERIFIED — treated as excluded pending verification
      notes: '[DEMO] IRCTC train ticket. CashPoints = 0 (UNVERIFIED — IRCTC govt exclusion pending HDFC T&C check)',
      aiConfidence: 80,
    },
    {
      date: new Date('2026-09-01'),
      amountPaise: 530000, // ₹5,300
      type: 'EXPENSE',
      merchantRaw: 'Rent',
      categoryId: categoryMap['Housing'],
      paymentMethodId: 3, // UPI
      cashpointsEarned: 0, // Rent excluded + not on card
      notes: '[DEMO] Monthly rent. 0 pts — rent is excluded category AND paid via UPI (not reward card)',
      aiConfidence: 99,
    },
    {
      date: new Date('2026-09-08'),
      amountPaise: 300000, // ₹3,000
      type: 'EXPENSE',
      merchantRaw: 'Amazon',
      merchantId: merchantMap['AMAZON'],
      categoryId: categoryMap['Shopping'],
      paymentMethodId: hdfc_moneyback.id,
      cashpointsEarned: 300, // 10X, general cap (not grocery)
      notes: '[DEMO] Amazon purchase. 10X partner. 300 pts = floor(3000/200)×20',
      aiConfidence: 99,
    },
    {
      date: new Date('2026-09-10'),
      amountPaise: 200000, // ₹2,000
      type: 'EXPENSE',
      merchantRaw: 'Transport',
      categoryId: categoryMap['Transport'],
      paymentMethodId: 3, // UPI
      cashpointsEarned: 0, // UPI — not on reward card
      notes: '[DEMO] Transport expense. 0 pts — paid via UPI, not reward card',
      aiConfidence: 90,
    },
    {
      date: new Date('2026-09-11'),
      amountPaise: 150000, // ₹1,500
      type: 'EXPENSE',
      merchantRaw: 'Electricity Bill',
      categoryId: categoryMap['Bills'],
      paymentMethodId: 3, // UPI
      cashpointsEarned: 0, // UPI — not on reward card
      notes: '[DEMO] Electricity bill. 0 pts — paid via UPI, not reward card',
      aiConfidence: 99,
    },
    // Income entry
    {
      date: new Date('2026-09-01'),
      amountPaise: 4_000_000, // ₹40,000 salary
      type: 'INCOME',
      merchantRaw: 'Salary',
      categoryId: categoryMap['Income'],
      paymentMethodId: 3, // UPI / bank transfer
      cashpointsEarned: 0,
      notes: '[DEMO] Monthly salary',
      aiConfidence: 100,
    },
  ];

  for (const tx of demoTransactions) {
    await prisma.transaction.create({ data: tx });
  }
  console.log('✅ Demo transactions created (§26 corrections applied)');

  // ── Update MoneyBack+ outstanding based on demo transactions ─────────────
  const cardSpend = demoTransactions
    .filter(t => t.paymentMethodId === hdfc_moneyback.id && t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amountPaise, 0);

  await prisma.paymentMethod.update({
    where: { id: hdfc_moneyback.id },
    data: { outstandingPaise: cardSpend },
  });
  console.log('✅ Card outstanding updated');

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log(`   Default password: ${initialPassword}`);
  console.log('   ⚠️  Change INITIAL_PASSWORD in .env.local before production use');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
