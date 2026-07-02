import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  getMainCodingPrompt,
  screenshotToCodePrompt,
} from "@/lib/prompts";
import {
  DEFAULT_MODEL,
  modelSupportsVision,
  resolveModel,
} from "@/lib/constants";
import { createAIClient } from "@/lib/ai-config";
import { invalidateChatCache, invalidateMessageCache } from "@/lib/cached-db";
import { deriveChatTitle } from "@/lib/messages";
import { requireUser } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/rbac";

const MAX_PROMPT_LENGTH = 8000;

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = typeof body.model === "string" ? body.model : DEFAULT_MODEL;
    const screenshotUrl =
      typeof body.screenshotUrl === "string" ? body.screenshotUrl : undefined;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt must be under ${MAX_PROMPT_LENGTH} characters.` },
        { status: 400 },
      );
    }

    const resolvedModel = resolveModel(model);
    const prisma = getPrisma();
    const together = createAIClient("create-chat");

    let title = deriveChatTitle(prompt);
    try {
      const responseForChatTitle = await together.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a chatbot helping the user create a simple app or script, and your current job is to create a succinct title, maximum 3-5 words, for the chat given their initial prompt. Please return only the title.",
          },
          { role: "user", content: prompt },
        ],
      });
      title =
        responseForChatTitle.choices[0].message?.content?.trim() ||
        deriveChatTitle(prompt);
    } catch (err) {
      console.warn("Title generation failed, using prompt fallback:", err);
    }

    let fullScreenshotDescription: string | undefined;
    if (screenshotUrl && modelSupportsVision(resolvedModel)) {
      try {
        const screenshotResponse = await together.chat.completions.create({
          model: DEFAULT_MODEL,
          temperature: 0.4,
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: screenshotToCodePrompt },
                { type: "image_url", image_url: { url: screenshotUrl } },
              ],
            },
          ],
        });
        fullScreenshotDescription =
          screenshotResponse.choices[0].message?.content ?? undefined;
      } catch (err) {
        console.warn("Screenshot processing failed, continuing without it:", err);
      }
    }

    const userMessage = fullScreenshotDescription
      ? `${prompt} RECREATE THIS APP AS CLOSELY AS POSSIBLE: ${fullScreenshotDescription}`
      : prompt;

    const newChat = await prisma.chat.create({
      data: {
        model: resolvedModel,
        quality: "coder",
        prompt,
        title,
        shadcn: true,
        ownerId: user.id,
        messages: {
          createMany: {
            data: [
              {
                role: "system",
                content: getMainCodingPrompt(),
                position: 0,
              },
              { role: "user", content: userMessage, position: 1 },
            ],
          },
        },
      },
      include: { messages: true },
    });

    const lastMessage = newChat.messages
      .sort((a, b) => a.position - b.position)
      .at(-1);
    if (!lastMessage) throw new Error("No new message");

    invalidateChatCache(newChat.id);
    invalidateMessageCache(newChat.id, lastMessage.id);

    return NextResponse.json({
      chatId: newChat.id,
      lastMessageId: lastMessage.id,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 },
    );
  }
}
