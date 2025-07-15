const axios = require('axios');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fallback keyword list for simple extraction
const knownSkills = [
  "JavaScript", "React", "Node.js", "Python", "Java", "Docker",
  "C++", "C#", "SQL", "MongoDB", "Express", "TypeScript", "AWS",
  "HTML", "CSS", "GraphQL", "PostgreSQL", "MySQL", "Kubernetes",
  "Redis", "Angular", "Vue", "Tailwind", "Bootstrap", "Jenkins",
  "Git", "Linux", "Azure", "GCP", "Spring", "Django", "Flask"
];

// Simple local fallback if AI fails
function simpleKeywordExtract(text) {
  return [...new Set(knownSkills.filter(skill =>
    text.toLowerCase().includes(skill.toLowerCase())
  ))];
}

async function getGithubSkills(username) {
  try {
    const repos = await axios.get(`https://api.github.com/users/${username}/repos`);
    const repoDescriptions = repos.data.map(repo => repo.description || '').join('\n');
    const languages = [...new Set(repos.data.map(repo => repo.language).filter(Boolean))];

    if (languages.length === 0 && repoDescriptions.trim() === '') {
      console.warn("No languages or descriptions found on GitHub, returning empty skills.");
      return [];
    }

    const prompt = `
Extract a list of relevant programming skills, tools, and technologies mentioned or implied in the following GitHub repository descriptions and languages:

Languages: ${languages.join(', ')}
Descriptions:
${repoDescriptions}

Return the skills as a JSON array of strings only.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that extracts skills from GitHub repos.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 150,
    });

    let aiSkills = [];
    try {
      aiSkills = JSON.parse(response.choices[0].message.content.trim());
    } catch {
      aiSkills = response.choices[0].message.content
        .trim()
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }

    const skillsSet = new Set([...languages, ...aiSkills]);
    return Array.from(skillsSet);

  } catch (error) {
    console.error("Error in getGithubSkills:", error.message);
    console.warn("Falling back to GitHub languages only:", username);
    // Fallback: even if OpenAI fails, return repo languages
    try {
      const repos = await axios.get(`https://api.github.com/users/${username}/repos`);
      const languages = [...new Set(repos.data.map(repo => repo.language).filter(Boolean))];
      return languages;
    } catch (fallbackError) {
      console.error("Even fallback failed:", fallbackError.message);
      return [];
    }
  }
}



async function parseResumeText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function extractSkillsFromText(text) {
  try {
    const prompt = `
Extract all the programming skills, tools, and technologies mentioned in this resume text:

${text}

Return the skills as a JSON array of strings only.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that extracts skills from resumes.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 200,
    });

    let aiSkills = [];
    try {
      aiSkills = JSON.parse(response.choices[0].message.content.trim());
    } catch {
      aiSkills = response.choices[0].message.content
        .trim()
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }

    return [...new Set(aiSkills)];
  } catch (error) {
    console.error("Error in extractSkillsFromText, using fallback:", error.message);
    // If AI fails, fallback to keyword extraction
    return simpleKeywordExtract(text);
  }
}

function mergeSkills(githubSkills, resumeSkills) {
  const result = [];
  const allSkills = new Set([...githubSkills, ...resumeSkills]);

  allSkills.forEach(skill => {
    let confidence = 20;
    const sources = [];

    if (githubSkills.includes(skill)) {
      confidence += 45;
      sources.push('GitHub');
    }
    if (resumeSkills.includes(skill)) {
      confidence += 30;
      sources.push('Resume');
    }

    if (confidence > 100) confidence = 100;

    result.push({
      name: skill,
      confidence,
      source: sources.join('+')
    });
  });

  return result;
}


module.exports = {
  getGithubSkills,
  parseResumeText,
  extractSkillsFromText,
  mergeSkills,
};
