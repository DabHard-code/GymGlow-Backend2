import OpenAI from "openai";
import type { SportType, FeedbackItem, BadgeType } from "@shared/schema";
import { badgeTypes } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
import { buildSkillRubricBlock } from "./ai/rubrics.js";
import ffmpegImport from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

// ✅ handle ESM/CJS interop so we always get a callable function
const ffmpeg: any = (ffmpegImport as any)?.default ?? (ffmpegImport as any);

// ✅ tell fluent-ffmpeg where ffmpeg lives in prod (Render)
if (ffmpegPath && typeof ffmpeg.setFfmpegPath === "function") {
  ffmpeg.setFfmpegPath(ffmpegPath as string);
}

/* ==================== OPENAI ==================== */

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/* ==================== PROMPTS ==================== */

/**
 * IMPORTANT:
 * The UI expects *structured* coaching output.
 * If we don't force a schema, the model may return only a score/strengths and omit feedback cards.
 */
function buildSportPrompt(
  sport: SportType,
  ctx?: {
    targetSkillName?: string;
    description?: string;
    keyPoints?: string[];
    category?: string;
    commonMistakes?: string[];
  }
): string {
  const badgeList = badgeTypes.join(", ");

  const roleBySport: Record<SportType, string> = {
    gymnastics: "elite gymnastics coach",
    dance: "professional dance coach",
    cheer: "elite cheer coach",
    lifting: "strength & technique coach",
    yoga: "certified yoga instructor",
  };

    const skillName = (ctx?.targetSkillName || "").trim();

  const rubricBlock = skillName
    ? buildSkillRubricBlock({
        sport,
        skillName,
        category: ctx?.category ?? null,
        description: ctx?.description ?? null,
        keyPoints: ctx?.keyPoints ?? null,
        commonMistakes: ctx?.commonMistakes ?? null,
      })
    : "";

  return [
    `You are an ${roleBySport[sport]} coaching a youth athlete.`,
    "Your tone is warm, precise, age-appropriate, and actionable.",
    "Never shame; avoid harsh labels like bad, wrong, lazy, weak, or dangerous.",
    "Do not claim medical, injury, or safety clearance. Do not diagnose pain or injuries.",
    "Only describe what can reasonably be inferred from the sampled frames. If visibility is limited, say so and lower certainty.",
    "If the video is too short/unclear, say so in the summary, keep scoring conservative, and focus on safe basics.",
    "Safety: avoid advanced skill advice unless the frames clearly show readiness; include safetyNotes when matting, spotting, space, or progression limits matter.",
    "",
    ...(ctx?.targetSkillName
      ? [
          "",
          `This analysis is for the specific skill: ${ctx.targetSkillName}.`,
          ctx.description ? `Skill description: ${ctx.description}` : "",
          ctx.keyPoints?.length ? `Key coaching points: ${ctx.keyPoints.join("; ")}` : "",
          rubricBlock ? `Skill rubric (use this to judge phases/checkpoints):\n${rubricBlock}` : "",
          "If the frames do not show a clear attempt of the required skill, set overallScore between 0 and 35 and say it is not a valid attempt of the required skill in summary.",
        ].filter(Boolean)
      : []),
    "Return ONLY a valid JSON object that matches this schema exactly:",
    "{",
    '  "overallScore": number (0-100 integer),',
    '  "summary": string (1-2 sentences, encouraging),',
    '  "technicalBreakdown": string (short paragraph; can be empty string),',
    '  "strengths": string[] (3-6 short positives),',
    '  "feedback": Array< {',
    '     "title": string (short coaching focus, not generic),',
    '     "description": string (what you observed + why it matters, 1-2 sentences),',
    '     "improvement": string (one exact correction cue the athlete can try next time),',
    '     "severity": "info"|"warning"|"critical",',
    '     "bodyPart"?: string,',
    '     "phase"?: string,',
    '     "drillRecommendation"?: string (specific drill + reps/hold time when possible)',
    "  } > (3-8 items; DO NOT return an empty array),",
    '  "safetyNotes": string[] (0-3 items),',
    '  "progressionTips": string[] (0-4 items),',
    `  "awardedBadges": string[] (0-3 items; must be from: [${badgeList}])`,
    "}",
    "",
    "Hard requirements:",
    "- feedback must have at least 3 items.",
    "- Each feedback item must include title, description, improvement, severity.",
    "- At least one feedback item must address a strength, and at least two must address corrections.",
    "- Each correction must include a body/shape cue such as arms by ears, ribs down, squeeze legs, eyes forward, or knees over toes when relevant.",
    "- technicalBreakdown must mention phases/checkpoints visible in the frames, not generic praise.",
    "- strengths should be specific observable positives, not generic good job filler.",
    "- Keep feedback concrete and tied to what you can infer from the frames.",
    "- Use critical only for clear safety concerns or clearly invalid attempts.",
    "- No markdown. No extra keys.",
  ].join("\n");
}

