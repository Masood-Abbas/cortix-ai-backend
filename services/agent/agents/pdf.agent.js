import { getModel } from "../config/llmmodels.js";
import { generatePdf } from "../utils/pdf/generatePdf.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { uploadTOS3 } from "../utils/uplodeToS3.js";
import { deductCredit } from "../utils/deductCredit.js";
import { checkAgentLimit } from "../utils/Ratelimit/agentLimit.js";


export const pdfAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId,"pdf")
    const creditResult = await deductCredit(state.userId,"pdf",state.cookie)
    const llm = await getModel("pdf")
    const prompt=`
    You are expert document writer.
    Return ONLY valid JSON.
    Do NOT return markdown.
    Do NOT return explanations.
    structure:
    {
    "title":"",
    "subtitle":"",
    "section":[{
    "heading":"",
    "points":[]
    }]
    }
  
    Genertate 4-8 sections.
    Each section should have 3-6 concise bullet points.
  
    Topic:
  
    ${state.prompt}
    `
    const res=await llm.invoke(prompt)
    const data=JSON.parse(res.content)

    const pdfBuffer = await generatePdf(data)

    const fileName=`pdf-${Date.now()}.pdf`
    await uploadTOS3(fileName,pdfBuffer,"application/pdf")

    const downloadUrl=await getFromS3(fileName,24*60)
    return{
      ...state,
      aiResponse: "# PDF Generated Successfully\n\nThe PDF is ready. The download link expires in 1 day.",
      files: [
        {
          name: fileName,
          url: downloadUrl,
          type: "application/pdf",
        },
      ],
      user: creditResult?.user || state.user,

    }

  } catch (error) {
    console.log(error)
    const message = [402, 429].includes(error?.status)
      ? error.message
      : "Unable to generate the PDF right now. Please try again.";
     return {
      ...state,
      aiResponse: message,
      files: [],
      user: error?.user || state.user,
    };
  }

}
