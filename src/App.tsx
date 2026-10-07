import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { callNexo, DailyState, ensureSession, supabase } from './lib/nexo';
import { Handshake, HelpCircle, RefreshCw, Target, Flag, Pencil, UserRound, CloudCheck, ArrowRight } from 'lucide-react';
import { Dialog } from './components/Dialog';
import { AccountDialog } from './components/AccountDialog';
import { ContactCelebration } from './components/ContactCelebration';
import { ContactMoment, getContactMoment } from './lib/celebration';

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
  const [user,setUser]=useState<User|null>(null);
  const [showAccount,setShowAccount]=useState(false);
  const [moment,setMoment]=useState<ContactMoment|null>(null);
  const [introDismissed,setIntroDismissed]=useState(()=>{
    try{return localStorage.getItem('nexo-intro-v1')==='seen';}catch{return false;}
  });
  const previous=useRef<DailyState|null>(null);
  const userId=useRef<string|null>(null);
  const sequence=useRef(0);
  const mutating=useRef(false);
  const applyGame=useCallback((next:DailyState)=>{
    const celebration=getContactMoment(previous.current,next);
    if(celebration)setMoment(celebration);
    previous.current=next;setGame(next);
  },[]);
  const refresh=useCallback(async()=>{
    if(mutating.current) return;
    const id=++sequence.current;
    try {const result=await callNexo('state');if(id===sequence.current){applyGame(result);setError('');}}
    catch(err){if(id===sequence.current) setError(err instanceof Error?err.message:'No pudimos conectar.');}
  },[applyGame]);
  useEffect(()=>{
    if(!supabase)return;
    const timers=new Set<number>();
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      const nextId=session?.user.id || null;
      if(userId.current!==nextId){++sequence.current;previous.current=null;setGame(null);setMoment(null);setNotice('');setWord('');setClue('');setGuess('');setSecretGuess('');userId.current=nextId;}
      setUser(session?.user || null);
      // Auth callbacks are synchronous. Run client calls after its internal lock is released.
      const timer=window.setTimeout(()=>{timers.delete(timer);if(session)void refresh();else void ensureSession().catch(()=>{});},0);
      timers.add(timer);
    });
    return ()=>{subscription.unsubscribe();timers.forEach(window.clearTimeout);};
  },[refresh]);
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
  },[refresh,user?.id]);
  async function act(action:string,data:Record<string,unknown>,after?:()=>void){
    if(mutating.current) return;
    mutating.current=true;const id=++sequence.current;setBusy(true);setError('');setNotice('');
    try {const result=await callNexo(action,data);if(id===sequence.current){applyGame(result);setNotice(result.message || '');after?.();}}
    catch(err){if(id===sequence.current)setError(err instanceof Error?err.message:'No pudimos completar la operación.');}
    finally {mutating.current=false;setBusy(false);if(id!==sequence.current)void refresh();}
  }
  const contact=game?.pool[0];
  useEffect(()=>{setGuess('');},[contact?.id,contact?.version]);
  const playing=game?.progress.status==='PLAYING';
  function submit(e:FormEvent,action:string,data:Record<string,unknown>,after?:()=>void){e.preventDefault();void act(action,data,after);}
  function close(){if(!busy) setModal(null);}
  const remaining=game ? Math.max(0,game.config.maxAttempts-game.progress.attempts.length) : 0;

  return <div className="min-h-screen bg-[#FBF9F5] text-[#1A1A18] px-4 py-4 sm:px-6 sm:py-5"><main className="nexo-shell mx-auto">
    <header className="flex items-center justify-between border-b border-[#EAE5DA] pb-4"><div><h1 className="font-editorial text-4xl font-bold tracking-tight">ConTacto<span className="text-[#918771]">.</span></h1><p className="text-xs text-[#736F66] mt-1">Una palabra. Conexiones humanas.</p></div><div className="flex gap-1 items-center"><button aria-label="Actualizar partida" onClick={()=>void refresh()} disabled={busy} className="p-2.5"><RefreshCw size={18}/></button><button aria-label="Cómo jugar" className="p-2.5" onClick={()=>setModal('rules')}><HelpCircle size={20}/></button><button aria-label={user && !user.is_anonymous?'Mi cuenta':'Guardar partida o iniciar sesión'} disabled={busy || !user} className="p-2.5 sm:flex sm:items-center sm:gap-2 rounded-lg hover:bg-[#F4F0E8]" onClick={()=>setShowAccount(true)}>{user && !user.is_anonymous?<CloudCheck size={20}/>:<UserRound size={20}/>}<span className="hidden sm:inline text-xs font-semibold">{user && !user.is_anonymous?'Mi cuenta':'Guardar partida'}</span></button></div></header>
    {error && <div role="alert" className="my-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm">{error}<button className="block underline mt-2" onClick={()=>void refresh()} disabled={busy}>Volver a conectar</button></div>}
    {!game && <p className="py-14 text-center text-[#736F66]" role="status">Conectando con el ConTacto del día…</p>}
    {game && <>
      <div className="game-layout">
      <aside className="game-sidebar">
      <section className="text-center pt-5 pb-4"><p className="font-mono text-[11px] tracking-widest uppercase text-[#8C867A]">ConTacto del día · {game.day.split('-').reverse().join('/')}</p><p className="font-mono-tile text-5xl font-bold tracking-wider mt-4 mb-3 break-all" aria-label={`Prefijo descubierto: ${game.progress.prefix}`}>{!playing && game.secret ? game.secret : `${game.progress.prefix}...`}</p><p className="text-sm text-[#736F66]">{playing?'Tu pista conecta. Tu próxima letra aparece.':game.progress.status==='WON'?'🎯 ¡ConTacto RESUELTO!':'Se terminaron tus intentos por hoy.'}</p></section>
      <div className="flex justify-between rounded-xl bg-[#F4F0E8] px-4 py-3 text-xs mb-4"><span><strong>{game.progress.credits}</strong> créditos</span><span><strong>{remaining}</strong> intentos</span><span><strong>{game.progress.contacts}</strong> contactos</span></div>
      {playing && <button className="w-full flex justify-center items-center gap-2 border border-amber-300 rounded-xl bg-amber-50 py-3 font-semibold text-sm mb-4" onClick={()=>setModal('secret')}><Target size={18}/>Creo que ya sé: resolver ConTacto</button>}
      {playing && <section className={`contact-guide rounded-xl border border-[#E8E2D5] bg-white p-4 mb-4 ${introDismissed?'guide-compact':''}`} aria-label="Cómo avanzar">
        <div className="flex items-center justify-between gap-2 mb-2"><h2 className="font-semibold text-sm">Así descubrís otra letra</h2>{!introDismissed && <button className="text-xs underline text-[#736F66]" onClick={()=>{setIntroDismissed(true);try{localStorage.setItem('nexo-intro-v1','seen');}catch{}}}>Entendido</button>}</div>
        <p className="text-sm leading-relaxed">Publicás una pista <ArrowRight size={13} className="inline"/> <strong>{game.config.confirmations} {game.config.confirmations===1?'persona acierta':'personas aciertan'} tu palabra</strong> <ArrowRight size={13} className="inline"/> descubrís una letra.</p>
        {!introDismissed && <p className="text-xs text-[#736F66] mt-3">Ayudar a otros te da créditos para publicar. Las coincidencias en tu propia pista te hacen avanzar.</p>}
      </section>}
      <div className="hidden lg:block text-xs text-[#736F66] leading-relaxed pb-4">{user && !user.is_anonymous?<p className="flex gap-2 items-center"><CloudCheck size={16}/>Partida guardada en tu cuenta.</p>:<button className="text-left underline underline-offset-4" onClick={()=>setShowAccount(true)}>Guardá tu partida para seguir en otro dispositivo.</button>}</div>
      </aside>
      <div className="game-main min-w-0">
      {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 mb-4 text-sm">{notice}</p>}
      {playing && <>
        <div className="grid grid-cols-2 gap-2 mb-3" role="group" aria-label="Acciones del juego">{([['help','Ayudar a alguien'],['create','Crear mi contacto']] as const).map(([value,label])=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)} className={`rounded-xl py-3 text-sm font-semibold ${tab===value?'bg-[#1A1A18] text-white':'bg-[#F4F0E8]'}`}>{label}</button>)}</div>
        <p className="action-explainer text-xs text-[#736F66] mb-3">{tab==='help'?`Ayudás a otra persona y ganás ${game.config.answerReward} ${game.config.answerReward===1?'crédito':'créditos'}. Tu prefijo avanza cuando aciertan tu pista.`:'Esta es tu pista: cuando la comunidad acierta tu palabra, descubrís otra letra.'}</p>
        <section key={tab} aria-busy={busy} className="action-card bg-white border border-[#E8E2D5] rounded-2xl p-4 sm:p-5 mb-4">
          {tab==='help' ? contact ? <>
            <div className="flex justify-between text-xs text-[#736F66]"><span>Empieza con {contact.prefix}...</span><button onClick={()=>{setContactId(contact.id);setModal('report');}} className="flex items-center gap-1"><Flag size={13}/>Reportar</button></div>
            <p className="community-clue font-editorial text-2xl leading-snug my-4 break-words">“{contact.clue}”</p>
            <form onSubmit={e=>submit(e,'answer',{contactId:contact.id,version:contact.version,guess},()=>setGuess(''))} className="space-y-3"><label htmlFor="contact-guess" className="block text-sm">¿Qué palabra pensó?</label><input id="contact-guess" className={field} value={guess} onChange={e=>setGuess(e.target.value)} maxLength={40} autoComplete="off" required disabled={busy}/><button className={button} disabled={busy || !guess.trim()}>{busy?'Enviando respuesta…':`Enviar respuesta · +${game.config.answerReward} crédito`}</button></form><p className="text-xs text-[#736F66] mt-3">Una respuesta por pista. El contacto depende de coincidencias humanas.</p>
          </> : <div className="text-center py-5"><Handshake className="mx-auto mb-3 text-[#918771]" size={32}/><h2 className="font-editorial text-2xl">La comunidad está pensando.</h2><p className="text-sm text-[#736F66] mt-3">Todavía no hay pistas compatibles. Podés publicar la tuya con tu crédito inicial o volver en un rato.</p><button className="underline text-sm mt-4" onClick={()=>setTab('create')}>Crear una pista</button></div> : <>
            <h2 className="font-editorial text-2xl mb-2">Pensá una palabra con {game.progress.prefix}...</h2><p className="text-sm text-[#736F66] mb-4">Tu palabra queda oculta. Cuando {game.config.confirmations} {game.config.confirmations===1?'persona la acierta':'personas la aciertan'}, descubrís otra letra del ConTacto.</p>
            <form className="space-y-3" onSubmit={e=>submit(e,'create',{word,clue},()=>{setWord('');setClue('');})}><label htmlFor="private-word" className="block text-sm">Tu palabra privada</label><input id="private-word" className={field} value={word} onChange={e=>setWord(e.target.value)} maxLength={40} autoComplete="off" disabled={busy} required/><label htmlFor="clue" className="block text-sm">Una pista para que la descubran</label><textarea id="clue" className={field} rows={3} value={clue} onChange={e=>setClue(e.target.value)} minLength={8} maxLength={300} required disabled={busy}/><button className={button} disabled={busy || game.progress.credits<game.config.publishCost}>{busy?'Publicando pista…':`Publicar · ${game.config.publishCost} crédito`}</button>{game.progress.credits<game.config.publishCost && <p className="text-xs text-[#736F66]">Respondé una pista de otro jugador para obtener un crédito.</p>}</form>
          </>}
        </section>
      </>}
      {game.ownContacts.length>0 && <section className="space-y-3 mb-7"><h2 className="font-editorial text-2xl">Tus contactos</h2>{game.ownContacts.map(c=><article key={c.id} className="rounded-xl border border-[#E8E2D5] p-4 bg-white"><div className="flex justify-between gap-2 items-center"><strong>{c.word}</strong><span className="text-xs text-[#736F66]">{c.status==='CONFIRMED'?'🤝 Confirmado':c.status==='SUSPENDED'?'Suspendido':'Esperando contacto'}</span></div><p className="text-sm my-3">{c.clue}</p><p className="text-xs text-[#736F66]">{c.matches}/{c.required} coincidencias · {c.responses} respuestas</p><p className="text-xs text-[#736F66] mt-1">Claridad: {c.responses?`${Math.round(c.matches/c.responses*100)}%`:'sin datos'} · Originalidad: {c.originality}%</p>{playing && c.status==='PENDING' && <button className="mt-3 text-xs underline flex gap-1 items-center" onClick={()=>{setContactId(c.id);setEditClue(c.clue);setModal('edit');}}><Pencil size={12}/>Mejorar pista</button>}</article>)}</section>}
      {game.progress.attempts.length>0 && <p className="text-xs text-[#736F66] mb-5">Tus intentos: {game.progress.attempts.join(' · ')}</p>}
      {!playing && <div className="mb-6 text-center"><p className="text-sm mb-4">Mañana hay una nueva palabra para todos.</p><button className={button} onClick={()=>{const text=`ConTacto ${game.day}\n${game.progress.status==='WON'?'🎯 Resuelto':'Intentado'} · ${game.progress.contacts} contactos · ${game.progress.attempts.length} intentos\nhttps://contacto.sytes.net`;void navigator.clipboard.writeText(text).then(()=>setNotice('Resultado copiado, sin revelar la palabra.')).catch(()=>setError('No pudimos copiar el resultado.'));}}>Copiar resultado</button></div>}
      <p className="lg:hidden text-center text-xs text-[#736F66] mb-5">{user && !user.is_anonymous?'Tu partida se guarda automáticamente.':<button className="underline" onClick={()=>setShowAccount(true)}>Guardar partida para seguir en otro dispositivo</button>}</p>
      </div></div>
    </>}
    <section className="border-t border-[#EAE5DA] pt-5 pb-5 text-sm text-[#736F66] leading-relaxed"><details><summary className="cursor-pointer font-semibold py-3">ConTacto: juego diario de palabras en español</summary><div className="space-y-3 pt-3"><p>Una palabra secreta cada día, compartida por todos. Creá una pista: cuando dos personas aciertan tu palabra, descubrís una letra. Ayudar a otros te da créditos para publicar.</p><p>Podés jugar sin cuenta. Para continuar desde otro dispositivo, guardá tu partida con un usuario y contraseña.</p></div></details></section><footer className="border-t border-[#EAE5DA] pt-5 text-center text-xs text-[#918771]">Yo pienso una palabra. Vos la descubrís. Contacto.</footer>
  </main>
  {modal && <Dialog title={modal==='rules'?'Cómo jugar':modal==='secret'?'Resolver ConTacto':modal==='report'?'Reportar pista':'Mejorar pista'} onClose={close} busy={busy}>
    {modal==='rules' ? <><div className="space-y-4 text-sm leading-relaxed"><p>Todos buscamos la misma palabra del día. Solo ves su prefijo: <strong>C...</strong> La longitud permanece oculta.</p><p>Ayudá a otro jugador interpretando su pista. Cada respuesta suma un crédito; publicar tu propia pista cuesta un crédito.</p><p>Elegí una palabra que comience con todo tu prefijo y escribí una pista. Cuando otros coinciden con tu palabra, se confirma el contacto y descubrís una letra más.</p><p>Podés resolver el ConTacto en cualquier momento. Si fallás, consumís un intento.</p><p>Empezás con un crédito para formar el pool. No incluyas fragmentos, deletreo, longitud ni traducciones directas en tus pistas.</p><p>Podés jugar sin cuenta. Para recuperar tu partida en otro dispositivo, guardala con un usuario y contraseña desde Guardar partida.</p></div></> : modal==='secret' && game ? <><p className="text-sm mb-5">Empieza con {game.progress.prefix}... Te quedan {remaining} intentos.</p><form className="space-y-3" onSubmit={e=>submit(e,'guess',{guess:secretGuess},()=>{setModal(null);setSecretGuess('');})}><label htmlFor="secret" className="block text-sm">Creo que la palabra es</label><input autoFocus id="secret" className={field} value={secretGuess} onChange={e=>setSecretGuess(e.target.value)} required maxLength={40} disabled={busy}/><button className={button} disabled={busy}>Resolver ConTacto</button></form></> : modal==='report' ? <><form className="space-y-4" onSubmit={e=>submit(e,'report',{contactId,reason},()=>setModal(null))}><label htmlFor="report-reason" className="block text-sm">Motivo</label><select id="report-reason" className={field} value={reason} onChange={e=>setReason(e.target.value)}>{reasons.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button className={button} disabled={busy}>Enviar reporte</button></form></> : <><p className="text-sm mb-4">La nueva versión necesita nuevas coincidencias. Quienes ya respondieron no reciben otro crédito por esta pista.</p><form className="space-y-3" onSubmit={e=>submit(e,'edit',{contactId,clue:editClue},()=>setModal(null))}><label htmlFor="edit-clue" className="block text-sm">Nueva pista</label><textarea id="edit-clue" className={field} rows={4} value={editClue} onChange={e=>setEditClue(e.target.value)} minLength={8} maxLength={300} required disabled={busy}/><button className={button} disabled={busy}>Guardar pista</button></form></>}
    {error && <p role="alert" className="text-red-700 text-sm mt-4">{error}</p>}
  </Dialog>}
  {showAccount && <AccountDialog user={user} onClose={()=>setShowAccount(false)}/>}
  {moment && !modal && !showAccount && <ContactCelebration moment={moment} onClose={()=>setMoment(null)}/>}
  </div>;
}
export default App;
