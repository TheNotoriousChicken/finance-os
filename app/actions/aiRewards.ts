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
    return JSON.parse(text) as { type: '10x' | 'grocery' | 'excluded' | 'normal', isTataBrand: boolean, merchant: string, reason: string };
  } catch (error: any) {
    console.error("AI Classification Error:", error);
    throw new Error(error.message || "Failed to call Gemini API");
  }
}
