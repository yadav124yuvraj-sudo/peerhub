-- CreateTable
CREATE TABLE "DoubtThread" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "askedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isSolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoubtThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoubtReply" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "repliedById" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAcceptedAnswer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoubtReply_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DoubtThread" ADD CONSTRAINT "DoubtThread_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubtThread" ADD CONSTRAINT "DoubtThread_askedById_fkey" FOREIGN KEY ("askedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubtReply" ADD CONSTRAINT "DoubtReply_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DoubtThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubtReply" ADD CONSTRAINT "DoubtReply_repliedById_fkey" FOREIGN KEY ("repliedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
