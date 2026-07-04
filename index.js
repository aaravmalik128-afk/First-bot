require("dotenv").config();

const { Telegraf } = require("telegraf");
const config = require("./config");
const connectDB = require("./database");
const User = require("./userModel");

// Connect MongoDB
connectDB();

const bot = new Telegraf(config.BOT_TOKEN);

// Start Command
bot.start(async (ctx) => {
  try {
    const user = ctx.from;

    // Save user if not already in database
    const exists = await User.findOne({ userId: user.id });

    if (!exists) {
      await User.create({
        userId: user.id,
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        username: user.username || ""
      });

      console.log("✅ New User Saved:", user.id);
    }

    await ctx.reply(
      `👋 Welcome ${user.first_name}!

🤖 Study Matt Bot is now active.

✅ Your account has been registered successfully.

More features coming soon...`
    );

  } catch (err) {
    console.log(err);
    ctx.reply("❌ Something went wrong.");
  }
});

// Ping Command
bot.command("ping", (ctx) => {
  ctx.reply("🏓 Pong! Bot is Online.");
});

bot.launch();

console.log("🚀 Bot Started Successfully");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
