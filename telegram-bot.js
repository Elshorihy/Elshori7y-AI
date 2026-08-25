const TELEGRAM_API = token => `https://api.telegram.org/bot${token}`;

async function tgCall(token, method, payload) {
  const r = await fetch(`${TELEGRAM_API(token)}/${method}`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(payload)
  });
  let data = null;
  try { data = await r.json(); } catch {}
  if (!r.ok || !data?.ok) throw new Error(data?.description || `Telegram ${method} failed`);
  return data.result;
}

function telegramText(message) {
  const text = String(message || '').trim();
  return text.length > 3800 ? text.slice(0, 3770) + '\n\n…' : text;
}

async function telegramSend(token, chatId, text) {
  return tgCall(token, 'sendMessage', {chat_id: chatId, text: telegramText(text)});
}

async function telegramWebhook(request, env, answerFromBook) {
  const token = env?.TELEGRAM_BOT_TOKEN;
  if (!token) return new Response('TELEGRAM_BOT_TOKEN is not configured', {status: 500});
  let update;
  try { update = await request.json(); } catch { return new Response('bad json', {status: 400}); }
  const msg = update?.message;
  if (!msg?.chat?.id) return Response.json({ok: true});
  const chatId = msg.chat.id;
  const text = String(msg.text || msg.caption || '').trim();

  try {
    if (text === '/start') {
      await telegramSend(token, chatId, 'أهلًا 👋\nأنا بوت Elshori7y للكتب.\n\nابعتلي PDF أو صورة من الكتاب، وبعدها اسألني عن المحتوى.');
      return Response.json({ok: true});
    }
    if (text === '/help') {
      await telegramSend(token, chatId, 'ابعت PDF أو صور صفحات الكتاب، ثم اسأل مثلًا:\n\nاشرح الدرس الثالث\nما تعريف ...؟\nلخص الصفحة 20');
      return Response.json({ok: true});
    }

    if (msg.document) {
      await telegramSend(token, chatId, '📚 وصلتني الوثيقة. تجهيز قراءة الكتب يحتاج طبقة تخزين/استخراج نص دائمة؛ سأتعامل معها في المرحلة التالية.');
      return Response.json({ok: true});
    }
    if (msg.photo?.length) {
      await telegramSend(token, chatId, '🖼️ وصلتني صورة الصفحة. استقبال الصور جاهز، وربط OCR/RAG بالكتاب يحتاج تخزين الملف وفهرسته على السيرفر.');
      return Response.json({ok: true});
    }
    if (text && typeof answerFromBook === 'function') {
      const answer = await answerFromBook({chatId, text, update, env});
      await telegramSend(token, chatId, answer || 'لم أجد إجابة.');
    } else if (text) {
      await telegramSend(token, chatId, 'ابعت كتابًا أولًا ثم اسألني عنه.');
    }
  } catch (e) {
    await telegramSend(token, chatId, 'حصل خطأ مؤقت. جرّب مرة أخرى.');
  }
  return Response.json({ok: true});
}

export { telegramWebhook, tgCall };
