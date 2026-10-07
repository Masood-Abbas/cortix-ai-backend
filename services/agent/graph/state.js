import { Annotation } from "@langchain/langgraph";

export const agentState = Annotation.Root({
  prompt: Annotation(),
  aiResponse: Annotation(),
  agent:Annotation(),
  conversationId:Annotation(),
  history: Annotation(),
  searchResults:Annotation(),
  images:Annotation(),
  artifacts:Annotation(),
  files:Annotation(),
  userId:Annotation(),
  user:Annotation(),
  cookie:Annotation(),
  file:Annotation()
});
