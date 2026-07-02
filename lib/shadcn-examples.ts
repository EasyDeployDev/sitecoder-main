import "server-only";
import dedent from "dedent";
import blog from "./examples/blog.json";
import calculator from "./examples/calculator.json";
import landing from "./examples/landing.json";
import pomodoro from "./examples/pomodoro.json";
import quiz from "./examples/quiz.json";

const deployedStack = dedent(`
The user wants a deployed stack template that keeps auth and todo behavior in one place while exposing it through Next.js-style actions and an Elysia-style route adapter.

This should be a small, deployment-friendly TypeScript package:

- shared database bootstrap
- centralized auth helpers
- todo CRUD in a service layer
- thin action and route adapters
- a single public export surface

\`\`\`ts{path=src/lib/server/types.ts}
export type AuthInput = { email: string; password: string };

export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
};

export type Todo = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  completed: boolean;
};

export type TodoInput = {
  title: string;
  description?: string;
};
\`\`\`

\`\`\`ts{path=src/lib/server/db/index.ts}
import { createDatabase, type NanoDatabase } from "nanodb-orm";
import { authPlugin, withAuth, type AuthEnabled } from "@nanodb-orm/plugin-auth";
import { schema } from "./schema.ts";

type AppDatabase = NanoDatabase<typeof schema>;
export type AuthDatabase = AuthEnabled<AppDatabase>;

let dbPromise: Promise<AuthDatabase> | null = null;

export async function getDb(): Promise<AuthDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await createDatabase({
        tables: schema,
        plugins: [authPlugin()],
      });
      return withAuth(db);
    })();
  }
  return dbPromise;
}
\`\`\`

\`\`\`ts{path=src/lib/server/auth.ts}
import { eq } from "nanodb-orm";
import type { AuthDatabase } from "./db/index.ts";
import type { AuthInput, User } from "./types.ts";
import { makeId } from "./utils/id.ts";

const CREDENTIAL_PROVIDER_ID = "credential";

export async function loginWithCredentials(
  db: AuthDatabase,
  input: AuthInput,
): Promise<{ sessionToken: string; user: User }> {
  const users = db.auth.tables.user;
  const accounts = db.auth.tables.account;
  const sessions = db.auth.tables.session;

  const email = db.auth.normalizeEmail(input.email);
  const foundUsers = await db.select().from(users).where(eq(users.email, email));
  let activeUser = foundUsers[0] ?? null;

  if (!activeUser) {
    const [createdUser] = await db.insert(users).values({
      id: makeId("usr"),
      email,
    }).returning();
    if (!createdUser) throw new Error("USER_CREATION_FAILED");
    activeUser = createdUser;

    await db.insert(accounts).values({
      id: makeId("acct"),
      userId: activeUser.id,
      providerId: CREDENTIAL_PROVIDER_ID,
      accountId: activeUser.id,
      password: input.password,
    });
  }

  const sessionRecord = db.auth.createSessionRecord(activeUser.id, {
    id: makeId("sess"),
  });
  const [session] = await db.insert(sessions).values(sessionRecord as Record<string, unknown>).returning();
  if (!session?.token) throw new Error("SESSION_TOKEN_NOT_CREATED");

  return { sessionToken: session.token, user: activeUser as User };
}

export async function requireAuthenticatedUser(db: AuthDatabase, sessionToken: string): Promise<User> {
  const token = sessionToken.trim();
  if (!token) throw new Error("UNAUTHORIZED");

  const sessions = db.auth.tables.session;
  const users = db.auth.tables.user;
  const sessionRows = await db.select().from(sessions).where(eq(sessions.token, token));
  const session = sessionRows[0] ?? null;
  if (!session || db.auth.isSessionExpired(session.expiresAt)) throw new Error("UNAUTHORIZED");

  const userRows = await db.select().from(users).where(eq(users.id, session.userId));
  const user = userRows[0] ?? null;
  if (!user) throw new Error("UNAUTHORIZED");

  return user as User;
}
\`\`\`

\`\`\`ts{path=src/lib/server/services/todo-service.ts}
import { eq } from "nanodb-orm";
import type { AuthDatabase } from "../db/index.ts";
import type { Todo, TodoInput } from "../types.ts";
import { makeId } from "../utils/id.ts";

export async function listTodos(db: AuthDatabase, userId: string): Promise<Todo[]> {
  const rows = await db.select().from(db.tables.todo).where(eq(db.tables.todo.userId, userId));
  return rows as Todo[];
}

export async function createTodo(db: AuthDatabase, userId: string, input: TodoInput): Promise<Todo> {
  const [todo] = await db.insert(db.tables.todo).values({
    id: makeId("todo"),
    userId,
    title: input.title,
    description: input.description ?? null,
    completed: false,
  }).returning();
  if (!todo) throw new Error("TODO_CREATE_FAILED");
  return todo as Todo;
}
\`\`\`

\`\`\`ts{path=src/lib/server/actions.ts}
import { getDb } from "./db/index.ts";
import { loginWithCredentials, requireAuthenticatedUser } from "./auth.ts";
import { createTodo, listTodos } from "./services/todo-service.ts";
import type { AuthInput, TodoInput } from "./types.ts";

export async function loginAction(input: AuthInput) {
  return loginWithCredentials(await getDb(), input);
}

export async function listTodosAction(sessionToken: string) {
  const db = await getDb();
  const user = await requireAuthenticatedUser(db, sessionToken);
  return listTodos(db, user.id);
}

export async function createTodoAction(sessionToken: string, input: TodoInput) {
  const db = await getDb();
  const user = await requireAuthenticatedUser(db, sessionToken);
  return createTodo(db, user.id, input);
}
\`\`\`

\`\`\`ts{path=src/app/api/[[...slugs]]/route.ts}
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { createTodoAction, listTodosAction, loginAction } from "@/lib/server/actions";

const app = new Elysia()
  .use(cors())
  .post("/login", async ({ body }) => loginAction(body as { email: string; password: string }))
  .get("/todos", async ({ headers }) => listTodosAction(String(headers.authorization ?? "")))
  .post("/todos", async ({ headers, body }) =>
    createTodoAction(String(headers.authorization ?? ""), body as { title: string; description?: string }),
  );

export const GET = (request: Request) => app.handle(request);
export const POST = (request: Request) => app.handle(request);
\`\`\`

\`\`\`ts{path=src/index.ts}
export * from "./lib/server/actions.ts";
export * from "./lib/server/auth.ts";
export * from "./lib/server/db/index.ts";
export * from "./lib/server/types.ts";
\`\`\`
`);

