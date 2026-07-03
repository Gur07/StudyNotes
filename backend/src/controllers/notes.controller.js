const NoteJob = require('../models/NoteJob.model');
const { triggerAgent } = require('../services/agentService');

async function run(req, res) {
    const { topic } = req.body;

    if (!topic) {
        return res.status(400).json({ success: false, message: "Topic is required" });
    }

    try {
        const job = await NoteJob.create({
            userId:          req.user.userId,
            topic,
            contextProvided: false,
            status:          "pending",
        });

        // fire and forget — do not await
        triggerAgent(job._id.toString(), topic);

        res.status(201).json({ success: true, jobId: job._id });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to create job", error: err.message });
    }
}

async function runWithFile(req, res) {
    const { topic } = req.body;

    if (!topic) {
        return res.status(400).json({ success: false, message: "Topic is required" });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: "File is required" });
    }

    try {
        const fileBase64 = req.file.buffer.toString("base64");
        const filename   = req.file.originalname;

        const job = await NoteJob.create({
            userId:          req.user.userId,
            topic,
            contextProvided: true,
            sourceFilename:  filename,
            status:          "pending",
        });

        // fire and forget
        triggerAgent(job._id.toString(), topic, fileBase64, true, filename);

        res.status(201).json({ success: true, jobId: job._id });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to create job", error: err.message });
    }
}

async function getJob(req, res) {
    try {
        const job = await NoteJob.findOne({
            _id:    req.params.id,
            userId: req.user.userId,
        });

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        res.status(200).json({ success: true, job });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch job", error: err.message });
    }
}

async function listJobs(req, res) {
    try {
        const jobs = await NoteJob.find({ userId: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .select("-finalMd");  // don't send full markdown in list

        res.status(200).json({ success: true, jobs });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch jobs", error: err.message });
    }
}

async function downloadJob(req, res) {
    try {
        const job = await NoteJob.findOne({
            _id:    req.params.id,
            userId: req.user.userId,
        });

        if (!job || !job.finalMd) {
            return res.status(404).json({ success: false, message: "Notes not found" });
        }

        res.setHeader("Content-Disposition", `attachment; filename="${job.topic}.md"`);
        res.setHeader("Content-Type", "text/markdown");
        res.send(job.finalMd);

    } catch (err) {
        res.status(500).json({ success: false, message: "Download failed", error: err.message });
    }
}

async function removeJob(req, res) {
    try {
        const job = await NoteJob.findOneAndDelete({
            _id:    req.params.id,
            userId: req.user.userId,
        });

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        res.status(200).json({ success: true, message: "Job deleted" });

    } catch (err) {
        res.status(500).json({ success: false, message: "Delete failed", error: err.message });
    }
}

async function updateJob(req, res) {
    try {
        const { finalMd } = req.body;
        const job = await NoteJob.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            { finalMd },
            { new: true }
        );
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });
        res.status(200).json({ success: true, job });
    } catch (err) {
        res.status(500).json({ success: false, message: "Update failed", error: err.message });
    }
}

module.exports = { run, runWithFile, getJob, listJobs, downloadJob, removeJob, updateJob };