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
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'photos';
const TABLE_NAME = process.env.SUPABASE_TABLE || 'report_photos';

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
    const description = req.body.description || null; // texto opcional que manda la app
    const filePath = `reportes/${filename}`;

    // 1. Leer el archivo temporal de multer como buffer
    const fileBuffer = fs.readFileSync(req.file.path);

    // 2. Subir a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: req.file.mimetype || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // 3. Obtener la URL pública de la imagen
    //    (requiere que el bucket esté marcado como "Public" en Supabase Storage)
    const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    const storageUrl = publicUrlData.publicUrl;

    // 4. Insertar el registro en la tabla report_photos
    //    id y created_at los genera Supabase solo (uuid default / timestamptz default now())
    const { data: row, error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert({
        file_name: filename,
        storage_url: storageUrl,
        description: description,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 5. Limpiar archivo temporal local
    fs.unlink(req.file.path, () => { });

    res.json({
      success: true,
      file: {
        name: filename,
        url: storageUrl,
      },
      row, // el registro completo insertado (id, file_name, storage_url, description, created_at)
    });
  } catch (error) {
    console.error('Error subiendo a Supabase:', error);
    fs.unlink(req.file.path, () => { });
    res.status(500).json({ error: 'Error al subir a Supabase', detail: error.message });
  }
});

// Obtener todos los registros de fotos
app.get('/listall', checkAuth, async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from(TABLE_NAME)
      .select('id, file_name, storage_url, description, created_at')
      .order('created_at', { ascending: false }); // las más recientes primero

    if (error) throw error;

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Error consultando fotos:', error);
    res.status(500).json({ error: 'Error al obtener fotos', detail: error.message });
  }
});


app.get('/listpaginated', checkAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const { data: rows, error } = await supabase
      .from(TABLE_NAME)
      .select('id, file_name, storage_url, description, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Error consultando fotos:', error);
    res.status(500).json({ error: 'Error al obtener fotos', detail: error.message });
  }
});

app.get('/listfiltereddate', checkAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const fecha = req.query.fecha; // formato esperado: 2026-09-10

    let query = supabase
      .from(TABLE_NAME)
      .select('id, file_name, storage_url, description, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fecha) {
      // Validar formato YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD' });
      }

      const inicio = `${fecha}T00:00:00Z`;
      // Día siguiente: sumamos 1 día de forma segura (sin librerías)
      const [y, m, d] = fecha.split('-').map(Number);
      const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
      const fin = nextDay.toISOString(); // ej: 2026-09-11T00:00:00.000Z

      query = query
        .gte('created_at', inicio)
        .lt('created_at', fin);
    }

    const { data: rows, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Error consultando fotos:', error);
    res.status(500).json({ error: 'Error al obtener fotos', detail: error.message });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor Supabase escuchando en puerto ${PORT}`));