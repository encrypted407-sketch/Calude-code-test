-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Paper" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "examBoard" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "rawText" TEXT NOT NULL,
    "markSchemeRawText" TEXT,
    "isPreloaded" BOOLEAN NOT NULL DEFAULT false,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "mockDurationMins" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Paper_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paperId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "marksAvailable" INTEGER NOT NULL,
    "topic" TEXT,
    "yearRequired" INTEGER,
    "requiresDrawing" BOOLEAN NOT NULL DEFAULT false,
    "markSchemeText" TEXT,
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "sourceQuestionId" TEXT,
    CONSTRAINT "Question_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "Question" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "studentAnswerText" TEXT,
    "studentAnswerImageUrl" TEXT,
    "marksAwarded" INTEGER NOT NULL,
    "marksAvailable" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "improvementPoints" TEXT NOT NULL,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TopicMastery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "yearRequired" INTEGER,
    "strength" REAL NOT NULL DEFAULT 0,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL DEFAULT 2,
    "dueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timesReviewed" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ReviewSchedule_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "examBoard" TEXT NOT NULL,
    "topic" TEXT,
    "category" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "isPreloaded" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    CONSTRAINT "Flashcard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlashcardProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "easeFactor" REAL NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "dueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlashcardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FlashcardProgress_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "examBoard" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "label" TEXT,
    CONSTRAINT "ExamDate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Paper_userId_idx" ON "Paper"("userId");

-- CreateIndex
CREATE INDEX "Question_paperId_idx" ON "Question"("paperId");

-- CreateIndex
CREATE INDEX "Attempt_userId_idx" ON "Attempt"("userId");

-- CreateIndex
CREATE INDEX "Attempt_questionId_idx" ON "Attempt"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "TopicMastery_userId_subject_topic_key" ON "TopicMastery"("userId", "subject", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSchedule_questionId_key" ON "ReviewSchedule"("questionId");

-- CreateIndex
CREATE INDEX "ReviewSchedule_userId_idx" ON "ReviewSchedule"("userId");

-- CreateIndex
CREATE INDEX "Flashcard_subject_examBoard_idx" ON "Flashcard"("subject", "examBoard");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardProgress_userId_flashcardId_key" ON "FlashcardProgress"("userId", "flashcardId");

-- CreateIndex
CREATE INDEX "ExamDate_userId_idx" ON "ExamDate"("userId");
