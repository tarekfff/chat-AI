import { NextRequest, NextResponse } from "next/server";
import formidable from "formidable";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get("message") as string;
    const file = formData.get("file") as File;

    let aiResponse = "";

    // Handle text message
    if (message) {
      aiResponse += `👋 لقد أرسلت: ${message}`;
    }

    // Handle file upload
    if (file && file.name !== "undefined") {
      if (aiResponse) aiResponse += " | ";
      aiResponse += `📂 استلمت الملف: ${file.name}`;
    }

    // If neither message nor file was provided
    if (!message && (!file || file.name === "undefined")) {
      return NextResponse.json({ error: "No message or file provided" }, { status: 400 });
    }

    return NextResponse.json({ reply: aiResponse });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}