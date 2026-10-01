import { getModel } from "../config/llmmodels.js"

export const router=async (state) => {
    if(state.agent && state.agent!=="auto"){
         return {
        ...state,
        agent:state.agent
    }
    }
    const llm=await getModel("router")
    const prompt=`You are an agent router.
    Available agents:
    - chat
    - search
    - coding
    - pdf
    - ppt
    - vision
    
    Rules:

    chat:
    General conversation,
    explanation,
    learning,
    questions.

    search:
    current events,
    lateat information,
    news,
    recent developments,
    internet lookup.

    coding:

    Generate code,
    debud code,
    build projects,
    architecture,
    api design.

    pdf:

    Questions abiut generate PDFs
    or documents context.

    ppt:
    Questions abiut generate ppt
    or ppt context.

    vision:
    Generate image ,
    ceeate image

    Return ONLY one Word:
    chat 
    search
    coding
    pdf
    ppt
    vision

    user Query:
    ${state.prompt}
    `

    const response =await  llm.invoke(prompt)
    return {
        ...state,
        agent:response.content.trim().toLowerCase()
    }
}