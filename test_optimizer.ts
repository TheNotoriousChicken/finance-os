import { parseOptimizerOrQuestion } from "./lib/ai";
async function test() {
  try {
    const res = await parseOptimizerOrQuestion("1000 at starbucks");
    console.log(res);
  } catch (e) {
    console.error("ERROR:", e);
  }
}
test();