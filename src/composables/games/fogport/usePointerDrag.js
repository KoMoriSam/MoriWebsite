import { ref, onBeforeUnmount } from 'vue';
export function usePointerDrag(onDrop, onStart = () => {}, onMove = () => {}, onEnd = () => {}) {
  const ghost=ref(null);
  let gesture=null,blockedUntil=0,returnTimer=null;
  function detach() {
    window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);
    window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape);
    if(gesture?.source?.hasPointerCapture?.(gesture.id)) gesture.source.releasePointerCapture(gesture.id);
    gesture=null;
  }
  function cleanup() {clearTimeout(returnTimer);detach();ghost.value=null;onMove(null);}
  function start(event,payload,label) {
    if(event.button!==0 || gesture || ghost.value) return;
    event.stopPropagation();blockedUntil=0;
    const rect=event.currentTarget.getBoundingClientRect();
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,payload,label,active:false,source:event.currentTarget,
      origin:{x:rect.left,y:rect.top},grab:{x:event.clientX-rect.left,y:event.clientY-rect.top},width:rect.width,height:rect.height,
      touch:event.pointerType==='touch',scrollAxis:event.currentTarget.closest('[data-scroll-axis]')?.dataset.scrollAxis};
    window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape);
  }
  function move(event) {
    if(!gesture || event.pointerId!==gesture.id) return;
    const dx=Math.abs(event.clientX-gesture.x),dy=Math.abs(event.clientY-gesture.y);
    if(!gesture.active && Math.hypot(dx,dy)>8) {
      if(gesture.touch && (gesture.scrollAxis==='x' && dx>=dy || gesture.scrollAxis==='y' && dy>=dx)) {blockedUntil=Date.now()+350;cleanup();return;}
      if(onStart(gesture.payload)===false) {blockedUntil=Date.now()+350;cleanup();return;}
      gesture.active=true;gesture.source.setPointerCapture?.(gesture.id);
    }
    if(gesture?.active) {
      event.preventDefault();
      ghost.value={payload:gesture.payload,label:gesture.label,x:event.clientX-gesture.grab.x,y:event.clientY-gesture.grab.y,width:gesture.width,height:gesture.height};
      const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-fogport-drop]');
      onMove({value:target?.dataset.fogportDrop ?? null,x:event.clientX,y:event.clientY});
    }
  }
  function returnHome() {
    const origin=gesture.origin;detach();onMove(null);onEnd(false);
    if(!ghost.value) return;
    ghost.value={...ghost.value,...origin,returning:true};
    returnTimer=setTimeout(()=>{ghost.value=null;},180);
  }
  function up(event) {
    if(!gesture || event.pointerId!==gesture.id) return;
    if(!gesture.active) {cleanup();return;}
    blockedUntil=Date.now()+350;
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-fogport-drop]');
    const accepted=onDrop(gesture.payload,target?.dataset.fogportDrop ?? null,{x:event.clientX,y:event.clientY});
    if(accepted===false) returnHome();else {cleanup();onEnd(true);}
  }
  function cancel(event) {if(event && event.pointerId!==gesture?.id) return;blockedUntil=Date.now()+350;if(gesture?.active) returnHome();else cleanup();}
  function escape(event) {if(event.key==='Escape') cancel();}
  const clickAllowed=()=>!gesture?.active && !ghost.value && Date.now()>=blockedUntil;
  onBeforeUnmount(()=>{if(typeof window!=='undefined') {const active=gesture?.active;cleanup();if(active) onEnd(false);}});
  return {ghost,start,cancel,clickAllowed};
}
