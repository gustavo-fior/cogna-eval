import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const validators = pgTable("validators", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  active: boolean("active").notNull().default(true),
  systemPrompt: text("system_prompt").notNull(), // Basically the validator's mission (e.g. ensure factuality...)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: timestamp("date").notNull().defaultNow(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
});

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  content: text("content").notNull(),
  logId: uuid("log_id")
    .notNull()
    .references(() => logs.id, { onDelete: "cascade" }),
});

export const validations = pgTable("validations", {
  id: uuid("id").primaryKey().defaultRandom(),
  score: numeric("score", { precision: 3, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  logId: uuid("log_id")
    .notNull()
    .references(() => logs.id, { onDelete: "cascade" }),
  validatorId: uuid("validator_id")
    .notNull()
    .references(() => validators.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const warnings = pgTable("warnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  warning: text("warning").notNull(),
  validationId: uuid("validation_id")
    .notNull()
    .references(() => validations.id, { onDelete: "cascade" }),
});

export const logsRelations = relations(logs, ({ many }) => ({
  sources: many(sources),
  validations: many(validations),
}));

export const sourcesRelations = relations(sources, ({ one }) => ({
  log: one(logs, {
    fields: [sources.logId],
    references: [logs.id],
  }),
}));

export const validatorsRelations = relations(validators, ({ many }) => ({
  validations: many(validations),
}));

export const validationsRelations = relations(validations, ({ one, many }) => ({
  log: one(logs, {
    fields: [validations.logId],
    references: [logs.id],
  }),
  validator: one(validators, {
    fields: [validations.validatorId],
    references: [validators.id],
  }),
  warnings: many(warnings),
}));

export const warningsRelations = relations(warnings, ({ one }) => ({
  validation: one(validations, {
    fields: [warnings.validationId],
    references: [validations.id],
  }),
}));
