const fs = require('fs');

const retryLogic = `
async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      const errorData = await res.json().catch(() => null);
      let waitMs = 2000 * Math.pow(2, i); // default fallback exponential backoff
      if (errorData?.error?.message) {
         // extract "retry in X.Xs" if present
         const match = errorData.error.message.match(/retry in ([\d\.]+)s/);
         if (match && match[1]) {
           waitMs = parseFloat(match[1]) * 1000 + 500; // Add 500ms buffer
         }
      }
      console.warn(\`Rate limited (429). Retrying in \${waitMs}ms...\`);
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
  if (!content.includes('fetchWithRetry')) {
    // Insert after imports
    content = content.replace(/(import .*?;[\r\n]+)(?=(import|const|export))/, `$1\n${retryLogic}\n`);
    // Fallback if no import block matched nicely (e.g. aiRewards.ts might just have 'use server';)
    if (!content.includes('fetchWithRetry')) {
        content = content.replace("'use server';", "'use server';\n" + retryLogic);
    }
  }
  
  content = content.replace(/await fetch\(/g, "await fetchWithRetry(");
  fs.writeFileSync(path, content, 'utf8');
}

patchFile('c:\\Expense Tracker\\lib\\ai.ts');
patchFile('c:\\Expense Tracker\\app\\actions\\aiRewards.ts');
console.log("Patched to include fetchWithRetry");