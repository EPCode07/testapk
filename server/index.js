require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { google } = require('googleapis');

const app = express();
app.use(cors());

const upload = multer({ dest: 'tmp/' });

const API_SECRET = process.env.API_SECRET; // secreto compartido entre la app y este backend
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID; // carpeta compartida con la cuenta de servicio

/**
 * Carga las credenciales de la cuenta de servicio.
 * En producción: variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON (el JSON completo en una línea).
 * En desarrollo local: archivo ./service-account.json (NUNCA lo subas a git).
 */
function getAuth() {
  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else {
    credentials = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

function checkAuth(req, res, next) {
  const secret = req.header('x-api-secret');
  if (!API_SECRET || secret !== API_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/upload', checkAuth, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Falta el archivo "photo"' });
  }

  try {
    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: req.body.filename || `foto_${Date.now()}.jpg`,
      parents: DRIVE_FOLDER_ID ? [DRIVE_FOLDER_ID] : undefined,
    };

    const media = {
      mimeType: req.file.mimetype || 'image/jpeg',
      body: fs.createReadStream(req.file.path),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,        // <--- Añade esto
      includeItemsFromAllDrives: true // <--- Añade esto
    });

    fs.unlink(req.file.path, () => { });
    res.json({ success: true, file: response.data });
  } catch (error) {
    console.error('Error subiendo a Drive:', error);
    fs.unlink(req.file.path, () => { });
    res.status(500).json({ error: 'Error al subir a Drive', detail: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
