import { Hono } from "hono";
import { z } from "zod";
import { db } from "./db";
import { logs, sources } from "./db/schema";
import { runValidationEngine } from "./services/validationEngine";

const app = new Hono();

const evaluateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  answer: z.string().min(1, "Answer is required"),
  sources: z
    .array(
      z.object({
        url: z.url("Invalid URL format"),
        content: z.string().min(1, "Source content is required"),
      })
    )
    .optional(),
});

app.post("/evaluate", async (c) => {
  try {
    const body = await c.req.json();
    const validation = evaluateRequestSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: "Validation error",
          details: validation.error.issues,
        },
        400
      );
    }

    const { prompt, answer, sources: sourcesData } = validation.data;

    // Creating log entry
    const [log] = await db
      .insert(logs)
      .values({
        question: prompt,
        answer: answer,
      })
      .returning();

    // Creating sources if they exist
    if (sourcesData && sourcesData.length > 0) {
      await db.insert(sources).values(
        sourcesData.map((source) => ({
          url: source.url,
          content: source.content,
          logId: log.id,
        }))
      );
    }

    // Trigger async validation engine
    runValidationEngine(log.id, {
      question: prompt,
      answer: answer,
      sources: sourcesData,
    }).catch((error) => {
      console.error("Async validation error:", error);
    });

    // Return immediately with log ID
    return c.json(
      {
        success: true,
        logId: log.id,
      },
      200
    );
  } catch (error) {
    console.error("Evaluation endpoint error:", error);
    return c.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default app;
