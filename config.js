const dotenv = require('dotenv');
const path = require('path');

// .env फाइल लोड करना
dotenv.config({ path: path.join(__dirname, '.env') });

const requiredEnv = [
    'BOT_TOKEN',
    'MONGODB_URI',
    'ADMIN_ID',
    'FORCE_JOIN_CHANNEL',
    'CHANNEL_USERNAME'
];

// चेक करना कि कोई वेरिएबल मिसिंग तो नहीं है
for (const env of requiredEnv) {
    if (!process.env[env]) {
        console.error(`❌ CRITICAL ERROR: Environment variable "${env}" is missing in .env`);
        process.exit(1);
    }
}

module.exports = {
    botToken: process.env.BOT_TOKEN,
    mongodbUri: process.env.MONGODB_URI,
    adminId: parseInt(process.env.ADMIN_ID, 10),
    forceJoinChannel: process.env.FORCE_JOIN_CHANNEL,
    channelUsername: process.env.CHANNEL_USERNAME.startsWith('@') 
        ? process.env.CHANNEL_USERNAME 
        : `@${process.env.CHANNEL_USERNAME}`
};
