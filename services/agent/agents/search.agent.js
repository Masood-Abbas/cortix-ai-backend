import { searchTool } from "../config/tavily.js";
import { deductCredit } from "../utils/deductCredit.js";
import { checkAgentLimit } from "../utils/Ratelimit/agentLimit.js";

export const searchAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId,"search")
    const creditResult = await deductCredit(state.userId,"search",state.cookie)
    
    const results = await searchTool.invoke({
      query: state.prompt,
    });
    const images = Array.isArray(results?.images) ? results.images : [];
    const searchResults = Array.isArray(results)
      ? results
      : Array.isArray(results?.results)
        ? results.results
        : [];
    return {
      ...state,
      searchResults,
      images,
      user: creditResult?.user || state.user,
    };
  } catch (error) {
    console.error("Search agent error:", error);
    return {
      ...state,
      searchResults: [],
      images: [],
      aiResponse: error?.message || "Unable to complete search request.",
      user: error?.user || state.user,
    };
  }
};
