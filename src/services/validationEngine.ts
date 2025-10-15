import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "../db";
import { validators, validations, warnings } from "../db/schema";
import { eq } from "drizzle-orm";

// Schema for the AI response
const validationResultSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(1)
    .describe("Score from 0 to 1 indicating quality"),
  reason: z.string().describe("Explanation of the score"),
  warnings: z
    .array(z.string())
    .describe("Array of warning messages if any issues found"),
});

type ValidationResult = z.infer<typeof validationResultSchema>;

type ValidationInput = {
  question: string;
  answer: string;
  sources?: Array<{ url: string; content: string }>;
};

async function getActiveValidators() {
  return await db.select().from(validators).where(eq(validators.active, true));
}

// Validation function
async function runValidation(
  validatorSystemPrompt: string,
  input: ValidationInput
): Promise<ValidationResult> {
  const userPrompt = `
Please evaluate the following LLM response:

**Question:** ${input.question}

**Answer:** ${input.answer}

${input.sources && input.sources.length > 0 ? `**Sources:**\n` : ""}
${
  input.sources && input.sources.length > 0
    ? input.sources
        .map(
          (s, i) => `
Source ${i + 1} (${s.url}):
${s.content}
`
        )
        .join("\n")
    : ""
}

Provide a score from 0 to 1, a detailed reason for your evaluation, and any warnings.
`.trim();

  try {
    const result = await generateObject({
      model: openai("gpt-5-nano"),
      system: validatorSystemPrompt,
      prompt: userPrompt,
      schema: validationResultSchema,
    });

    return result.object;
  } catch (error) {
    console.error("Validation error:", error);
    return {
      score: 0,
      reason: `Validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      warnings: ["Validator execution failed"],
    };
  }
}

async function saveValidationResult(
  logId: string,
  validatorId: string,
  result: ValidationResult
) {
  const [validation] = await db
    .insert(validations)
    .values({
      logId,
      validatorId,
      score: result.score.toFixed(2),
      reason: result.reason,
    })
    .returning();

  if (result.warnings.length > 0) {
    await db.insert(warnings).values(
      result.warnings.map((warning) => ({
        validationId: validation.id,
        warning,
      }))
    );
  }
}

export async function runValidationEngine(
  logId: string,
  input: ValidationInput
) {
  try {
    const activeValidators = await getActiveValidators();

    if (activeValidators.length === 0) {
      console.warn("No active validators found");
      return;
    }

    const validationPromises = activeValidators.map(async (validator) => {
      try {
        const result = await runValidation(validator.systemPrompt, input);
        await saveValidationResult(logId, validator.id, result);
        console.log(
          `Completed validation: ${validator.name} (score: ${result.score})`
        );
      } catch (error) {
        console.error(`Failed to run validator ${validator.name}:`, error);
      }
    });

    await Promise.all(validationPromises);
    console.log(`Validation complete for log ${logId}`);
  } catch (error) {
    console.error("Validation engine error:", error);
  }
}
