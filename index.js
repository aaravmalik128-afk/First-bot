const { Telegraf, session } = require('telegraf');
const config = require('./config');
const connectDB = require('./database');
const User = require('./userModel');
const { forceJoinMiddleware, mainMenuKeyboard } = require('./middleware');
const { setupAdminFeatures } = require('./admin');
const { setupUserFeatures } = require('./userFeatures');

// 1. Initialize Bot
const bot = new Telegraf(config.botToken);

// 2. Connect MongoDB Database
connectDB();

// 3. Setup Sessions
bot.use(session()); // सीन्स और स्टेट्स मैनेज करने के लिए

// 🔥 CRITICAL FIX: एडमिन फीचर्स को सबसे पहले रजिस्टर करें ताकि वे फ़ोर्स जॉइन या सामान्य यूज़र स्टार्ट से बाईपास न हों
setupAdminFeatures(bot);

// 4. Setup Force Join Middleware (अब यह केवल सामान्य यूज़र्स पर लागू होगा)
bot.use(forceJoinMiddleware); 

// 5. Register Users on /start Command
bot.start(async (ctx) => {
    if (!ctx.from) return;

    const telegramId = ctx.from.id;
    const { username, first_name: firstName, last_name: lastName } = ctx.from;

    try {
        // चेक करें कि यूजर पहले से डेटाबेस में है या नहीं
        let user = await User.findOne({ telegramId });
        
        if (!user) {
            // नया यूजर सेव करें
            user = new User({
                telegramId,
                username,
                firstName,
                lastName
            });
            await user.save();
            console.log(`👤 New User Registered: ${firstName} (${telegramId})`);
        }

        const welcomeMessage = `👋 *Welcome to our File Sharing Bot, ${firstName}!*\n\n` +
            `🚀 Here you can find all materials, PDFs, notes, courses, and software files instantly.\n\n` +
            `👉 Use the menu buttons below to search or explore categories!`;

        return ctx.replyWithMarkdown(welcomeMessage, mainMenuKeyboard);
    } catch (error) {
        console.error(`❌ Error in /start command: ${error.message}`);
        return ctx.reply('👋 Welcome back! Click on any button below to get started.', mainMenuKeyboard);
    }
});

// 6. Handle Force Join Verification Callback Button
bot.action('verify_join', async (ctx) => {
    if (!ctx.from) return;
    
    const userId = ctx.from.id;
    
    try {
        // दोबारा चैनल स्टेटस चेक करें
        const member = await ctx.telegram.getChatMember(config.forceJoinChannel, userId);
        const allowedStatuses = ['creator', 'administrator', 'member'];
        
        if (allowedStatuses.includes(member.status)) {
            await ctx.answerCbQuery('✅ Verification Successful! Welcome.', { show_alert: false });
            
            // पुराना मैसेज डिलीट करके सीधे मेनू कीबोर्ड सेंड करना
            await ctx.deleteMessage().catch(() => {});
            return ctx.reply(`🎉 *Verification Success!*\n\nYou can now fully use the bot and access all files.`, {
                parse_mode: 'Markdown',
                ...mainMenuKeyboard
            });
        } else {
            return ctx.answerCbQuery('⚠️ You still haven\'t joined! Please join the channel first.', { show_alert: true });
        }
    } catch (error) {
        console.error(`❌ Verification Callback Error: ${error.message}`);
        return ctx.answerCbQuery('❌ Verification failed. Try again later.', { show_alert: true });
    }
});

// 7. Bind User Core Modules
setupUserFeatures(bot);

// 8. Production-Ready Global Error Handling (Prevents Bot Crashing on Railway)
bot.catch((err, ctx) => {
    console.error(`❌ Telegraf Runtime Error encountered for ${ctx.updateType}:`, err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ CRITICAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ CRITICAL UNHANDLED REJECTION AT:', promise, 'REASON:', reason);
});

// 9. Launch Bot (Railway/Production Polling Mode)
bot.launch({
    allowedUpdates: ['message', 'callback_query'] // सिलेक्टेड अपडेट्स से परफॉरमेंस बेहतर होगी
}).then(() => {
    console.log('🚀 Telegram File Sharing Bot is successfully running in Production mode!');
}).catch((error) => {
    console.error(`❌ Failed to launch bot: ${error.message}`);
});

// Graceful Shutdown Support
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
