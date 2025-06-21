import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createWorker } from "tesseract.js";

// 🛠️ Tool-calling handler
function handleToolCalling(message: string): any | null {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("time")) {
    const timeIST = new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    const dateIST = new Date().toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    return {
      role: "function",
      name: "getCurrentTime",
      content: `🕒 The current IST time is ${timeIST} on ${dateIST}.`,
    };
  }

  if (lowerMsg.includes("weather")) {
    return {
      role: "function",
      name: "getWeather",
      content: "🌤️ The weather in Hyderabad is 32°C, mostly sunny with light winds.",
    };
  }

  return null;
}

// 🔍 Simple RAG-style document fetcher
function retrieveRelevantDocs(msgs: any[]): string {
  const docs = [
    "How to use the chatbot",
    "Groq API Guide",
    "Common image use cases",
    "Helpful doc about multimodal AI",
  ];

  const lastMsg = msgs[msgs.length - 1]?.content?.toLowerCase() || "";

  return docs
    .filter((doc) =>
      doc.toLowerCase().split(" ").some((keyword) => lastMsg.includes(keyword))
    )
    .join("\n");
}

// 🧠 Main route handler
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const messagesStr = formData.get("messages") as string;
    const image = formData.get("file") as File | null;

    const messages: any[] = JSON.parse(messagesStr || "[]");
    let extractedText = "";

    // 🖼️ OCR Handling
    if (image) {
      try {
        if (!image.type.startsWith("image/")) {
          return NextResponse.json(
            { error: "Only image uploads are supported." },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await image.arrayBuffer());
        const tempPath = path.join(os.tmpdir(), `${Date.now()}-${image.name}`);
        await fs.writeFile(tempPath, buffer);

        const worker = await createWorker();
        await worker.load();
        await worker.loadLanguage("eng");
        await worker.initialize("eng");

        const {
          data: { text },
        } = await worker.recognize(tempPath);

        await worker.terminate();
        await fs.unlink(tempPath);

        extractedText = text.trim();
      } catch (ocrError) {
        console.error("OCR Error:", ocrError);
        extractedText = "";
      }

      messages.push({
        role: "user",
        content: extractedText
          ? `Text from image: ${extractedText}`
          : "Image uploaded but no text was detected.",
      });
    }

    // 🧩 Tool Calling
    const toolCall = handleToolCalling(messages[messages.length - 1]?.content || "");
    if (toolCall) {
      return NextResponse.json({
        reply: toolCall,
      });
    }

    // 📚 Add system context using RAG
    const context = retrieveRelevantDocs(messages);
    messages.unshift({
      role: "system",
      content: `Use this knowledge:\n${context}`,
    });

    // 🔑 GROQ API Integration
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ API key missing" }, { status: 500 });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      console.error("Groq API error:", errorText);
      return NextResponse.json(
        {
          reply: {
            role: "assistant",
            content: "⚠️ Groq API error. Please try again later.",
          },
        },
        { status: 500 }
      );
    }

    const groqData = await groqRes.json();
    const replyText = groqData?.choices?.[0]?.message?.content;

    if (!replyText) {
      console.error("No reply content:", groqData);
      throw new Error("Empty reply from model.");
    }

    return NextResponse.json({
      reply: { role: "assistant", content: replyText.trim() },
    });
  } catch (err) {
    console.error("Server Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
