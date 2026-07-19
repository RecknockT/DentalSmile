import React from 'react';

const STATUS_ORDER = ['healthy', 'filling', 'cavity', 'missing'];
const STATUS_LABEL = {
  healthy: 'Sano',
  filling: 'Obturado',
  cavity: 'Caries',
  missing: 'Ausente'
};

const STATUS_COLOR = {
  healthy: '#e6f7ff',
  filling: '#fff4e6',
  cavity: '#ffe6e6',
  missing: '#f0f0f0'
};

// Numeración FDI/ISO (dos dígitos: cuadrante + posición).
// Los cuadrantes se ordenan tal como se ven al enfrentar al paciente:
// arriba-derecha del paciente (Q1) a la izquierda de la pantalla,
// arriba-izquierda del paciente (Q2) a la derecha de la pantalla, y así abajo.
const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export default function Odontogram({ teeth = {}, onChange }) {
  const handleToggle = (num) => {
    const key = String(num);
    const current = teeth[key] || 'healthy';
    const idx = STATUS_ORDER.indexOf(current);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    const nextTeeth = { ...teeth, [key]: next };
    onChange?.(nextTeeth);
  };

  const renderTooth = (num, isMidlineStart) => {
    const s = teeth[String(num)] || 'healthy';
    return (
      <button
        key={num}
        type="button"
        onClick={() => handleToggle(num)}
        title={`Pieza ${num} — ${STATUS_LABEL[s]}`}
        style={{
          width: 40,
          height: 40,
          margin: '4px 3px',
          marginLeft: isMidlineStart ? 18 : 3,
          borderRadius: 6,
          border: '1px solid #bbb',
          background: STATUS_COLOR[s],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ fontSize: 12, color: '#111', fontWeight: 700 }}>{num}</div>
      </button>
    );
  };

  const renderRow = (teethArray) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: 900 }}>
      {teethArray.map((num, i) => renderTooth(num, i === 8))}
    </div>
  );

  return (
    <div className="odontogram-component">
      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 700, marginBottom: 4, fontSize: 11, color: '#888' }}>
        <span>Derecha del paciente</span>
        <span>Izquierda del paciente</span>
      </div>

      {renderRow(UPPER_TEETH)}
      <div style={{ height: 16 }} />
      {renderRow(LOWER_TEETH)}

      <div style={{ marginTop: 12, fontSize: 13 }}>
        <strong>Leyenda:</strong>
        {Object.keys(STATUS_LABEL).map((k) => (
          <span key={k} style={{ marginLeft: 10 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: STATUS_COLOR[k], border: '1px solid #ddd', marginRight: 6 }} />
            {STATUS_LABEL[k]}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>
        Numeración FDI/ISO: cuadrante 1 y 2 (arriba), cuadrante 4 y 3 (abajo).
      </div>
    </div>
  );
}
