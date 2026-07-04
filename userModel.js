const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
    userId: {
        type: Number,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        default: ""
    },
    lastName: {
        type: String,
        default: ""
    },
    username: {
        type: String,
        default: ""
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User", userSchema);
