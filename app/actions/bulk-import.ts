
'use server';

import { GoogleGenAI, Type, Schema } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const bulkSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      merchantRaw: { type: Type.STRING },
      merchantNormalized: { type: Type.STRING },
      amountPaise: { type: Type.INTEGER },
      date: { type: Type.STRING },
      type: { type: Type.STRING, enum: ['EXPENSE', 'INCOME', 'TRANSFER', 'REFUND'] },
      paymentMethodType: { type: Type.STRING }
    },
    required: ['merchantRaw', 'merchantNormalized', 'amountPaise', 'date', 'type']
  }
};

export async function parseBulkStatementAction(formData: FormData) {
  const file = formData.get('file') as File | null;
  const text = formData.get('text') as string | null;

  let contents: any[] = [{ text: "Extract all transactions from this document/text into structured data. Return amounts in paise (rupees * 100):" }];

  if (file && file.size > 0) {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    
    // Default to application/pdf if excel or unknown, Gemini handles many docs
    let mimeType = file.type;
    if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (file.name.endsWith('.csv')) mimeType = 'text/csv';
    else if (file.name.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; // Gemini might struggle with pure xlsx inline, but often supports it or we fallback to text
    
    contents.push({
      inlineData: {
        mimeType: mimeType || 'application/pdf',
        data: base64
      }
    });
  } else if (text && text.trim().length > 0) {
    contents.push({ text: text });
  } else {
    throw new Error("Please provide a file or text.");
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: contents,
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: bulkSchema,
    }
  });

  if (!response.text) throw new Error("No response from AI");
  
  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch (e: any) {
    console.error("JSON parse failed, attempting repair. Error:", e.message);
    // Attempt to repair a truncated JSON array of objects
    let text = response.text;
    const lastValidObj = text.lastIndexOf('}');
    if (lastValidObj !== -1) {
      text = text.substring(0, lastValidObj + 1) + ']';
      try {
        parsed = JSON.parse(text);
      } catch (e2) {
        throw new Error("Failed to parse AI output even after repair: " + e.message);
      }
    } else {
      throw new Error("Failed to parse AI output: " + e.message);
    }
  }
  
  return parsed;

}
