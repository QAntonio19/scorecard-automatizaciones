# Despliegue: Vercel (web) + API en contenedor (Render u otro)

La app **Next.js** va bien en **Vercel**. La **API Express** usa archivos JSON en disco (`api/data`); en Vercel Serverless no tendrías persistencia fiable para overrides y sync. Por eso la API se despliega como **servicio Node** (Docker) en Render, Railway, Fly.io, etc.

## Si el build falla con `NEXT_TELEMETRY_DISABLED=1` (comando antiguo)

En el proyecto de Vercel: **Settings → General → Build & Development Settings**. Si **Build Command** tiene un valor manual, bórralo (deja el override desactivado) para que use `web/vercel.json` del repo.

## Recrear el proyecto si lo borraste en Vercel

Vercel **no restaura** proyectos eliminados. Hay que volver a **importar** el repo (es el mismo código en GitHub).

1. Entra en [vercel.com/new](https://vercel.com/new) (equipo correcto: p. ej. *ITAI's projects*).
2. **Add New…** → **Project** → **Import** `QAntonio19/scorecard-automatizaciones`.
3. En **Root Directory**, pulsa **Edit** y escribe **`web`** (obligatorio en este monorepo).
4. **Environment Variables** → añade `NEXT_PUBLIC_API_URL` (URL de tu API en producción, sin `/` final). Si aún no tienes API, puedes desplegar igual y añadirla después.
5. **Deploy**.

Opcional por CLI (tras `npx vercel login` en tu máquina): en la carpeta `web`, `npm run deploy:vercel`.

## 1. Frontend en Vercel

1. Sube el repo a **GitHub** (o GitLab / Bitbucket).
2. En [vercel.com](https://vercel.com): **Add New Project** → importa el repo.
3. Ajustes del proyecto:
   - **Root Directory**: `web`
   - **Framework Preset**: Next.js (detectado)
   - **Build Command**: `npm run build` (por defecto)
   - **Install Command**: `npm install` (por defecto)
4. **Environment Variables** (Production):
   - `NEXT_PUBLIC_API_URL` = URL pública de tu API, por ejemplo `https://scorecard-api-xxxx.onrender.com` (sin barra final).

5. Deploy.

Tras publicar la API (paso 2), vuelve a desplegar el frontend si hace falta o edita `NEXT_PUBLIC_API_URL` y redeploy.

## 2. API con Docker (Render)

1. Crea un **Web Service** → **Docker**.
2. Conecta el mismo repositorio.
3. Configuración:
   - **Dockerfile path**: `api/Dockerfile`
   - **Root directory** / context: raíz del repo (por defecto).
4. Variables de entorno (mínimo para CORS y datos):

| Variable | Ejemplo | Notas |
|----------|---------|--------|
| `PORT` | (Render lo inyecta) | No hace falta fijarla si la plataforma la define. |
| `CORS_ORIGIN` | `https://tu-app.vercel.app` | Origen del front; varios separados por coma. |
| `EXTERNAL_SYNC_ENABLED` | `false` | Activa solo cuando tengas claves n8n/Make. |
| Resto | Ver `api/.env` local | Copia lo que necesites (N8N_*, MAKE_*, etc.). |

5. Deploy. Copia la URL HTTPS del servicio y úsala en `NEXT_PUBLIC_API_URL` en Vercel.

**Blueprint:** en la raíz hay `render.yaml` como punto de partida; revisa el plan y variables en el panel de Render.

### Probar la API localmente con Docker

En la raíz del monorepo:

```bash
docker build -f api/Dockerfile -t scorecard-api .
docker run --rm -p 4000:4000 -e CORS_ORIGIN=http://localhost:3000 scorecard-api
```

## 3. Comprobaciones

- Abre `https://tu-api/health` → debe responder JSON `{ "status": "ok" }`.
- En el front, la consola del navegador no debe mostrar errores CORS al cargar proyectos.
- Si cambias fase/responsable y no persiste: en servicios gratuitos el disco puede ser **efímero**; para datos que sobrevivan reinicios usa volumen de disco o base de datos en tu proveedor.

## 4. CLI de Vercel (opcional)

```bash
npm i -g vercel
cd web
vercel
```

Define las mismas variables en el dashboard o con `vercel env add`.
