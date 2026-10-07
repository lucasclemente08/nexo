import { createClient } from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase=url && key ? createClient(url,key) : null;
export interface CommunityContact {id:string;prefix:string;clue:string;version:number}
export interface OwnContact {id:string;prefix:string;word:string;clue:string;status:'PENDING'|'CONFIRMED'|'SUSPENDED';required:number;matches:number;responses:number;originality:number}
export interface DailyState {
  day:string;
  progress:{day:string;prefix:string;status:'PLAYING'|'WON'|'LOST';credits:number;attempts:string[];contacts:number;started_at:string;finished_at:string|null};
  config:{confirmations:number;maxAttempts:number;publishCost:number;answerReward:number};
  ownContacts:OwnContact[];pool:CommunityContact[];secret:string|null;message?:string;correct?:boolean;
}
let sessionPromise:Promise<string>|null=null;
export function ensureSession():Promise<string> {
  if(!supabase) return Promise.reject(new Error('Falta configurar la conexión con Supabase.'));
  if(sessionPromise) return sessionPromise;
  const client=supabase;
  sessionPromise=(async()=>{
    const {data:{session},error}=await client.auth.getSession();
    if(error) throw error;
    if(session) return session.user.id;
    const {data,error:signInError}=await client.auth.signInAnonymously();
    if(signInError) throw new Error('No pudimos iniciar tu sesión. Intentá de nuevo en unos minutos.');
    return data.user!.id;
  })().finally(()=>{sessionPromise=null;});
  return sessionPromise;
}
export async function callNexo(action:string,data:Record<string,unknown>={}):Promise<DailyState> {
  return requestNexo<DailyState>(action,data);
}
export async function requestNexo<T>(action:string,data:Record<string,unknown>={}):Promise<T> {
  if(!supabase) throw new Error('Falta configurar la conexión con Supabase.');
  await ensureSession();
  const {data:{session}}=await supabase.auth.getSession();
  if(!session) throw new Error('La sesión venció. Volvé a abrir el juego.');
  let response:Response;
  try {
    response=await fetch(`${url}/functions/v1/nexo`,{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action,data:action==='state'?data:{...data,requestId:data.requestId || crypto.randomUUID()}})});
  } catch {
    throw new Error('La conexión tardó demasiado o se interrumpió. Actualizá la partida antes de repetir la acción.');
  }
  const result=await response.json();
  if(!response.ok) throw new Error(result.error || 'No pudimos conectar con ConTacto.');
  return result;
}

export async function createAccount(username:string,password:string) {
  await requestNexo('register',{username,password});
  const {error}=await supabase!.auth.signInWithPassword({email:`${username.trim().toLowerCase()}@players.nexo.invalid`,password});
  if(error) throw new Error('La cuenta se creó. Iniciá sesión con tu usuario y contraseña.');
}
export async function loginAccount(username:string,password:string) {
  const handle=username.trim().toLowerCase();
  if(!/^[a-z0-9_]{3,24}$/.test(handle)) throw new Error('Revisá el nombre de usuario.');
  const {error}=await supabase!.auth.signInWithPassword({email:`${handle}@players.nexo.invalid`,password});
  if(error) throw new Error(error.status===429?'Demasiados intentos. Esperá unos minutos.':'El usuario o la contraseña no son correctos.');
}
