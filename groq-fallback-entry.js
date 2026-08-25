import originalWorker from "./worker.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

async function callGroq(env, message, context = "", mode = "auto", instruction = "") {
  const key = env?.GROQ_API_KEY;
  if (typeof key !== "string" || !key.trim()) throw new Error("GROQ_API_KEY is not configured");
  const prompt = `أنت Elshori7y AI، مساعد دراسي شخصي باللغة العربية. اشرح ببساطة وبشكل منظم وساعد الطالب على الفهم.\n\nالوضع: ${mode}\nالتعليمات: ${instruction}\n${context ? `\nمقتطفات من كتب الطالب:\n${context}` : ""}\n\nرسالة الطالب:\n${message}`;
  const models = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"];
  let lastError = "";
  for (const model of models) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": "Bearer " + key.trim()
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "أنت Elshori7y AI، مساعد دراسي ذكي وودود. تحدث بالعربية المصرية عندما يتحدث المستخدم بالعربية، وكن طبيعيًا ومنظمًا ومفيدًا." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      });
      const data = await r.json().catch(() => null);
      if (r.ok) {
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
      lastError = data?.error?.message || `Groq ${r.status}`;
    } catch (e) {
      lastError = String(e?.message || e || "Groq request failed");
    }
  }
  throw new Error(lastError || "Groq request failed");
}

async function telegramSend(token, chatId, text) {
  const safe = String(text || "").trim();
  const body = { chat_id: chatId, text: safe.length > 3900 ? safe.slice(0, 3870) + "\n\n…" : safe };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Telegram sendMessage failed: ${r.status}`);
}

async function telegramHandler(request, env) {
  const token = env?.TELEGRAM_BOT_TOKEN;
  if (typeof token !== "string" || !token.trim()) return json({ error: "TELEGRAM_BOT_TOKEN is not configured" }, 500);
  let update;
  try { update = await request.json(); } catch { return json({ ok: true }); }
  const msg = update?.message;
  const chatId = msg?.chat?.id;
  if (!chatId) return json({ ok: true });
  const text = String(msg?.text || msg?.caption || "").trim();
  if (!text) return json({ ok: true });

  if (text === "/start") {
    await telegramSend(token, chatId, "أهلًا 👋\nأنا Elshori7y AI. ابعت سؤالك الدراسي مباشرة.");
    return json({ ok: true });
  }
  if (text === "/help") {
    await telegramSend(token, chatId, "ابعت سؤالك الدراسي، وأنا هجاوبك مباشرة.");
    return json({ ok: true });
  }

  try {
    const answer = await callGroq(env, text);
    await telegramSend(token, chatId, answer);
  } catch (e) {
    await telegramSend(token, chatId, "❌ Groq فشل: " + String(e?.message || e));
  }
  return json({ ok: true });
}

async function groqFallback(request, env) {
  let body;
  try { body = await request.json(); } catch { return null; }
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return null;
  const context = typeof body?.context === "string" ? body.context.trim() : "";
  const mode = ["books", "general", "auto"].includes(body?.mode) ? body.mode : "auto";
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";
  try {
    const text = await callGroq(env, message, context, mode, instruction);
    return json({ text, provider: "groq-llama" });
  } catch (e) {
    return json({ error: "Gemini quota reached, and Groq fallback failed: " + String(e?.message || e) }, 502);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Telegram webhook: handle it here BEFORE the old worker/Gemini path.
    // This makes the bot independent from Gemini quota.
    if (request.method === "POST") {
      const clonedForTelegram = request.clone();
      try {
        const body = await clonedForTelegram.json();
        if (body?.update_id != null && body?.message?.chat?.id != null) {
          return await telegramHandler(new Request(request.url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body)
          }), env);
        }
      } catch {}
    }

    const cloned = request.clone();
    const response = await originalWorker.fetch(request, env, ctx);
    if (response.status !== 429 && response.status !== 500 && response.status !== 502 && response.status !== 503) return response;
    if (url.pathname !== "/api/chat") return response;
    const fallback = await groqFallback(cloned, env);
    return fallback || response;
  }
};
