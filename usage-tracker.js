/* 익명 활동 집계: 학습 답안과 점수는 전송하지 않습니다. */
(()=>{'use strict';
 const c=window.BIBLE_USAGE_CONFIG;if(!c?.url||!c?.key)return;
 const key='manjeomlab.usage.v1',disabledKey='manjeomlab.usage.disabled';
 const kinds=new Set(['visit','daily_complete','exam_start','exam_complete','memory_complete','review_complete']);
 let busy=false,timer=null,retries=0;
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}');}catch{return {};}};
 const write=s=>{try{localStorage.setItem(key,JSON.stringify(s));}catch{}};
 const disabled=()=>{try{return localStorage.getItem(disabledKey)==='1';}catch{return true;}};
 const notify=()=>window.dispatchEvent(new Event('bible-usage-change'));
 const schedule=ms=>{clearTimeout(timer);timer=setTimeout(flush,ms);};
 async function flush(){
  if(busy||disabled()||navigator.onLine===false)return;
  busy=true;
  try{
   let remaining=read().queue||[];
   for(const item of remaining.slice(0,10)){
    if(disabled())break;
    if(Date.now()-Date.parse(item.at)>47*3600000){const s=read();s.queue=(s.queue||[]).filter(e=>e.id!==item.id);write(s);continue;}
    const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),8000);
    let r;try{r=await fetch(c.url,{method:'POST',headers:{'Content-Type':'application/json','apikey':c.key},body:JSON.stringify(item),signal:ac.signal,keepalive:true});}finally{clearTimeout(timeout);}
    if(r.status===429){const s=read();s.queue=[];write(s);break;}
    if(!r.ok)throw new Error('retry');
    const s=read();s.queue=(s.queue||[]).filter(e=>e.id!==item.id);write(s);retries=0;
   }
  }catch{retries++;}finally{busy=false;}
  if((read().queue||[]).length&&!disabled())schedule(retries?Math.min(60000,3000*2**Math.min(retries,5)):100);
 }
 function event(kind){
  if(disabled()||!kinds.has(kind))return;
  try{
   const s=read();s.visitor=s.visitor||crypto.randomUUID();
   const item={action:'event',id:crypto.randomUUID(),visitor:s.visitor,kind,at:new Date().toISOString()};
   s.queue=[...(s.queue||[]),item].slice(-100);s.lastActivity=Date.now();write(s);schedule(0);
  }catch{/* 통계 실패가 학습을 막지 않도록 합니다. */}
 }
 function visit(){
  if(disabled())return;
  const s=read(),fresh=!s.lastActivity||Date.now()-s.lastActivity>30*60000;
  s.lastActivity=Date.now();write(s);if(fresh)event('visit');else schedule(0);
 }
 function setOptOut(off){try{localStorage.setItem(disabledKey,off?'1':'0');if(off){const s=read();s.queue=[];write(s);clearTimeout(timer);}else visit();notify();}catch{}}
 window.BibleUsage={event,visit,setOptOut,disabled};
 if(new URLSearchParams(location.search).get('usage')==='off')setOptOut(true);
 window.addEventListener('online',()=>schedule(0));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)visit();});
 window.addEventListener('pointerdown',()=>{if(disabled())return;const s=read();if(Date.now()-(s.lastActivity||0)>60000){s.lastActivity=Date.now();write(s);}},{passive:true});
 function notice(){
  const footer=document.createElement('footer');footer.style.cssText='max-width:940px;margin:24px auto 100px;padding:16px;color:var(--ink3,#556);font-size:12px;line-height:1.8';
  footer.innerHTML='이용량 확인을 위해 익명 브라우저 식별자와 학습 활동 횟수를 최대 90일간 집계합니다. 이름·점수·선택한 답은 전송하지 않습니다. 통계 연결이 끊겨도 학습할 수 있어요.'+' <button type="button" id="usageToggle" style="font:inherit;color:inherit;text-decoration:underline;background:none;border:0;cursor:pointer;padding:4px"></button>';
  document.body.appendChild(footer);const b=footer.querySelector('button');const label=()=>{b.textContent=disabled()?'익명 집계 허용하기':'이 브라우저 집계 거부하기';};b.onclick=()=>setOptOut(!disabled());window.addEventListener('bible-usage-change',label);label();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',notice);else notice();
})();
