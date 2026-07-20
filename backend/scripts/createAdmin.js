const bcrypt = require("bcrypt");
const db = require("../config/db");

async function createAdmin() {
  try {
    const username = "admin";
    const password = "123456";

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `
            INSERT INTO admins(username, password)
            VALUES (?, ?)
            `,
      [username, hashedPassword],
    );

    console.log("=================================");
    console.log("Admin đã được tạo thành công!");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("=================================");

    process.exit();
  } catch (error) {
    console.error(error);

    process.exit();
  }
}

createAdmin();
