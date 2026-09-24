const fs = require('fs');
['c:\\Expense Tracker\\lib\\ai.ts', 'c:\\Expense Tracker\\app\\actions\\aiRewards.ts'].forEach(path => {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/gemini-3\.6-flash/g, 'gemini-2.5-flash');
  fs.writeFileSync(path, content, 'utf8');
});
console.log("Switched to gemini-2.5-flash");