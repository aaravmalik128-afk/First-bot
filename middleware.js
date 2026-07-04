const config = require('./config');
const User = require('./userModel');

// 1. Force Join Check Middleware
const forceJoinMiddleware = async (ctx, next) => {
    // अगर मैसेज चैनल से है तो इग्नोर करें
    if (ctx.chat && ctx.chat.type === 'channel') {
        return next();
    }

    // अगर ctx.from नहीं है, तो भी आगे बढ़ें (जैसे इनलाइन क्वेरी)
    if (!ctx.from) {
        return next();
    }

    const userId = ctx.from.id;

    // एडमिन के लिए फ़ोर्स जॉइन बाईपास
    if (userId === Number(config.adminId)) {
        return next();
    }

    try {
        const member = await ctx.telegram.getChatMember(config.forceJoinChannel, userId);
        const allowedStatuses = ['creator', 'administrator', 'member'];
        
        if (allowedStatuses.includes(member.status)) {
            return next();
        } else {
            return sendForceJoinMessage(ctx);
        }
    } catch (error) {
        console.error(`❌ Force Join Error: ${error.message}`);
        return sendForceJoinMessage(ctx);
    }
};

// फ़ोर्स जॉइन मैसेज भेजने का हेल्पर फंक्शन
const sendForceJoinMessage = async (ctx) => {
    const text = `📢 *Access Denied!*\n\nOur bot is exclusive for channel members. Please join our updates channel to use this bot and access files.\n\n👇 *Join from the button below:*`;
    
    const keyboard = {
        inline_keyboard: [
            [{ text: '📢 Join Channel', url: `https://t.me/${config.channelUsername.replace('@', '')}` }],
            [{ text: '✅ Verify Status', callback_data: 'verify_join' }]
        ]
    };

    if (ctx.callbackQuery) {
        // अगर यूजर ने 'Verify' बटन दबाया और अभी भी जॉइन नहीं किया
        await ctx.answerCbQuery('⚠️ You haven\'t joined the channel yet! Please join first.', { show_alert: true });
        return;
    }

    return ctx.replyWithMarkdownV2(text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), { reply_markup: keyboard });
};

// 2. Main Menu Keyboard Definition
const mainMenuKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: '🔍 Search' }, { text: '📂 Categories' }],
            [{ text: '📁 My Files' }, { text: '📊 Statistics' }],
            [{ text: 'ℹ Help' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

module.exports = {
    forceJoinMiddleware,
    mainMenuKeyboard
};
