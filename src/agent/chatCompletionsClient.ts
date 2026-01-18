type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: unknown[];
};

export type ChatCompletionsClient = {
  chat(props: {
    model: string;
    messages: ChatMessage[];
    tools: unknown[];
  }): Promise<unknown>;
};

export function createChatCompletionsClient(props: {
  apiKey: string;
  baseUrl: string;
}): ChatCompletionsClient {
  const { apiKey, baseUrl } = props;

  async function chat(request: {
    model: string;
    messages: ChatMessage[];
    tools: unknown[];
  }) {
    const body = {
      model: request.model,
      messages: request.messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 4096,
      tool_choice: "auto",
      response_format: { type: "text" },
      tools: request.tools,
    };

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ChatCompletions error ${res.status}: ${text}`);
    }

    return res.json() as Promise<unknown>;
  }

  return { chat };
}
