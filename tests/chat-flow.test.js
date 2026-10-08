import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const fixture = { conversation: {}, message: {}, axios: {}, redis: {}, graph: {}, model: {} };
globalThis.__chatFlowFixture = fixture;
const hooks = registerHooks({
  load(url, context, nextLoad) {
    const exports = [
      ["/models/conversation.modle.js", "export default globalThis.__chatFlowFixture.conversation;"],
      ["/models/message.model.js", "export default globalThis.__chatFlowFixture.message;"],
      ["/axios/index.js", "export default globalThis.__chatFlowFixture.axios;"],
      ["/shared/redis/redis.js", "export default globalThis.__chatFlowFixture.redis;"],
      ["/graph/graph.js", "export const graph = globalThis.__chatFlowFixture.graph;"],
      ["/config/llmmodels.js", "export const getModel = async () => globalThis.__chatFlowFixture.model;"],
      ["/utils/deductCredit.js", "export const deductCredit = async () => ({ user: { userId: 'owner', credits: 99 } });"],
      ["/utils/Ratelimit/agentLimit.js", "export const checkAgentLimit = async () => ({ success: true });"],
    ];
    const match = exports.find(([suffix]) => url.endsWith(suffix));
    return match ? { format: "module", shortCircuit: true, source: match[1] } : nextLoad(url, context);
  },
});
const chat = await import("../services/chat/controllers/chat.controller.js");
const { agent } = await import("../services/agent/controllers/agent.controller.js");
const { getMemory } = await import("../services/agent/utils/memory.js");
const { chatAgent } = await import("../services/agent/agents/chat.agent.js");
hooks.deregister();

const id = "507f1f77bcf86cd799439011";
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } });
const request = (body = {}, userId = "owner") => ({ headers: userId ? { "x-user-id": userId } : {}, body, params: { conversationId: id } });
const reset = () => {
  fixture.conversation.findOne = async ({ userId }) => userId === "owner" ? { _id: id, userId } : null;
  fixture.conversation.updateOne = async () => {};
  fixture.redis.get = async () => null;
  fixture.redis.set = async () => {};
  fixture.redis.del = async () => {};
};

test("history requires authentication and ownership before reading messages", async () => {
  reset();
  fixture.message.find = () => { throw new Error("Must not read messages"); };
  const anonymous = response();
  await chat.getMessage(request({}, null), anonymous);
  assert.equal(anonymous.statusCode, 401);
  const otherUser = response();
  await chat.getMessage(request({}, "other-user"), otherUser);
  assert.equal(otherUser.statusCode, 404);
});

test("history uses only the requested conversation and a deterministic order", async () => {
  reset();
  fixture.message.find = (filter) => {
    assert.deepEqual(filter, { conversationId: id });
    return { sort: async (sort) => {
      assert.deepEqual(sort, { createdAt: 1, _id: 1 });
      return [{ role: "user", content: "mine" }];
    } };
  };
  const res = response();
  await chat.getMessage(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body[0].content, "mine");
});

test("invalid IDs, missing content, and foreign message writes are rejected", async () => {
  reset();
  fixture.message.create = () => { throw new Error("Must not save invalid messages"); };
  for (const [body, user, expected] of [
    [{ conversationId: "undefined", role: "user", content: "hello" }, "owner", 400],
    [{ conversationId: id, role: "assistant", content: null }, "owner", 400],
    [{ conversationId: id, role: "user", content: "hello" }, "other-user", 404],
  ]) {
    const res = response();
    await chat.saveMessage(request(body, user), res);
    assert.equal(res.statusCode, expected);
  }
});

test("title updates cannot modify another user's conversation", async () => {
  reset();
  fixture.conversation.findOneAndUpdate = () => { throw new Error("Must not update foreign conversation"); };
  const res = response();
  await chat.updateConversation(request({ id, title: "stolen" }, "other-user"), res);
  assert.equal(res.statusCode, 404);
});

test("memory is scoped by owner and conversation and retains exactly the last 20 messages", async () => {
  reset();
  const keys = [];
  fixture.redis.get = async (key) => { keys.push(key); return JSON.stringify(Array.from({ length: 25 }, (_, i) => ({ role: "user", content: String(i) }))); };
  const history = await getMemory(id, "owner");
  await getMemory("507f1f77bcf86cd799439012", "owner");
  await getMemory(id, "another-owner");
  assert.equal(new Set(keys).size, 3);
  assert.equal(history.length, 20);
  assert.equal(history[0].content, "5");
  await assert.rejects(getMemory(undefined, "owner"));
});

test("cache errors fall back to authenticated database history", async () => {
  reset();
  fixture.redis.get = async () => { throw new Error("Redis unavailable"); };
  fixture.redis.set = async () => { throw new Error("Redis unavailable"); };
  fixture.axios.get = async (url, options) => {
    assert.ok(url.endsWith(`/get-messge/${id}`));
    assert.equal(options.headers["x-user-id"], "owner");
    return { data: [{ role: "user", content: "from database" }] };
  };
  assert.equal((await getMemory(id, "owner"))[0].content, "from database");
});

test("agent snapshots history before saving the prompt and persists replies before returning", async () => {
  reset();
  const events = [];
  fixture.axios.get = async (url, options) => {
    assert.equal(options.headers["x-user-id"], "owner");
    events.push(url.includes("/conversation/") ? "ownership" : "history");
    return { data: url.includes("/conversation/") ? { _id: id } : [{ role: "assistant", content: "previous answer" }] };
  };
  fixture.axios.post = async (url, body, options) => {
    assert.equal(options.headers["x-user-id"], "owner");
    assert.equal(body.conversationId, id);
    events.push(`save:${body.role}`);
    return { data: body };
  };
  fixture.graph.invoke = async (state) => {
    events.push("model");
    assert.deepEqual(state.history, [{ role: "assistant", content: "previous answer" }]);
    assert.equal(state.prompt, "hello");
    return { aiResponse: "answer" };
  };
  const res = response();
  await agent(request({ conversationId: id, prompt: " hello " }), res);
  assert.equal(res.body.answer, "answer");
  assert.deepEqual(res.body.images, []);
  assert.deepEqual(events, ["ownership", "history", "save:user", "model", "save:assistant"]);
});

test("ownership rejection stops the agent before cache reads or paid model calls", async () => {
  reset();
  fixture.axios.get = async () => { throw Object.assign(new Error("Not found"), { response: { status: 404 } }); };
  fixture.redis.get = () => { throw new Error("Cache must not be read"); };
  fixture.graph.invoke = () => { throw new Error("Model must not be invoked"); };
  const res = response();
  await agent(request({ conversationId: id, prompt: "hello" }, "other-user"), res);
  assert.equal(res.statusCode, 404);
});

test("chat model receives historical turns followed by the current prompt exactly once", async () => {
  reset();
  fixture.model.invoke = async (messages) => {
    assert.deepEqual(messages.map((message) => message.getType()), ["system", "human", "ai", "human"]);
    assert.deepEqual(messages.slice(1).map((message) => message.content), ["old question", "old answer", "new question"]);
    return { content: "new answer" };
  };
  const result = await chatAgent({ prompt: "new question", history: [{ role: "user", content: "old question" }, { role: "assistant", content: "old answer" }] });
  assert.equal(result.aiResponse, "new answer");
});