/* ==================== TYPES ==================== */

export interface AnalysisOutput {
  overallScore: number;
  summary: string;
  technicalBreakdown: string;
  feedback: FeedbackItem[];
  strengths: string[];
  safetyNotes: string[];
  progressionTips: string[];
  awardedBadges: BadgeType[];
}

interface ProcessedVideo {
  frames: string[];
  framesDir: string;
}

/* ==================== FFMPEG HELPERS (TS SAFE) ==================== */

function runFfmpeg(input: string, output: string, options: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof ffmpeg !== "function") {
      return reject(new Error("fluent-ffmpeg import is not callable (ffmpeg is undefined)"));
    }

    ffmpeg(input)
      .outputOptions(options)
      .output(output)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

/* ==================== FRAME EXTRACTION ==================== */

async function extractFramesFromFile(videoPath: string): Promise<ProcessedVideo> {
  const tmp = os.tmpdir();
  const id = randomUUID();
  const trimmed = path.join(tmp, `trim_${id}.mp4`);
  const framesDir = path.join(tmp, `frames_${id}`);

  fs.mkdirSync(framesDir, { recursive: true });

  await runFfmpeg(videoPath, trimmed, [
    "-t", "8",
    "-vf", "scale=854:480:force_original_aspect_ratio=decrease",
    "-preset", "ultrafast",
    "-crf", "28",
  ]);

  await runFfmpeg(trimmed, path.join(framesDir, "frame_%03d.jpg"), [
  "-vf", "fps=5/8,scale=360:-1",
  "-frames:v", "5",
  "-q:v", "10",
]);

  const frames = fs
    .readdirSync(framesDir)
    .filter(f => f.endsWith(".jpg"))
    .sort()
    .map(f =>
      fs.readFileSync(path.join(framesDir, f)).toString("base64")
    );

  try { fs.unlinkSync(trimmed); } catch {}

  return { frames, framesDir };
}

function cleanup(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

/* ==================== MAIN EXPORT ==================== */

export async function analyzeVideoFilePath(
  localVideoPath: string,
  sport: SportType,
  ctx?: {
    targetSkillName?: string;
    description?: string;
    keyPoints?: string[];
    category?: string;
    commonMistakes?: string[];
  }
): Promise<AnalysisOutput> {

  const { frames, framesDir } = await extractFramesFromFile(localVideoPath);

  if (!frames.length) {
    cleanup(framesDir);
    throw new Error("Could not extract frames");
  }

  try {
    const frameIndexes =
      frames.length <= 3
        ? frames.map((_, i) => i)
        : [0, Math.floor(frames.length / 2), frames.length - 1];

    const images = frameIndexes.map(i => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/jpeg;base64,${frames[i]}`,
        detail: "low" as const,
      },
    }));

    const openai = getOpenAI();

const extractContent = (resp: any): string | null => {
  const msg = resp?.choices?.[0]?.message;
  const c = msg?.content;

  // content can be a string OR an array of parts depending on model/sdk behavior
  if (typeof c === "string" && c.trim()) return c;

  if (Array.isArray(c)) {
    const text = c
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
    if (text) return text;
  }

  const toolArgs = msg?.tool_calls?.[0]?.function?.arguments;
  if (typeof toolArgs === "string" && toolArgs.trim()) return toolArgs;

  return null;
};

const callModel = async (model: string, maxTokens: number) => {
  return await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: buildSportPrompt(sport, ctx) },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Analyze my ${sport} form based on these frames. ` +
              `Return JSON that matches the required schema in the system message.`,
          },
          ...images,
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: maxTokens, // ✅ don’t let it bloat
  });
};

// FAST primary
let response = await callModel("gpt-4.1-mini", 1100);
let content = extractContent(response);

// Retry once
if (!content) {
  console.error(
    "Empty AI response (gpt-4.1-mini). finish_reason:",
    response?.choices?.[0]?.finish_reason
  );
  response = await callModel("gpt-4.1-mini", 1300);
  content = extractContent(response);
}

// Fallback to GPT-5 for tougher cases
if (!content) {
  console.error("Falling back to gpt-5");
  response = await callModel("gpt-5", 1500);
  content = extractContent(response);
}

if (!content) throw new Error("No AI response");

