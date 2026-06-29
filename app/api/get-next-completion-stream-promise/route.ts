import { z } from "zod";
import { resolveModel } from "@/lib/constants";
import { createAIClient } from "@/lib/ai-config";
import { createPrismaClient } from "@/lib/prisma";

function optimizeMessagesForTokens(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): { role: "system" | "user" | "assistant"; content: string }[] {
  // Strip code blocks from assistant messages except the last 2 to save tokens
  const assistantIndices: number[] = [];
  for (
    let i = messages.length - 1;
    i >= 0 && assistantIndices.length < 2;
    i--
  ) {
    if (messages[i].role === "assistant") {
      assistantIndices.push(i);
    }
  }
  return messages.map((msg, index) => {
    if (msg.role === "assistant" && !assistantIndices.includes(index)) {
      const stripped = msg.content.replace(/```[\s\S]*?```/g, "").trim();
      return {
        ...msg,
        content: stripped || "[code omitted]",
      };
    }
    return msg;
  });
}

const requestSchema = z.object({
  messageId: z.string().min(1),
  model: z.string().min(1),
});

export async function POST(req: Request) {
  const prisma = createPrismaClient();

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response("Invalid request", { status: 400 });
  }
  const { messageId, model } = parsed.data;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return new Response(null, { status: 404 });
  }

  const messagesRes = await prisma.message.findMany({
    where: { chatId: message.chatId, position: { lte: message.position } },
    orderBy: { position: "asc" },
  });

  let messages = z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .parse(messagesRes);

  messages = optimizeMessagesForTokens(messages);

  if (messages.length > 10) {
    messages = [messages[0], messages[1], messages[2], ...messages.slice(-7)];
  }

  const together = createAIClient(message.chatId);

  const res = await together.chat.completions.create({
    model: resolveModel(model),
    reasoning: { enabled: false },
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
    temperature: 0.4,
    max_tokens: 9000,
  });

  return new Response(res.toReadableStream());
}

export const runtime = "edge";
export const maxDuration = 300;
