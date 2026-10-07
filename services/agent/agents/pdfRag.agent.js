import fs from "fs"
import { PDFParse } from "pdf-parse"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { vectorStore } from "../config/vectorDb.js";
import { getModel } from "../config/llmmodels.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";


export const pdfRag=async (state) => {
    try {
        const buffer = fs.readFileSync(state.file.path)
        const pdf= new PDFParse({
            data:buffer
        })
        const result=await pdf.getText()
        const text= result.text
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 500 })
        const docs =await splitter.createDocuments([text])
        const collectonName=`pdf-${Date.now()}`

        const store=await vectorStore(docs,collectonName)

        const relevantDocs= await store.similaritySearch(state.prompt,5)

        const context = relevantDocs.map(d=>d.pageContent).join("/n/n")

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
            aiResponse:response.content
        }


    } catch (error) {
        console.log(error)
        return {
            ...state,
            aiResponse:"Failed to Aanalze pdf"
        }
    }finally{
        fs.unlinkSync(state.file.path)
    }
}