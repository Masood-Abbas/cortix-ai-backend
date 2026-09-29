import { getModel } from "../config/llmmodels.js";

export const chatAgent = async (state) => {
  const chatllm = await getModel("chat");
  const systemPrompt = "You are CortexAI , an intelligent AI assistant";
  const res = await chatllm.invoke([
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "human",
      content: state.prompt,
    },
  ]);

  return {
    ...state,
    aiResponse:res.content     
  }
};
 