import fs from "fs"
import { PDFParse } from "pdf-parse"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getModel } from "../config/llmmodels.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { deductCredit } from "../utils/deductCredit.js";
import { checkAgentLimit } from "../utils/Ratelimit/agentLimit.js";


export const pdfRag=async (state) => {
    try {
        await checkAgentLimit(state.userId,"pdfRag")
        const creditResult = await deductCredit(state.userId,"pdf",state.cookie)
        if (!state.file?.path) {
            return {
                ...state,
                aiResponse:"Please upload a PDF file first."
            }
        }
        const buffer = fs.readFileSync(state.file.path)
        const pdf= new PDFParse({
            data:buffer
        })
        const result=await pdf.getText()
        const text= String(result.text || "").trim()
        if (!text) {
            return {
                ...state,
                aiResponse:"I could not extract readable text from this PDF."
            }
        }
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 500 })
        const docs =await splitter.createDocuments([text])
        const collectonName=`pdf-${Date.now()}`

        const { vectorStore } = await import("../config/vectorDb.js");
        const store=await vectorStore(docs,collectonName)
        if (!store?.similaritySearch) {
            throw new Error("Vector store was not initialized")
        }

        const relevantDocs= await store.similaritySearch(state.prompt,5)

        const context = relevantDocs.map(d=>d.pageContent).join("\n\n")

        const llm=await getModel("pdfRag")
        const messages=[
            new SystemMessage(`
                You are CortexAI PDF Assistant.
                Rules:
                - Answer ONLY from the uploaded pdf.
                - Never make up information.
                - if the answer is not present in the PDF, reply:
                " I couldn't find this information in the uploded pdf."
                use Markdown foemating.
                `), 
                new HumanMessage(`
                    context:${context}
                    Question:${state.prompt}
                    `)
        ]
        const response =await llm.invoke(messages)
        return {
            ...state,
            aiResponse:response.content,
            user: creditResult?.user || state.user,
        }


    } catch (error) {
        console.log(error)
        const message = [402, 429].includes(error?.status)
            ? error.message
            : `Failed to analyze PDF. ${error?.message || "Please try again."}`
        return {
            ...state,
            aiResponse:message,
            user: error?.user || state.user,
        }
    }finally{
        if (state.file?.path && fs.existsSync(state.file.path)) {
            fs.unlinkSync(state.file.path)
        }
    }
}
