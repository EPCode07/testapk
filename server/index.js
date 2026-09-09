require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());

const upload = multer({ dest: 'tmp/' });

const API_SECRET = process.env.API_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Puedes usar la Service Role Key o la Anon Key
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'photos';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    const filename = req.body.filename || `foto_${Date.now()}.jpg`;
    const filePath = `reportes/${filename}`;

    // Leer el archivo temporal de multer como buffer
    const fileBuffer = fs.readFileSync(req.file.path);

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: req.file.mimetype || 'image/jpeg',
        upsert: true
      });

    if (error) {
      throw error;
    }

    // Obtener la URL pública de la imagen
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // Limpiar archivo temporal local
    fs.unlink(req.file.path, () => { });

    res.json({
      success: true,
      file: {
        name: filename,
        url: publicUrlData.publicUrl
      }
    });

  } catch (error) {
    console.error('Error subiendo a Supabase:', error);
    fs.unlink(req.file.path, () => { });
    res.status(500).json({ error: 'Error al subir a Supabase', detail: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor Supabase escuchando en puerto ${PORT}`));