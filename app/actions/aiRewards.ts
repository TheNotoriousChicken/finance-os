'use server';


async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429 || res.status === 503) {
      const errorData = await res.json().catch(() => null);
      let waitMs = 2000 * Math.pow(2, i); // fallback exponential backoff
      
      if (res.status === 429 && errorData?.error?.message) {
         const match = errorData.error.message.match(/retry in ([0-9.]+)s/);
         if (match && match[1]) {
           waitMs = parseFloat(match[1]) * 1000 + 500;
         }
      }
      
      // If Vercel might time out (e.g. wait > 8 seconds), let's just throw 
      // so the UI can gracefully show the error instead of Vercel giving a 504.
      if (waitMs > 8000) {
        console.warn(`Rate limit wait time (${waitMs}ms) is too long for serverless. Throwing.`);
        return new Response(JSON.stringify(errorData || { error: { message: "Rate limit exceeded. Please try again later." } }), { status: res.status });
      }

      console.warn(`Gemini ${res.status}. Retrying in ${waitMs}ms...`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    return res;
  }
  return fetch(url, options); // last attempt
}


export async function classifySpendGemini(merchantDesc: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in Vercel environment variables.");

  const prompt = `You are a rewards classification engine for an Indian personal finance app. The user has two credit cards:

## CARD 1: HDFC MoneyBack+ Credit Card
Reward type: CashPoints (1 CashPoint ≈ ₹0.25)
Earn rates:
- "10x": 10 CashPoints per ₹200 spent at: Amazon, Flipkart, Swiggy, Reliance Smart, BigBasket, Blinkit
  - Grocery sub-category ("grocery"): Reliance Smart, BigBasket, Blinkit — same 10x but has a monthly sub-cap of 1000 CashPoints
- "normal": 2 CashPoints per ₹200 for all other eligible spend
- "excluded": ZERO rewards for: Fuel, Petrol, Diesel, CNG, Rent, Housing Society Maintenance, Government payments (taxes, challans, passport), Wallet loads (Paytm/PhonePe wallet), Gift cards, EMI transactions, Cash withdrawals, Insurance premiums paid to HDFC

## CARD 2: Tata Neu Plus HDFC Credit Card (RuPay)
Reward type: NeuCoins (1 NeuCoin = ₹1 when redeemed on Tata Neu app)
Earn rates:
- "tata_brand": 2% NeuCoins on Tata ecosystem brands: Tata Neu app, Croma, BigBasket, 1mg, Air India, Taj Hotels, Tata Cliq, Titan, Tanishq, Tata Play (Tata Sky), Westside, Zudio, Tata Motors showrooms, Starbucks (Tata-operated)
- "upi_eligible": 1% NeuCoins on UPI transactions at eligible merchants (cap 500 NeuCoins/month), 0% for non-eligible UPI
- "normal": 1% NeuCoins on all other non-excluded spend
- "excluded": ZERO rewards for: Fuel, Rent, Government, Wallet loads, EMI, Utility bill payments (electricity/water), Cash, Fees

## YOUR TASK
Classify this merchant/spend description: "${merchantDesc}"

Output rules:
- "type" must be one of: "10x", "grocery", "excluded", "normal"
  - Use "grocery" when merchant is Reliance Smart / BigBasket / Blinkit (they are BOTH 10x AND grocery sub-capped)
  - Use "10x" when merchant is Amazon / Flipkart / Swiggy (10x partner but NOT grocery)
  - Use "excluded" when ANY excluded category applies (fuel, rent, govt, wallet, EMI, etc.)
  - Use "normal" for everything else
- "isTataBrand" = true if the merchant belongs to the Tata ecosystem (earns 2% on Tata Neu Plus)
- "merchant" = clean, normalized, title-case merchant name (e.g., "Reliance Smart" not "RELIANCE SMART SUPERSTORE")
- "reason" = a concise, useful 1–2 sentence explanation mentioning BOTH cards' specific reward outcome
- "category" = the spending category. Pick one: Food, Shopping, Transport, Housing, Bills, Entertainment, Healthcare, Education, Travel, Subscriptions, Government, Fuel, Rent, Insurance, Other

Respond ONLY with valid JSON (no markdown):
{
  "type": "10x",
  "isTataBrand": false,
  "merchant": "string",
  "category": "string",
  "reason": "string"
}`;

  try {
    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
    }
    
    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text) as { type: '10x' | 'grocery' | 'excluded' | 'normal', isTataBrand: boolean, merchant: string, category: string, reason: string };
  } catch (error: any) {
    console.error("AI Classification Error:", error);
    throw new Error(error.message || "Failed to call Gemini API");
  }
}
