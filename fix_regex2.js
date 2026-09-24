const fs = require('fs');

function fix(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/const match = .*;/g, 'const match = errorData.error.message.match(/retry in ([0-9.]+)s/);');
  fs.writeFileSync(path, content, 'utf8');
}

fix('c:\\Expense Tracker\\lib\\ai.ts');
fix('c:\\Expense Tracker\\app\\actions\\aiRewards.ts');
console.log("Fixed regex properly");