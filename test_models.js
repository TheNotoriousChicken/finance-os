const apiKey = process.env.GEMINI_API_KEY;
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
.then(r => r.json()).then(d => require('fs').writeFileSync('models.json', JSON.stringify(d, null, 2))).catch(console.error);