const imageBtn=document.getElementById('imageBtn');
const imagePrompt=document.getElementById('imagePrompt');
const imageStyle=document.getElementById('imageStyle');
const imageResult=document.getElementById('imageResult');
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function labelsFromResponse(d){return Array.isArray(d.labels)?d.labels.filter(x=>x&&typeof x.text==='string').slice(0,16):[]}
function buildLabeledSvg(image,labels){const safeImage=escapeHtml(image);const nodes=labels.map((x,i)=>{const px=Math.max(3,Math.min(97,Number(x.x)||10+((i*17)%80))),py=Math.max(6,Math.min(97,Number(x.y)||12+((i*23)%80)));return `<g><rect x="${px-8}" y="${py-5}" width="16" height="10" rx="2" fill="rgba(255,255,255,.9)"/><text x="${px}" y="${py}" text-anchor="middle" dominant-baseline="middle" direction="rtl" unicode-bidi="plaintext" font-family="Noto Sans Arabic, Noto Naskh Arabic, Arial" font-size="4" fill="#111">${escapeHtml(x.text)}</text></g>`}).join('');return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><image href="${safeImage}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice"/>${nodes}</svg>`}
function normalize(s){return String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim()}
function queryTerms(q){return [...new Set(normalize(q).split(' ').filter(w=>w.length>2 && !['اعمل','اعمللي','اعملوا','صورة','صور','تعليمية','تعليمي','للدرس','للصفحة','صوره','من','في','عن','هذا','هذه','الكتاب'].includes(w)))]}
async function imageBookContext(q){
 if(typeof allChunks!=='function')return '';
 const all=await allChunks();
 const selected=bookSelect?.value||'';
 if(!all.length)return '';
 const pool=selected?all.filter(x=>x.book===selected):all;
 if(!pool.length)return '';
 const terms=queryTerms(q);
 const scored=pool.map((x,i)=>{const t=normalize(x.text);let score=0;for(const term of terms){if(t.includes(term))score+=term.length>=5?4:2}const page=Number(x.page)||0;return {...x,score,page,index:i}}).sort((a,b)=>b.score-a.score||a.page-b.page);
 let chosen=scored.filter(x=>x.score>0).slice(0,12);
 // طلبات مثل «الدرس الثالث» لا تتطابق بالضرورة مع نص الصفحة، لذلك نبحث أيضًا عن العنوان/رقم الدرس.
 const lesson=q.match(/(?:الدرس|درس)\s*(?:رقم\s*)?(\d+)/i);
 if(lesson){const n=Number(lesson[1]);const lessonTerms=[`الدرس ${n}`,`درس ${n}`,`الدرس${n}`];const lessonHits=pool.filter(x=>lessonTerms.some(v=>normalize(x.text).includes(normalize(v))));if(lessonHits.length)chosen=[...lessonHits.slice(0,12),...chosen].slice(0,12);}
 const page=q.match(/(?:الصفحة|صفحة|ص)\s*(\d+)/i);
 if(page){const n=Number(page[1]);const near=pool.filter(x=>Math.abs((Number(x.page)||0)-n)<=1);if(near.length)chosen=[...near.slice(0,6),...chosen].slice(0,12);}
 // إذا لم توجد مطابقة، نأخذ مقاطع موزعة من الكتاب المحدد نفسه. هذا يضمن أن اختيار الكتاب لا يعتمد على تطابق كلمة الطلب.
 if(!chosen.length){const step=Math.max(1,Math.floor(pool.length/10));for(let i=0;i<pool.length&&chosen.length<10;i+=step)chosen.push(pool[i]);}
 return chosen.map(x=>`[${x.book} — صفحة ${x.page}]\n${x.text}`).join('\n\n---\n\n').slice(0,18000);
}
async function generateEducationalImage(){
 const text=(imagePrompt?.value||'').trim();if(!text)return;
 imageResult.innerHTML='<div class="image-loading">📚 جاري البحث داخل الكتاب المختار...</div>';
 try{
  const context=await imageBookContext(text);
  if(!context)throw new Error('الكتاب المحدد لا يحتوي على مقاطع مفهرسة. أعد رفع الكتاب وانتظر ظهور رسالة اكتمال التجهيز.');
  imageResult.innerHTML='<div class="image-loading">🧠 تم جلب محتوى الكتاب — Gemini يحلل الدرس الآن...</div>';
  const r=await fetch('/api/image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:text,style:imageStyle?.value||'شرح درس',context,book:bookSelect?.value||'',arabicLabels:true,noTextInBaseImage:true})});
  let d;try{d=await r.json()}catch{throw new Error('الخادم أرسل استجابة غير صالحة.');}
  if(!r.ok)throw new Error(d.error||'فشل إنشاء الصورة');
  if(!d.image&&!d.url)throw new Error('لم تصل صورة من الخادم');
  const base=d.image||d.url;const labels=labelsFromResponse(d);const labeled=labels.length?buildLabeledSvg(base,labels):base;
  imageResult.innerHTML=`<img src="${labeled}" alt="صورة تعليمية مبنية على محتوى الكتاب"><a download="elshori7y-educational.svg" href="${labeled}">⬇️ تحميل الصورة</a>`;
 }catch(e){imageResult.textContent='❌ '+(e.message||'تعذر إنشاء الصورة')}
}
imageBtn?.addEventListener('click',generateEducationalImage);