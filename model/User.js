const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["employee", "recruiter"],
    required: true,
  },
  githubUsername: {
    type: String,
    default: null,
  },
  resume: {
    fileUrl: { type: String, default: null },
    parsedText: { type: String, default: null },
  },
  parsedSkills: {
    type: [skillSchema],
    default: [],
  },
  experience: {
    type: String,
    default: null,
  },
  confidenceScore: {
    type: Number,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
