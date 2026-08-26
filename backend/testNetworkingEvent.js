const NetworkingEventModel = require("./models/networkingEventModel");

async function test() {
  try {
    console.log("=== TEST NETWORKING EVENT ===");
    const events = await NetworkingEventModel.getAll({
      year: 2025,
    });

    console.log(JSON.stringify(events, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("TEST ERROR:", error);

    process.exit(1);
  }
}

test();
