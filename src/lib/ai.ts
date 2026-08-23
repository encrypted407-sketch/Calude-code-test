import { z } from "zod";

// Groq's API is OpenAI-compatible (https://console.groq.com/docs/openai) — plain fetch
// against their REST endpoint, no SDK needed. Text-only calls (parsing, rewriting, and
// text-only marking) use GROQ_MODEL; marking with a drawn/handwritten image needs a
// vision-capable model, so those calls use GROQ_VISION_MODEL instead.
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const TEXT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.6-27b";

function getApiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to your .env file to enable AI features " +
        "(get a free key at https://console.groq.com/keys)."
    );
  }
  return key;
}

/** Strips ```json fences etc., in case the model wraps its JSON output despite response_format. */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

type UserContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/** A rate/size limit response — retrying immediately would just spend more of the same
 * exhausted budget, so this is never retried (unlike malformed-JSON/schema failures). */
class RateLimitError extends Error {}

async function callGroqJSON<T>(opts: {
  system: string;
  userContent: string | UserContentPart[];
  schema: z.ZodType<T>;
  model?: string;
  maxTokens?: number;
}): Promise<T> {
  const apiKey = getApiKey();
  const model = opts.model ?? TEXT_MODEL;

  const attempt = async (extraNote?: string): Promise<T> => {
    const userContent = extraNote
      ? typeof opts.userContent === "string"
        ? `${opts.userContent}\n\n${extraNote}`
        : [...opts.userContent, { type: "text" as const, text: extraNote }]
      : opts.userContent;

    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      if (res.status === 413 || res.status === 429) {
        throw new RateLimitError(
          "Groq's free-tier rate limit was hit for this request. Wait a minute and try again, " +
            "or try a shorter paper/answer — free-tier accounts have a per-minute token cap."
        );
      }
      throw new Error(`Groq API error (${res.status}): ${errBody || res.statusText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("No text content returned from the model.");
    }

    const jsonText = extractJson(text);
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(jsonText);
    } catch {
      throw new Error("MALFORMED_JSON");
    }

    // Groq's json_object mode requires a JSON *object*, so array responses (paper
    // parsing) are asked for wrapped as {"questions": [...]}; unwrap before validating.
    const candidate =
      !Array.isArray(parsedRaw) &&
      parsedRaw &&
      typeof parsedRaw === "object" &&
      "questions" in parsedRaw
        ? (parsedRaw as { questions: unknown }).questions
        : parsedRaw;

    const result = opts.schema.safeParse(candidate);
    if (!result.success) {
      throw new Error("SCHEMA_MISMATCH");
    }
    return result.data;
  };

  try {
    return await attempt();
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    // Retry once, telling the model exactly what went wrong.
    return await attempt(
      "Your previous response was not valid JSON matching the required schema. " +
        "Reply again with ONLY the raw JSON, no prose, no markdown fences."
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
Respond with STRICT JSON ONLY: an object of the form {"questions": [...]}, where each array entry has exactly these fields:
- "number": string, the question number/part as printed (e.g. "3(b)(ii)")
- "text": string, the full question text
- "marksAvailable": integer, marks for this question/part
- "topic": string or null, the specification topic this question tests (e.g. "Differentiation", "Forces and Motion")
- "yearRequired": 1 or 2 or null — 1 if this is first-year/AS content, 2 if it is second-year-only content. Infer from spec position/difficulty if not explicit.
- "requiresDrawing": boolean, true if the question asks the student to sketch/plot/draw a graph, diagram, or construction
- "markSchemeText": string or null, the matching mark scheme text for this question, matched by question number

No prose, no markdown fences — the raw JSON object only.`;

  const userText = input.markSchemeText
    ? `QUESTION PAPER:\n${input.paperText}\n\n---\n\nMARK SCHEME:\n${input.markSchemeText}`
    : `QUESTION PAPER (no mark scheme provided):\n${input.paperText}`;

  return callGroqJSON({
    system,
    userContent: userText,
    schema: parsedPaperSchema,
    // Kept well under Groq's free-tier per-request token cap (input + this reservation
    // must clear it) — see the README's note on free-tier limits for larger papers.
    maxTokens: 3500,
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

  const text = [
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
    .join("\n\n");

  const userContent: string | UserContentPart[] = input.studentAnswerImageBase64
    ? [
        { type: "text", text },
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${input.studentAnswerImageBase64}` },
        },
      ]
    : text;

  return callGroqJSON({
    system,
    userContent,
    schema: markingResultSchema,
    model: input.studentAnswerImageBase64 ? VISION_MODEL : TEXT_MODEL,
    // A marking JSON object (an int plus two short paragraphs) never needs much room —
    // kept tight because an image already costs several thousand tokens of Groq's
    // free-tier per-minute budget on its own (measured ~2800+ tokens for a tiny image).
    maxTokens: 1200,
  });
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

  return callGroqJSON({
    system,
    userContent: userText,
    schema: rewriteSchema,
    maxTokens: 1800,
  });
}
