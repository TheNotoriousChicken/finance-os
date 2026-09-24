const apiKey = process.env.GEMINI_API_KEY;

async function check(model) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
    });
    const d = await res.json();
    if (res.ok) console.log(`SUCCESS for ${model}`);
    else console.log(`FAIL for ${model}: ${d.error.message.substring(0, 50)}...`);
  } catch(e) {
    console.log(`ERROR for ${model}: ${e.message}`);
  }
}

async function run() {
  await check('gemini-flash-latest');
  await check('gemini-3.7-flash');
  await check('gemini-3.8-flash');
}
run();