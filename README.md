# NEXO

Juego diario de palabras en español, con contactos creados y resueltos por la comunidad. React + Vite en Vercel; Auth, PostgreSQL, Edge Functions y Realtime en Supabase.

## Desarrollo

```sh
npm ci
# Copiar .env.example a .env.local y configurar URL y clave pública.
npm run dev
npm test
npm run build
```

## Configuración de Supabase y Vercel

1. Crear un proyecto dedicado de Supabase, preferentemente en São Paulo (`sa-east-1`).
2. Aplicar `supabase/schema.sql` una única vez en ese proyecto. Es el esquema inicial; los cambios posteriores deben hacerse con migraciones incrementales.
3. Habilitar los inicios de sesión anónimos en Authentication > Sign In / Providers. El navegador guarda la sesión; no hay que registrarse para jugar.
4. Desplegar `supabase/functions/nexo/index.ts` como Edge Function `nexo`, con verificación JWT habilitada. La función además verifica el usuario con Auth antes de llamar a la API de la base de datos.
5. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en Vercel (production, preview y development). Ninguna clave de servicio debe llegar al frontend. Las claves de servidor son las variables incorporadas del entorno de Edge Functions.
6. Compilar y desplegar en el proyecto existente `lucasclemente08s-projects/nexo`.

Las solicitudes de navegador se aceptan desde los dos dominios de producción de NEXO y `localhost:5173`. Para probar otro dominio de preview, agregar su origen exacto al conjunto `origins` de la Edge Function.

## Reglas y datos

- La palabra diaria se elige en el servidor al iniciar la primera sesión de ese día y permanece fija para todos. El día cambia a medianoche de Argentina. El banco inicial tiene 32 palabras y puede repetir palabras en días posteriores.
- Durante una partida solo se envía el prefijo conocido. No se envían la palabra secreta, su longitud ni las respuestas de otros contactos.
- Una respuesta a una pista suma un crédito, acierte o no. Publicar cuesta un crédito. Hay un crédito inicial por día para formar el pool sin contactos ficticios.
- Dos usuarios distintos deben coincidir con la palabra privada del creador para confirmar un contacto. El creador recibe una letra; resolver una pista ajena aporta créditos, no letras.
- Cada usuario responde una sola vez por pista, incluso si cambia la pista. Al editar se reinicia el conteo de coincidencias para la nueva versión. Los usuarios que ya respondieron no reciben otro crédito.
- Tres reportes de usuarios distintos suspenden una pista. No hay moderación con IA ni un panel administrativo en esta versión.
- Claridad = aciertos / respuestas de la versión actual. Originalidad = 100 × (1 − frecuencia de esa palabra entre contactos del mismo prefijo y día). Ambas métricas pueden cambiar al crecer la muestra.
- Los intentos para resolver el NEXO son limitados. Al terminar se muestra la solución. El último contacto también puede completar la palabra y ganar la partida.
- El resultado compartido no incluye la palabra secreta.

Los valores son configurables desde `nexo_private.settings` mediante una conexión administrativa:

```sql
update nexo_private.settings
set confirmations = 2, max_attempts = 3, initial_credits = 1,
    publish_cost = 1, answer_reward = 1, report_threshold = 3
where id = true;
```

El número de confirmaciones se guarda al crear cada pista; modificarlo afecta pistas nuevas. Los demás valores se consultan en cada operación. Cambiar reglas durante una partida puede afectar a los jugadores de ese día.

## Acceso y consistencia

Las palabras, contactos, respuestas y reportes viven en un esquema privado sin acceso para `anon` o `authenticated`. La API SQL usa `SECURITY INVOKER`, solo es ejecutable por `service_role` y recibe el ID de jugador exclusivamente desde la función que verifica la sesión.

`public.player_progress` permite lectura únicamente del progreso propio mediante RLS. Los navegadores no pueden modificar créditos, prefijos o resultados. Realtime publica solo ese progreso; el pool se actualiza también cada 15 segundos y al recuperar el foco.

Un bloqueo transaccional diario serializa operaciones para evitar doble cobro, doble revelación y bloqueos cruzados. Un identificador de operación permite deduplicar solicitudes. Hay un límite de 30 operaciones de escritura por usuario y minuto. Este enfoque es adecuado para el inicio del juego; conviene revisar contención antes de crecer a tráfico elevado.

Las sesiones anónimas identifican sesiones, no prueban que dos cuentas pertenezcan a personas distintas. Borrar datos del navegador crea otra identidad. Antes de una difusión masiva, incorporar CAPTCHA/Turnstile y límites de creación de cuentas; para recuperar progreso entre dispositivos, ofrecer vinculación con una cuenta.

## Validación

`npm test` ejecuta el esquema en PostgreSQL local mediante PGlite y comprueba secretos ocultos, prefijos, créditos, deduplicación, validaciones independientes, edición de pistas, reportes, límites de intentos y RLS. La publicación Realtime y el login anónimo requieren verificación adicional contra el proyecto Supabase real.

La antigua lógica de LocalStorage y los desafíos con respuestas incluidas en el cliente se eliminaron. Las partidas de la versión anterior no se migran al modo comunitario.
