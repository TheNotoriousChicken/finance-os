const fs = require('fs');

const newRetry = `async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429 || res.status === 503) {
      const errorData = await res.json().catch(() => null);
      let waitMs = 2000 * Math.pow(2, i);
      if (res.status === 429 && errorData?.error?.message) {
         const match = errorData.error.message.match(/retry in ([0-9.]+)s/);
         if (match && match[1]) {
           waitMs = parseFloat(match[1]) * 1000 + 500;
         }
      }
      if (waitMs > 8000) {
        console.warn(\`Rate limit wait time (\${waitMs}ms) is too long for serverless. Throwing.\`);
        return new Response(JSON.stringify(errorData || { error: { message: "Rate limit exceeded. Please try again later." } }), { status: res.status });
      }
      console.warn(\`Gemini \${res.status}. Retrying in \${waitMs}ms...\`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    return res;
  }
  return fetch(url, options);
}`;

function patch(path) {
  let content = fs.readFileSync(path, 'utf8');
  // Match just the old fetchWithRetry block
  const oldRetryRegex = /async function fetchWithRetry[\s\S]*?return fetch\(url, options\);\s*\}/;
  content = content.replace(oldRetryRegex, newRetry);
  content = content.replace(/gemini-3\.6-flash/g, 'gemini-3.5-flash');
  fs.writeFileSync(path, content, 'utf8');
}

patch('c:\\Expense Tracker\\lib\\ai.ts');
console.log("Fixed ai.ts");