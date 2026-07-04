const User = require('./userModel');
const File = require('./fileModel');
const { mainMenuKeyboard } = require('./middleware');

const setupUserFeatures = (bot) => {
    
    // 1. Statistics Functionality
    const getStatsMessage = async () => {
        const totalUsers = await User.countDocuments();
        const totalFiles = await File.countDocuments();
        const dbStatus = 'Connected 🟢';
        
        // Uptime Calculation
        const uptimeSeconds = process.uptime();
        const days = Math.floor(uptimeSeconds / (3600 * 24));
        const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const uptimeString = `${days}d ${hours}h ${minutes}m`;

        return `📊 *Bot Live Statistics*\n\n` +
               `👥 *Total Users:* ${totalUsers}\n` +
               `📁 *Total Files:* ${totalFiles}\n` +
               `⚙️ *Database:* ${dbStatus}\n` +
               `⏱ *Bot Uptime:* ${uptimeString}`;
    };

    // 2. Main Menu Button Handlers
    bot.hears('📊 Statistics', async (ctx) => {
        const statsMessage = await getStatsMessage();
        return ctx.replyWithMarkdown(statsMessage);
    });

    bot.hears('ℹ Help', async (ctx) => {
        const helpText = `ℹ *How to use this Bot:*\n\n` +
            `🔍 *Search:* Simply type any keyword or file name directly in the chat, or click the Search button.\n\n` +
            `📂 *Categories:* Click on the Categories button to browse files sorted by topics.\n\n` +
            `📁 *My Files:* Displays your activity or downloaded files count.\n\n` +
            `⚠️ *Note:* If you face any issues, make sure you are still joined in our official channel.`;
        return ctx.replyWithMarkdown(helpText);
    });

    bot.hears('📁 My Files', async (ctx) => {
        return ctx.reply(`📁 You have active access to the cloud database. Start searching for files using keywords!`);
    });

    bot.hears('🔍 Search', async (ctx) => {
        return ctx.reply('🔍 Simply type the file name or keyword directly in the chat to search our database!');
    });

    // 3. Categories System Layout
    bot.hears('📂 Categories', async (ctx) => {
        const categories = ['Books', 'Notes', 'PYQs', 'Courses', 'Software', 'Apps', 'Movies', 'Others'];
        const keyboard = { inline_keyboard: [] };

        for (let i = 0; i < categories.length; i += 2) {
            const row = [{ text: `📁 ${categories[i]}`, callback_data: `browse_cat_${categories[i]}` }];
            if (categories[i + 1]) {
                row.push({ text: `📁 ${categories[i + 1]}`, callback_data: `browse_cat_${categories[i + 1]}` });
            }
            keyboard.inline_keyboard.push(row);
        }

        return ctx.reply('📂 *Select a category to browse files:*', { parse_mode: 'Markdown', reply_markup: keyboard });
    });

    // 4. Handling Category Browsing Clicks
    bot.on('callback_query', async (ctx, next) => {
        const data = ctx.callbackQuery.data;

        if (data.startsWith('browse_cat_')) {
            const category = data.replace('browse_cat_', '');
            const files = await File.find({ category }).limit(20); // Top 20 files in that category

            if (files.length === 0) {
                await ctx.answerCbQuery(`No files in ${category}`);
                return ctx.reply(`ℹ️ Currently, there are no files available in the *${category}* category.`, { parse_mode: 'Markdown' });
            }

            await ctx.answerCbQuery();
            const keyboard = {
                inline_keyboard: files.map(file => [{ text: `📄 ${file.fileName}`, callback_data: `dl_${file._id}` }])
            };

            return ctx.reply(`📂 *Files in Category - ${category}:*`, { parse_mode: 'Markdown', reply_markup: keyboard });
        }

        // 5. Handling File Download Clicks (Using fileId without re-uploading)
        if (data.startsWith('dl_')) {
            const fileIdInDB = data.replace('dl_', '');
            try {
                const file = await File.findById(fileIdInDB);
                if (!file) {
                    return ctx.answerCbQuery('❌ File not found or deleted from database.', { show_alert: true });
                }

                await ctx.answerCbQuery('🚀 Sending file...');
                
                // Increment download count
                file.downloadCount += 1;
                await file.save();

                // Send file using Telegram's original fileId based on its type
                if (file.fileType === 'document') {
                    return ctx.replyWithDocument(file.fileId, { caption: `📄 *File Name:* ${file.fileName}\n📂 *Category:* ${file.category}`, parse_mode: 'Markdown' });
                } else if (file.fileType === 'video') {
                    return ctx.replyWithVideo(file.fileId, { caption: `🎬 *File Name:* ${file.fileName}\n📂 *Category:* ${file.category}`, parse_mode: 'Markdown' });
                } else if (file.fileType === 'audio') {
                    return ctx.replyWithAudio(file.fileId, { caption: `🎵 *File Name:* ${file.fileName}\n📂 *Category:* ${file.category}`, parse_mode: 'Markdown' });
                }
            } catch (err) {
                console.error(`❌ File Delivery Error: ${err.message}`);
                return ctx.reply('❌ Failed to send the file. It might have been removed from Telegram servers.');
            }
        }

        return next();
    });

    // 6. Global Search System (Triggers when users type anything else)
    bot.on('text', async (ctx) => {
        const query = ctx.message.text.trim();

        // System Keywords or Menu Actions avoid text trigger
        if (['📊 Statistics', 'ℹ Help', '📁 My Files', '🔍 Search', '📂 Categories'].includes(query)) return;

        try {
            // Text search using Regular Expression for broad matching across name and keywords array
            const files = await File.find({
                $or: [
                    { fileName: { $regex: query, $options: 'i' } },
                    { keywords: { $regex: query, $options: 'i' } }
                ]
            }).limit(10); // Limit results to top 10 matches

            if (files.length === 0) {
                return ctx.reply(`🔍 No files found matching *"${query}"*.\n\n💡 Try using different keywords or check spelling!`, { parse_mode: 'Markdown' });
            }

            const keyboard = {
                inline_keyboard: files.map(file => [{ text: `📥 ${file.fileName}`, callback_data: `dl_${file._id}` }])
            };

            return ctx.reply(`🔍 *Search Results for "${query}":*`, { parse_mode: 'Markdown', reply_markup: keyboard });
        } catch (error) {
            console.error(`❌ Search Logic Error: ${error.message}`);
            return ctx.reply('❌ An error occurred while searching. Please try again later.');
        }
    });
};

module.exports = { setupUserFeatures };
