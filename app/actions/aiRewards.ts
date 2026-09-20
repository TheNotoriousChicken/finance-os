'use server';

export async function classifySpendGemini(merchantDesc: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in Vercel environment variables.");

  const prompt = `You are a rewards classification assistant for the HDFC MoneyBack+ credit card.
The user is spending money at: "${merchantDesc}"

Classify this merchant into one of the following reward types based on HDFC MoneyBack+ rules:
- '10x': Amazon, Flipkart, Swiggy, Reliance Smart, BigBasket
- 'grocery': Reliance Smart, BigBasket (these are 10x but specifically grocery)
- 'excluded': Fuel (petrol pumps), Rent (Cred rent, NoBroker, etc), Government (taxes, IRCTC), Wallet Loads (Paytm wallet), EMI, Gift Cards
- 'normal': Everything else (e.g. Zomato, Myntra, offline clothing, restaurants, Zepto, Blinkit, Swiggy Instamart)

Respond ONLY in raw JSON format without markdown blocks:
{
  "type": "10x" | "grocery" | "excluded" | "normal",
  "merchant": "Cleaned up merchant name",
  "reason": "Short explanation of why it falls into this category"
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
    return JSON.parse(text) as { type: '10x' | 'grocery' | 'excluded' | 'normal', merchant: string, reason: string };
  } catch (error: any) {
    console.error("AI Classification Error:", error);
    throw new Error(error.message || "Failed to call Gemini API");
  }
}
