import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

globalThis.__routeFixture = { route: "chat", history: null, model: null };
const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/config/llmmodels.js")) {
      return { format: "module", shortCircuit: true, source: `
        export const getModel = async (name) => ({ invoke: async (messages) => {
          const fixture = globalThis.__routeFixture;
          if (name === "router") return { content: fixture.route };
          fixture.history = messages;
          fixture.model = name;
          if (name === "pdf") {
            return { content: JSON.stringify({ title: "PDF", subtitle: "Test", section: [{ heading: "One", points: ["A"] }] }) };
          }
          return { content: "model response" };
        } });
      ` };
    }
    if (url.endsWith("/config/tavily.js")) {
      return { format: "module", shortCircuit: true, source: `
        export const searchTool = {
          invoke: async () => ({
            results: [{ title: "Search hit", content: "Fresh web result", url: "https://example.com" }],
            images: ["https://example.com/image.jpg"],
          }),
        };
      ` };
    }
    if (url.endsWith("/utils/generatePdf.js")) {
      return { format: "module", shortCircuit: true, source: `
        export const generatePdf = async () => Buffer.from("pdf");
      ` };
    }
    if (url.endsWith("/utils/uplodeToS3.js")) {
      return { format: "module", shortCircuit: true, source: `
        export const uploadTOS3 = async () => "file";
      ` };
    }
    if (url.endsWith("/utils/getFromS3.js")) {
      return { format: "module", shortCircuit: true, source: `
        export const getFromS3 = async () => "https://signed.example.com/file.pdf";
      ` };
    }
    return nextLoad(url, context);
  },
});
const { graph } = await import("../services/agent/graph/graph.js");
hooks.deregister();

for (const route of ["chat", "coding", "search", "pdf", "ppt", "vision", "unknown"]) {
  test(`router destination '${route}' returns a useful response without an empty graph update`, async () => {
    globalThis.__routeFixture.route = route;
    const result = await graph.invoke({ prompt: "hello", conversationId: "conversation", history: [{ role: "user", content: "past question" }] });
    assert.equal(typeof result.aiResponse, "string");
    assert.ok(result.aiResponse.length > 0);
    if (["chat", "search", "unknown"].includes(route)) {
      assert.equal(globalThis.__routeFixture.history[1].content, "past question");
      assert.equal(globalThis.__routeFixture.model, route === "coding" ? "coding" : "chat");
    } else if (route === "coding") {
      assert.equal(globalThis.__routeFixture.model, "coding");
    } else if (route === "pdf") {
      assert.equal(globalThis.__routeFixture.model, "pdf");
      assert.deepEqual(result.files, [
        {
          name: result.files[0].name,
          url: "https://signed.example.com/file.pdf",
          type: "application/pdf",
        },
      ]);
    } else if (route === "vision") {
      assert.match(result.aiResponse, /Unable to generate the image/);
    } else {
      assert.match(result.aiResponse, /not available yet/);
    }
  });
}
