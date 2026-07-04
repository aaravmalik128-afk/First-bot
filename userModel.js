const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: {
        type: Number,
        required: true,
        unique: true, // ताकि एक यूजर बार-बार डुप्लिकेट न हो
        index: true // फास्ट सर्चिंग के लिए इंडेक्सिंग
    },
    username: {
        type: String,
        default: null
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        default: null
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // इससे createdAt और updatedAt ऑटोमैटिक मैनेज होंगे
});

const User = mongoose.model('User', userSchema);

module.exports = User;
