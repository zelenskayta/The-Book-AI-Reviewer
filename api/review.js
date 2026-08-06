const CRITERIA = [

  {

    id: "hook",

    title: "Strong hook",

    description:

      "Opens with curiosity, a question, a vivid comparison, or a genuine personal reaction rather than a generic sponsor announcement."

  },

  {

    id: "reframe",

    title: "Clear product reframe",

    description:

      "Positions The Book as more than an ordinary book: an artifact, art object, collector’s piece, or unusual intellectual experience."

  },

  {

    id: "concept",

    title: "Clear concept explanation",

    description:

      "Quickly explains what the book is and what rebuilding civilization means in practical terms."

  },

  {

    id: "demo",

    title: "Physical demonstration",

    description:

      "Clearly plans to show the cover, size, pages, illustrations, or physical quality of the book."

  },

  {

    id: "specific",

    title: "Specific page or topic",

    description:

      "Includes a real spread, page, chapter, or subject rather than speaking only in generalities."

  },

  {

    id: "personal",

    title: "Personal experience",

    description:

      "Includes a specific reaction, behavior, surprise, favorite section, purchase, or gift experience."

  },

  {

    id: "premium",

    title: "Premium visual value",

    description:

      "Makes the book feel substantial, beautiful, display-worthy, and physically desirable."

  },

  {

    id: "curiosity",

    title: "Curiosity and exploration",

    description:

      "Sells discovery, rabbit holes, returning to the book, or losing track of time."

  },

  {

    id: "quest",

    title: "Hidden quest and mystery",

    description:

      "Uses the hidden quest to create a curiosity gap without spoiling it."

  },

  {

    id: "proof",

    title: "Natural social proof",

    description:

      "Uses crowdfunding success, bestseller status, or the team naturally rather than as a dry statistics list."

  },

  {

    id: "audience",

    title: "Clear audience or gift use case",

    description:

      "Identifies the kind of curious person who would enjoy the book or receive it as a memorable gift."

  },

  {

    id: "cta",

    title: "Soft, clear CTA",

    description:

      "Includes the link, code, or discount and remains natural rather than aggressive."

  }

];

const REVIEW_SCHEMA = {

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

    overall_score: {

      type: "integer",

      minimum: 0,

      maximum: 100

    },

    top_performer_fit: {

      type: "integer",

      minimum: 0,

      maximum: 100

    },

    naturalness_score: {

      type: "integer",

      minimum: 0,

      maximum: 100

    },

    selling_strength: {

      type: "integer",

      minimum: 0,

      maximum: 100

    },

    structure_score: {

      type: "integer",

      minimum: 0,

      maximum: 100

    },

    summary: {

      type: "string"

    },

    evaluations: {

      type: "array",

      minItems: 12,

      maxItems: 12,

      items: {

        type: "object",

        additionalProperties: false,

        required: [

          "id",

          "title",

          "description",

          "present",

          "score",

          "evidence",

          "reason",

          "suggestions"

        ],

        properties: {

          id: {

            type: "string",

            enum: CRITERIA.map((criterion) => criterion.id)

          },

          title: {

            type: "string"

          },

          description: {

            type: "string"

          },

          present: {

            type: "boolean"

          },

          score: {

            type: "integer",

            minimum: 0,

            maximum: 100

          },

          evidence: {

            type: "array",

            items: {

              type: "string"

            }

          },

          reason: {

            type: "string"

          },

          suggestions: {

            type: "array",

            items: {

              type: "string"

            }

          }

        }

      }

    },

    manager_feedback: {

      type: "string"

    },

    creator_feedback: {

      type: "string"

    },

    rewrites: {

      type: "array",

      maxItems: 5,

      items: {

        type: "object",

        additionalProperties: false,

        required: ["area", "before", "after", "why"],

        properties: {

          area: {

            type: "string"

          },

          before: {

            type: "string"

          },

          after: {

            type: "string"

          },

          why: {

            type: "string"

          }

        }

      }

    }

  }

};

function getOutputText(responseData) {

  if (

    typeof responseData.output_text === "string" &&

    responseData.output_text.trim()

  ) {

    return responseData.output_text;

  }

  const textParts = [];

  for (const outputItem of responseData.output || []) {

    for (const contentItem of outputItem.content || []) {

      if (

        contentItem.type === "output_text" &&

        typeof contentItem.text === "string"

      ) {

        textParts.push(contentItem.text);

      }

    }

  }

  return textParts.join("");

}

