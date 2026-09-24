const fs = require('fs');

function fix(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace("const res = await fetchWithRetry(url, options);", "const res = await fetch(url, options);");
  content = content.replace(/match\(\/retry in \(\[d\.\]\+\)s\/\)/g, 'match(/retry in ([\\\\d\\\\.]+)s/)');
  fs.writeFileSync(path, content, 'utf8');
}

fix('c:\\Expense Tracker\\lib\\ai.ts');
fix('c:\\Expense Tracker\\app\\actions\\aiRewards.ts');
console.log("Fixed infinite recursion in fetchWithRetry");