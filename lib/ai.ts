
import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = 'gemini-3.6-flash';

const FINANCIAL_PARSER_PROMPT = `You are a transaction-extraction engine for an Indian personal finance app. You parse bank SMS, UPI notifications, and receipt text into structured data. Follow these rules exactly.

## AMOUNTS
- Output amountPaise as an integer: rupees * 100. ₹450 → 45000. ₹1,299.50 → 129950.
- Strip currency symbols, commas, and "Rs./INR" before converting.
- If multiple amounts appear (e.g. a receipt with subtotal, tax, total), use the FINAL settled amount, not subtotal.

## MERCHANT NORMALIZATION
Raw merchant strings from Indian bank/UPI rails are noisy. Normalize aggressively:
- Strip payment-gateway prefixes: "SWIGGY*ORDER123" → "Swiggy". "AMZN/1234ABC" → "Amazon". "RAZORPAY*ZOMATO" → "Zomato" (use the underlying merchant, not the gateway).
- Strip UPI handle suffixes: "reliancesmart@ybl" → "Reliance Smart". "johndoe@okhdfcbank" → keep as a person's name if it looks like a P2P transfer, don't force-normalize.
- Title-case the result. "DMART" → "DMart". "RELIANCE SMART SUPERSTORE" → "Reliance Smart".
- merchantRaw = the untouched original string. merchantNormalized = your cleaned version. Never lose the raw string even if normalization is uncertain.

## CATEGORIES
Pick the single best fit from this fixed set — do not invent new categories:
Food, Shopping, Transport, Housing, Bills, Entertainment, Healthcare, Education, Travel, Subscriptions, Government, Income, Refunds, Transfers, Other.

Heuristics:
- MSEDCL, BESCOM, property tax, income tax, traffic challans, passport fees → Government.
- Electricity, internet, mobile recharge (Jio/Airtel) if not explicitly government → Bills.
- Reliance Smart / DMart / BigBasket / Swiggy / Zomato / Restaurants → Food.
- Rent, maintenance, repairs → Housing.
- Uber, Ola, Petrol, IRCTC, Flights → Transport (or Travel for flights/hotels).
- Amazon, Flipkart, Myntra, retail stores → Shopping.
- Netflix/Spotify/iCloud → Subscriptions.

## PAYMENT METHOD
- UPI apps (GPay, PhonePe, Paytm, "UPI/", "@okhdfcbank" etc. handles) → UPI.
- "XX1234" or "card ending 1234" style + "credit" in narration → CREDIT_CARD.
- Same pattern + "debit" → DEBIT_CARD.
- NEFT/IMPS/RTGS/"A/C XXXX" with no card mention → BANK_TRANSFER.
- No usable signal → UNKNOWN. Never guess a specific bank/card if the text doesn't name one.
- paymentMethodRaw = the literal snippet that led to your classification (e.g. "HDFC Bank Credit Card XX1234"), not a paraphrase.

## TRANSACTION TYPE
- Money leaving the user → EXPENSE. Money arriving (salary, P2P received, cashback) → INCOME. Money moving between the user's own accounts (self-transfer, card bill payment from linked account) → TRANSFER. Reversals → REFUND per above.

## RECEIPTS
- Only populate receiptItems if the text is a genuine itemized receipt with distinct line items and prices. A bank SMS or single-line UPI notification should have an empty array, never a fabricated single item.

## CONFIDENCE SCORE
Score 0-100 based on extraction certainty, not transaction size:
- 90-100: full bank SMS/UPI format with clear amount, merchant, date, payment method.
- 60-89: one field (usually merchant name or category) is inferred/ambiguous.
- Below 60: truncated text, garbled OCR, or missing amount/date requiring guesswork.

## GENERAL
- Never hallucinate a date, amount, or merchant not present or clearly inferable in the text.
- If the input is not a transaction at all (promo SMS, OTP, balance-check message), still return your best-effort JSON but set confidenceScore below 20 and suggestedCategory to "Other".`;

const transactionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    merchantRaw: {
      type: Type.STRING,
      description: 'The exact raw merchant name from the text',
    },
    merchantNormalized: {
      type: Type.STRING,
      description: 'A clean, human-readable name for the merchant (e.g. "Amazon" instead of "AMZN/1234")',
    },
    amountPaise: {
      type: Type.INTEGER,
      description: 'The transaction amount in paise (rupees * 100)',
    },
    date: {
      type: Type.STRING,
      description: 'ISO 8601 date string of the transaction',
    },
    type: {
      type: Type.STRING,
      enum: ['EXPENSE', 'INCOME', 'TRANSFER', 'REFUND'],
      description: 'The type of transaction',
    },
    suggestedCategory: {
      type: Type.STRING,
      description: 'Suggested broad category (e.g., "Groceries", "Food", "Travel", "Utilities", "Shopping")',
    },
    paymentMethodType: {
      type: Type.STRING,
      enum: ['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH', 'UNKNOWN'],
      description: 'How the transaction was paid',
    },
    paymentMethodRaw: {
      type: Type.STRING,
      description: 'Raw string indicating payment method (e.g., "HDFC Bank Credit Card ending in 1234")',
    },
    receiptItems: {
      type: Type.ARRAY,
      description: 'If this is a detailed receipt, extract the individual line items',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.INTEGER },
          pricePaise: { type: Type.INTEGER },
        },
        required: ['name', 'quantity', 'pricePaise'],
      }
    },
    confidenceScore: {
      type: Type.INTEGER,
      description: 'Confidence score from 0-100 of the extraction quality',
    }
  },
  required: ['merchantRaw', 'merchantNormalized', 'amountPaise', 'date', 'type', 'suggestedCategory', 'paymentMethodType', 'confidenceScore'],
};

export async function parseTransactionFromText(text: string, currentDateStr: string) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Today's date is ${currentDateStr}. Extract the transaction details from this text, SMS, or receipt:\n\n${text}`,
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: transactionSchema,
      systemInstruction: FINANCIAL_PARSER_PROMPT,
    }
  });

  const rawJson = response.text;
  if (!rawJson) throw new Error('No text returned from Gemini');
  
  return JSON.parse(rawJson);
}

const searchIntentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      enum: ['FILTER_TRANSACTIONS', 'AGGREGATE_SPENDING', 'UNKNOWN'],
    },
    merchantName: { type: Type.STRING },
    categoryName: { type: Type.STRING },
    startDate: { type: Type.STRING, description: 'ISO string' },
    endDate: { type: Type.STRING, description: 'ISO string' },
    minAmountPaise: { type: Type.INTEGER },
    maxAmountPaise: { type: Type.INTEGER },
  },
  required: ['intent'],
};

export async function parseSearchIntent(query: string, currentDateStr: string) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Today is ${currentDateStr}. Parse this search query into structured filters: "${query}"`,
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: searchIntentSchema,
    }
  });
  
  return JSON.parse(response.text || '{}');
}
