import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
const origins = new Set(['https://nexo-eight-alpha.vercel.app','https://nexo-lucasclemente08s-projects.vercel.app','http://localhost:5173']);
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async (req: Request) => {
  const origin=req.headers.get('origin') || '';
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://nexo-eight-alpha.vercel.app','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(req.method==='OPTIONS') return new Response(null,{headers});
  if(req.method!=='POST') return reply({error:'Método no permitido.'},405);
  if(origin && !origins.has(origin)) return reply({error:'Origen no permitido.'},403);
  const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token) return reply({error:'Necesitás una sesión para jugar.'},401);
  // The player ID comes from verified Auth, never from the request body.
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError || !user) return reply({error:'La sesión venció. Volvé a abrir el juego.'},401);
  try {
    const raw=await req.text();
    if(raw.length>4096) return reply({error:'Solicitud demasiado grande.'},413);
    const body=JSON.parse(raw);
    if(body.action==='register') {
      if(!user.is_anonymous) return reply({error:'Esta sesión ya tiene una cuenta.'},400);
      const username=typeof body.data?.username==='string'?body.data.username.trim().toLowerCase():'';
      const password=body.data?.password;
      if(!/^[a-z0-9_]{3,24}$/.test(username)) return reply({error:'Usá entre 3 y 24 letras sin tildes, números o guion bajo.'},400);
      if(typeof password!=='string' || password.length<10 || password.length>128) return reply({error:'La contraseña debe tener entre 10 y 128 caracteres.'},400);
      // This is a username identity, not a real email. Never send mail to this reserved domain.
      // Updating the existing UUID preserves every contact and all progress under RLS.
      const {data,error}=await admin.auth.admin.updateUserById(user.id,{
        email:`${username}@players.nexo.invalid`,password,email_confirm:true,
        app_metadata:{...user.app_metadata,nexo_username:username},
      });
      if(error) return reply({error:error.code==='email_exists'?'Ese usuario ya está en uso. Elegí otro o iniciá sesión.':'No pudimos crear la cuenta. Probá otro usuario o una contraseña más segura.'},400);
      if(data.user?.is_anonymous) return reply({error:'No pudimos vincular la cuenta. Intentá nuevamente.'},500);
      return reply({username,message:'Tu cuenta está lista. Conservaste toda tu partida.'});
    }
    if(!['state','create','answer','edit','report','guess'].includes(body.action)) return reply({error:'Operación inválida.'},400);
    const {data,error}=await admin.rpc('nexo_api',{p_player:user.id,p_action:body.action,p_data:body.data || {}});
    if(error) return reply({error:error.code==='P0001'?error.message:'No pudimos procesar la operación. Actualizá e intentá de nuevo.'},400);
    return reply(data);
  } catch {return reply({error:'Solicitud inválida.'},400);}
});
