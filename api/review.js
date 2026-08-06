import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const criteria = [
  ["hook", "Strong hook", "Opens with curiosity, a question, a vivid comparison, or a genuine personal reaction rather than a generic sponsor announcement."],
  ["reframe", "Clear product reframe", "Positions The Book as more than an ordinary book: an artifact, art object, collector’s piece, or unusual intellectual experience."],
  ["concept", "Clear concept explanation", "Quickly explains what the book is and what rebuilding civilization means in practical terms."],
  ["demo", "Physical demonstration", "Clearly plans to show the cover, size, pages, illustrations, or physical quality of the book."],
  ["specific", "Specific page or topic", "Includes a real spread, page, chapter, or subject rather than speaking only in generalities."],
  ["personal", "Personal experience", "Includes a specific reaction, behavior, surprise, favorite section, purchase, or gift experience."],
  ["premium", "Premium visual value", "Makes the book feel substantial, beautiful, display-worthy, and physically desirable."],
  ["curiosity", "Curiosity and exploration", "Sells discovery, rabbit holes, returning to the book, or losing track of time."],
  ["quest", "Hidden quest and mystery", "Uses the hidden quest to create a curiosity gap without spoiling it."],
  ["proof", "Natural social proof", "Uses crowdfunding success, bestseller status, or the team naturally rather than as a dry statistics list."],
  ["audience", "Clear audience or gift use case", "Identifies the kind of curious person who would enjoy the book or receive it as a memorable gift."],
  ["cta", "Soft, clear CTA", "Includes the link, code, or discount and remains natural rather than aggressive."]
];

const reviewSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overall_score",
    "top_performer_fit",
    "naturalness_score",
    "selling_strength",
    "structure_score",
    "summary",
    "evaluations",
    "manager_feedback",
    "creator_feedback",
    "rewrites"
  ],
  properties: {
    overall_score: { type: "integer", minimum: 0, maximum: 100 },
    top_performer_fit: { type: "integer", minimum: 0, maximum: 100 },
    naturalness_score: { type: "integer", minimum: 0, maximum: 100 },
    selling_strength: { type: "integer", minimum: 0, maximum: 100 },
    structure_score: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    evaluations: {
      type: "array",
      minItems: 12,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id","title","description","present","score","evidence","reason","suggestions"],
        properties: {
          id: { type: "string", enum: criteria.map(([id]) => id) },
          title: { type: "string" },
          description: { type: "string" },
          present: { type: "boolean" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          evidence: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
          suggestions: { type: "array", items: { type: "string" } }
        }
      }
    },
    manager_feedback: { type: "string" },
    creator_feedback: { type: "string" },
    rewrites: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["area","before","after","why"],
        properties: {
          area: { type: "string" },
          before: { type: "string" },
          after: { type: "string" },
          why: { type: "string" }
        }
      }
    }
  }
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "the-book-ai-reviewer",
      model: "gpt-5-mini",
      api_key_configured: Boolean(process.env.OPENAI_API_KEY)
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured in Vercel."
    });
  }

  const script = req.body?.script;
  if (!script || typeof script !== "string" || !script.trim()) {
    return res.status(400).json({ error: "Please provide a creator script." });
  }

  if (script.length > 30000) {
    return res.status(400).json({ error: "The script is too long. Maximum: 30,000 characters." });
  }

  const rubric = criteria
    .map(([id, title, description], index) => `${index + 1}. ${id} — ${title}: ${description}`)
    .join("\n");

  const instructions = `You are an expert influencer marketing script reviewer for Hungry Minds.

Review a YouTube sponsorship script for The Book: The Ultimate Guide to Rebuilding a Civilization.

Evaluate these exact criteria in this exact order:
${rubric}

Rules:
- Be strict and evidence-based.
- Do not mark a criterion present because of a vague adjacent idea.
- Quote only short evidence fragments from the submitted script.
- Use 0–100 integer scores.
- For every missing or weak criterion, give one or two natural phrase suggestions.
- Naturalness should penalize corporate wording, feature dumping, repeated superlatives, and lines that do not sound like a creator.
- Selling strength should reward emotional ownership, concrete demonstration, curiosity, specificity, personal experience, and a clear CTA.
- Structure should assess: hook → reframe/concept → demonstration → personal reaction/value → proof/audience → CTA.
- Top-performer fit measures similarity to the successful script framework. It is not a revenue forecast.
- Create a concise internal manager review with strengths, risks, and an approval recommendation.
- Create polite creator-facing feedback that is specific and easy to act on.
- Provide up to five targeted rewrites of weak passages. Preserve the creator's voice and do not rewrite the entire script.
- Above 80 means ready to approve; 51–80 means revision required; 50 or below means rewrite required.`;

  try {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      store: false,
      instructions,
      input: script,
      text: {
        format: {
          type: "json_schema",
          name: "script_review",
          strict: true,
          schema: reviewSchema
        }
      }
    });

    if (!response.output_text) {
      return res.status(502).json({
        error: "The model returned no review."
      });
    }

    const review = JSON.parse(response.output_text);
    return res.status(200).json(review);
  } catch (error) {
    console.error("Review error:", error);

    const status = error?.status || 500;
    let message = "The AI review failed.";

    if (status === 401) message = "The OpenAI API key is invalid.";
    else if (status === 429) message = "The OpenAI API limit or billing quota has been reached.";
    else if (status === 400) message = "OpenAI rejected the review request. Check the deployment logs for details.";

    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: message,
      details: process.env.NODE_ENV === "development" ? String(error?.message || error) : undefined
    });
  }
}
