export const MODEL_ALIASES: Record<string, string> = {};

export function resolveModel(model: string): string {
  return MODEL_ALIASES[model] ?? model;
}

export const DEFAULT_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";
export const CODER_LABEL = "Coder";

/** Text-only coder model — skip vision API calls for screenshot uploads. */
export function modelSupportsVision(model: string): boolean {
  const id = model.toLowerCase();
  return (
    id.includes("vision") ||
    id.includes("gpt-4o") ||
    id.includes("claude-3") ||
    id.includes("kimi") ||
    id.includes("llava")
  );
}

export const SUGGESTED_PROMPTS = [
  {
    title: "Kanban Board",
    description:
      "Create a Kanban-style project board with columns for To Do, In Progress, and Done. Let users add, edit, and drag tasks between columns. Include task labels, due dates, and a clean minimal design.",
  },
  {
    title: "Landing Page",
    description:
      "Build a modern landing page for an AI startup with a bold hero section, an animated feature grid, a pricing table with three tiers, a testimonials carousel, and a waitlist signup form. Use smooth scroll animations and a sleek dark theme.",
  },
  {
    title: "Habit Tracker",
    description:
      "Build a daily habit tracker where I can add habits and check them off each day. Show a weekly streak view with a heatmap-style grid, track completion percentages, and celebrate streaks with animations.",
  },
  {
    title: "Expense Tracker",
    description:
      "Make a personal expense tracker where I can log expenses with categories like food, transport, and entertainment. Show a monthly breakdown with interactive pie and bar charts, and a running total.",
  },
  {
    title: "Workout Timer",
    description:
      "Make an interval workout timer for HIIT training. Let me configure work and rest durations, number of rounds, and exercises. Show a large countdown display with color changes for work vs rest, and play a sound when switching.",
  },
  {
    title: "Calculator",
    description:
      "Make a beautiful scientific calculator with a history panel that shows past calculations. Support basic arithmetic, percentages, parentheses, and common functions like square root and exponents. Style it with a modern glassmorphism design.",
  },
  {
    title: "Deployed Stack",
    description:
      "Build a deployed stack template with shared auth and todo logic exposed through Next.js actions and an Elysia route adapter. Include email/password login, current-user todo CRUD, and a clean package layout for deployment.",
  },
];
