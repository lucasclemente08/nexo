# Pruebas de base de datos

PGlite ejecuta el SQL de producción con roles `anon`, `authenticated` y `service_role`, un esquema mínimo de Auth y usuarios efímeros. Solo se omite la instrucción `ALTER PUBLICATION`: PGlite no reproduce el servicio Realtime de Supabase.

Los datos de prueba viven en memoria y no afectan al servicio desplegado. Ejecutar con `npm test`.
