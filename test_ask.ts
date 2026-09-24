const { askFinanceAssistant } = require("./lib/ai");
async function test() {
  try {
    const res = await askFinanceAssistant("Hello", "Context");
    console.log("Success:", res);
  } catch (e) {
    console.error("ERROR:", e);
  }
}
test();