export const examples = {
  "landing page": {
    prompt:
      "Create a modern, responsive landing page for a fictional SaaS company",
    response: `
\`\`\`
${landing.content}
\`\`\`
`,
  },
  "blog app": {
    prompt: "make me a personal blog",
    response: `
The user wants me to create a personal blog using Next.js with several specific features:

Clean and modern design
About me page
Blog post archive
Contact form
Categories for travel, food, and technology
Responsive design
Commenting system

This is a complex multi-page application with different sections and features. Since this involves multiple distinct systems (blog posts, categories, contact form, commenting system), I should use the TodoManager to break this down into manageable tasks.
First, I should generate design inspiration since the user wants a "clean and modern design" but hasn't provided specific visual requirements. Then I'll search the repo to understand the codebase structure and create a systematic plan.

\`\`\`
${blog.content}
\`\`\`
    `,
  },
  "calculator app": {
    prompt: "make me a calculator app",
    response: dedent(`
The user wants me to build a Next.js calculator application with:

- Basic arithmetic operations (addition, subtraction, multiplication, division)
- User-friendly interface with clear display
- Buttons for each operation
- Decimal number support
- Clear input functionality
- Responsive design for desktop and mobile
- Keyboard shortcuts for enhanced usability
- Proper multi-file structure for maintainability

\`\`\`tsx{path=src/App.tsx}
import Calculator from "./components/Calculator";
import { ThemeProvider } from "./components/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="calculator-theme">
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Calculator />
      </div>
    </ThemeProvider>
  );
}
\`\`\`

\`\`\`tsx{path=src/components/Calculator.tsx}
${calculator.content}
\`\`\`

\`\`\`ts{path=src/types/calculator.ts}
export type Operation = "+" | "-" | "×" | "÷" | null;

export interface CalculatorState {
  displayValue: string;
  previousValue: number | null;
  operation: Operation;
  waitingForOperand: boolean;
}

export interface CalculatorButton {
  value: string;
  display: string;
  type: "digit" | "operation" | "function" | "equals";
  className?: string;
}
\`\`\`

\`\`\`ts{path=src/utils/calculator.ts}
import { CalculatorState, Operation } from "../types/calculator";

export const performOperation = (
  firstOperand: number,
  secondOperand: number,
  operation: Operation
): number => {
  switch (operation) {
    case "+":
      return firstOperand + secondOperand;
    case "-":
      return firstOperand - secondOperand;
    case "×":
      return firstOperand * secondOperand;
    case "÷":
      return firstOperand / secondOperand;
    default:
      return secondOperand;
  }
};

export const formatDisplay = (value: number): string => {
  // Format the display value to show up to 10 digits
  const stringValue = value.toString();
  if (stringValue.length > 10) {
    return value.toExponential(5);
  }
  return stringValue;
};
\`\`\`
    `),
  },
  "quiz app": {
    prompt:
      "Make me a quiz app about American history. Make sure to give the user an explanation on each question whether they got it right or wrong and keep a score going",
    response: dedent(`
The user wants me to create a quiz app about American history with the following requirements:

- Quiz questions about American history
- Show explanations for each question whether right or wrong
- Keep track of score
- Create a well-structured multi-file application

This is a straightforward app that should be organized into multiple files for better structure and maintainability. I'll create separate files for components, types, and utilities.

\`\`\`tsx{path=src/App.tsx}
${quiz.content.replace("export default function Quiz() {", 'import Quiz from "./components/Quiz";\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-gray-50 py-8">\n      <div className="container mx-auto px-4">\n        <Quiz />\n      </div>\n    </div>\n  );\n')}
\`\`\`

\`\`\`tsx{path=src/components/Quiz.tsx}
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
// ... rest of the quiz component code
\`\`\`

\`\`\`ts{path=src/types/quiz.ts}
export type Question = {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

export type QuizState = {
  currentQuestionIndex: number;
  score: number;
  answers: number[];
  showExplanation: boolean;
};
\`\`\`
      `),
  },
  "pomodoro timer": {
    prompt: "make a pomodoro timer",
    response: dedent(`
      I'll create a Pomodoro timer with adjustable focus and break times, along with a sound notification when the timer completes. Since no reference image/app was provided in your prompt, I'll create a clean and functional design with a proper multi-file structure.

\`\`\`tsx{path=src/App.tsx}
import PomodoroTimer from "./components/PomodoroTimer";
import { ThemeProvider } from "./components/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="pomodoro-theme">
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <PomodoroTimer />
      </div>
    </ThemeProvider>
  );
}
\`\`\`

\`\`\`tsx{path=src/components/PomodoroTimer.tsx}
${pomodoro.content}
\`\`\`

\`\`\`tsx{path=src/components/ThemeProvider.tsx}
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) as Theme : undefined) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
        
      root.classList.add(systemTheme);
      return;
    }
    
    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
    
  return context;
}
\`\`\`

\`\`\`ts{path=src/types/timer.ts}
export type TimerMode = "work" | "shortBreak" | "longBreak";

export interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
}

export interface TimerState {
  mode: TimerMode;
  timeLeft: number;
  isRunning: boolean;
  completedSessions: number;
}
\`\`\`
    `),
  },
  "deployed stack": {
    prompt:
      "Build a deployed stack template with shared auth and todo logic exposed through Next.js actions and an Elysia route adapter",
    response: deployedStack,
  },
};
