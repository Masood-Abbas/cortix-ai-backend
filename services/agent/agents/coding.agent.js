import { getModel } from "../config/llmmodels.js";
import { getUnsplashImages } from "../tools/unsplash.tool.js";
import { deductCredit } from "../utils/deductCredit.js";
import { checkAgentLimit } from "../utils/Ratelimit/agentLimit.js";

const cleanJsonContent = (content) =>
  String(content || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const extractJsonObject = (content) => {
  const cleaned = cleanJsonContent(content);
  const candidates = [cleaned];
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed === "string") candidates.push(cleanJsonContent(parsed));
    else return parsed;
  } catch {
    /* Try extracting the JSON object below. */
  }

  for (const candidate of candidates) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) continue;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      /* Keep trying other candidates. */
    }
  }
  return null;
};

const projectSummary = () => `# Code Generated

Your project is ready to explore.`;

const normalizeFiles = (files) =>
  Array.isArray(files)
    ? files
        .filter((file) => file?.name)
        .map((file) => ({
          name: String(file.name),
          content: String(file.content || file.context || ""),
        }))
    : [];

const latestProjectArtifact = (history = []) => {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const artifacts = history[index]?.artifacts;
    if (!Array.isArray(artifacts)) continue;
    const artifact = [...artifacts]
      .reverse()
      .find((item) => Array.isArray(item?.files) && item.files.length > 0);
    if (artifact) return artifact;
  }
  return null;
};

export const codingAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId,"coding")
    const creditResult = await deductCredit(state.userId,"coding",state.cookie)
    const intentLlm = await getModel("intent");
    const llm = await getModel("coding");
    const existingArtifact = latestProjectArtifact(state.history);
  
    const intentRes = await intentLlm.invoke(`
      You are an intent classifier .
      Return ONLY one of these values.
      CODE_GENERATION
      CODE_REVIEW
      CODE_EXPLANATION
      DEBUGGING
      OPTIMIZATION
      CONVERSION
      DOCUMENTATION
  
      USER REQUEST:
      ${state.prompt}
      `);
    const intent = String(intentRes.content || "").trim().toUpperCase();
    const shouldReturnProject =
      intent === "CODE_GENERATION" ||
      (existingArtifact &&
        ["DEBUGGING", "OPTIMIZATION", "CONVERSION"].includes(intent));
  
    if (shouldReturnProject) {
      const unsplashImages = await getUnsplashImages(state.prompt, 6);
      const prompt = `
        You are CortexAI coding Agent.
        ${existingArtifact ? "Update the existing project files using the user's request." : "Generate the requested project."}
  
        Default Stact:
        - HTML
        - CSS
        - JavaScript
  
        use React/ Next.js / Vue Only if explicity requested.
  
        Rules:
  
        - Responsive
        - Modern UI
        - CSS Variables
        - Flexbox/Grid
        - Smooth Scroll
        - Hover Effects
        - Beautiful spacing
        - Single Page unless user asks otherwise.
  
        IMAGES:
        - Use the provided Unsplash image URLs when the project needs images.
        - Use image URLs exactly as provided.
        - Never use placeholders.
        - If no Unsplash image URLs are provided, build the UI without image placeholders.
  
        Unsplash image URLs:
        ${JSON.stringify(unsplashImages, null, 2)}
  
        Return Only valid JSON.
  
        Schema:
  
          {
            "files": [
               {
                  "name": "index.html",
                  "content": "..."
                },
                {
                  "name": "style.css",
                  "content": "..."
               },
              {
                  "name": "script.js",
                  "content": "..."
              }
            ]
          }
  
        Rules:
  
        - Output must start with {
        - Output must end with }
        - No markdown
        - No explanation
        - No extra text
        - No '\'\'
        - Never mention intent
  
        Existing files:
        ${JSON.stringify(normalizeFiles(existingArtifact?.files), null, 2)}
  
        User Request:
        ${state.prompt}
  
        `;
      const res = await llm.invoke(prompt);
      const data = extractJsonObject(res.content);
      if (!data) {
        return {
          ...state,
          aiResponse: `# Generated Code\n\n${res.content}`,
          artifacts: [],
          user: creditResult?.user || state.user,
        };
      }
      const files = normalizeFiles(data.files);
      return {
        ...state,
        aiResponse: projectSummary(files),
        artifacts: [
          {
            id: Date.now(),
            type: "Project",
            files,
            title:state.prompt
          },
        ],
        user: creditResult?.user || state.user,
      };
    }
  
    const res = await llm.invoke(`
      The user's request is:
      ${intent}
      Return Markdown only.
      Never generate project files.
      use heading like:
      # Overview
      ##  Explanation
      ## Problems
      ## Improvements
      ## Best Practices
      ## Optimized Code (if needed)
  
      User Request:
      ${state.prompt}
      `);
  
    const data = res.content;
    return {
      ...state,
      aiResponse: data,
      artifacts: [],
      user: creditResult?.user || state.user,
    };
  } catch (error) {
    console.log(error)
    return {
      ...state,
      aiResponse: `Unable to generate code right now. ${error?.message || "Please try again."}`,
      artifacts: [],
      user: error?.user || state.user,
    };
  }
};
