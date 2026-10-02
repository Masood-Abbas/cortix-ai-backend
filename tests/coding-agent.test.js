import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const fixture = { calls: [], prompts: [] };
globalThis.__codingAgentFixture = fixture;

const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/config/llmmodels.js")) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export const getModel = async (name) => ({
            invoke: async (prompt) => {
              globalThis.__codingAgentFixture.calls.push(name);
              globalThis.__codingAgentFixture.prompts.push(prompt);
              if (name === "intent") return { content: "CODE_GENERATION" };
              return {
                content: 'Here is the JSON:\\n{"files":[{"name":"index.html","content":"<main>Calculator</main>"},{"name":"style.css","context":"main { color: red; }"},{"name":"script.js","content":"console.log(1)"}]}'
              };
            },
          });
        `,
      };
    }
    if (url.endsWith("/tools/unsplash.tool.js")) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export const getUnsplashImages = async () => [
            { url: "https://images.unsplash.com/photo-test", alt: "test image" },
          ];
        `,
      };
    }
    return nextLoad(url, context);
  },
});

const { codingAgent } = await import("../services/agent/agents/coding.agent.js");
hooks.deregister();

test("coding agent extracts project files when the model wraps JSON with text", async () => {
  fixture.calls = [];
  fixture.prompts = [];
  const result = await codingAgent({ prompt: "create calculator", history: [] });
  assert.equal(typeof result.aiResponse, "string");
  assert.match(result.aiResponse, /Code Generated/);
  assert.equal(result.artifacts.length, 1);
  assert.deepEqual(
    result.artifacts[0].files.map((file) => [file.name, file.content]),
    [
      ["index.html", "<main>Calculator</main>"],
      ["style.css", "main { color: red; }"],
      ["script.js", "console.log(1)"],
    ],
  );
  assert.deepEqual(fixture.calls, ["intent", "coding"]);
  assert.match(fixture.prompts[1], /https:\/\/images\.unsplash\.com\/photo-test/);
});
