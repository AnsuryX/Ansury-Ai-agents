import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

app.use(express.json());

// --- API Routes ---

// WhatsApp Webhook Verification
app.get("/api/webhook/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// --- AI Logic & Multi-Agent Engine ---

async function getAgentResponse(whatsappNumber: string, userMessage: string) {
  try {
    // 1. Fetch thread and agent type from Supabase
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("*")
      .eq("whatsapp_number", whatsappNumber)
      .single();

    let agentType = "support";
    let history = [];

    if (thread) {
      agentType = thread.agent_type;
      history = thread.history || [];
    } else {
      // Create new thread if not exists
      await supabase.from("threads").insert({
        whatsapp_number: whatsappNumber,
        agent_type: "support",
        history: [],
      });
    }

    // 2. Get system prompt based on agent type
    const { data: settings } = await supabase.from("settings").select("*").eq("key", "prompts").single();
    const prompts = settings?.value || {
      sales: "You are a persuasive sales agent...",
      marketing: "You are a creative marketing expert...",
      support: "You are a helpful customer support agent...",
    };

    const systemInstruction = prompts[agentType] || prompts.support;

    // 3. Define Booking Tool (Function Calling)
    const bookingTool = {
      name: "book_meeting",
      description: "Book a meeting with a sales representative.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: "The date for the meeting (YYYY-MM-DD)" },
          time: { type: Type.STRING, description: "The time for the meeting (HH:MM)" },
          email: { type: Type.STRING, description: "The user's email address" },
        },
        required: ["date", "time", "email"],
      },
    };

    // 4. Call Gemini
    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        ...history.map((h: any) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        })),
        { role: "user", parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [bookingTool] }],
      },
    });

    const text = response.text;

    // 5. Handle Function Calls
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (call.name === "book_meeting") {
          const args = call.args as any;
          console.log(`Booking meeting for ${args.email} on ${args.date} at ${args.time}`);
          
          // Respond to the function call
          const response2 = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [
              ...history.map((h: any) => ({
                role: h.role === "user" ? "user" : "model",
                parts: [{ text: h.text }],
              })),
              { role: "user", parts: [{ text: userMessage }] },
              { role: "model", parts: [{ functionCall: call }] },
              { role: "user", parts: [{ functionResponse: { name: "book_meeting", response: { content: `Meeting booked successfully for ${args.date} at ${args.time}.` } } }] }
            ],
            config: { systemInstruction }
          });
          return response2.text;
        }
      }
    }

    // 6. Update History in Supabase
    const updatedHistory = [...history, { role: "user", text: userMessage }, { role: "model", text }];
    await supabase
      .from("threads")
      .update({ history: updatedHistory })
      .eq("whatsapp_number", whatsappNumber);

    return text;
  } catch (error) {
    console.error("Error in AI Engine:", error);
    return "I'm sorry, I'm having trouble processing your request right now.";
  }
}

// WhatsApp Webhook Handler (Updated)
app.post("/api/webhook/whatsapp", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const text = message.text?.body;

      if (text) {
        const aiResponse = await getAgentResponse(from, text);
        console.log(`AI Response to ${from}: ${aiResponse}`);
        
        // Send WhatsApp response using WhatsApp Business API
        // fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        //   method: "POST",
        //   headers: { "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        //   body: JSON.stringify({ messaging_product: "whatsapp", to: from, text: { body: aiResponse } })
        // });
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Dashboard Data Endpoints
app.get("/api/logs", async (req, res) => {
  // Mock logs for now, in real app fetch from Supabase
  res.json([
    { id: 1, timestamp: new Date(), from: "WhatsApp User", message: "Hello, I need help with my order.", agent: "Support" },
    { id: 2, timestamp: new Date(), from: "AI Agent", message: "Sure! I can help with that. What is your order number?", agent: "Support" },
  ]);
});

app.get("/api/leads", async (req, res) => {
  // Mock leads
  res.json([
    { id: 1, name: "John Doe", email: "john@example.com", phone: "+1234567890", status: "New" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", phone: "+0987654321", status: "Contacted" },
  ]);
});

app.get("/api/settings", async (req, res) => {
  res.json({
    salesPrompt: "You are a persuasive sales agent...",
    marketingPrompt: "You are a creative marketing expert...",
    supportPrompt: "You are a helpful customer support agent...",
  });
});

app.post("/api/settings", async (req, res) => {
  // Save settings to Supabase
  res.json({ success: true });
});

// --- Vite Middleware ---
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
