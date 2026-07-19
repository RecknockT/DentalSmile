import React, { useEffect, useRef, useState } from 'react';

export default function TopPatientSearch({ patients = [], onSelect, onSearchChange, placeholder = 'Buscar paciente' }) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    onSearchChange?.(value);
  }, [value, onSearchChange]);

  const filtered = patients
    .filter((p) => p.name.toLowerCase().includes(String(value).toLowerCase()))
    .slice(0, 6);

  const handleChange = (e) => {
    setValue(e.target.value);
    setOpen(true);
    setHighlight(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
      setOpen(true);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) {
        handleSelect(filtered[highlight]);
      }
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelect = (p) => {
    onSelect?.(p);
    setValue(p.name);
    setOpen(false);
  };

  useEffect(() => {
    const onDoc = (ev) => {
      if (ref.current && !ref.current.contains(ev.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="top-search" ref={ref} style={{ position: 'relative' }}>
      <input
        className="search-pill-input"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Buscar paciente"
      />

      {open && value && filtered.length > 0 && (
        <ul
          className="typeahead-list"
          style={{
            position: 'absolute',
            right: 0,
            background: '#fff',
            zIndex: 60,
            width: 320,
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            marginTop: 6,
            listStyle: 'none',
            padding: 0,
            borderRadius: 6,
            overflow: 'hidden'
          }}
        >
          {filtered.map((p, i) => (
            <li
              key={p.id}
              onMouseDown={() => handleSelect(p)}
              style={{
                padding: '10px 12px',
                background: i === highlight ? '#eef6ff' : 'transparent',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{p.treatment}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
