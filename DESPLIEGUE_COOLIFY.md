# Desplegar el ADN GovTech v14 en Coolify (con base de datos)

Una sola aplicación y un volumen. No hace falta crear una base de datos aparte en Coolify. Las respuestas se guardan en SQLite, dentro del volumen `/data`.

## Qué incluye
- **La app:** recorrido Summit, quiosco y completo.
- **La base de datos:** guarda cada respuesta al llegar al resultado y la actualiza si la persona cambia su opinión o el nombre de la organización.
- **`/admin`, protegido con usuario y clave:**
  - conteos por recorrido, por quiosco y por arquetipo;
  - descarga en Excel con tres hojas: *Respuestas* (una fila por persona), *Detalle por pregunta* (letra original, arquetipo de la opción, puntaje y posición en pantalla) y *Empresas y contactos* (nombre, correo autorizado, página web, descripción, qué le interesaría a futuro, qué le agregaría a la experiencia y observaciones adicionales);
  - descarga en JSON;
  - un formulario para borrar los datos de una persona, incluida su tarjeta.
- **La dirección principal abre el Summit.** Para que abra el completo, usa la variable `RECORRIDO_INICIAL=completo`.
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
- **Al terminar**, en «Llévatelo» la persona escribe el nombre de su empresa (opcional) con el teclado de la pantalla y toca «Generar el QR de mi tarjeta».
  - La tarjeta se guarda en el servidor y aparece un QR que abre `TU-DOMINIO/t/<id>` en el celular: ahí descarga su tarjeta.
  - En esa misma página, con el teclado de su celular, puede contarnos de su empresa. Todo es opcional: nombre, correo (con autorización), página web, descripción, qué le interesaría a futuro, qué le agregaría a la experiencia y observaciones adicionales. Por eso, en el quiosco ya no se pide el texto abierto de la opinión.
  - También puede abrir su resultado completo y descargar el informe PDF.
  - Si cambia el nombre, debe volver a generar el QR.
- **Casos ficticios en el quiosco:** el botón «Ver un caso en 1 minuto» (pantalla de espera e inicio) muestra cuatro empresas inventadas, su revelación, rol, radar, ruta y los componentes del servicio. No se guardan en la base de datos.
- **QR de datos, para quien no alcanza a hacer el recorrido:**
  - en el quiosco, una tarjeta flotante con un QR («¿Sin tiempo?») está a la vista desde el inicio y durante todo el formulario. Al tocarla se amplía;
  - el QR abre `https://TU-DOMINIO/datos` en el celular. Esa página solo capta los datos de la empresa: nombre, correo con autorización, página web, descripción, qué le interesaría a futuro y observaciones adicionales;
  - en el Excel, esos registros aparecen en *Empresas y contactos* con el recorrido «QR de datos (sin recorrido)».
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
