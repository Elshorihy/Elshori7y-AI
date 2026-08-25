import originalWorker from "./worker.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

async function groqFallback(request, env) {
  if (typeof env?.GROQ_API_KEY !== "string" || !env.GROQ_API_KEY.trim()) return null;
  let body;
  try { body = await request.json(); } catch { return null; }
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return null;
  const context = typeof body?.context === "string" ? body.context.trim() : "";
  const mode = ["books", "general", "auto"].includes(body?.mode) ? body.mode : "auto";
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";
  const bookBlock = context ? `\n\nمقتطفات من كتب الطالب:\n${context}` : "";
  const prompt = `أنت Elshori7y AI، مساعد دراسي شخصي باللغة العربية. اشرح ببساطة وبشكل منظم، وساعد الطالب على الفهم بدل الحفظ فقط.\n\nوضع المعرفة الحالي: ${mode === "books" ? "من الكتب فقط" : mode === "general" ? "المساعد العام" : "تلقائي"}\nالتعليمات: ${instruction}${bookBlock}\n\nقواعد مهمة: ${mode === "books" ? "اعتمد حصريًا على المقتطفات من كتب الطالب. إذا لم تجد الإجابة فيها، قل إن المعلومة غير موجودة في الكتب ولا تخمن." : mode === "general" ? "أجب من معرفتك العامة، ولا تنسب المعلومات إلى كتب الطالب." : "استخدم مقتطفات الكتب كمصدر أول. إذا لم تكفِ للإجابة، يمكنك الاستعانة بمعرفتك العامة، ووضح للمستخدم أن الجزء الإضافي ليس من الكتاب."}\nإذا استخدمت معلومة من مقتطفات الكتب، اذكر اسم الكتاب ورقم الصفحة عند الإمكان.\n\nرسالة الطالب:\n${message}`;

  const models = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"];
  let lastError = "";
  for (const model of models) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": "Bearer " + env.GROQ_API_KEY.trim()
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
        if (text) return json({ text, provider: "groq-llama" });
      }
      lastError = data?.error?.message || `Groq ${r.status}`;
    } catch (e) {
      lastError = String(e?.message || e || "Groq request failed");
    }
  }
  return json({ error: "Gemini quota reached, and Groq fallback failed: " + lastError }, 502);
}

export default {
  async fetch(request, env, ctx) {
    const cloned = request.clone();
    const response = await originalWorker.fetch(request, env, ctx);
    if (response.status !== 429 && response.status !== 500 && response.status !== 502 && response.status !== 503) return response;
    const url = new URL(request.url);
    if (url.pathname !== "/api/chat") return response;
    const fallback = await groqFallback(cloned, env);
    return fallback || response;
  }
};
