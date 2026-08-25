// Add this handler to worker.js before the default export:
async function image(request,env){
 let body;try{body=await request.json()}catch{return json({error:'بيانات الطلب غير صالحة.'},400)}
 const prompt=typeof body?.prompt==='string'?body.prompt.trim():'';const style=typeof body?.style==='string'?body.style:'شرح درس';const context=typeof body?.context==='string'?body.context.trim():'';
 if(!prompt)return json({error:'اكتب وصف الصورة أولًا.'},400);
 const key=env?.IMAGE_API_KEY;if(typeof key!=='string'||!key.trim())return json({error:'لم يتم إعداد IMAGE_API_KEY بعد. أضف مفتاح مزود الصور كـ Secret في Cloudflare.'},500);
 const finalPrompt=`Educational Arabic study illustration. Style: ${style}. Create a clear, accurate, age-appropriate visual for a student. User request: ${prompt}. ${context?`Book context to respect:\n${context.slice(0,10000)}`:''} Avoid copyrighted characters and logos. Keep labels readable and do not invent facts.`;
 // Provider-specific image generation goes here. Keep the provider key server-side.
 // Return {image:'data:image/...'} or {url:'https://...'} after calling your chosen image provider.
 return json({error:'IMAGE_API_KEY موجود، لكن لم يتم اختيار مزود صور في Worker بعد.'},501)
}
