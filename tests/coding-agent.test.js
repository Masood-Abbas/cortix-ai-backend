import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const fixture = { calls: [] };
globalThis.__codingAgentFixture = fixture;

const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/config/llmmodels.js")) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export const getModel = async (name) => ({
            invoke: async () => {
              globalThis.__codingAgentFixture.calls.push(name);
              if (name === "intent") return { content: "CODE_GENERATION" };
              return {
                content: 'Here is the JSON:\\n{"files":[{"name":"index.html","content":"<main>Calculator</main>"},{"name":"style.css","context":"main { color: red; }"},{"name":"script.js","content":"console.log(1)"}]}'
              };
            },
          });
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
  const result = await codingAgent({ prompt: "create calculator", history: [] });
  assert.equal(typeof result.aiResponse, "string");
  assert.match(result.aiResponse, /Project Generated/);
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
});
