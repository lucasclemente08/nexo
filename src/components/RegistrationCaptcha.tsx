import { useEffect, useRef, useState } from 'react';
interface Turnstile {render:(element:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void}
declare global {interface Window {turnstile?:Turnstile}}
let scriptReady:Promise<void>|null=null;
function loadScript():Promise<void> {
  if(window.turnstile)return Promise.resolve();
  if(scriptReady)return scriptReady;
  scriptReady=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;
    const timer=window.setTimeout(()=>{script.remove();reject(new Error('Timeout'));},15000);
    script.onload=()=>{window.clearTimeout(timer);resolve();};script.onerror=()=>{window.clearTimeout(timer);script.remove();reject(new Error('Load failed'));};
    document.head.append(script);
  }).catch(error=>{scriptReady=null;throw error;});
  return scriptReady;
}
export function RegistrationCaptcha({siteKey,onToken}:{siteKey:string;onToken:(token:string)=>void}) {
  const container=useRef<HTMLDivElement>(null);const callback=useRef(onToken);callback.current=onToken;
  const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let cancelled=false;let widget:string|undefined;setError('');callback.current('');
    void loadScript().then(()=>{
      if(cancelled || !container.current || !window.turnstile)return;
      widget=window.turnstile.render(container.current,{sitekey:siteKey,action:'register',language:'es',size:'flexible',callback:(token:string)=>{if(!cancelled){setError('');callback.current(token);}},'expired-callback':()=>{if(!cancelled){callback.current('');setError('La verificación venció. Reintentá.');}},'error-callback':()=>{if(!cancelled){callback.current('');setError('No pudimos completar la verificación. Reintentá.');}return true;}});
    }).catch(()=>{if(!cancelled)setError('No pudimos cargar la verificación. Revisá tu conexión o bloqueador.');});
    return ()=>{cancelled=true;if(widget)window.turnstile?.remove(widget);};
  },[siteKey,attempt]);
  return <div><p className="text-sm mb-2">Verificación de seguridad</p><div ref={container}/>{error && <p role="alert" className="text-sm text-red-700 mt-2">{error}<button type="button" className="underline block py-3" onClick={()=>setAttempt(value=>value+1)}>Reintentar CAPTCHA</button></p>}</div>;
}
