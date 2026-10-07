import { useState } from 'react';
import { Star } from 'lucide-react';
import type { CommunityContact } from '../lib/nexo';
const labels=['Muy confusa','Poco clara','Aceptable','Clara','Muy clara'];
export function ClueRating({contact,busy,onRate}:{contact:CommunityContact;busy:boolean;onRate:(score:number)=>void}) {
  const [score,setScore]=useState(0);
  return <section className="action-card rounded-xl border border-[#D5E2D8] bg-[#F1F6F0] p-4 mb-4" aria-label="Valorar una pista respondida">
    <h2 className="font-semibold text-sm">¿Qué tan clara fue esta pista?</h2>
    <p className="text-sm my-3 break-words">“{contact.clue}”</p>
    <div role="group" aria-label="Elegí de 1 a 5 estrellas" className="flex gap-1">{labels.map((label,i)=><button key={label} type="button" aria-label={`${i+1} ${i===0?'estrella':'estrellas'}: ${label}`} aria-pressed={score===i+1} disabled={busy} onClick={()=>setScore(i+1)} className="rounded-lg p-2.5 hover:bg-white text-[#38634D]"><Star size={24} fill={score>=i+1?'currentColor':'none'}/></button>)}</div>
    <p className="text-xs text-[#536354] mt-2" role="status">{score?labels[score-1]:'Valorás la claridad, aunque no hayas acertado.'}</p>
    <button type="button" disabled={busy || !score} onClick={()=>onRate(score)} className="mt-3 rounded-xl bg-[#38634D] text-white px-4 py-3 text-sm font-semibold disabled:opacity-40">{busy?'Guardando…':'Enviar valoración'}</button>
    <p className="text-xs text-[#536354] mt-2">Un voto por pista. No cambia créditos ni letras y no suspende la pista.</p>
  </section>;
}
