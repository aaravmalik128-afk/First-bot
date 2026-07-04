require("dotenv").config();

const { Telegraf } = require("telegraf");
const config = require("./config");

const bot = new Telegraf(config.BOT_TOKEN);

// Start Command
bot.start((ctx) => {
  ctx.reply(
    "🤖 Bot Successfully Started!\n\nWelcome to the Telegram File Bot.\n\nMore features coming soon..."
  );
});

// Ping Command
bot.command("ping", (ctx) => {
  ctx.reply("🏓 Pong! Bot is Online.");
});

// Launch Bot
bot.launch();

console.log("✅ Bot is Running...");

// Graceful Stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
