import { NextResponse } from "next/server";
import { db } from "@/configs";
import { userResponses } from "@/configs/schema";
import { eq } from "drizzle-orm";

// Serves a file that was submitted through a form. Files are stored inline as
// base64 data URLs in the response JSON; this decodes and streams one back so
// it can be opened from a Google Sheet link, email, etc.
export async function GET(req, { params }) {
  const { id, field } = params;

  const rows = await db
    .select()
    .from(userResponses)
    .where(eq(userResponses.id, Number(id)));
  const resp = rows[0];
  if (!resp) return new NextResponse("Not found", { status: 404 });

  let data = {};
  try {
    data = JSON.parse(resp.jsonResponse);
  } catch (e) {
    return new NextResponse("Invalid response", { status: 400 });
  }

  const file = data[decodeURIComponent(field)];
  if (!file || typeof file !== "object" || !file.dataUrl) {
    return new NextResponse("No file for this field", { status: 404 });
  }

  const match = /^data:([^;]+);base64,(.*)$/s.exec(file.dataUrl);
  if (!match) return new NextResponse("Unsupported file", { status: 400 });

  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const safeName = String(file.name || "file").replace(/[\r\n"]/g, "");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${safeName}"`,
    },
  });
}
