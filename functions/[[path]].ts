import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const app = new Hono<{ Bindings: { 
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  WHATSAPP_VERIFY_TOKEN: string;
} }>();

app.use('*', cors());

// --- AI Engine Helper ---
async function processAI(env: any, whatsappNumber: string, userMessage: string) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  
  // Fetch thread
  const { data: thread } = await supabase.from("threads").select("*").eq("whatsapp_number", whatsappNumber).single();
  const agentType = thread?.agent_type || "support";
  const history = thread?.history || [];

  // Get prompts
  const { data: settings } = await supabase.from("settings").select("*").eq("key", "prompts").single();
  const systemInstruction = settings?.value[agentType] || "You are a helpful assistant.";

  // Call Gemini
  const response = await genAI.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [
      ...history.map((h: any) => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] })),
      { role: "user", parts: [{ text: userMessage }] }
    ],
    config: { systemInstruction }
  });

  const text = response.text;
  
  // Update history
  const updatedHistory = [...history, { role: "user", text: userMessage }, { role: "model", text }];
  await supabase.from("threads").update({ history: updatedHistory }).eq("whatsapp_number", whatsappNumber);
  
  return text;
}

// --- API Routes ---
app.get('/api/webhook/whatsapp', (c) => {
  const query = c.req.query();
  if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === c.env.WHATSAPP_VERIFY_TOKEN) {
    return c.text(query['hub.challenge']);
  }
  return c.text('Forbidden', 403);
});

app.post('/api/webhook/whatsapp', async (c) => {
  const body = await c.req.json();
  // ... Process WhatsApp body and call processAI ...
  return c.text('OK');
});

app.get('/api/logs', async (c) => {
  return c.json([{ id: 1, timestamp: new Date(), from: "Edge Worker", message: "System operational on Cloudflare.", agent: "System" }]);
});

export const onRequest = (context: any) => app.fetch(context.request, context.env);
