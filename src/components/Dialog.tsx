import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Dialog({title,onClose,busy=false,children}:{title:string;onClose:()=>void;busy?:boolean;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  const closeRef=useRef(onClose);
  closeRef.current=onClose;
  useEffect(()=>{
    const dialog=ref.current!;
    const previous=document.activeElement as HTMLElement|null;
    dialog.showModal();
    return ()=>{dialog.close();previous?.focus();};
  },[]);
  return <dialog ref={ref} aria-label={title} className="nexo-dialog" onCancel={e=>{e.preventDefault();if(!busy)closeRef.current();}} onClick={e=>{if(e.target===e.currentTarget && !busy)closeRef.current();}}>
    <div className="dialog-content"><div className="flex items-start justify-between gap-4 mb-5"><h2 className="font-editorial text-3xl">{title}</h2><button type="button" aria-label="Cerrar" className="p-2 rounded-full hover:bg-[#F4F0E8]" disabled={busy} onClick={onClose}><X size={20}/></button></div>{children}</div>
  </dialog>;
}
