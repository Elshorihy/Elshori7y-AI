const imageBtn=document.getElementById('imageBtn');
const imagePrompt=document.getElementById('imagePrompt');
const imageStyle=document.getElementById('imageStyle');
const imageResult=document.getElementById('imageResult');
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function labelsFromResponse(d){return Array.isArray(d.labels)?d.labels.filter(x=>x&&typeof x.text==='string').slice(0,16):[]}
function buildLabeledSvg(image,labels){const safeImage=escapeHtml(image);const nodes=labels.map((x,i)=>{const px=Math.max(3,Math.min(97,Number(x.x)||10+((i*17)%80))),py=Math.max(6,Math.min(97,Number(x.y)||12+((i*23)%80)));return `<g><rect x="${px-8}" y="${py-5}" width="16" height="10" rx="2" fill="rgba(255,255,255,.9)"/><text x="${px}" y="${py}" text-anchor="middle" dominant-baseline="middle" direction="rtl" unicode-bidi="plaintext" font-family="Noto Sans Arabic, Noto Naskh Arabic, Arial" font-size="4" fill="#111">${escapeHtml(x.text)}</text></g>`}).join('');return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><image href="${safeImage}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice"/>${nodes}</svg>`}
async function imageBookContext(q){
 let context=typeof relevantContext==='function'?await relevantContext(q):'';
 if(context&&context.trim())return context;
 if(typeof allChunks!=='function')return '';
 const all=await allChunks();
 const selected=bookSelect?.value||'';
 if(!selected)return '';
 const pool=all.filter(x=>x.book===selected);
 if(!pool.length)return '';
 // إذا لم يطابق نص الطلب كلمات الصفحة، استخدم بداية محتوى الكتاب بدل إرجاع فراغ.
 // ثم نضيف صفحات موزعة من الكتاب حتى يستطيع Gemini فهم موضوع الدرس حتى لو كان الطلب عامًا.
 const chosen=[];const step=Math.max(1,Math.floor(pool.length/8));
 for(let i=0;i<pool.length&&chosen.length<8;i+=step)chosen.push(pool[i]);
 return chosen.map(x=>`[${x.book} — صفحة ${x.page}]\n${x.text}`).join('\n\n---\n\n').slice(0,18000);
}
async function generateEducationalImage(){
 const text=(imagePrompt?.value||'').trim();if(!text)return;
 imageResult.innerHTML='<div class="image-loading">📚 جاري قراءة محتوى الكتاب ثم بناء الصورة التعليمية...</div>';
 try{
  const context=await imageBookContext(text);
  if(!context)throw new Error('الكتاب المحدد لا يحتوي على محتوى مفهرس. أعد رفع الكتاب وانتظر اكتمال التجهيز.');
  imageResult.innerHTML='<div class="image-loading">🧠 تم العثور على محتوى من الكتاب — جاري تحليله وبناء الرسم...</div>';
  const r=await fetch('/api/image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:text,style:imageStyle?.value||'شرح درس',context,book:bookSelect?.value||'',arabicLabels:true,noTextInBaseImage:true})});
  let d;try{d=await r.json()}catch{throw new Error('الخادم أرسل استجابة غير صالحة.');}
  if(!r.ok)throw new Error(d.error||'فشل إنشاء الصورة');
  if(!d.image&&!d.url)throw new Error('لم تصل صورة من الخادم');
  const base=d.image||d.url;const labels=labelsFromResponse(d);const labeled=labels.length?buildLabeledSvg(base,labels):base;
  imageResult.innerHTML=`<img src="${labeled}" alt="صورة تعليمية مبنية على محتوى الكتاب"><a download="elshori7y-educational.svg" href="${labeled}">⬇️ تحميل الصورة</a>`;
 }catch(e){imageResult.textContent='❌ '+(e.message||'تعذر إنشاء الصورة')}
}
imageBtn?.addEventListener('click',generateEducationalImage);