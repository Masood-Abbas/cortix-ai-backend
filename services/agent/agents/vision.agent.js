
import { getModel } from "../config/llmmodels.js";
import axios from "axios";
import { uploadTOS3 } from "../utils/uplodeToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";



export const visionAgent = async (state) => {
  try {
    const llm = await getModel("vision");
    const res = await llm.invoke(
      `You are an elite AI image Prompt engineer.
      convert the user request into a highly detailed image generation prompt.
      Requirements:
      - Cinematic lighting
      - Professional composition
      - Ultra realistic 
      - High detail
      - Beautiful color patette
      - sharp focus
      - 8K quality
      - Photorealistic
      - depth of field
      - professional photography
      - Stunning visuals
  
      Return only the image prompt.
      user Reaquest :
  
      ${state.prompt}
      `
    );

    const prompt = res.content.trim();
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
    const imageRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(imageRes.data);
    const fileName = `image-${Date.now()}.webp`;

    await uploadTOS3(fileName, buffer, "image/webp");
    const downloadUrl = await getFromS3(fileName, 24 * 60 );

    return {
      ...state,
      aiResponse: "# Image Generated Successfully\n\nThe image is ready. The download link expires in 1 day.",
      images: [downloadUrl],
    };
  } catch (error) {
    console.error("Vision agent error:", error.message);
    return {
      ...state,
      aiResponse: "Unable to generate the image right now. Please try again.",
      images: [],
    };
  }
};

