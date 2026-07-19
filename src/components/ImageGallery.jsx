import React from 'react';

export default function ImageGallery({ images = [], onSelect }) {
  if (!images || images.length === 0) return <div>No hay imágenes guardadas.</div>;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {images.map((img, i) => (
        <button key={i} onClick={() => onSelect(img)} style={{ border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}>
          <img src={img} alt={`Imagen ${i+1}`} style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
        </button>
      ))}
    </div>
  );
}
