const fs = require('fs');

function fix(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/match\(\/retry in \(\[\\\\d\\\\\.\]\+\)s\/\)/g, 'match(/retry in ([\\\\d\\\\.]+)s/)'); // Let's just use \d\.
  
  // Actually, I can just use match(/retry in ([\d\.]+)s/);
  content = content.replace("match(/retry in ([\\\\d\\\\.]+)s/)", "match(/retry in ([\\\\d\\\\.]+)s/)");
  fs.writeFileSync(path, content, 'utf8');
}

fix('c:\\Expense Tracker\\lib\\ai.ts');
fix('c:\\Expense Tracker\\app\\actions\\aiRewards.ts');
console.log("Fixed regex");