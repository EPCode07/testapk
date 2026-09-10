require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
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


const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');




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
    const description = req.body.description || null;
    const filePath = `reportes/${filename}`;

    const fileBuffer = fs.readFileSync(req.file.path);

    // Subir imagenes a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: req.file.mimetype || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    const storageUrl = publicUrlData.publicUrl;

    // Insertar el registro en la tabla report_photos
    const { data: row, error: insertError } = await supabase
      .from(TABLE_NAME)
      .upsert({
        file_name: filename,
        storage_url: storageUrl,
        description: description,
      }, {
        onConflict: 'file_name'
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    fs.unlink(req.file.path, () => { });

    res.json({
      success: true,
      file: {
        name: filename,
        url: storageUrl,
      },
      row,
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
      .order('created_at', { ascending: false });

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
    const fecha = req.query.fecha;

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
      const [y, m, d] = fecha.split('-').map(Number);
      const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
      const fin = nextDay.toISOString();

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

app.get('/report-word', checkAuth, async (req, res) => {
  try {
    // 1. Datos de Supabase
    const { data: rows, error } = await supabase
      .from(TABLE_NAME)
      .select('id, file_name, storage_url, description, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!rows?.length) return res.status(404).json({ error: 'No hay registros' });

    // 2. Descargar imágenes
    const fotos = await Promise.all(
      rows.map(async (row, i) => {
        const r = await fetch(row.storage_url);
        const buffer = Buffer.from(await r.arrayBuffer());
        return {
          num: i + 1,
          descripcion: row.description || 'Sin descripción',
          fecha_foto: new Date(row.created_at).toLocaleString('es-PE'),
          foto: buffer.toString('base64'),
        };
      })
    );

    // 3. Agrupar de 2 en 2 (cada "fila" = una hoja, foto1 arriba y foto2 abajo)
    const filas = [];
    for (let i = 0; i < fotos.length; i += 2) {
      const f1 = fotos[i];
      const f2 = fotos[i + 1]; // Puede ser undefined si es impar

      filas.push({
        // Imagen de arriba (siempre existe si i < fotos.length)
        foto1: f1 ? f1.foto : null,
        num1: f1 ? f1.num : '',
        descripcion1: f1 ? f1.descripcion : '',
        fecha1: f1 ? f1.fecha_foto : '',

        // Control para la imagen de abajo
        tiene2: !!f2,

        // Imagen de abajo (solo si existe f2)
        foto2: f2 ? f2.foto : null,
        num2: f2 ? f2.num : '',
        descripcion2: f2 ? f2.descripcion : '',
        fecha2: f2 ? f2.fecha_foto : '',
      });
    }

    // 3.1 NUEVO: marcar con saltoPagina=true todas las filas MENOS la última,
    // para que el salto de página de la plantilla no deje una hoja en blanco al final.
    const totalFilas = filas.length;
    filas.forEach((fila, index) => {
      fila.saltoPagina = index < totalFilas - 1;
    });

    // 4. Cargar plantilla
    const templatePath = path.resolve(__dirname, 'plantillas/plantilla.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // 5. Módulo de imágenes
    const imageModule = new ImageModule({
      centered: false,
      getImage: (tagValue) => Buffer.from(tagValue, 'base64'),
      // 320x400 mantiene la proporción real de tus fotos (4:5), solo más grande
      // que antes (220x275) ya que ahora van apiladas, no lado a lado.
      getSize: () => [320, 400],
    });

    const doc = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
    });

    // 6. Render con 'filas' (ya incluye saltoPagina en cada objeto)
    doc.render({
      responsable: 'Nombre del responsable',
      fecha: new Date().toLocaleDateString('es-PE'),
      filas,
    });

    // 7. Enviar
    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_fotografico.docx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error generando Word:', error);
    res.status(500).json({ error: 'Error al generar', detail: error.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor Supabase escuchando en puerto ${PORT}`));