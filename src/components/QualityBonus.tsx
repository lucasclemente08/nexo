import { Gift } from 'lucide-react';
import type { DailyState } from '../lib/nexo';
export function QualityBonus({game,busy,onRedeem}:{game:DailyState;busy:boolean;onRedeem:(contactId:string)=>void}) {
  if(game.progress.status!=='PLAYING' || !game.bonus)return null;
  const eligible=game.ownContacts.find(contact=>contact.qualityEligible);
  return <section className="rounded-xl border border-[#E8D8AF] bg-[#FFF9EB] p-4 mb-4" aria-label="Bonus por buenas pistas">
    <h2 className="flex items-center gap-2 font-semibold text-sm"><Gift size={18}/> {game.bonus.used?'Bonus del día usado':game.bonus.available?'¡Ganaste una letra extra!':'Tus buenas pistas tienen premio'}</h2>
    <p className="text-sm mt-2">{game.bonus.used?'Ya canjeaste tu letra extra. Mañana podés conseguir otro bonus.':game.bonus.available?'La comunidad valoró tu pista. Podés descubrir ahora la siguiente letra del ConTacto.':'Pista confirmada + 3 valoraciones con promedio de 4/5 o más + 60 % de aciertos. La pista debe tener al menos tres palabras y no revelar la respuesta.'}</p>
    {game.bonus.available && eligible && <button type="button" onClick={()=>onRedeem(eligible.id)} disabled={busy} className="rounded-xl bg-[#1A1A18] text-white px-4 py-3 text-sm font-semibold mt-3 disabled:opacity-40">{busy?'Descubriendo…':'Canjear una letra extra'}</button>}
    {!game.bonus.used && <p className="text-xs text-[#736F66] mt-2">Sin IA · Un bonus por día · Canje opcional mientras tengas intentos.</p>}
  </section>;
}
