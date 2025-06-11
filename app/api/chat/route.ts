import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createWorker } from "tesseract.js";

// Function to simulate tool calling
function handleToolCalling(message: string): any | null {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("time")) {
    return {
      role: "function",
      name: "getCurrentTime",
      content: `🕒 The current time is ${new Date().toLocaleTimeString()}`,
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

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const messagesStr = formData.get("messages") as string;
    const image = formData.get("image") as File | null;

    const messages: any[] = JSON.parse(messagesStr || "[]");
    let extractedText = "";

    // ✅ OCR handling if image uploaded
    if (image) {
      try {
        const buffer = Buffer.from(await image.arrayBuffer());
        const tempPath = path.join(os.tmpdir(), `${Date.now()}-${image.name}`);
        await fs.writeFile(tempPath, buffer);

        const worker = await createWorker({
          workerPath: require.resolve("tesseract.js/src/worker-script/node/index.js"),
          corePath: require.resolve("tesseract.js-core/tesseract-core.wasm.js"),
          langPath: path.resolve("node_modules", "tesseract.js-core", "lang"),
        });

        await worker.load();
        await worker.loadLanguage("eng");
        await worker.initialize("eng");

        const { data: { text } } = await worker.recognize(tempPath);
        await worker.terminate();
        extractedText = text.trim();
        await fs.unlink(tempPath);
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

    // Tool calling
    const toolCall = handleToolCalling(messages[messages.length - 1]?.content || "");
    if (toolCall) {
      return NextResponse.json({
        reply: toolCall,
      });
    }

    //  Fake RAG context retrieval
    function retrieveRelevantDocs(msgs: any[]): string {
      const docs = [
        "How to use the chatbot",
        "Groq API Guide",
        "Common image use cases",
        "Helpful doc about multimodal AI",
      ];
      const last = msgs[msgs.length - 1]?.content?.toLowerCase() || "";
      return docs.filter((d) => d.toLowerCase().includes(last)).join("\n");
    }

    const context = retrieveRelevantDocs(messages);
    messages.unshift({
      role: "system",
      content: `Use this knowledge:\n${context}`,
    });

    // GROQ call
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
      console.error("Groq API error:", await groqRes.text());
      return NextResponse.json({
        reply: { role: "assistant", content: "❌ Groq API error. Try again later." },
      });
    }

    const groqData = await groqRes.json();
    const replyText = groqData?.choices?.[0]?.message?.content;

    if (!replyText) {
      console.error("No reply content:", groqData);
      throw new Error("Empty reply");
    }

    return NextResponse.json({
      reply: { role: "assistant", content: replyText.trim() },
    });
  } catch (err) {
    console.error("Server Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
