import { useEffect } from 'react';
import { Handshake } from 'lucide-react';
import type { ContactMoment } from '../lib/celebration';
import { Dialog } from './Dialog';

export function ContactCelebration({moment,onClose}:{moment:ContactMoment;onClose:()=>void}) {
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let cancelled=false;
    void import('canvas-confetti').then(({default:confetti})=>{if(!cancelled)confetti({particleCount:45,spread:65,origin:{y:0.55},colors:['#487047','#b8cda4','#c2a16a'],disableForReducedMotion:true});});
    return ()=>{cancelled=true;};
  },[]);
  return <Dialog title={moment.count>1?'¡Contactos confirmados!':'¡Contacto confirmado!'} onClose={onClose}>
    <div className="text-center"><div className="contact-handshake mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#edf3eb] text-[#487047]"><Handshake size={42}/></div><p className="text-sm text-[#736F66] mb-5">Otras personas entendieron tu pista.<br/>Pensaron la misma palabra que vos.</p><p className="text-xs uppercase tracking-widest text-[#736F66] mb-3">{moment.complete?'Encontraste el ConTacto':'Tu nueva letra'}</p><div className="font-mono-tile text-4xl font-bold tracking-wider mb-6 break-all">{moment.before}<span className="new-contact-letter text-[#487047]">{moment.after.slice(moment.before.length)}</span>{!moment.complete && <span className="text-[#918771]">...</span>}</div><button className="account-primary" onClick={onClose}>{moment.complete?'Ver mi resultado':'Seguir jugando'}</button></div>
  </Dialog>;
}
