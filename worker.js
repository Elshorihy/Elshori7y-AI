function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
async function chat(request, env) {
  let body; try { body = await request.json(); } catch { return json({ error: 'بيانات الطلب غير صالحة.' }, 400); }
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return json({ error: 'اكتب رسالتك أولاً.' }, 400);
  if (message.length > 12000) return json({ error: 'الرسالة طويلة جدًا.' }, 400);
  const apiKey = env?.GEMINI_API_KEY;
  if (typeof apiKey !== 'string' || !apiKey.trim()) return json({ error: 'لم يتم إعداد GEMINI_API_KEY على Cloudflare Worker.' }, 500);
  const prompt = `أنت Elshori7y AI، مساعد دراسي شخصي باللغة العربية. اشرح ببساطة وبشكل منظم، وساعد الطالب على الفهم بدل الحفظ فقط. إذا لم تكن لديك معلومة مؤكدة، قل ذلك بوضوح.\n\nرسالة الطالب:\n${message}`;
  let upstream;
  try {
    upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + encodeURIComponent(apiKey.trim()), {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}]})
    });
  } catch { return json({ error:'تعذر الاتصال بخدمة Gemini.' },502); }
  let data; try { data = await upstream.json(); } catch { return json({ error:'Gemini أرسل استجابة غير صالحة.' },502); }
  if (!upstream.ok) return json({ error:data?.error?.message || 'حدث خطأ من Gemini.' },upstream.status);
  const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'لم يصل رد من المساعد.';
  return json({text});
}
export default { async fetch(request, env) {
  const url=new URL(request.url);
  if(url.pathname==='/api/chat'&&request.method==='POST') return chat(request,env);
  if(url.pathname==='/api/health') return json({ok:true,secretConfigured:typeof env?.GEMINI_API_KEY==='string'&&env.GEMINI_API_KEY.length>0,bindingNames:Object.keys(env||{})});
  return env.ASSETS.fetch(request);
}};