const parsed = JSON.parse(content);

    const normalizeSeverity = (s: any): "info" | "warning" | "critical" => {
      return s === "critical" || s === "warning" || s === "info" ? s : "info";
    };

    const cleanText = (value: unknown, fallback = "", maxLength = 420): string => {
      const text = String(value ?? fallback)
        .replace(/\s+/g, " ")
        .trim();
      return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
    };

    const rawFeedback = Array.isArray(parsed.feedback) ? parsed.feedback : [];

    // Guardrail: the UI needs feedback cards. If the model returns an empty array,
    // provide a few conservative defaults so the user never sees a blank section.
    const fallbackFeedback = [
      {
        title: "Set & posture",
        description: "Maintain tall posture and a stable core through the movement.",
        improvement: "Before you start, take a 'tall' breath, ribs down, and squeeze your core for 2 seconds.",
        severity: "info",
        bodyPart: "core",
        phase: "preparation",
        drillRecommendation: "Wall posture hold: back against wall, ribs down, hold 10 seconds x 3.",
      },
      {
        title: "Arms finish",
        description: "A strong arms-up finish helps control landings and shows confidence.",
        improvement: "Finish with arms by ears and hold your landing for a full 1 second.",
        severity: "info",
        bodyPart: "arms",
        phase: "finish",
        drillRecommendation: "Stick drill: jump to a 'freeze' landing on a line, hold 1 second x 8.",
      },
      {
        title: "Landing control",
        description: "Focus on landing softly with knees tracking over toes.",
        improvement: "Land quietly and keep knees aligned—no wobble—then stand tall.",
        severity: "warning",
        bodyPart: "legs",
        phase: "finish",
        drillRecommendation: "Panel-mat stick landings with a spotter nearby: 6 reps.",
      },
    ];

    const feedbackSource = rawFeedback.length >= 3 ? rawFeedback : fallbackFeedback;

    const feedback: FeedbackItem[] = feedbackSource.map((f: any) => ({
      id: randomUUID(),
      title: cleanText(f.title, "Coaching focus", 80),
      description: cleanText(f.description, "Focus on clean shape, control, and safe progressions.", 360),
      improvement: cleanText(f.improvement, "Try one controlled repetition with a clear start, tight body shape, and still finish.", 260),
      severity: normalizeSeverity(f.severity),
      bodyPart: cleanText(f.bodyPart, "", 40) || undefined,
      drillRecommendation: cleanText(f.drillRecommendation, "", 220) || undefined,
      phase: cleanText(f.phase, "", 40) || undefined,
    }));

    const validBadges = (parsed.awardedBadges || []).filter(
      (b: string) => badgeTypes.includes(b as BadgeType)
    ) as BadgeType[];

    return {
      overallScore: Math.max(0, Math.min(100, parsed.overallScore ?? 70)),
      summary: cleanText(parsed.summary, "Analysis complete.", 260),
      technicalBreakdown: cleanText(parsed.technicalBreakdown, "", 900),
      feedback,
      strengths:
        Array.isArray(parsed.strengths) && parsed.strengths.length
          ? parsed.strengths.map((s: unknown) => cleanText(s, "", 120)).filter(Boolean).slice(0, 8)
          : ["Good effort and confidence", "Nice commitment to the movement", "Strong intention on the finish"],
      safetyNotes: Array.isArray(parsed.safetyNotes)
        ? parsed.safetyNotes.map((s: unknown) => cleanText(s, "", 180)).filter(Boolean).slice(0, 5)
        : [],
      progressionTips: Array.isArray(parsed.progressionTips)
        ? parsed.progressionTips.map((s: unknown) => cleanText(s, "", 180)).filter(Boolean).slice(0, 6)
        : [],
      awardedBadges: validBadges,
    };
  } finally {
    cleanup(framesDir);
  }
}

export type ChallengeAnalysisOutput = {
  isMatch: boolean;
  detectedSkill: string;
  detectedSkillCandidates?: string[]; // up to 2 (more specific guesses)
  confidence: number; // 0..1
  score: number | null; // 0..100 when isMatch=true
  feedback: string;
};

/**
 * Challenge submissions need an eligibility gate. Without it, the model can
 * "anchor" on the challenge title and produce confident-but-wrong feedback
 * and scores for a different skill.
 */
