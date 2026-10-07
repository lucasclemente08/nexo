import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { callNexo, DailyState, ensureSession, supabase } from './lib/nexo';
import { Handshake, HelpCircle, RefreshCw, Target, Flag, Pencil, X } from 'lucide-react';

const reasons=[['fragment','Revela parte de la palabra'],['spelling','Deletrea la respuesta'],['translation','Da la traducción directamente'],['inappropriate','Contenido inapropiado'],['other','Otro']];
const field='w-full rounded-xl border border-[#DCD6C9] bg-white px-4 py-3 text-base outline-none focus:border-[#1A1A18] focus:ring-1 focus:ring-[#1A1A18]';
const button='w-full rounded-xl bg-[#1A1A18] px-4 py-3 text-white font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-wait';

export function App() {
  const [game,setGame]=useState<DailyState|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [tab,setTab]=useState<'help'|'create'>('help');
  const [word,setWord]=useState('');
  const [clue,setClue]=useState('');
  const [guess,setGuess]=useState('');
  const [secretGuess,setSecretGuess]=useState('');
  const [modal,setModal]=useState<'rules'|'secret'|'report'|'edit'|null>(null);
  const [contactId,setContactId]=useState('');
  const [reason,setReason]=useState('fragment');
  const [editClue,setEditClue]=useState('');
  const sequence=useRef(0);
  const mutating=useRef(false);
  const refresh=useCallback(async()=>{
    if(mutating.current) return;
    const id=++sequence.current;
    try {const result=await callNexo('state');if(id===sequence.current){setGame(result);setError('');}}
    catch(err){if(id===sequence.current) setError(err instanceof Error?err.message:'No pudimos conectar.');}
  },[]);
  useEffect(()=>{
    void refresh();
    const interval=window.setInterval(()=>{if(document.visibilityState==='visible') void refresh();},15000);
    const focus=()=>{void refresh();};window.addEventListener('focus',focus);
    let channel:ReturnType<NonNullable<typeof supabase>['channel']>|undefined;
    let cancelled=false;
    void ensureSession().then(playerId=>{
      if(cancelled || !supabase) return;
      channel=supabase.channel(`progress-${playerId}`).on('postgres_changes',{event:'*',schema:'public',table:'player_progress',filter:`player_id=eq.${playerId}`},()=>{void refresh();}).subscribe();
    }).catch(()=>{});
    return ()=>{cancelled=true;++sequence.current;window.clearInterval(interval);window.removeEventListener('focus',focus);if(channel && supabase) void supabase.removeChannel(channel);};
  },[refresh]);
  async function act(action:string,data:Record<string,unknown>,after?:()=>void){
    if(mutating.current) return;
    mutating.current=true;++sequence.current;setBusy(true);setError('');setNotice('');
    try {const result=await callNexo(action,data);setGame(result);setNotice(result.message || '');after?.();}
    catch(err){setError(err instanceof Error?err.message:'No pudimos completar la operación.');}
    finally {mutating.current=false;setBusy(false);}
  }
  const contact=game?.pool[0];
  useEffect(()=>{setGuess('');},[contact?.id,contact?.version]);
  const playing=game?.progress.status==='PLAYING';
  function submit(e:FormEvent,action:string,data:Record<string,unknown>,after?:()=>void){e.preventDefault();void act(action,data,after);}
  function close(){if(!busy) setModal(null);}
  const remaining=game ? Math.max(0,game.config.maxAttempts-game.progress.attempts.length) : 0;

  return <div className="min-h-screen bg-[#FBF9F5] text-[#1A1A18] px-5 py-7"><main className="mx-auto max-w-[480px]">
    <header className="flex items-center justify-between border-b border-[#EAE5DA] pb-5"><div><h1 className="font-editorial text-4xl font-bold tracking-tight">NEXO<span className="text-[#918771]">.</span></h1><p className="text-xs text-[#736F66] mt-1">Una palabra. Conexiones humanas.</p></div><div className="flex gap-3"><button aria-label="Actualizar partida" onClick={()=>void refresh()} disabled={busy} className="p-2"><RefreshCw size={19}/></button><button aria-label="Cómo jugar" className="p-2" onClick={()=>setModal('rules')}><HelpCircle size={21}/></button></div></header>
    {error && <div role="alert" className="my-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm">{error}<button className="block underline mt-2" onClick={()=>void refresh()} disabled={busy}>Volver a conectar</button></div>}
    {!game && <p className="py-14 text-center text-[#736F66]" role="status">Conectando con el NEXO del día…</p>}
    {game && <>
      <section className="text-center py-8"><p className="font-mono text-[11px] tracking-widest uppercase text-[#8C867A]">NEXO del día · {game.day.split('-').reverse().join('/')}</p><p className="font-mono-tile text-5xl font-bold tracking-wider mt-5 mb-4 break-all" aria-label={`Prefijo descubierto: ${game.progress.prefix}`}>{!playing && game.secret ? game.secret : `${game.progress.prefix}...`}</p><p className="text-sm text-[#736F66]">{playing?'La próxima letra llega cuando otros entienden tu pista.':game.progress.status==='WON'?'🎯 ¡NEXO RESUELTO!':'Se terminaron tus intentos por hoy.'}</p></section>
      <div className="flex justify-between rounded-xl bg-[#F4F0E8] px-4 py-3 text-xs mb-4"><span><strong>{game.progress.credits}</strong> créditos</span><span><strong>{remaining}</strong> intentos</span><span><strong>{game.progress.contacts}</strong> contactos</span></div>
      {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 mb-4 text-sm">{notice}</p>}
      {playing && <>
        <button className="w-full flex justify-center items-center gap-2 border border-amber-300 rounded-xl bg-amber-50 py-3 font-semibold text-sm mb-6" onClick={()=>setModal('secret')}><Target size={18}/>Creo que ya sé: resolver NEXO</button>
        <div className="grid grid-cols-2 gap-2 mb-4" role="tablist" aria-label="Acciones del juego">{([['help','Ayudar a alguien'],['create','Crear mi contacto']] as const).map(([value,label])=><button key={value} role="tab" aria-selected={tab===value} onClick={()=>setTab(value)} className={`rounded-xl py-3 text-sm font-semibold ${tab===value?'bg-[#1A1A18] text-white':'bg-[#F4F0E8]'}`}>{label}</button>)}</div>
        <section className="bg-white border border-[#E8E2D5] rounded-2xl p-5 mb-6">
          {tab==='help' ? contact ? <>
            <div className="flex justify-between text-xs text-[#736F66]"><span>Empieza con {contact.prefix}...</span><button onClick={()=>{setContactId(contact.id);setModal('report');}} className="flex items-center gap-1"><Flag size={13}/>Reportar</button></div>
            <p className="font-editorial text-2xl leading-snug my-6">“{contact.clue}”</p>
            <form onSubmit={e=>submit(e,'answer',{contactId:contact.id,version:contact.version,guess},()=>setGuess(''))} className="space-y-3"><label htmlFor="contact-guess" className="block text-sm">¿Qué palabra pensó?</label><input id="contact-guess" className={field} value={guess} onChange={e=>setGuess(e.target.value)} maxLength={40} autoComplete="off" required disabled={busy}/><button className={button} disabled={busy || !guess.trim()}>Enviar respuesta · +{game.config.answerReward} crédito</button></form><p className="text-xs text-[#736F66] mt-3">Una respuesta por pista. El contacto depende de coincidencias humanas.</p>
          </> : <div className="text-center py-5"><Handshake className="mx-auto mb-3 text-[#918771]" size={32}/><h2 className="font-editorial text-2xl">La comunidad está pensando.</h2><p className="text-sm text-[#736F66] mt-3">Todavía no hay pistas compatibles. Podés publicar la tuya con tu crédito inicial o volver en un rato.</p><button className="underline text-sm mt-4" onClick={()=>setTab('create')}>Crear una pista</button></div> : <>
            <h2 className="font-editorial text-2xl mb-2">Pensá una palabra con {game.progress.prefix}...</h2><p className="text-sm text-[#736F66] mb-5">Tu palabra queda oculta. {game.config.confirmations} coincidencias de otros jugadores revelan una nueva letra.</p>
            <form className="space-y-3" onSubmit={e=>submit(e,'create',{word,clue},()=>{setWord('');setClue('');})}><label htmlFor="private-word" className="block text-sm">Tu palabra privada</label><input id="private-word" className={field} value={word} onChange={e=>setWord(e.target.value)} maxLength={40} autoComplete="off" disabled={busy} required/><label htmlFor="clue" className="block text-sm">Una pista para que la descubran</label><textarea id="clue" className={field} rows={3} value={clue} onChange={e=>setClue(e.target.value)} minLength={8} maxLength={300} required disabled={busy}/><button className={button} disabled={busy || game.progress.credits<game.config.publishCost}>Publicar · {game.config.publishCost} crédito</button>{game.progress.credits<game.config.publishCost && <p className="text-xs text-[#736F66]">Respondé una pista de otro jugador para obtener un crédito.</p>}</form>
          </>}
        </section>
      </>}
      {game.ownContacts.length>0 && <section className="space-y-3 mb-7"><h2 className="font-editorial text-2xl">Tus contactos</h2>{game.ownContacts.map(c=><article key={c.id} className="rounded-xl border border-[#E8E2D5] p-4 bg-white"><div className="flex justify-between gap-2 items-center"><strong>{c.word}</strong><span className="text-xs text-[#736F66]">{c.status==='CONFIRMED'?'🤝 Confirmado':c.status==='SUSPENDED'?'Suspendido':'Esperando contacto'}</span></div><p className="text-sm my-3">{c.clue}</p><p className="text-xs text-[#736F66]">{c.matches}/{c.required} coincidencias · {c.responses} respuestas</p><p className="text-xs text-[#736F66] mt-1">Claridad: {c.responses?`${Math.round(c.matches/c.responses*100)}%`:'sin datos'} · Originalidad: {c.originality}%</p>{playing && c.status==='PENDING' && <button className="mt-3 text-xs underline flex gap-1 items-center" onClick={()=>{setContactId(c.id);setEditClue(c.clue);setModal('edit');}}><Pencil size={12}/>Mejorar pista</button>}</article>)}</section>}
      {game.progress.attempts.length>0 && <p className="text-xs text-[#736F66] mb-5">Tus intentos: {game.progress.attempts.join(' · ')}</p>}
      {!playing && <div className="mb-6 text-center"><p className="text-sm mb-4">Mañana hay una nueva palabra para todos.</p><button className={button} onClick={()=>{const text=`NEXO ${game.day}\n${game.progress.status==='WON'?'🎯 Resuelto':'Intentado'} · ${game.progress.contacts} contactos · ${game.progress.attempts.length} intentos\nhttps://nexo-eight-alpha.vercel.app`;void navigator.clipboard.writeText(text).then(()=>setNotice('Resultado copiado, sin revelar la palabra.')).catch(()=>setError('No pudimos copiar el resultado.'));}}>Copiar resultado</button></div>}
    </>}
    <footer className="border-t border-[#EAE5DA] pt-5 text-center text-xs text-[#918771]">Yo pienso una palabra. Vos la descubrís. Contacto.</footer>
  </main>
  {modal && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5" onClick={close}><section role="dialog" aria-modal="true" aria-label={modal==='rules'?'Cómo jugar':modal==='secret'?'Resolver NEXO':modal==='report'?'Reportar pista':'Mejorar pista'} className="w-full max-w-[440px] max-h-[90vh] overflow-auto rounded-2xl bg-[#FBF9F5] p-6" onClick={e=>e.stopPropagation()}><button aria-label="Cerrar" className="float-right p-1" disabled={busy} onClick={close}><X size={20}/></button>
    {modal==='rules' ? <><h2 className="font-editorial text-3xl mb-5">Cómo se juega</h2><div className="space-y-4 text-sm leading-relaxed"><p>Todos buscamos la misma palabra del día. Solo ves su prefijo: <strong>C...</strong> La longitud permanece oculta.</p><p>Ayudá a otro jugador interpretando su pista. Cada respuesta suma un crédito; publicar tu propia pista cuesta un crédito.</p><p>Elegí una palabra que comience con todo tu prefijo y escribí una pista. Cuando otros coinciden con tu palabra, se confirma el contacto y descubrís una letra más.</p><p>Podés resolver el NEXO en cualquier momento. Si fallás, consumís un intento.</p><p>Empezás con un crédito para formar el pool. No incluyas fragmentos, deletreo, longitud ni traducciones directas en tus pistas.</p><p>Tu progreso queda asociado a este navegador. Si borrás sus datos o usás otro dispositivo, empezás con otra sesión.</p></div></> : modal==='secret' && game ? <><h2 className="font-editorial text-3xl mb-3">¿Ya lo tenés?</h2><p className="text-sm mb-5">Empieza con {game.progress.prefix}... Te quedan {remaining} intentos.</p><form className="space-y-3" onSubmit={e=>submit(e,'guess',{guess:secretGuess},()=>{setModal(null);setSecretGuess('');})}><label htmlFor="secret" className="block text-sm">Creo que la palabra es</label><input autoFocus id="secret" className={field} value={secretGuess} onChange={e=>setSecretGuess(e.target.value)} required maxLength={40} disabled={busy}/><button className={button} disabled={busy}>Resolver NEXO</button></form></> : modal==='report' ? <><h2 className="font-editorial text-3xl mb-5">Reportar pista</h2><form className="space-y-4" onSubmit={e=>submit(e,'report',{contactId,reason},()=>setModal(null))}><label htmlFor="report-reason" className="block text-sm">Motivo</label><select id="report-reason" className={field} value={reason} onChange={e=>setReason(e.target.value)}>{reasons.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button className={button} disabled={busy}>Enviar reporte</button></form></> : <><h2 className="font-editorial text-3xl mb-5">Mejorar tu pista</h2><p className="text-sm mb-4">La nueva versión necesita nuevas coincidencias. Quienes ya respondieron no reciben otro crédito por esta pista.</p><form className="space-y-3" onSubmit={e=>submit(e,'edit',{contactId,clue:editClue},()=>setModal(null))}><label htmlFor="edit-clue" className="block text-sm">Nueva pista</label><textarea id="edit-clue" className={field} rows={4} value={editClue} onChange={e=>setEditClue(e.target.value)} minLength={8} maxLength={300} required disabled={busy}/><button className={button} disabled={busy}>Guardar pista</button></form></>}
    {error && <p role="alert" className="text-red-700 text-sm mt-4">{error}</p>}
  </section></div>}
  </div>;
}
export default App;
