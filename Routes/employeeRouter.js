const express = require("express");
const authenticateUser = require("../middleware/authMiddleware");
const User = require('../model/User');
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { getGithubSkills, parseResumeText, extractSkillsFromText, mergeSkills } = require('../utils/skillParser');

// MULTER

const storage = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,"uploads/");
    },
    filename: function(req,file,cb){
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null,uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get("/profile",authenticateUser, async(req,res)=>{
    try {
        const user = await User.findById(req.user.userId).select("-password");
        res.json(user);
    } catch (error) {
        res.status(500).json({msg:'Server Error'});
    }
});

router.post("/github",authenticateUser,async(req,res)=>{
    const {githubUsername} = req.body;

    if(!githubUsername){
        return res.status(400).json({msg: "Github username required"});
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { githubUsername },
            {new:true}
        ).select("-password");

        if (!user) return res.status(404).json({ msg: "User not found" });

        res.json({msg: "Github username updated",user});
    } catch (error) {
        res.status(500).json({msg:'Server Error'});
    }
});

router.post("/resume", authenticateUser, upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: "No file uploaded" });
  }
  console.log("Uploaded file:", req.file);

  const fileUrl = `/uploads/${req.file.filename}`;
  const filePath = path.join(__dirname, "..", "uploads", req.file.filename);

  try {
    const user = await User.findById(req.user.userId);

    // If same resume file already parsed, return cached parsedSkills
    if (user.resume?.fileUrl === fileUrl && user.parsedSkills?.length > 0) {
      return res.json({ msg: "Using cached skills for this resume", user });
    }

    // 1. Parse resume text
    const resumeText = await parseResumeText(filePath);

    // 2. Get GitHub skills if username exists
    let githubSkills = [];
    if (user.githubUsername) {
      githubSkills = await getGithubSkills(user.githubUsername);
    }

    // 3. Extract skills from resume text with AI fallback
    let resumeSkills = [];
    try {
      resumeSkills = await extractSkillsFromText(resumeText);
    } catch (err) {
      console.warn("AI skill extraction failed, falling back to keyword matching.");
      resumeSkills = simpleKeywordExtract(resumeText);
    }

    // 4. Merge
    const parsedSkills = mergeSkills(githubSkills, resumeSkills);

    // 5. Save user data
    user.resume = { fileUrl, parsedText: resumeText };
    user.parsedSkills = parsedSkills;
    await user.save();

    res.json({ msg: "Resume uploaded and skills parsed", user });
  } catch (error) {
    console.error("Error in /resume route:", error);
    res.status(500).json({ msg: "Server error: " + error.message });
  }
});

module.exports = router;
