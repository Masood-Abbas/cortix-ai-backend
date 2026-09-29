import "./env.js";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const groq = new ChatGroq({
  model: "openai/gpt-oss-120b",
});

const gemni = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
});

export const getModel = async (agent) => {
  switch (agent) {
    case "chat":
      return groq;
    case "search":
      return groq;
    case "coding":
      return gemni;

    default:
      return groq;
  }
};