export default async function handler(req, res) {

  res.setHeader("Content-Type", "application/json; charset=utf-8");

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

    return res.status(405).json({

      error: "Method not allowed."

    });

  }

  if (!process.env.OPENAI_API_KEY) {

    return res.status(500).json({

      error: "OPENAI_API_KEY is not configured in Vercel."

    });

  }

  let script = req.body?.script;

  if (typeof req.body === "string") {

    try {

      script = JSON.parse(req.body)?.script;

    } catch {

      return res.status(400).json({

        error: "The request body is not valid JSON."

      });

    }

  }

  if (!script || typeof script !== "string" || !script.trim()) {

    return res.status(400).json({

      error: "Please provide a creator script."

    });

  }

  if (script.length > 30000) {

    return res.status(400).json({

      error: "The script is too long. Maximum: 30,000 characters."

    });

  }

  const rubric = CRITERIA.map(

    (criterion, index) =>

      `${index + 1}. ${criterion.id} — ${criterion.title}: ${

        criterion.description

      }`

  ).join("\n");

  const instructions = `

You are an expert influencer marketing script reviewer for Hungry Minds.

Review a YouTube sponsorship script for:

The Book: The Ultimate Guide to Rebuilding a Civilization.

Evaluate these exact criteria in this exact order:

${rubric}

Rules:

- Be strict and evidence-based.

- Do not mark a criterion present because of a vague or adjacent idea.

- Quote only short evidence fragments from the submitted script.

- Use integer scores from 0 to 100.

- Keep evaluations in the exact order shown above.

- For every missing or weak criterion, provide one or two natural phrase suggestions.

- Suggestions should sound like creator language, not corporate copy.

- Naturalness should penalize feature dumping, repeated superlatives, stiff wording, and lines that do not sound like the creator.

- Selling strength should reward emotional ownership, concrete demonstration, curiosity, specificity, personal experience, and a clear CTA.

- Structure should assess this sequence:

  hook → reframe/concept → demonstration → personal reaction/value → social proof/audience → CTA.

- Top-performer fit measures similarity to the successful script framework. It is not a revenue prediction.

- Create a concise internal manager review containing strengths, risks, and an approval recommendation.

- Create polite creator-facing feedback that is specific and easy to implement.

- Provide up to five targeted rewrites of weak passages.

- Preserve the creator’s voice.

- Do not rewrite the entire script.

- Above 80 means ready to approve.

- 51–80 means revision required.

- 50 or below means rewrite required.

`.trim();

  try {

    const openAIResponse = await fetch(

      "https://api.openai.com/v1/responses",

      {

        method: "POST",

        headers: {

          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,

          "Content-Type": "application/json"

        },

        body: JSON.stringify({

          model: "gpt-5-mini",

          store: false,

          instructions,

          input: script,

          text: {

            format: {

              type: "json_schema",

              name: "script_review",

              strict: true,

              schema: REVIEW_SCHEMA

            }

          }

        })

      }

    );

    const rawResponse = await openAIResponse.text();

    if (!openAIResponse.ok) {

      console.error(

        "OpenAI error:",

        openAIResponse.status,

        rawResponse

      );

      let openAIError;

      try {

        openAIError = JSON.parse(rawResponse);

      } catch {

        openAIError = null;

      }

      const actualMessage =

        openAIError?.error?.message ||

        `OpenAI returned HTTP ${openAIResponse.status}.`;

      let publicMessage = "The AI review failed.";

      if (openAIResponse.status === 401) {

        publicMessage = "The OpenAI API key is invalid.";

      } else if (openAIResponse.status === 429) {

        publicMessage =

          "The OpenAI API billing quota or request limit has been reached.";

      } else if (openAIResponse.status === 400) {

        publicMessage =

          `OpenAI rejected the review request: ${actualMessage}`;

      } else if (openAIResponse.status === 404) {

        publicMessage =

          "The selected OpenAI model is unavailable for this API project.";

      }

      return res.status(502).json({

        error: publicMessage,

        details: actualMessage

      });

    }

    let responseData;

    try {

      responseData = JSON.parse(rawResponse);

    } catch {

      console.error("Invalid OpenAI HTTP response:", rawResponse);

      return res.status(502).json({

        error: "OpenAI returned an invalid response."

      });

    }

    const outputText = getOutputText(responseData);

    if (!outputText) {

      console.error(

        "No output text in OpenAI response:",

        JSON.stringify(responseData)

      );

      return res.status(502).json({

        error: "The model returned no usable review."

      });

    }

    let review;

    try {

      review = JSON.parse(outputText);

    } catch {

      console.error("Invalid model JSON:", outputText);

      return res.status(502).json({

        error: "The model returned an invalid review format."

      });

    }

    return res.status(200).json(review);

  } catch (error) {

    console.error("Server error:", error);

    return res.status(500).json({

      error: "A server error occurred while creating the review.",

      details:

        error instanceof Error

          ? error.message

          : String(error)

    });

  }

}