export async function analyzeChallengeVideoFilePath(
  localVideoPath: string,
  sport: SportType,
  ctx: {
    challengeName: string;
    challengeInstructions?: string;
    targetSkillName?: string;
    targetSkillDescription?: string;
    targetSkillCategory?: string;
    targetSkillKeyPoints?: string[];
    targetSkillCommonMistakes?: string[];
  }
): Promise<ChallengeAnalysisOutput> {
  const { frames, framesDir } = await extractFramesFromFile(localVideoPath);

  if (!frames.length) {
    cleanup(framesDir);
    throw new Error("Could not extract frames");
  }

  try {
    const frameIndexes =
      frames.length <= 3
        ? frames.map((_, i) => i)
        : [0, Math.floor(frames.length / 2), frames.length - 1];

    const images = frameIndexes.map((i) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/jpeg;base64,${frames[i]}`,
        detail: "low" as const,
      },
    }));

    const openai = getOpenAI();

    const targetName = ctx.targetSkillName || ctx.challengeName;
    const targetDesc = ctx.targetSkillDescription || "";
    const instructions = ctx.challengeInstructions || "";

    const challengeRubricBlock = buildSkillRubricBlock({
      sport,
      skillName: targetName,
      category: ctx.targetSkillCategory ?? null,
      description: targetDesc || null,
      keyPoints: ctx.targetSkillKeyPoints ?? null,
      commonMistakes: ctx.targetSkillCommonMistakes ?? null,
    });

    const baseSystem =
      `You are a careful youth ${sport} challenge judge. ` +
      `Your first job is eligibility, not encouragement.\n\n` +
      `IMPORTANT: First identify what skill is actually shown from the frames. ` +
      `Do NOT assume the challenge skill was performed because of the title. ` +
      `If the camera angle or frames are unclear, lower confidence and be conservative.\n\n` +
      `Challenge skill to match exactly enough for eligibility: "${targetName}".\n` +
      (targetDesc ? `Skill description: ${targetDesc}\n` : "") +
      (instructions ? `Challenge instructions: ${instructions}\n` : "") +
      `\nSkill rubric (use this to judge phases/checkpoints):\n${challengeRubricBlock}\n\n` +
      `Return JSON ONLY with this schema:\n` +
      `{"isMatch": boolean, "detectedSkill": string, "detectedSkillCandidates": string[], "confidence": number, "score": number|null, "feedback": string}\n\n` +
      `Rules:\n` +
      `- Step A (Eligibility): Set detectedSkill + confidence (0..1). Decide isMatch vs the challenge skill using visible checkpoints.\n` +
      `- Provide detectedSkillCandidates (array of up to 2 strings) with your top 2 specific guesses.\n` +
      `- Set isMatch=false if the required skill is absent, only partially visible, too unclear to judge, or a different skill category.\n` +
      `- If isMatch=false: score MUST be null. Feedback must politely explain it is not eligible, name what was detected, and say what to upload instead.\n` +
      `- If isMatch=true: give a 0..100 score and short, specific, kid-friendly coaching feedback with one clear correction cue.\n` +
      `- Never praise the challenge skill if it was not performed.\n` +
      `- Do not give medical advice or safety clearance.\n` +
      `- Keep detectedSkill under 60 characters, candidates under 60 chars each, and feedback under 300 characters.`;

    const callModel = async (modelName: string, maxTokens: number) => {
  return await openai.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: baseSystem},
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Evaluate this weekly challenge submission using the rules. Return ONLY the JSON schema.`
          },
          ...images,
        ],
      },
    ],
    response_format: { type: "json_object" as const },
    max_completion_tokens: maxTokens,
  });
};

    // Extract JSON content from either `message.content` or (rarely) tool call arguments.
    const extractContent = (resp: any): string | null => {
      const msg = resp?.choices?.[0]?.message;
      const content = msg?.content;
      if (typeof content === "string" && content.trim().length) return content;
      const toolArgs = msg?.tool_calls?.[0]?.function?.arguments;
      if (typeof toolArgs === "string" && toolArgs.trim().length) return toolArgs;
      return null;
    };

    let response = await callModel("gpt-5", 1200);
let content = extractContent(response);

if (!content) {
  console.error("Empty AI response (gpt-5). finish_reason:", response?.choices?.[0]?.finish_reason);
  response = await callModel("gpt-5", 1200);
  content = extractContent(response);
}

if (!content) {
  console.error("Empty AI response again. Falling back to gpt-4.1");
  response = await callModel("gpt-4.1", 1200);
  content = extractContent(response);
}

if (!content) throw new Error("No AI response");
const parsed = JSON.parse(content);

    const isMatch = Boolean(parsed.isMatch);
    const detectedSkill = typeof parsed.detectedSkill === "string" ? parsed.detectedSkill : "Unknown";
    const detectedSkillCandidates = Array.isArray(parsed.detectedSkillCandidates)
      ? parsed.detectedSkillCandidates
          .filter((x: any) => typeof x === "string" && x.trim().length)
          .map((s: string) => s.trim())
          .slice(0, 2)
      : undefined;
    const confidenceRaw = Number(parsed.confidence);
    const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0.5;
    const scoreRaw = parsed.score === null || parsed.score === undefined ? null : Number(parsed.score);
    const score = isMatch && Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw as number))) : null;
    const feedback = typeof parsed.feedback === "string" && parsed.feedback.trim().length
      ? parsed.feedback.trim()
      : isMatch
        ? "Nice work! Keep practicing and aim for clean form."
        : `This looks like "${detectedSkill}", not the weekly challenge skill. Please re-upload the correct skill to enter.`;

    return { isMatch, detectedSkill, detectedSkillCandidates, confidence, score, feedback };
  } finally {
    cleanup(framesDir);
  }
}
