const mongoose = require('mongoose');

const noteJobSchema = new mongoose.Schema({
    userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic:           { type: String, required: true },
    contextProvided: { type: Boolean, default: false },
    sourceFilename:  { type: String, default: null },
    mode:            { type: String, default: "" },
    needsResearch:   { type: Boolean, default: false },
    needsRag:        { type: Boolean, default: false },
    status:          { type: String, enum: ["pending", "running", "done", "failed"], default: "pending" },
    finalMd:         { type: String, default: "" },
    error:           { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('NoteJob', noteJobSchema);