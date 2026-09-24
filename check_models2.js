const apiKey = process.env.GEMINI_API_KEY;
const models = [
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash-lite-tts',
  'gemini-omni-1.1-flash',
  'gemini-2.5-pro'
];

async function check(model) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
    });
    const d = await res.json();
    if (res.ok) console.log(`SUCCESS for ${model}`);
    else console.log(`FAIL for ${model}: ${d.error?.message?.substring(0, 50)}...`);
  } catch(e) {
    console.log(`ERROR for ${model}: ${e.message}`);
  }
}

async function run() {
  for (let m of models) await check(m);
}
run();