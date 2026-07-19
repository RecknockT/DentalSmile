import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xubohxptebglubnvdsmo.supabase.co'
const supabaseKey = 'sb_publishable_nwxQGSRyfqP3gBjvfn9R4A_V3DicJTg'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

const IMAGES_BUCKET = 'Imagenes';

export const uploadFileToStorage = async (bucket, path, file, onProgress) => {
  // If caller provides onProgress callback, use XHR to report upload progress
  if (typeof onProgress === 'function') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const encodedPath = path.split('/').map(encodeURIComponent).join('/');
      const url = `${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`;
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
      xhr.setRequestHeader('apikey', supabaseKey);
      xhr.setRequestHeader('x-upsert', 'true');
      if (file.type) xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const percent = Math.round((evt.loaded / evt.total) * 100);
          try { onProgress(percent); } catch (e) { /* ignore */ }
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const { data: urlData, error: urlError } = supabase.storage.from(bucket).getPublicUrl(path);
            if (urlError) return reject(urlError);
            return resolve(urlData?.publicUrl || null);
          } catch (err) {
            return reject(err);
          }
        }
        return reject(new Error(`Upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }

  // Fallback to supabase client upload (no progress)
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData, error: urlError } = supabase.storage.from(bucket).getPublicUrl(path);
  if (urlError) throw urlError;
  return urlData?.publicUrl || null;
};

const isStorageRlsError = (err) => {
  const message = err?.message || String(err);
  return /row-level security|violates row-level security policy/i.test(message);
};

export const uploadOdontogram = async (file, patientId, onProgress) => {
  const ext = (file.name && file.name.split('.').pop()) || 'jpg';
  const path = `patients/${patientId}/patient-${patientId}-${Date.now()}.${ext}`;
  try {
    return await uploadFileToStorage(IMAGES_BUCKET, path, file, onProgress);
  } catch (err) {
    if (isStorageRlsError(err)) {
      throw new Error('Storage upload falló por RLS. Revisa la política del bucket Imagenes en Supabase para permitir la carga desde el cliente.');
    }

    try {
      return await uploadWithClientFallback(file, path);
    } catch (err2) {
      if (isStorageRlsError(err2)) {
        throw new Error('Storage upload falló por RLS. Revisa la política del bucket Imagenes en Supabase para permitir la carga desde el cliente.');
      }
      throw err2 || err;
    }
  }
};

const uploadWithClientFallback = async (file, path) => {
  const { data, error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData, error: urlError } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path);
  if (urlError) throw urlError;
  return urlData?.publicUrl || null;
};