
import { GoogleGenAI, Type, Schema } from '@google/genai';



async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429 || res.status === 503) {
      const errorData = await res.json().catch(() => null);
      let waitMs = 2000 * Math.pow(2, i);
      if (res.status === 429 && errorData?.error?.message) {
        const match = errorData.error.message.match(/retry in ([0-9.]+)s/);
        if (match && match[1]) waitMs = parseFloat(match[1]) * 1000 + 500;
      }
      if (waitMs > 8000) {
        console.warn(`Gemini rate-limit wait ${waitMs}ms > 8s, aborting early.`);
        return new Response(
          JSON.stringify({ error: { code: res.status, message: 'Rate limit exceeded. Please try again in a moment.' } }),
          { status: res.status }
        ) as unknown as Response;
      }
      console.warn(`Gemini ${res.status}. Retrying in ${waitMs}ms (attempt ${i + 1}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    return res;
  }
  return fetch(url, options);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = 'gemini-3.5-flash';



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


// -----------------------------
// OPTIMIZER PARSER
// -----------------------------

const optimizerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    intentType: {
      type: Type.STRING,
      enum: ['TRANSACTION_OPTIMIZER', 'GENERAL_QUESTION'],
      description: 'Whether the user is asking to optimize a specific transaction, or asking a general question'
    },
    amountPaise: { type: Type.INTEGER, description: 'Amount in paise' },
    merchant: { type: Type.STRING },
    category: { type: Type.STRING },
    isEmi: { type: Type.BOOLEAN },
    splitUpiAmountPaise: { type: Type.INTEGER, description: 'If the user specifies paying a part via UPI, e.g. "25k UPI and rest on EMI"' },
    confidenceScore: { type: Type.INTEGER, description: '0-100 score of extraction confidence' },
    generalQuestion: { type: Type.STRING, description: 'The question if intentType is GENERAL_QUESTION' }
  },
  required: ['intentType', 'confidenceScore']
};

export async function parseOptimizerOrQuestion(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  
  const prompt = `You are a financial intent parser for an Indian personal finance app. Classify the user query and extract structured data.

## INTENT CLASSIFICATION
Classify as one of:
- TRANSACTION_OPTIMIZER: User wants to know the best card/payment method for a purchase. Signals: ₹/rupee amounts, merchant names, product names, EMI mentions, UPI split mentions.
  Examples: "₹4,000 at Reliance", "which card for Croma laptop?", "60k at Swiggy EMI", "rent payment 15000", "2500 electricity bill"
- GENERAL_QUESTION: User is asking a question about their financial data, balances, rewards, limits, spending history, or needs advice.
  Examples: "how much HDFC limit left?", "what did I spend on food this month?", "how many cashpoints do I have?", "should I pay the full bill now?"

## AMOUNT EXTRACTION RULES
- Convert to integer paise (rupees × 100): ₹4,000 → 400000. "60k" → 6000000. "1.5L" → 150000. "1.5 lakh" → 150000.
- Strip ₹ / Rs / INR symbols and commas before converting.
- If user says "X on UPI, rest on card" for a total: amountPaise = full total, splitUpiAmountPaise = UPI portion.
- If user says "X at merchant" with no UPI split: splitUpiAmountPaise = 0.

## MERCHANT NORMALIZATION
- Normalize to a clean title-case name: "reliance smart superstore" → "Reliance Smart", "amzn" → "Amazon".
- Tata brands (important for rewards): Croma, Tata Neu, BigBasket, 1mg, Air India, Taj Hotels, Tata Cliq, Titan, Tanishq, Tata Sky (Tata Play), Westside, Zudio.
- If the merchant is clearly a Tata brand, preserve the exact normalized name so downstream logic can detect it.

## CATEGORY RULES
Pick exactly one from: Food, Shopping, Transport, Housing, Bills, Entertainment, Healthcare, Education, Travel, Subscriptions, Government, Fuel, Rent, Other.
- Petrol/diesel/CNG/fuel station → "Fuel"
- Rent/maintenance/housing society/PG → "Rent"  
- MSEDCL/BESCOM/BBMP/property tax/income tax/traffic challan → "Government"
- Electricity/internet/mobile recharge (Jio/Airtel) → "Bills"
- Swiggy/Zomato/restaurants/food delivery/grocery → "Food"
- Amazon/Flipkart/Myntra/retail → "Shopping"
- Uber/Ola/Metro/IRCTC (trains) → "Transport"
- Flights/hotels/vacation → "Travel"
- Netflix/Spotify/iCloud/streaming → "Subscriptions"
- Hospitals/pharmacy/doctor → "Healthcare"

## EMI DETECTION
Set isEmi=true if user says "EMI", "no-cost EMI", "easy installment", "convert to EMI", or asks to split into monthly payments.

## CONFIDENCE SCORING
- 90–100: Clear amount AND clear merchant both present.
- 70–89: Amount clear, merchant is ambiguous or generic ("a shop", "store").
- 50–69: Either amount or merchant is missing or very unclear.
- <50: Both missing or input is highly ambiguous.

Query: "${text}"

Respond ONLY with valid JSON (no markdown fences):
{
  "intentType": "TRANSACTION_OPTIMIZER",
  "amountPaise": number,
  "merchant": "string",
  "category": "string",
  "isEmi": false,
  "splitUpiAmountPaise": 0,
  "confidenceScore": number,
  "generalQuestion": null
}`;

  const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, response_mime_type: "application/json" }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.status} - ${await response.text()}`);
  }
  
  const data = await response.json();
  const resText = data.candidates[0].content.parts[0].text;
  return JSON.parse(resText || '{}');
}

// -----------------------------
// AI ASSISTANT CHAT
// -----------------------------

export async function askFinanceAssistant(query: string, systemContext: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

  const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemContext }] },
      contents: [{ parts: [{ text: query }] }],
      generationConfig: { temperature: 0.2 }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}