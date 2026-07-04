const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
    try {
        const options = {
            autoIndex: true, // Production में इंडेक्सिंग को सही रखने के लिए
        };

        await mongoose.connect(config.mongodbUri, options);
        console.log('✅ MongoDB Connected Successfully.');
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        // 5 सेकंड बाद दोबारा कनेक्ट करने की कोशिश करेगा
        console.log('🔄 Retrying database connection in 5 seconds...');
        setTimeout(connectDB, 5000);
    }
};

// अगर कनेक्शन बीच में कभी टूट जाए (Disconnected Event)
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected! Attempting to reconnect...');
    connectDB();
});

// अगर कनेक्शन में कोई एरर आए
mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB Runtime Error: ${err.message}`);
});

module.exports = connectDB;
