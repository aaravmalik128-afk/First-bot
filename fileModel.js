const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    fileId: {
        type: String,
        required: true,
        unique: true, // ताकि सेम फ़ाइल दोबारा डेटाबेस में डुप्लिकेट न हो
        index: true
    },
    fileUniqueId: {
        type: String,
        required: true,
        unique: true
    },
    fileName: {
        type: String,
        required: true,
        trim: true
    },
    fileType: {
        type: String,
        required: true, 
        enum: ['document', 'video', 'audio', 'photo'] // Telegram फ़ाइल के टाइप्स
    },
    category: {
        type: String,
        required: true,
        enum: ['Books', 'Notes', 'PYQs', 'Courses', 'Software', 'Apps', 'Movies', 'Others'], // आपकी डिफाइन की हुई कैटेगरीज
        index: true
    },
    keywords: {
        type: [String], // सर्च को बेहतर बनाने के लिए कीवर्ड्स का एरे (Array)
        default: []
    },
    uploadedBy: {
        type: Number, // एडमिन की टेलीग्राम ID
        required: true
    },
    downloadCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// फ़ास्ट और एडवांस सर्च के लिए fileName और keywords पर Text Index बनाना
fileSchema.index({ fileName: 'text', keywords: 'text' });

const File = mongoose.model('File', fileSchema);

module.exports = File;

