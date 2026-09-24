const { smartOptimizeAction } = require("./app/actions/optimizer");

async function test() {
  try {
    const res = await smartOptimizeAction("60k laptop from reliance digital. 25k down and remainng emi");
    console.log("Success:", JSON.stringify(res, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

test();