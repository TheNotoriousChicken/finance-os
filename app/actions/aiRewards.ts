'use server';

export async function classifySpendGemini(merchantDesc: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in Vercel environment variables.");

  const prompt = `You are a rewards classification assistant evaluating spending for two credit cards: HDFC MoneyBack+ and Tata Neu Plus (RuPay).
The user is spending money at: "${merchantDesc}"

Rules:
HDFC MoneyBack+:
- '10x': Amazon, Flipkart, Swiggy, Reliance Smart, BigBasket, Blinkit
- 'grocery': Reliance Smart, BigBasket
- 'excluded': Fuel, Rent, Govt, Wallets, EMI
- 'normal': Everything else

Tata Neu Plus:
- Earns 2% on Tata Brands (e.g., Tata Neu app, Croma, BigBasket, 1mg, Air India, Taj, Tata Cliq, Titan, Tanishq)
- 'excluded': Fuel, Rent, Govt, Wallets, EMI

Respond ONLY in raw JSON format without markdown blocks:
{
  "type": "10x" | "grocery" | "excluded" | "normal",
  "isTataBrand": boolean,
  "merchant": "Cleaned up merchant name",
  "reason": "Short explanation of the rewards eligibility for both cards"
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
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
    return JSON.parse(text) as { type: '10x' | 'grocery' | 'excluded' | 'normal', isTataBrand: boolean, merchant: string, reason: string };
  } catch (error: any) {
    console.error("AI Classification Error:", error);
    throw new Error(error.message || "Failed to call Gemini API");
  }
}
