import "./env.js";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const groq = new ChatGroq({
  model: "openai/gpt-oss-120b",
});

const gemni = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash",
});

const readOpenRouterContent = (content) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.content === "string") return part.content;
        return "";
      })
      .join("")
      .trim();
  }
  return "";
};

const readOpenRouterError = (data, status) => {
  const raw = data?.error?.metadata?.raw;
  let rawMessage = "";
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      rawMessage = parsed?.message || parsed?.error_msg || parsed?.error || raw;
    } catch {
      rawMessage = raw;
    }
  }

  return (
    rawMessage ||
    data?.error?.message ||
    data?.message ||
    `OpenRouter request failed with status ${status}`
  );
};

const invokeOpenRouter = async (prompt) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
      "X-Title": process.env.OPENROUTER_SITE_NAME || "CortexAI",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_CODING_MODEL || "deepseek/deepseek-chat",
      temperature: 0,
      max_tokens: 2500,
      messages: [{ role: "user", content: String(prompt || "") }],
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(readOpenRouterError(data, response.status));
  }

  const choice = data?.choices?.[0];
  const content = readOpenRouterContent(choice?.message?.content);
  if (!content) {
    throw new Error(
      readOpenRouterError(data, response.status) ||
        "OpenRouter returned no generated message content",
    );
  }

  return { content };
};

const openrouter = {
  invoke: async (prompt) => {
    try {
      return await invokeOpenRouter(prompt);
    } catch (error) {
      if (process.env.CODING_FALLBACK_TO_GROQ === "false") throw error;
      console.warn(`OpenRouter coding model failed, falling back to Groq: ${error.message}`);
      return groq.invoke(String(prompt || ""));
    }
  },
};

export const getModel = async (agent) => {
  switch (agent) {
    case "chat":
      return groq;
    case "search":
      return groq;
    case "vision":
      return gemni;
    case "coding":
      return openrouter;
    case "imageAnalyzer":
      return gemni;

    default:
      return groq;
  }
};
