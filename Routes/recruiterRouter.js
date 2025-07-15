const express = require("express");
const router = express.Router();
const User = require("../model/User");
const authenticateUser = require("../middleware/authMiddleware");

router.post("/matchProfiles", authenticateUser, async (req, res) => {
  const { project } = req.body;

  if (!project || project.trim() === "") {
    return res.status(400).json({ msg: "Project Description is required." });
  }

  const projectText = project.toLowerCase();

  try {
    const allUsers = await User.find().select("-password");

    const projectText = project.toLowerCase();

    const matchedUsers = allUsers
      .map((user) => {
        if (!user.parsedSkills || user.parsedSkills.length === 0) return null;

        // Filter user's skills to only those matching project text
        const matchingSkills = user.parsedSkills.filter(
          (skill) => projectText.includes(skill.name.toLowerCase()) // both lowercase
        );

        if (matchingSkills.length === 0) return null;

        // Return user object with only matching skills
        return {
          ...user.toObject(), // convert Mongoose doc to plain object
          parsedSkills: matchingSkills,
        };
      })
      .filter(Boolean); // removes all nulls

    res.json(matchedUsers);
  } catch (error) {
    return res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
