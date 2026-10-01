import { searchTool } from "../config/tavily.js";

export const searchAgent = async (state) => {
  try {
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
    };
  } catch (error) {
    console.error("Search agent error:", error);
    return {
      ...state,
      searchResults: [],
      images: [],
    };
  }
};
