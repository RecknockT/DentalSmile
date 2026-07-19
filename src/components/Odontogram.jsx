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

export default function Odontogram({ teeth = {}, onChange }) {
  // We'll render 32 teeth numbered 1..32 in a simple grid: upper 16 then lower 16
  const handleToggle = (num) => {
    const key = String(num);
    const current = teeth[key] || 'healthy';
    const idx = STATUS_ORDER.indexOf(current);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    const nextTeeth = { ...teeth, [key]: next };
    onChange?.(nextTeeth);
  };

  const renderTooth = (num) => {
    const s = teeth[String(num)] || 'healthy';
    return (
      <button
        key={num}
        type="button"
        onClick={() => handleToggle(num)}
        title={`${num} — ${STATUS_LABEL[s]}`}
        style={{
          width: 44,
          height: 44,
          margin: 6,
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
        <div style={{ fontSize: 13, color: '#111', fontWeight: 700 }}>{num}</div>
      </button>
    );
  };

  return (
    <div className="odontogram-component">
      <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: 900 }}>
        {/* Upper teeth 1..16 */}
        {Array.from({ length: 16 }, (_, i) => renderTooth(i + 1))}
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', maxWidth: 900 }}>
        {/* Lower teeth 17..32 */}
        {Array.from({ length: 16 }, (_, i) => renderTooth(i + 17))}
      </div>
      <div style={{ marginTop: 8, fontSize: 13 }}>
        <strong>Leyenda:</strong>
        {Object.keys(STATUS_LABEL).map((k) => (
          <span key={k} style={{ marginLeft: 10 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: STATUS_COLOR[k], border: '1px solid #ddd', marginRight: 6 }} />
            {STATUS_LABEL[k]}
          </span>
        ))}
      </div>
    </div>
  );
}
