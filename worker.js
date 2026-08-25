function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
async function chat(request,env){
 let body;try{body=await request.json()}catch{return json({error:'بيانات الطلب غير صالحة.'},400)}
 const message=typeof body?.message==='string'?body.message.trim():'';const context=typeof body?.context==='string'?body.context.trim():'';const mode=['books','general','auto'].includes(body?.mode)?body.mode:'auto';const instruction=typeof body?.instruction==='string'?body.instruction.trim():'';
 if(!message)return json({error:'اكتب رسالتك أولاً.'},400);if(message.length>12000)return json({error:'الرسالة طويلة جدًا.'},400);
 const apiKey=env?.GEMINI_API_KEY;if(typeof apiKey!=='string'||!apiKey.trim())return json({error:'لم يتم إعداد GEMINI_API_KEY على Cloudflare Worker.'},500);
 const bookBlock=context?`\n\nمقتطفات من كتب الطالب:\n${context}`:'';
 const prompt=`أنت Elshori7y AI، مساعد دراسي شخصي باللغة العربية. اشرح ببساطة وبشكل منظم، وساعد الطالب على الفهم بدل الحفظ فقط.\n\nوضع المعرفة الحالي: ${mode==='books'?'من الكتب فقط':mode==='general'?'المساعد العام':'تلقائي'}\nالتعليمات: ${instruction}${bookBlock}\n\nقواعد مهمة: ${mode==='books'?'اعتمد حصريًا على المقتطفات من كتب الطالب. إذا لم تجد الإجابة فيها، قل إن المعلومة غير موجودة في الكتب ولا تخمن.':mode==='general'?'أجب من معرفتك العامة، ولا تنسب المعلومات إلى كتب الطالب.':'استخدم مقتطفات الكتب كمصدر أول. إذا لم تكفِ للإجابة، يمكنك الاستعانة بمعرفتك العامة، ووضح للمستخدم أن الجزء الإضافي ليس من الكتاب.'}\nإذا استخدمت معلومة من مقتطفات الكتب، اذكر اسم الكتاب ورقم الصفحة عند الإمكان.\n\nرسالة الطالب:\n${message}`;
 let upstream;try{upstream=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key='+encodeURIComponent(apiKey.trim()),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}]})})}catch{return json({error:'تعذر الاتصال بخدمة Gemini.'},502)}
 let data;try{data=await upstream.json()}catch{return json({error:'Gemini أرسل استجابة غير صالحة.'},502)}
 if(!upstream.ok)return json({error:data?.error?.message||'حدث خطأ من Gemini.'},upstream.status);
 const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'لم يصل رد من المساعد.';return json({text})
}
async function image(request,env){
 let body;try{body=await request.json()}catch{return json({error:'بيانات طلب الصورة غير صالحة.'},400)}
 const prompt=typeof body?.prompt==='string'?body.prompt.trim():'';const style=typeof body?.style==='string'?body.style.trim():'شرح درس';const context=typeof body?.context==='string'?body.context.trim():'';
 if(!prompt)return json({error:'اكتب وصف الصورة أولًا.'},400);
 const hf=env?.HF_TOKEN;if(typeof hf!=='string'||!hf.trim())return json({error:'لم يتم إعداد HF_TOKEN على Cloudflare Worker.'},500);
 const model=env?.HF_IMAGE_MODEL||'black-forest-labs/FLUX.1-dev';
 const instruction=`Educational illustration for an Arabic-speaking student. Style: ${style}. Request: ${prompt}. ${context?`Use this book context for factual accuracy: ${context.slice(0,7000)}`:''} No text, letters, captions, labels, logos, watermarks, or copyrighted characters in the image. Use clear visual elements only.`;
 let upstream;try{upstream=await fetch('https://router.huggingface.co/fal-ai/fal-ai/'+encodeURIComponent(model),{method:'POST',headers:{authorization:'Bearer '+hf.trim(),'content-type':'application/json'},body:JSON.stringify({prompt:instruction,num_inference_steps:4})})}catch{return json({error:'تعذر الاتصال بخدمة Hugging Face/Fal AI.'},502)}
 if(!upstream.ok){let msg='حدث خطأ أثناء توليد الصورة.';try{const e=await upstream.json();msg=e?.error||e?.message||msg}catch{}return json({error:msg},upstream.status)}
 const contentType=upstream.headers.get('content-type')||'';
 if(contentType.includes('image/')){const buffer=await upstream.arrayBuffer();let binary='';const bytes=new Uint8Array(buffer);const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));return json({image:`data:${contentType};base64,${btoa(binary)}`,labels:[]})}
 let result;try{result=await upstream.json()}catch{return json({error:'مزود الصور أرسل استجابة غير صالحة.'},502)}
 const url=result?.images?.[0]?.url||result?.image?.url||result?.url||result?.images?.[0];if(typeof url==='string'&&url)return json({image:url,labels:[]});
 return json({error:result?.error||'لم تصل صورة من مزود الصور.'},502)
}
export default{async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/api/chat'&&request.method==='POST')return chat(request,env);if(url.pathname==='/api/image'&&request.method==='POST')return image(request,env);if(url.pathname==='/api/health')return json({ok:true,secretConfigured:typeof env?.GEMINI_API_KEY==='string'&&env.GEMINI_API_KEY.length>0,hfConfigured:typeof env?.HF_TOKEN==='string'&&env.HF_TOKEN.length>0,bindingNames:Object.keys(env||{})});return env.ASSETS.fetch(request)}};