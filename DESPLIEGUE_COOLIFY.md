# Desplegar el ADN GovTech v14 en Coolify (con base de datos)

Una sola aplicación y un volumen. No hace falta crear una base de datos aparte en Coolify. Las respuestas se guardan en SQLite, dentro del volumen `/data`.

## Qué incluye
- **La app:** recorrido Summit, quiosco y completo.
- **La base de datos:** guarda cada respuesta al llegar al resultado y la actualiza si la persona cambia su opinión o el nombre de la organización.
- **`/admin`, protegido con usuario y clave:**
  - conteos por recorrido, por quiosco y por arquetipo;
  - descarga en Excel con tres hojas: *Respuestas* (una fila por persona), *Detalle por pregunta* (letra original, arquetipo de la opción, puntaje y posición en pantalla) y *Contactos autorizados*;
  - descarga en JSON;
  - un formulario para borrar los datos de una persona.
- **Accesos cortos:**
  - `/summit` (celular)
  - `/quiosco` (pantalla vertical)
  - `/completo`

## Pasos en Coolify (v4)
1. **Código en GitHub.** Esta carpeta ya es un repositorio Git listo; solo falta subirlo. Si el repositorio es privado, conecta la GitHub App de Coolify.
2. En Coolify: **Projects → (tu proyecto) → + New → Resource**. Elige *Public Repository* (o *Private Repository (with GitHub App)*) y pega la URL del repositorio, rama `main`.
3. **Build Pack:** `Dockerfile`. En **Ports Exposes** escribe `3000`.
4. **Domains:** pon el dominio, por ejemplo `https://adn.bogotacapitalgovtech.co`. Si no tienes uno, Coolify ofrece uno de prueba `sslip.io`. Coolify gestiona el HTTPS.
5. **Environment Variables:**
   - `ADMIN_PASSWORD`: una clave larga (márcala como *secret*). Sin ella, `/admin` queda desactivado.
   - `ADMIN_USER`: opcional; por defecto es `equipo`.
6. **Persistent Storage → + Add → Volume:** *Destination Path* `/data`. **Sin este paso, las respuestas se pierden en cada despliegue.**
7. **Deploy.** Cuando termine, comprueba que `https://TU-DOMINIO/api/estado` responde `{"ok":true}`.

## En el evento
- **Pantalla vertical:** abre `https://TU-DOMINIO/quiosco` en Chrome a pantalla completa (modo quiosco).
- **Al terminar**, la pantalla muestra un QR. La persona lo escanea y en su celular descarga la tarjeta y el informe PDF. Desde ahí también puede dejar su correo, con autorización, para recibir invitaciones.
- **QR para el stand**, para que cada persona lo haga en su celular: `https://TU-DOMINIO/summit`.
- **El quiosco necesita internet** para guardar. Si se cae la red, la persona igual ve su resultado, pero esa respuesta no se guarda.

## Para analizar
- Entra a `https://TU-DOMINIO/admin` y descarga el Excel.
- El archivo de la base es `/data/adn-govtech.sqlite`. Como respaldo, descarga el Excel o el JSON después de cada jornada.

## Antes de abrirlo al público (pendiente)
- **Validación jurídica del texto de tratamiento de datos** (Ley 1581 de 2012). Hay que definir:
  - quién es el responsable del tratamiento (Atenea, iBO, Alcaldía…);
  - el correo de contacto para consultas y supresión;
  - el enlace a la política oficial.

  El texto actual describe lo que hace el sistema, pero no es una política aprobada.
- **Confirmar la mención a Campus 2600** en la invitación por correo.
- **El envío automático del PDF por correo no está implementado.** Necesita una cuenta SMTP (por ejemplo, el correo institucional). Hoy el correo solo se guarda para invitaciones; el PDF y la tarjeta se descargan en el celular.

## Probar en el computador, sin Coolify
```bash
npm run build
PORT=3000 DATA_DIR=./data ADMIN_PASSWORD=una-clave node server/server.mjs
```
Abre `http://localhost:3000/summit`. Para el panel, abre `http://localhost:3000/admin` (usuario `equipo`).
