export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return new Response(JSON.stringify({ error: 'اكتب رسالتك أولاً' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } });
    if (message.length > 12000) return new Response(JSON.stringify({ error: 'الرسالة طويلة جدًا' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } });

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: 'لم يتم إعداد GEMINI_API_KEY على الاستضافة بعد.' }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });

    const prompt = `أنت Elshori7y AI، مساعد دراسي شخصي باللغة العربية. اشرح ببساطة وبشكل منظم، وإذا كان السؤال دراسيًا أعطِ أمثلة قصيرة وساعد الطالب على الفهم بدل الحفظ فقط. لا تدّعِ أنك تعرف شيئًا من كتب المستخدم إلا إذا تم تزويدك به.\n\nرسالة المستخدم:\n${message}`;
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: data?.error?.message || 'حدث خطأ من Gemini' }), { status: response.status, headers: { 'content-type': 'application/json; charset=utf-8' } });
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || 'لم أستطع إنشاء رد.';
    return new Response(JSON.stringify({ text }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'تعذر الاتصال بالمساعد.' }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}
