type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: any[];
};

export type SiliconFlowClient = {
  chat(props: {
    model: string;
    messages: ChatMessage[];
    tools: any[];
  }): Promise<any>;
};

export function createSiliconFlowClient(props: {
  apiKey: string;
  baseUrl: string;
}): SiliconFlowClient {
  const { apiKey, baseUrl } = props;

  async function chat(request: {
    model: string;
    messages: ChatMessage[];
    tools: any[];
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
      throw new Error(`SiliconFlow error ${res.status}: ${text}`);
    }

    return res.json();
  }

  return { chat };
}
