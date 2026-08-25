const imageBtn=document.getElementById('imageBtn');
const imagePrompt=document.getElementById('imagePrompt');
const imageStyle=document.getElementById('imageStyle');
const imageResult=document.getElementById('imageResult');
function escapeHtml(s){return String(s).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
function normalize(s){return String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim()}
function queryTerms(q){return [...new Set(normalize(q).split(' ').filter(w=>w.length>2&&!['اعمل','اعمللي','اعملوا','صورة','صور','تعليمية','تعليمي','للدرس','للصفحة','صوره','من','في','عن','هذا','هذه','الكتاب'].includes(w)))]}
async function imageBookContext(q){
 if(typeof allChunks!=='function')return '';
 const all=await allChunks();const selected=bookSelect?.value||'';if(!all.length)return '';
 const pool=selected?all.filter(x=>x.book===selected):all;if(!pool.length)return '';
 const terms=queryTerms(q);const scored=pool.map((x,i)=>{const t=normalize(x.text);let score=0;for(const term of terms)if(t.includes(term))score+=term.length>=5?4:2;return {...x,score,page:Number(x.page)||0,index:i}}).sort((a,b)=>b.score-a.score||a.page-b.page);
 let chosen=scored.filter(x=>x.score>0).slice(0,14);
 const lesson=q.match(/(?:الدرس|درس)\s*(?:رقم\s*)?(\d+)/i);if(lesson){const n=Number(lesson[1]);const hits=pool.filter(x=>[`الدرس ${n}`,`درس ${n}`,`الدرس${n}`].some(v=>normalize(x.text).includes(normalize(v))));if(hits.length)chosen=[...hits.slice(0,14),...chosen].slice(0,14)}
 const page=q.match(/(?:الصفحة|صفحة|ص)\s*(\d+)/i);if(page){const n=Number(page[1]);const near=pool.filter(x=>Math.abs((Number(x.page)||0)-n)<=1);if(near.length)chosen=[...near.slice(0,8),...chosen].slice(0,14)}
 if(!chosen.length){const step=Math.max(1,Math.floor(pool.length/10));for(let i=0;i<pool.length&&chosen.length<10;i+=step)chosen.push(pool[i])}
 return chosen.map(x=>`[${x.book} — صفحة ${x.page}]\n${x.text}`).join('\n\n---\n\n').slice(0,18000);
}
async function requestImage(prompt,style,context){
 const r=await fetch('/api/image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,style,context,book:bookSelect?.value||'',arabicLabels:true,noTextInBaseImage:true})});
 let d;try{d=await r.json()}catch{throw new Error('الخادم أرسل استجابة غير صالحة.')}
 if(!r.ok)throw new Error(d.error||'فشل إنشاء الصورة');
 if(!d.image&&!d.url)throw new Error('لم تصل صورة من الخادم');
 return d.image||d.url;
}
function card(src,title,i){return `<div class="educational-card"><h3>${escapeHtml(title)}</h3><img src="${src}" alt="${escapeHtml(title)}"><a download="elshori7y-educational-${i+1}.svg" href="${src}">⬇️ تحميل الصورة</a></div>`}
async function generateEducationalImage(){
 const text=(imagePrompt?.value||'').trim();if(!text)return;
 imageResult.innerHTML='<div class="image-loading">📚 جاري قراءة محتوى الكتاب المختار...</div>';
 try{
  const context=await imageBookContext(text);if(!context)throw new Error('الكتاب المحدد لا يحتوي على مقاطع مفهرسة. أعد رفع الكتاب وانتظر اكتمال التجهيز.');
  const isFullLesson=/(الدرس|درس|الوحدة|الباب|الفصل|الموضوع)/i.test(text);
  const styles=isFullLesson?[
   ['ملخص بصري شامل للدرس','📚 ملخص الدرس'],
   ['خريطة مفاهيم','🧠 خريطة المفاهيم'],
   ['ملخص بصري للخطوات أو العملية','🔄 الخطوات والعملية'],
   ['مقارنة أو تصنيف أو مخطط علمي حسب محتوى الدرس','🔬 العلاقات والتصنيف']
  ]:[
   ['خريطة مفاهيم','🧠 الخريطة الرئيسية'],
   ['ملخص بصري للخطوات أو العملية','🔄 الخطوات والعملية'],
   ['مقارنة أو تصنيف أو مخطط علمي حسب محتوى الدرس','🔬 التحليل البصري']
  ];
  imageResult.innerHTML=`<div class="image-loading">🧠 تم العثور على محتوى الكتاب — جاري ${isFullLesson?'تحويل الدرس إلى حزمة مذاكرة بصرية':'إنشاء مجموعة الصور'}...</div>`;
  const results=[];
  for(let i=0;i<styles.length;i++){
   imageResult.innerHTML=`<div class="image-loading">🎨 جاري إنشاء الصورة ${i+1} من ${styles.length}...</div>`;
   try{
    const src=await requestImage(`${text}\n\nأنشئ لوحة تعليمية رقم ${i+1} من مجموعة مترابطة مبنية على محتوى الكتاب المرفق فقط. ${isFullLesson?'اعتبر هذه اللوحة جزءًا من حزمة مذاكرة للدرس كاملًا، واستخرج أهم المعلومات التي يجب أن يراجعها الطالب.':''} ركّز على جزء مختلف ومهم، ولا تكرر اللوحات السابقة. النوع المفضل لهذه اللوحة: ${styles[i][0]}. إذا لم يكن هذا النوع مناسبًا للمحتوى، اختر النوع الأنسب من الأنواع المتاحة.`,styles[i][0],context);
    results.push(card(src,styles[i][1],i));
   }catch(e){if(i===0)throw e}
  }
  if(!results.length)throw new Error('تعذر إنشاء الصور التعليمية.');
  imageResult.innerHTML=`<div class="educational-set"><div class="set-title">${isFullLesson?'📚 حزمة مذاكرة بصرية مبنية على الدرس كاملًا':'📚 مجموعة تعليمية مبنية على محتوى الكتاب'}</div>${results.join('')}</div>`;
 }catch(e){imageResult.textContent='❌ '+(e.message||'تعذر إنشاء الصور')}
}
imageBtn?.addEventListener('click',generateEducationalImage);