const mongoose = require("mongoose");
const config = require("./config");

async function connectDB() {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      dbName: "studymatt"
    });

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Error:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
