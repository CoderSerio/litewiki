import assert from "node:assert/strict";
import test from "node:test";

import { createAnthropicMessagesClient } from "../../src/agent/anthropicMessagesClient.js";

test("anthropic client maps tools and tool calls", async (t) => {
  const originalFetch = globalThis.fetch;
  let seenRequest: { url?: string; body?: any } | null = null;

  globalThis.fetch = async (url, init) => {
    const bodyText = typeof init?.body === "string" ? init.body : "";
    seenRequest = {
      url: String(url),
      body: bodyText ? JSON.parse(bodyText) : undefined,
    };

    const responseBody = {
      content: [
        { type: "text", text: "ok" },
        {
          type: "tool_use",
          id: "tool-2",
          name: "listDirectory",
          input: { relativeOriginalPath: "" },
        },
      ],
    };
    return new Response(JSON.stringify(responseBody), { status: 200 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const client = createAnthropicMessagesClient({
    apiKey: "test-key",
    baseUrl: "https://api.anthropic.com/v1/messages",
  });

  const response = (await client.chat({
    model: "claude-3-5-sonnet-20241022",
    messages: [
      { role: "system", content: "sys" },
      { role: "user", content: "hi" },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "tool-1",
            type: "function",
            function: {
              name: "readFile",
              arguments: JSON.stringify({ relativeFilePath: "README.md" }),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "tool-1",
        name: "readFile",
        content: "file content",
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "readFile",
          description: "read file",
          parameters: {
            type: "object",
            properties: { relativeFilePath: { type: "string" } },
            required: ["relativeFilePath"],
          },
        },
      },
    ],
  })) as any;

  assert.ok(seenRequest);
  assert.equal(
    (seenRequest as any)?.url,
    "https://api.anthropic.com/v1/messages",
  );
  assert.equal((seenRequest as any)?.body?.system, "sys");
  assert.equal((seenRequest as any)?.body?.tools?.[0]?.name, "readFile");
  assert.equal((seenRequest as any)?.body?.messages?.[1]?.role, "assistant");
  assert.equal(
    (seenRequest as any)?.body?.messages?.[1]?.content?.[0]?.type,
    "tool_use",
  );
  assert.equal(
    (seenRequest as any)?.body?.messages?.[2]?.content?.[0]?.type,
    "tool_result",
  );

  assert.equal(response?.choices?.[0]?.message?.content, "ok");
  assert.equal(
    response?.choices?.[0]?.message?.tool_calls?.[0]?.function?.name,
    "listDirectory",
  );
});
