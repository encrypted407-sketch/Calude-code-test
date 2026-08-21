import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

let client: Anthropic | null = null;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your .env file to enable AI features."
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/** Strips ```json fences etc. some models wrap strict-JSON responses in. */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: "image/png" | "image/jpeg"; data: string };
    };

async function callClaudeJSON<T>(opts: {
  system: string;
  content: ContentBlock[];
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const anthropic = getClient();

  const attempt = async (extraNote?: string): Promise<T> => {
    const content = extraNote
      ? [...opts.content, { type: "text" as const, text: extraNote }]
      : opts.content;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system,
      messages: [{ role: "user", content }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content returned from the model.");
    }

    const jsonText = extractJson(textBlock.text);
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(jsonText);
    } catch {
      throw new Error("MALFORMED_JSON");
    }

    const result = opts.schema.safeParse(parsedRaw);
    if (!result.success) {
      throw new Error("SCHEMA_MISMATCH");
    }
    return result.data;
  };

  try {
    return await attempt();
  } catch {
    // Retry once, telling the model exactly what went wrong.
    return await attempt(
      "Your previous response was not valid JSON matching the required schema. " +
        "Reply again with ONLY the raw JSON object/array, no prose, no markdown fences."
    );
  }
}

// ---------------------------------------------------------------------------
// Paper parsing
// ---------------------------------------------------------------------------

export const parsedQuestionSchema = z.object({
  number: z.string(),
  text: z.string(),
  marksAvailable: z.number().int().min(0),
  topic: z.string().nullable().optional(),
  yearRequired: z.union([z.literal(1), z.literal(2)]).nullable().optional(),
  requiresDrawing: z.boolean().default(false),
  markSchemeText: z.string().nullable().optional(),
});
export type ParsedQuestion = z.infer<typeof parsedQuestionSchema>;

const parsedPaperSchema = z.array(parsedQuestionSchema);

export async function parsePaperWithAI(input: {
  subject: string;
  examBoard: string;
  level: string;
  paperText: string;
  markSchemeText?: string | null;
}): Promise<ParsedQuestion[]> {
  const system = `You are an expert exam-paper parser for ${input.examBoard} ${input.level} ${input.subject}.
Split a past exam paper into individual questions and match each to its mark scheme entry.
Respond with STRICT JSON ONLY: an array of objects with exactly these fields:
- "number": string, the question number/part as printed (e.g. "3(b)(ii)")
- "text": string, the full question text
- "marksAvailable": integer, marks for this question/part
- "topic": string or null, the specification topic this question tests (e.g. "Differentiation", "Forces and Motion")
- "yearRequired": 1 or 2 or null — 1 if this is first-year/AS content, 2 if it is second-year-only content. Infer from spec position/difficulty if not explicit.
- "requiresDrawing": boolean, true if the question asks the student to sketch/plot/draw a graph, diagram, or construction
- "markSchemeText": string or null, the matching mark scheme text for this question, matched by question number

No prose, no markdown fences — the raw JSON array only.`;

  const userText = input.markSchemeText
    ? `QUESTION PAPER:\n${input.paperText}\n\n---\n\nMARK SCHEME:\n${input.markSchemeText}`
    : `QUESTION PAPER (no mark scheme provided):\n${input.paperText}`;

  return callClaudeJSON({
    system,
    content: [{ type: "text", text: userText }],
    schema: parsedPaperSchema,
    maxTokens: 8192,
  });
}

// ---------------------------------------------------------------------------
// Marking
// ---------------------------------------------------------------------------

const markingResultSchema = z.object({
  marksAwarded: z.number().int().min(0),
  feedback: z.string(),
  improvementPoints: z.string(),
});
export type MarkingResult = z.infer<typeof markingResultSchema>;

export async function markAnswer(input: {
  questionText: string;
  markSchemeText: string;
  marksAvailable: number;
  studentAnswerText?: string | null;
  studentAnswerImageBase64?: string | null;
  previousFeedback?: string | null;
}): Promise<MarkingResult> {
  const system = `You are a strict, fair A-level examiner marking against an official mark scheme.
Award marks exactly as a real examiner would: only give credit for what the mark scheme allows, including method/accuracy marks where relevant.
If the student's working is shown (text or image), follow it through for "error carried forward" credit where the mark scheme allows it.
Respond with STRICT JSON ONLY, an object with exactly these fields:
- "marksAwarded": integer, 0 to ${input.marksAvailable}
- "feedback": string, specific feedback tied to what the student actually wrote — what was right, what was missing, and why marks were or weren't given
- "improvementPoints": string, 1-3 concrete, actionable points the student should focus on to improve on this topic next time

No prose outside the JSON, no markdown fences.`;

  const content: ContentBlock[] = [
    {
      type: "text",
      text: [
        `QUESTION (${input.marksAvailable} marks):\n${input.questionText}`,
        `MARK SCHEME:\n${input.markSchemeText}`,
        input.previousFeedback
          ? `PREVIOUS ATTEMPT FEEDBACK (the student is resubmitting after this):\n${input.previousFeedback}`
          : null,
        input.studentAnswerText ? `STUDENT'S WRITTEN ANSWER:\n${input.studentAnswerText}` : null,
        input.studentAnswerImageBase64
          ? "STUDENT'S DRAWN/HANDWRITTEN ANSWER: see attached image."
          : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  if (input.studentAnswerImageBase64) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: input.studentAnswerImageBase64,
      },
    });
  }

  return callClaudeJSON({ system, content, schema: markingResultSchema });
}

// ---------------------------------------------------------------------------
// Question rewriting (spaced repetition requizzing)
// ---------------------------------------------------------------------------

const rewriteSchema = z.object({
  text: z.string(),
  markSchemeText: z.string(),
  marksAvailable: z.number().int().min(0),
});
export type RewrittenQuestion = z.infer<typeof rewriteSchema>;

export async function rewriteQuestionWithAI(input: {
  originalText: string;
  originalMarkScheme: string;
  marksAvailable: number;
  topic: string | null;
  yearRequired: number | null;
  subject: string;
  examBoard: string;
}): Promise<RewrittenQuestion> {
  const system = `You write fresh A-level exam questions for ${input.examBoard} ${input.subject} spaced-repetition practice.
Given a question the student previously struggled with, write a NEW question that tests the exact same concept, at the same difficulty and year level, but with different surface details (different numbers, context, or phrasing) so it cannot be answered from memorised recall of the original.
Also write a matching mark scheme for your new question, worth the same number of marks.
Respond with STRICT JSON ONLY, an object with exactly these fields:
- "text": string, the new question text
- "markSchemeText": string, the mark scheme for the new question
- "marksAvailable": integer, must equal ${input.marksAvailable}

No prose, no markdown fences.`;

  const userText = `ORIGINAL QUESTION (topic: ${input.topic ?? "unknown"}, year: ${input.yearRequired ?? "unknown"}):\n${input.originalText}\n\nORIGINAL MARK SCHEME:\n${input.originalMarkScheme}`;

  return callClaudeJSON({
    system,
    content: [{ type: "text", text: userText }],
    schema: rewriteSchema,
  });
}
