const deleteBookBtn=document.getElementById('deleteBookBtn');
async function deleteSelectedBook(){
 const book=bookSelect?.value;
 if(!book){alert('اختار كتابًا من المكتبة أولًا.');return;}
 const ok=confirm(`حذف كتاب "${book}" من مكتبتك؟\nسيتم حذف كل الصفحات المفهرسة الخاصة به من هذا الجهاز.`);
 if(!ok)return;
 try{
  const d=await db();
  await new Promise((resolve,reject)=>{
   const tx=d.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),r=s.getAll();
   r.onsuccess=()=>{for(const item of r.result){if(item.book===book)s.delete(item.id)}};
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  bookSelect.value='';
  await updateLibrary();
  const msg=addMessage(`🗑️ تم حذف "${book}" من المكتبة.`, 'ai');
 }catch(e){alert('تعذر حذف الكتاب: '+(e.message||'خطأ غير معروف'));}
}
deleteBookBtn?.addEventListener('click',deleteSelectedBook);