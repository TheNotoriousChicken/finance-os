const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ai = require("./lib/ai");

async function test() {
  const query = "60k laptop from reliance digital. 25k down and remainng emi";
  
  try {
    const parsed = await ai.parseOptimizerOrQuestion(query);
    console.log("Parsed:", parsed);
  } catch(e) {
    console.error("AI Error:", e);
  }
}
test();