const fs = require('fs');

const retryLogic = `
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
        console.warn(\`Rate limit wait time (\${waitMs}ms) is too long for serverless. Throwing.\`);
        return new Response(JSON.stringify(errorData || { error: { message: "Rate limit exceeded. Please try again later." } }), { status: res.status });
      }

      console.warn(\`Gemini \${res.status}. Retrying in \${waitMs}ms...\`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    return res;
  }
  return fetch(url, options); // last attempt
}
`;

function patchFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  // Remove old fetchWithRetry
  content = content.replace(/async function fetchWithRetry[\s\S]*?(?=\nexport )/, retryLogic + "\n");
  
  // Replace 3.6 with 3.5
  content = content.replace(/gemini-3\.6-flash/g, 'gemini-3.5-flash');
  
  fs.writeFileSync(path, content, 'utf8');
}

patchFile('c:\\Expense Tracker\\lib\\ai.ts');
patchFile('c:\\Expense Tracker\\app\\actions\\aiRewards.ts');
console.log("Patched to gemini-3.5-flash with better retry");