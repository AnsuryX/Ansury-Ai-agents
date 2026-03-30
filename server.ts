import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
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

// Initialize Google OAuth
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/auth/google/callback`
);

app.use(express.json());

// --- Google OAuth Routes ---

app.get("/api/auth/google/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
    prompt: "consent",
  });
  res.json({ url });
});

app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    // Store tokens in Supabase (global settings for now)
    await supabase.from("settings").upsert({ key: "google_tokens", value: tokens });
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error exchanging code:", error);
    res.status(500).send("Authentication failed.");
  }
});

// --- AI Logic & Multi-Agent Engine ---

async function getAgentResponse(whatsappNumber: string, userMessage: string) {
  try {
    // 1. Fetch thread and agent type from Supabase
    const { data: thread } = await supabase
      .from("threads")
      .select("*")
      .eq("whatsapp_number", whatsappNumber)
      .single();

    let agentType = thread?.agent_type || "support";
    let history = thread?.history || [];

    if (!thread) {
      await supabase.from("threads").insert({ whatsapp_number: whatsappNumber, agent_type: "support", history: [] });
    }

    // 2. Get system prompt
    const { data: settings } = await supabase.from("settings").select("*").eq("key", "prompts").single();
    const prompts = settings?.value || {
      sales: "You are a persuasive sales agent. Use 'check_availability' and 'book_meeting' to schedule calls.",
      marketing: "You are a creative marketing expert. Use 'capture_lead' to save potential customer info.",
      support: "You are a helpful customer support agent. Use 'switch_agent' if the user wants to buy something.",
    };

    const systemInstruction = prompts[agentType] || prompts.support;

    // 3. Define Autonomous Tools
    const tools = [
      {
        functionDeclarations: [
          {
            name: "check_availability",
            description: "Check if a specific date and time is available for a meeting.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "Date (YYYY-MM-DD)" },
                time: { type: Type.STRING, description: "Time (HH:MM)" },
              },
              required: ["date", "time"],
            },
          },
          {
            name: "book_meeting",
            description: "Book a meeting on the calendar.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "Date (YYYY-MM-DD)" },
                time: { type: Type.STRING, description: "Time (HH:MM)" },
                email: { type: Type.STRING, description: "User email" },
                summary: { type: Type.STRING, description: "Meeting title" },
              },
              required: ["date", "time", "email"],
            },
          },
          {
            name: "capture_lead",
            description: "Save a new lead's contact information to the database.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
              },
              required: ["name"],
            },
          },
          {
            name: "switch_agent",
            description: "Switch the conversation to a different specialized agent (sales, marketing, support).",
            parameters: {
              type: Type.OBJECT,
              properties: {
                target_agent: { type: Type.STRING, enum: ["sales", "marketing", "support"] },
              },
              required: ["target_agent"],
            },
          },
        ],
      },
      { googleSearch: {} } // Autonomous web search
    ];

    // 4. Call Gemini
    const model = genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        ...history.map((h: any) => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] })),
        { role: "user", parts: [{ text: userMessage }] }
      ],
      config: { systemInstruction, tools },
    });

    let response = await model;
    
    // 5. Handle Tool Calls Loop
    while (response.functionCalls && response.functionCalls.length > 0) {
      const functionResponses = [];

      for (const call of response.functionCalls) {
        const args = call.args as any;
        let result = {};

        if (call.name === "check_availability") {
          const { data: tokens } = await supabase.from("settings").select("value").eq("key", "google_tokens").single();
          if (tokens?.value) {
            oauth2Client.setCredentials(tokens.value);
            const calendar = google.calendar({ version: "v3", auth: oauth2Client });
            const start = new Date(`${args.date}T${args.time}:00Z`);
            const end = new Date(start.getTime() + 30 * 60000);
            const events = await calendar.events.list({
              calendarId: "primary",
              timeMin: start.toISOString(),
              timeMax: end.toISOString(),
              singleEvents: true,
            });
            result = { available: events.data.items?.length === 0 };
          } else {
            result = { error: "Google Calendar not connected." };
          }
        } 
        else if (call.name === "book_meeting") {
          const { data: tokens } = await supabase.from("settings").select("value").eq("key", "google_tokens").single();
          if (tokens?.value) {
            oauth2Client.setCredentials(tokens.value);
            const calendar = google.calendar({ version: "v3", auth: oauth2Client });
            const start = new Date(`${args.date}T${args.time}:00Z`);
            const end = new Date(start.getTime() + 30 * 60000);
            await calendar.events.insert({
              calendarId: "primary",
              requestBody: {
                summary: args.summary || "Ansury Booking",
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() },
                attendees: [{ email: args.email }],
              },
            });
            result = { success: true };
          } else {
            result = { error: "Google Calendar not connected." };
          }
        }
        else if (call.name === "capture_lead") {
          await supabase.from("leads").insert({ name: args.name, email: args.email, phone: args.phone });
          result = { success: true };
        }
        else if (call.name === "switch_agent") {
          await supabase.from("threads").update({ agent_type: args.target_agent }).eq("whatsapp_number", whatsappNumber);
          agentType = args.target_agent;
          result = { success: true, message: `Switched to ${args.target_agent} agent.` };
        }

        functionResponses.push({ functionResponse: { name: call.name, response: result } });
      }

      // Send responses back to model
      response = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          ...history.map((h: any) => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] })),
          { role: "user", parts: [{ text: userMessage }] },
          { role: "model", parts: response.candidates[0].content.parts },
          { role: "user", parts: functionResponses }
        ],
        config: { systemInstruction, tools }
      });
    }

    const text = response.text;

    // 6. Update History
    const updatedHistory = [...history, { role: "user", text: userMessage }, { role: "model", text }];
    await supabase.from("threads").update({ history: updatedHistory }).eq("whatsapp_number", whatsappNumber);

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

app.get("/api/health", async (req, res) => {
  const health = {
    supabase: { status: "offline", latency: 0 },
    google: { status: "disconnected", lastSync: null },
    whatsapp: { status: "active", webhook: "connected" },
    gemini: { status: "online" }
  };

  const start = Date.now();
  try {
    const { error } = await supabase.from("settings").select("key").limit(1);
    if (!error) {
      health.supabase.status = "online";
      health.supabase.latency = Date.now() - start;
    }
  } catch (e) {
    health.supabase.status = "error";
  }

  try {
    const { data: tokens } = await supabase.from("settings").select("value").eq("key", "google_tokens").single();
    if (tokens?.value) {
      health.google.status = "connected";
      health.google.lastSync = new Date().toISOString();
    }
  } catch (e) {}

  res.json(health);
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
