const { smartOptimizeAction } = require("./app/actions/optimizer");
async function run() {
  const res = await smartOptimizeAction("6000 at flipkart");
  console.log(res);
  process.exit(0);
}
run();