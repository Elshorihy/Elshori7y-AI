const imageBtn=document.getElementById('imageBtn');
const imagePrompt=document.getElementById('imagePrompt');
const imageStyle=document.getElementById('imageStyle');
const imageResult=document.getElementById('imageResult');
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function labelsFromResponse(d){return Array.isArray(d.labels)?d.labels.filter(x=>x&&typeof x.text==='string').slice(0,16):[]}
function buildLabeledSvg(image,labels){const safeImage=escapeHtml(image);const nodes=labels.map((x,i)=>{const px=Math.max(3,Math.min(97,Number(x.x)||10+((i*17)%80))),py=Math.max(6,Math.min(97,Number(x.y)||12+((i*23)%80)));return `<g><rect x="${px-8}" y="${py-5}" width="16" height="10" rx="2" fill="rgba(255,255,255,.9)"/><text x="${px}" y="${py}" text-anchor="middle" dominant-baseline="middle" direction="rtl" unicode-bidi="plaintext" font-family="Noto Sans Arabic, Noto Naskh Arabic, Arial" font-size="4" fill="#111">${escapeHtml(x.text)}</text></g>`}).join('');return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><image href="${safeImage}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice"/>${nodes}</svg>`}
async function generateEducationalImage(){
 const text=(imagePrompt?.value||'').trim(); if(!text)return;
 imageResult.innerHTML='<div class="image-loading">🎨 جاري إنشاء الرسم ثم إضافة النص العربي بدقة...</div>';
 try{const context=typeof relevantContext==='function'?await relevantContext(text):'';const r=await fetch('/api/image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:text,style:imageStyle?.value||'شرح درس',context,arabicLabels:true,noTextInBaseImage:true})});const d=await r.json();if(!r.ok)throw new Error(d.error||'فشل إنشاء الصورة');
 if(!d.image&&!d.url)throw new Error('لم تصل صورة من المزود');
 const base=d.image||d.url;const labels=labelsFromResponse(d);const labeled=labels.length?buildLabeledSvg(base,labels):base;
 imageResult.innerHTML=`<img src="${labeled}" alt="صورة تعليمية مع نص عربي واضح"><a download="elshori7y-educational.svg" href="${labeled}">⬇️ تحميل الصورة</a>`;
 }catch(e){imageResult.textContent='❌ '+e.message}
}
imageBtn?.addEventListener('click',generateEducationalImage);