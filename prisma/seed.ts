import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a demo note to show the UI structure
  const note = await prisma.audioNote.create({
    data: {
      title: "Demo: Build a REST API",
      originalFileName: "demo-note.webm",
      audioPath: "./uploads/demo.webm",
      mimeType: "audio/webm",
      durationSeconds: 45,
      status: "prompt_generated",
    },
  });

  await prisma.transcript.create({
    data: {
      audioNoteId: note.id,
      rawText:
        "I want to build a REST API for a task management app. It should have CRUD endpoints for tasks with title, description, status, and due date. Use Node.js with Express and PostgreSQL. Include authentication with JWT tokens and rate limiting.",
      cleanedText:
        "Build a REST API for a task management application. The API should provide CRUD endpoints for tasks, each with a title, description, status, and due date. Use Node.js with Express and PostgreSQL for the backend. Include JWT-based authentication and rate limiting.",
      transcriptionProvider: "openai-whisper",
      language: "en",
    },
  });

  const artifact = await prisma.promptArtifact.create({
    data: {
      audioNoteId: note.id,
      engineeringSummary:
        "Build a production-ready REST API for task management with full CRUD, JWT auth, and rate limiting using Node.js/Express and PostgreSQL.",
      detectedIntent: "Create a complete task management API backend",
      techStack: ["Node.js", "Express", "PostgreSQL", "JWT", "bcrypt"],
      functionalRequirements: [
        "CRUD endpoints for tasks (create, read, update, delete)",
        "Task fields: title, description, status, due date",
        "User authentication with JWT tokens",
        "Protected routes requiring authentication",
        "Task filtering by status and due date",
      ],
      nonFunctionalRequirements: [
        "Rate limiting on API endpoints",
        "Input validation and sanitization",
        "Proper error handling with consistent error format",
        "Database connection pooling",
      ],
      assumptions: [
        "Single-user MVP — no team/workspace features",
        "Status values: todo, in_progress, done",
        "No file attachments on tasks",
      ],
      risks: [
        "No mention of pagination — will assume cursor-based pagination",
        "No specific rate limit values — will use sensible defaults",
      ],
      acceptanceCriteria: [
        "All CRUD endpoints return proper HTTP status codes",
        "JWT authentication works for signup and login",
        "Protected endpoints reject unauthenticated requests",
        "Rate limiting returns 429 when exceeded",
      ],
      finalClaudePrompt:
        "Build a REST API for a task management application using Node.js, Express, and PostgreSQL.\n\nRequirements:\n1. CRUD endpoints for tasks: POST /tasks, GET /tasks, GET /tasks/:id, PUT /tasks/:id, DELETE /tasks/:id\n2. Task schema: id, title (required), description, status (todo|in_progress|done), due_date, created_at, updated_at\n3. JWT authentication: POST /auth/signup, POST /auth/login\n4. All task endpoints require authentication\n5. Rate limiting: 100 requests per 15 minutes per IP\n6. Input validation using a validation library\n7. Proper error handling with consistent JSON error format\n\nTech stack: Express, pg (node-postgres), jsonwebtoken, bcrypt, express-rate-limit, joi or zod for validation.\n\nInclude:\n- Project setup with package.json\n- Database migration SQL\n- Environment variable configuration\n- Clear folder structure (routes, controllers, middleware, models)\n- Basic tests for auth and task endpoints",
      openaiModel: "gpt-4o",
    },
  });

  await prisma.claudeRun.create({
    data: {
      audioNoteId: note.id,
      promptArtifactId: artifact.id,
      requestPrompt: artifact.finalClaudePrompt,
      responseText: "// Demo: Claude would generate the full implementation here.\n// This is seed data to demonstrate the UI.",
      anthropicModel: "claude-sonnet-4-20250514",
      status: "completed",
    },
  });

  console.log(`Created demo note: ${note.id}`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
