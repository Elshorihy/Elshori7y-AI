const imageBtn=document.getElementById('imageBtn');
const imagePrompt=document.getElementById('imagePrompt');
const imageStyle=document.getElementById('imageStyle');
const imageResult=document.getElementById('imageResult');
async function generateEducationalImage(){
 const text=(imagePrompt?.value||'').trim(); if(!text)return;
 imageResult.innerHTML='<div class="image-loading">🎨 جاري تجهيز الصورة التعليمية...</div>';
 try{const context=typeof relevantContext==='function'?await relevantContext(text):'';const r=await fetch('/api/image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:text,style:imageStyle?.value||'شرح درس',context})});const d=await r.json();if(!r.ok)throw new Error(d.error||'فشل إنشاء الصورة');
 if(d.image){imageResult.innerHTML=`<img src="${d.image}" alt="صورة تعليمية"><a download="elshori7y-educational.png" href="${d.image}">⬇️ تحميل الصورة</a>`}else if(d.url){imageResult.innerHTML=`<img src="${d.url}" alt="صورة تعليمية"><a target="_blank" href="${d.url}">🔗 فتح الصورة</a>`}else throw new Error('لم تصل صورة من المزود');
 }catch(e){imageResult.textContent='❌ '+e.message}
}
imageBtn?.addEventListener('click',generateEducationalImage);