import { type NextRequest, NextResponse } from "next/server";
import { generateOpenApiDocument } from "trpc-to-openapi";
import { appRouter } from "~/server/api/root";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const openApiDocument = generateOpenApiDocument(appRouter, {
    title: "Tacta Workspace API",
    version: "1.0.0",
    baseUrl: `${origin}/api`,
  });

  return NextResponse.json(openApiDocument);
}
