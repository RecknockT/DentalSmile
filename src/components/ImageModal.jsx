import React from 'react';
//checho rubio
export default function ImageModal({ src, alt, onClose, onDelete }) {
  if (!src) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ maxWidth: '90%', maxHeight: '90%', background: '#fff', padding: 12, borderRadius: 8 }} onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={alt} style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', borderRadius: 6 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
          <button className="ghost-btn" type="button" onClick={onClose}>Cerrar</button>
          {typeof onDelete === 'function' ? (
            <button className="ghost-btn" type="button" onClick={onDelete} style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}>
              Borrar imagen
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
