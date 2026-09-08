# Backend de sincronización a Google Drive

Este servidor recibe fotos desde la app y las sube a una carpeta de Drive usando
una **cuenta de servicio**. Es obligatorio tener este backend porque las
credenciales de la cuenta de servicio (private key) NUNCA deben viajar dentro
del APK/IPA de la app — cualquiera podría extraerlas.

## 1. Crear el proyecto y la cuenta de servicio en Google Cloud

1. Ve a https://console.cloud.google.com/ y crea un proyecto (o usa uno existente).
2. Habilita la **Google Drive API**: menú "APIs y servicios" → "Biblioteca" → busca
   "Google Drive API" → Habilitar.
3. Ve a "APIs y servicios" → "Credenciales" → "Crear credenciales" →
   **Cuenta de servicio**. Dale un nombre (ej. `drive-sync-uploader`).
4. Dentro de la cuenta de servicio creada, pestaña "Claves" → "Agregar clave" →
   "Crear clave nueva" → tipo **JSON**. Se descargará un archivo `.json`.
   - Este archivo es la variable `GOOGLE_SERVICE_ACCOUNT_JSON` / `service-account.json`.
   - **No lo subas a git. No lo mandes por chat público.**
5. Copia el "email" de la cuenta de servicio (algo como
   `drive-sync-uploader@tu-proyecto.iam.gserviceaccount.com`).

## 2. Preparar la carpeta de Drive

Las cuentas de servicio no tienen almacenamiento propio, así que deben escribir
dentro de una carpeta que un usuario real comparta con ellas:

1. En tu Google Drive normal, crea una carpeta (ej. "Fotos App").
2. Clic derecho → "Compartir" → pega el email de la cuenta de servicio → dale
   rol **Editor**.
3. Abre la carpeta y copia el ID desde la URL:
   `https://drive.google.com/drive/folders/ESTE_ES_EL_ID`
4. Ese ID va en `DRIVE_FOLDER_ID`.

> Alternativa si tienes Google Workspace: usar una **Unidad compartida**
> (Shared Drive) en vez de carpeta personal — ahí sí hay cuota propia y es más
> robusto para producción.

## 3. Configurar el backend localmente

```bash
cd server
npm install
cp .env.example .env
```

Edita `.env`:
- `API_SECRET`: cualquier cadena larga y aleatoria (ej. genera una con
  `openssl rand -hex 32`). Debe coincidir con la que pongas en la app.
- `DRIVE_FOLDER_ID`: el ID del paso 2.
- Para desarrollo local: guarda el JSON descargado como
  `server/service-account.json` (deja `GOOGLE_SERVICE_ACCOUNT_JSON` vacío).

Prueba local:
```bash
npm start
# curl http://localhost:3000/health
```

## 4. Desplegar a un hosting con URL pública HTTPS

La app necesita una URL pública (HTTPS) para poder llamar al backend desde
cualquier red. Opciones sencillas (elige una):

- **Render.com** (gratis para empezar): conecta el repo, "Web Service",
  build command `npm install`, start command `npm start`. Agrega las
  variables de entorno (`API_SECRET`, `DRIVE_FOLDER_ID`,
  `GOOGLE_SERVICE_ACCOUNT_JSON` con el JSON completo en una línea).
- **Railway.app**: similar a Render.
- **Google Cloud Run**: ideal si ya usas GCP; puedes usar Workload Identity
  en vez de un JSON de clave (más seguro), pero requiere más configuración.
- Un VPS propio con PM2/Docker.

Una vez desplegado, anota la URL pública (ej.
`https://drive-sync-backend.onrender.com`) — la necesitas para
`lib/sync/uploadService.ts` en la app.

## Endpoint expuesto

`POST /upload`
- Header: `x-api-secret: <tu API_SECRET>`
- Body: `multipart/form-data` con campo `photo` (el archivo) y opcionalmente
  `filename`.
- Respuesta: `{ success: true, file: { id, name, webViewLink } }`
