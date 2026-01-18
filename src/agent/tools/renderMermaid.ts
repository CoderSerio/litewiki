import { z } from "zod";
import type { ToolResult } from "../types.js";

const renderMermaidSchema = {
  type: "object",
  properties: {
    template: {
      type: "string",
      description: "图类型：flowchart | sequence | state | class",
    },
    direction: {
      type: "string",
      description: "流程图方向：TB/TD/BT/LR/RL",
    },
    title: { type: "string" },
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          shape: { type: "string" },
        },
        required: ["label"],
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          label: { type: "string" },
          arrow: { type: "string" },
        },
        required: ["from", "to"],
      },
    },
    participants: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, label: { type: "string" } },
        required: ["label"],
      },
    },
    messages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          label: { type: "string" },
          arrow: { type: "string" },
        },
        required: ["from", "to", "label"],
      },
    },
    states: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, label: { type: "string" } },
        required: ["label"],
      },
    },
    transitions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          label: { type: "string" },
        },
        required: ["from", "to"],
      },
    },
    classes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          fields: { type: "array", items: { type: "string" } },
          methods: { type: "array", items: { type: "string" } },
        },
        required: ["label"],
      },
    },
  },
  required: ["template"],
  additionalProperties: false,
} as const;

const renderMermaidParams = z.object({
  template: z.enum(["flowchart", "sequence", "state", "class"]),
  direction: z.enum(["TB", "TD", "BT", "LR", "RL"]).optional(),
  title: z.string().optional(),
  nodes: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string(),
        shape: z.string().optional(),
      }),
    )
    .optional(),
  edges: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().optional(),
        arrow: z.string().optional(),
      }),
    )
    .optional(),
  participants: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string(),
      }),
    )
    .optional(),
  messages: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: z.string(),
        arrow: z.string().optional(),
      }),
    )
    .optional(),
  states: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string(),
      }),
    )
    .optional(),
  transitions: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().optional(),
      }),
    )
    .optional(),
  classes: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string(),
        fields: z.array(z.string()).optional(),
        methods: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

type Message = any;
type ToolCall = any;

function toId(label: string, fallback: string) {
  const raw = String(label || "")
    .trim()
    .replace(/[^\w-]+/g, "_");
  return raw.length > 0 ? raw : fallback;
}

function toLabel(label: string) {
  return String(label || "")
    .replaceAll('"', '\\"')
    .replaceAll("\n", " ");
}

function renderNode(id: string, label: string, shape?: string) {
  const text = `"${toLabel(label)}"`;
  switch (shape) {
    case "round":
      return `${id}(${text})`;
    case "stadium":
      return `${id}([${text}])`;
    case "subroutine":
      return `${id}[["${toLabel(label)}"]]`;
    case "circle":
      return `${id}((${text}))`;
    case "diamond":
      return `${id}{${text}}`;
    default:
      return `${id}[${text}]`;
  }
}

function renderFlowchart(params: z.infer<typeof renderMermaidParams>) {
  const dir = params.direction || "TB";
  const lines = [`flowchart ${dir}`];
  const nodes = params.nodes || [];
  const ids = new Map<string, string>();
  nodes.forEach((n, i) => {
    const id = n.id || toId(n.label, `N${i + 1}`);
    ids.set(n.label, id);
    lines.push(`  ${renderNode(id, n.label, n.shape)}`);
  });
  const edges = params.edges || [];
  edges.forEach((e) => {
    const from = ids.get(e.from) || toId(e.from, e.from);
    const to = ids.get(e.to) || toId(e.to, e.to);
    const arrow = e.arrow || "-->";
    const label = e.label ? `-- "${toLabel(e.label)}" ` : "";
    lines.push(`  ${from} ${label}${arrow} ${to}`);
  });
  return lines.join("\n");
}

function renderSequence(params: z.infer<typeof renderMermaidParams>) {
  const lines = ["sequenceDiagram"];
  (params.participants || []).forEach((p, i) => {
    const id = p.id || toId(p.label, `P${i + 1}`);
    lines.push(`  participant ${id} as "${toLabel(p.label)}"`);
  });
  (params.messages || []).forEach((m) => {
    const arrow = m.arrow || "->>";
    lines.push(
      `  ${toId(m.from, m.from)}${arrow}${toId(m.to, m.to)}: ${toLabel(m.label)}`,
    );
  });
  return lines.join("\n");
}

function renderState(params: z.infer<typeof renderMermaidParams>) {
  const lines = ["stateDiagram-v2"];
  (params.states || []).forEach((s, i) => {
    const id = s.id || toId(s.label, `S${i + 1}`);
    lines.push(`  state "${toLabel(s.label)}" as ${id}`);
  });
  (params.transitions || []).forEach((t) => {
    const label = t.label ? ` : ${toLabel(t.label)}` : "";
    lines.push(`  ${toId(t.from, t.from)} --> ${toId(t.to, t.to)}${label}`);
  });
  return lines.join("\n");
}

function renderClass(params: z.infer<typeof renderMermaidParams>) {
  const lines = ["classDiagram"];
  (params.classes || []).forEach((c, i) => {
    const id = c.id || toId(c.label, `C${i + 1}`);
    lines.push(`  class ${id} {`);
    (c.fields || []).forEach((f) => lines.push(`    ${f}`));
    (c.methods || []).forEach((m) => lines.push(`    ${m}()`));
    lines.push("  }");
    if (c.label && c.label !== id) {
      lines.push(`  ${id} : ${toLabel(c.label)}`);
    }
  });
  return lines.join("\n");
}

function renderMermaid(params: z.infer<typeof renderMermaidParams>) {
  const title = params.title ? `%% ${toLabel(params.title)}\n` : "";
  let body = "";
  switch (params.template) {
    case "flowchart":
      body = renderFlowchart(params);
      break;
    case "sequence":
      body = renderSequence(params);
      break;
    case "state":
      body = renderState(params);
      break;
    case "class":
      body = renderClass(params);
      break;
  }
  return `${title}${body}`;
}

const handler = async (props: {
  toolResults: ToolResult[];
  args: Record<string, any>;
  messages: Message[];
  cwd: string;
  call: ToolCall;
}) => {
  const { toolResults, args, messages, call } = props;
  const parsed = renderMermaidParams.safeParse(args);
  if (!parsed.success) {
    toolResults.push({ tool: "renderMermaid", data: "invalid args" } as any);
    return;
  }
  const mermaidText = renderMermaid(parsed.data);
  const output = `\`\`\`mermaid\n${mermaidText}\n\`\`\``;
  toolResults.push({ tool: "renderMermaid", data: output });
  messages.push({
    role: "tool",
    tool_call_id: call.id ?? "",
    name: "renderMermaid",
    content: output,
  });
};

export const renderMermaidTool = {
  meta: {
    type: "function",
    function: {
      name: "renderMermaid",
      description: "用参数生成标准化的 Mermaid 图代码块",
      parameters: renderMermaidSchema,
      strict: false,
    },
  },
  handler,
};
