import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModel } from "../config/llmmodels.js";
import fs from "fs/promises";
import { deductCredit } from "../utils/deductCredit.js";
export const imageAnalyzer = async (state) => {
  try {
    if (!state.file?.path || !state.file?.mimetype?.startsWith("image/")) {
      return {
        ...state,
        aiResponse: "Please upload an image file first.",
      };
    }
    const llm = await getModel("imageAnalyzer");
    const imageBuffer = await fs.readFile(state.file.path);
    const base64image = imageBuffer.toString("base64");

    const message = [
      new SystemMessage(
        `You are CortexAI vision Agent.
            Rules:
            - Analyze only the upload image.
            - Answer the user's question accurately.
            - if charts or tables exist,explain them.
            - if something is unclear ,say so.
            - use Markdown when helpfull.
            - Do not hallucinate
            `,
      ),
      new HumanMessage({
        content: [
          {
            type: "text",
            text: state.prompt || "analyze the image",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${state.file.mimetype};base64,${base64image}`,
            },
          },
        ],
      }),
    ];
    const response=await llm.invoke(message)
    const creditResult = await deductCredit(state.userId,"vision",state.cookie)
    return {
        ...state,
        aiResponse:response.content,
        user: creditResult?.user || state.user,
    }
  } catch (error) {
    console.log(error);
    return {
        ...state,
        aiResponse:`failed to analyze the file`
    }
  } finally{
    if (state.file?.path) {
      await fs.unlink(state.file.path).catch(() => {});
    }
  }
};
