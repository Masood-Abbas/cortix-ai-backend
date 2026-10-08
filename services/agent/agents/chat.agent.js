import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { getModel } from "../config/llmmodels.js";
import { deductCredit } from "../utils/deductCredit.js";
import { checkAgentLimit } from "../utils/Ratelimit/agentLimit.js";

export const chatAgent = async (state) => {
try {
  if (state.aiResponse) return state;
  const hasSearchContext = Array.isArray(state.searchResults) && state.searchResults.length > 0;
  let creditResult = null;
  if (!hasSearchContext) {
    await checkAgentLimit(state.userId,"chat")
    creditResult = await deductCredit(state.userId,"chat",state.cookie)
  }
    const chatllm = await getModel(state.agent === "coding" ? "coding" : "chat");
  
    const history = state.history || [];
  
    const searchContext = state.searchResults?.length
      ? `
    Web search results:
    ${JSON.stringify(state.searchResults)}
    Answer the user using only these search results.`
      : ``;
  
    const systemPrompt = `You are CortexAI , an intelligent AI assistant.
  
    ${searchContext}
  
    if searchContext exists:
    - use search result to answer.
    - Do not mention internal tools.
    Rules:
    - For simple questions , greeting, and short quiriers, respond naturally in plaain text.
    - for technical,education, coding, or detail topic, use clean Markdown.
  
    Formatting:
  - Use # for titles and ## for sections.
  - Leave a blank line after headings.
  - Use bullet points for lists.
  - Use numbered lists for steps.
  - Use fenced code blocks with language tags for code.
  - Keep paragraphs short and readable.
  - Never write headings and content on the same line.
  - Never generate large walls of text. `;
  
    const messages = [new SystemMessage(systemPrompt)];
    history.forEach((msg) => {
      if (msg.role == "user") {
        messages.push(new HumanMessage(msg.content));
      } else {
        messages.push(new AIMessage(msg.content));
      }
    });
  
    messages.push(new HumanMessage(state.prompt));
    const res = await chatllm.invoke(messages);
    return {
      ...state,
      aiResponse: res.content,
      user: creditResult?.user || state.user,
    };
} catch (error) {
  return {
      ...state,
      aiResponse: error?.message || "Unable to complete chat request.",
      user: error?.user || state.user,
    };
}
};
