const File = require('./fileModel');
const User = require('./userModel');
const config = require('./config');

// एडमिन चेक करने का हेल्पर
const isAdmin = (ctx) => ctx.from && ctx.from.id === config.adminId;

// एडमिन के अपलोड स्टेट्स को ट्रैक करने के लिए इन-मेमरी ऑब्जेक्ट
const uploadState = {};

const setupAdminFeatures = (bot) => {
    
    // 1. Upload Command
    bot.command('upload', async (ctx) => {
        if (!isAdmin(ctx)) return ctx.reply('⚠️ Only admin can use this command.');
        
        uploadState[ctx.from.id] = { step: 'AWAITING_FILE' };
        return ctx.reply('📂 Please send the file (PDF, ZIP, APK, Video, Audio, or Document) you want to upload.');
    });

    // 2. Broadcast Command
    bot.command('broadcast', async (ctx) => {
        if (!isAdmin(ctx)) return ctx.reply('⚠️ Only admin can use this command.');
        
        uploadState[ctx.from.id] = { step: 'AWAITING_BROADCAST_MSG' };
        return ctx.reply('📢 Please send the message (Text, Photo, or Document) you want to broadcast to all users.');
    });

    // 3. Admin Panel Logic (Handling files & steps)
    bot.on(['document', 'video', 'audio', 'photo', 'text'], async (ctx, next) => {
        if (!isAdmin(ctx)) return next(); // अगर एडमिन नहीं है तो यूजर फीचर्स पर भेजें

        const userId = ctx.from.id;
        const state = uploadState[userId];

        if (!state) return next();

        // STEP 1: Handling File Input
        if (state.step === 'AWAITING_FILE') {
            let fileId, fileUniqueId, fileName, fileType;

            if (ctx.message.document) {
                fileId = ctx.message.document.file_id;
                fileUniqueId = ctx.message.document.file_unique_id;
                fileName = ctx.message.document.file_name || 'Unnamed Document';
                fileType = 'document';
            } else if (ctx.message.video) {
                fileId = ctx.message.video.file_id;
                fileUniqueId = ctx.message.video.file_unique_id;
                fileName = ctx.message.video.file_name || `Video_${Date.now()}.mp4`;
                fileType = 'video';
            } else if (ctx.message.audio) {
                fileId = ctx.message.audio.file_id;
                fileUniqueId = ctx.message.audio.file_unique_id;
                fileName = ctx.message.audio.file_name || `Audio_${Date.now()}.mp3`;
                fileType = 'audio';
            } else {
                return ctx.reply('❌ Unsupported file type. Please send a Document, Video, or Audio file.');
            }

            // चेक करें कि फ़ाइल पहले से तो नहीं है
            const existingFile = await File.findOne({ fileUniqueId });
            if (existingFile) {
                delete uploadState[userId];
                return ctx.reply('⚠️ This file already exists in the database!');
            }

            // स्टेट अपडेट करें
            uploadState[userId] = {
                step: 'AWAITING_CATEGORY',
                fileId,
                fileUniqueId,
                fileName,
                fileType
            };

            // कैटेगरी सेलेक्ट करने के लिए इनलाइन बटन्स
            const categories = ['Books', 'Notes', 'PYQs', 'Courses', 'Software', 'Apps', 'Movies', 'Others'];
            const keyboard = {
                inline_keyboard: []
            };
            
            for (let i = 0; i < categories.length; i += 2) {
                const row = [
                    { text: categories[i], callback_data: `set_cat_${categories[i]}` }
                ];
                if (categories[i + 1]) {
                    row.push({ text: categories[i + 1], callback_data: `set_cat_${categories[i + 1]}` });
                }
                keyboard.inline_keyboard.push(row);
            }

            return ctx.reply('📂 Select the Category for this file:', { reply_markup: keyboard });
        }

        // STEP 2: Handling Custom File Name (If text is sent)
        if (state.step === 'AWAITING_NAME') {
            if (!ctx.message.text) return ctx.reply('❌ Please send a valid text for File Name.');
            
            state.fileName = ctx.message.text.trim();
            state.step = 'AWAITING_KEYWORDS';
            
            return ctx.reply(`✅ Name updated to: *${state.fileName}*\n\n🔑 Now enter keywords separated by commas (e.g., upsc, history, 2024):`, { parse_mode: 'Markdown' });
        }

        // STEP 3: Handling Keywords & Saving to Database
        if (state.step === 'AWAITING_KEYWORDS') {
            if (!ctx.message.text) return ctx.reply('❌ Please send valid text for keywords.');

            const keywordsArray = ctx.message.text.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
            
            try {
                const newFile = new File({
                    fileId: state.fileId,
                    fileUniqueId: state.fileUniqueId,
                    fileName: state.fileName,
                    fileType: state.fileType,
                    category: state.category,
                    keywords: keywordsArray,
                    uploadedBy: userId
                });

                await newFile.save();
                delete uploadState[userId]; // स्टेट क्लियर करें

                return ctx.reply(`🎉 *File Saved Successfully!*\n\n📝 *Name:* ${newFile.fileName}\n📂 *Category:* ${newFile.category}\n🔑 *Keywords:* ${keywordsArray.join(', ')}`, { parse_mode: 'Markdown' });
            } catch (error) {
                console.error(`❌ DB Save Error: ${error.message}`);
                delete uploadState[userId];
                return ctx.reply('❌ Failed to save file to database due to an internal error.');
            }
        }

        // STEP 4: Handling Broadcast Message Execution
        if (state.step === 'AWAITING_BROADCAST_MSG') {
            delete uploadState[userId]; // स्टेट तुरंत क्लियर करें
            
            ctx.reply('🚀 Broadcasting started... This might take some time.');

            const users = await User.find({}, 'telegramId');
            let successCount = 0;
            let failCount = 0;

            for (const user of users) {
                try {
                    // copyMessage का उपयोग करके ओरिजिनल फॉर्मेट में मैसेज सेंड करना
                    await ctx.telegram.copyMessage(user.telegramId, ctx.chat.id, ctx.message.message_id);
                    successCount++;
                } catch (err) {
                    failCount++; // अगर यूजर ने बोट ब्लॉक किया है
                }
            }

            return ctx.reply(`📢 *Broadcast Finished!*\n\n✅ Success: ${successCount}\n❌ Failed/Blocked: ${failCount}`, { parse_mode: 'Markdown' });
        }

        return next();
    });

    // Callback Query Handling for Admin Categories Selection
    bot.on('callback_query', async (ctx, next) => {
        const userId = ctx.from.id;
        const state = uploadState[userId];
        const data = ctx.callbackQuery.data;

        if (state && state.step === 'AWAITING_CATEGORY' && data.startsWith('set_cat_')) {
            const selectedCat = data.replace('set_cat_', '');
            state.category = selectedCat;
            state.step = 'AWAITING_NAME';
            
            await ctx.answerCbQuery(`Category set to ${selectedCat}`);
            return ctx.reply(`📂 Category Set: *${selectedCat}*\n\n📝 Current File Name: \`${state.fileName}\`\n\nIf you want to change the file name, send the new name now. Otherwise, copy and paste the current name and send it.`, { parse_mode: 'Markdown' });
        }

        return next();
    });
};

module.exports = { setupAdminFeatures };
