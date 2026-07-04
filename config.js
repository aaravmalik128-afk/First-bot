require("dotenv").config();

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  MONGODB_URI: process.env.MONGODB_URI,
  ADMIN_ID: process.env.ADMIN_ID,
  FORCE_JOIN_CHANNEL: process.env.FORCE_JOIN_CHANNEL
};
