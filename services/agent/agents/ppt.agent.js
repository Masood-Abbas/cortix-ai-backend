import { getModel } from "../config/llmmodels.js";
import { generatePpt } from "../utils/ppt/generatePpt.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { uploadTOS3 } from "../utils/uplodeToS3.js";
import { deductCredit } from "../utils/deductCredit.js";
import { checkAgentLimit } from "../utils/Ratelimit/agentLimit.js";

export const pptAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId,"ppt")
    const creditResult = await deductCredit(state.userId, "ppt", state.cookie);
    const llm = await getModel("ppt");
    const prompt = `
    You are a professional presentation designer.
    Return only valid JSON.
    Format:
    {
    "title":"",
    "subtitle":"",
    "slides":[{
    "title":"",
    "points":[
    "","","",""
    ]
    }
    ]
    }

    Rules:
    - Generate Exactly 6 content slides.
    - Each slide should have 4-6 concise bullet points.
    - No markdown.
    - No explanation.
    - No code block.
    - Return ONLY JSON.

    Topic:

    ${state.prompt}
    `;

    const res = await llm.invoke(prompt);
    const data = JSON.parse(res.content);
    const ppt = await generatePpt(data);

    const buffer = await ppt.write({
      outputType: "nodebuffer",
    });
    const fileName = `ppt.${Date.now()}.pptx`;

    await uploadTOS3(
      fileName,
      buffer,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );

    const downloadUrl = await getFromS3(fileName, 24 * 60 * 60);

    return {
      ...state,
      aiResponse:
        "# ppt Generated Successfully\n\nThe PPT is ready. The download link expires in 1 day.",
      files: [
        {
          name: fileName,
          url: downloadUrl,
          type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        },
      ],
      user: creditResult?.user || state.user,
    };
  } catch (error) {
    console.log(error);
    const message = [402, 429].includes(error?.status)
      ? error.message
      : "Unable to generate the PPt right now. Please try again.";
    return {
      ...state,
      aiResponse: message,
      files: [],
      user: error?.user || state.user,
    };
  }
};
