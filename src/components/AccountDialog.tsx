import { FormEvent, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { CloudCheck, KeyRound, LogOut } from 'lucide-react';
import { createAccount, loginAccount, supabase } from '../lib/nexo';
import { Dialog } from './Dialog';

export function AccountDialog({user,onClose}:{user:User|null;onClose:()=>void}) {
  const [mode,setMode]=useState<'create'|'login'>('create');
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [confirmation,setConfirmation]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const saved=!!user && !user.is_anonymous;
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return;setError('');
    if(mode==='create' && password!==confirmation){setError('Las contraseñas no coinciden.');return;}
    setBusy(true);
    try {if(mode==='create')await createAccount(username,password);else await loginAccount(username,password);setPassword('');setConfirmation('');onClose();}
    catch(err){setError(err instanceof Error?err.message:'No pudimos conectar.');}
    finally {setBusy(false);}
  }
  const input='account-input';
  return <Dialog title={saved?'Tu partida está guardada':'Llevá tu NEXO con vos'} onClose={onClose} busy={busy}>
    {saved ? <><div className="rounded-xl bg-[#edf3eb] p-4 mb-5"><CloudCheck size={24} className="text-[#487047] mb-2"/><p className="font-semibold">{String(user.app_metadata.nexo_username || 'Tu cuenta')}</p><p className="text-sm text-[#736F66] mt-2">Tus pistas, créditos y letras se guardan automáticamente. Entrá con este usuario desde otro dispositivo para continuar.</p></div><button className="account-secondary flex justify-center gap-2" disabled={busy} onClick={async()=>{setBusy(true);const {error}=await supabase!.auth.signOut({scope:'local'});if(error){setError('No pudimos cerrar la sesión.');setBusy(false);}else onClose();}}><LogOut size={16}/>Cerrar sesión en este dispositivo</button></> : <>
      <p className="text-sm text-[#736F66] leading-relaxed mb-5">Podés seguir jugando sin cuenta. Si creás una, conservás tu partida y podés continuar desde el celular o la computadora.</p>
      <div className="grid grid-cols-2 rounded-xl bg-[#F4F0E8] p-1 mb-5">{([['create','Guardar mi partida'],['login','Ya tengo cuenta']] as const).map(([value,label])=><button key={value} type="button" disabled={busy} aria-pressed={mode===value} className={`py-2.5 rounded-lg text-sm font-semibold ${mode===value?'bg-white shadow-sm':''}`} onClick={()=>{setMode(value);setError('');setPassword('');setConfirmation('');}}>{label}</button>)}</div>
      <form onSubmit={submit} className="space-y-4">
        <div><label htmlFor="account-username" className="block text-sm font-semibold mb-2">{mode==='create'?'Elegí un usuario':'Tu usuario'}</label><input id="account-username" className={input} value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" disabled={busy}/>{mode==='create' && <p className="text-xs text-[#736F66] mt-2">3 a 24 letras sin tildes, números o guion bajo.</p>}</div>
        <div><label htmlFor="account-password" className="block text-sm font-semibold mb-2">Contraseña</label><input id="account-password" className={input} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='create'?'new-password':'current-password'} minLength={mode==='create'?10:undefined} maxLength={128} required disabled={busy}/>{mode==='create' && <p className="text-xs text-[#736F66] mt-2">Al menos 10 caracteres. Guardala para volver a entrar.</p>}</div>
        {mode==='create' && <div><label htmlFor="account-confirmation" className="block text-sm font-semibold mb-2">Repetí la contraseña</label><input id="account-confirmation" className={input} type="password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required disabled={busy}/></div>}
        {mode==='login' && <p className="text-xs text-[#736F66] rounded-lg bg-[#F4F0E8] p-3">Abrirás la partida guardada de esa cuenta. La partida de invitado de este dispositivo no se combina con ella.</p>}
        <button className="account-primary flex justify-center gap-2 items-center" disabled={busy}><KeyRound size={16}/>{busy?'Conectando…':mode==='create'?'Crear cuenta y guardar partida':'Entrar y recuperar mi partida'}</button>
      </form>
      <p className="text-xs text-[#736F66] mt-4">No pedimos tu correo. Por ahora no hay recuperación de contraseña: guardá tus datos de acceso.</p>
      <button type="button" className="block mx-auto text-sm underline mt-4" disabled={busy} onClick={onClose}>Seguir jugando sin cuenta</button>
    </>}
    {error && <p role="alert" className="text-sm text-red-700 mt-4">{error}</p>}
  </Dialog>;
}
