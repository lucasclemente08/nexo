import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Dialog({title,onClose,busy=false,children}:{title:string;onClose:()=>void;busy?:boolean;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  const closeRef=useRef(onClose);
  const closing=useRef(false);
  const exit=useRef<Animation|null>(null);
  closeRef.current=onClose;
  function requestClose(){
    if(busy || closing.current)return;
    const dialog=ref.current;
    if(!dialog || window.matchMedia('(prefers-reduced-motion: reduce)').matches){closeRef.current();return;}
    closing.current=true;
    exit.current=dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(6px) scale(.98)'}],{duration:120,easing:'ease-in',fill:'forwards'});
    void exit.current.finished.then(()=>closeRef.current()).catch(()=>{});
  }
  useEffect(()=>{
    const dialog=ref.current!;
    const previous=document.activeElement as HTMLElement|null;
    dialog.showModal();
    return ()=>{exit.current?.cancel();closing.current=false;dialog.close();previous?.focus();};
  },[]);
  return <dialog ref={ref} aria-label={title} aria-busy={busy} className="nexo-dialog" onCancel={e=>{e.preventDefault();requestClose();}} onClick={e=>{if(e.target===e.currentTarget)requestClose();}}>
    <div className="dialog-content"><div className="flex items-start justify-between gap-4 mb-5"><h2 className="font-editorial text-3xl">{title}</h2><button type="button" aria-label="Cerrar" className="p-2 rounded-full hover:bg-[#F4F0E8]" disabled={busy} onClick={requestClose}><X size={20}/></button></div>{children}</div>
  </dialog>;
}
