import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import TopPatientSearch from '../components/TopPatientSearch';
import { findPatientByNameOrId } from '../utils/patientUtils';
import Odontogram from '../components/Odontogram';
import ImageGallery from '../components/ImageGallery';
import ImageModal from '../components/ImageModal';
import { uploadOdontogram, uploadFileToStorage } from '../services/supabase';
import { supabase } from '../services/supabase';

const STORAGE_KEYS = {
  patients: 'dental-smile-patients',
  appointments: 'dental-smile-appointments'
};

const EXAMPLE_PATIENTS = ['Lucía Pérez', 'Emilia Soto', 'Julián Torres'];
const EXAMPLE_APPOINTMENTS = ['María López', 'Sofía Ruiz', 'Tomás Vega'];

const sanitizeRecords = (rows, type) => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter((item) => {
    const name = (item.name || item.patient || '').trim();
    if (type === 'patients') {
      return !EXAMPLE_PATIENTS.includes(name);
    }

    return !EXAMPLE_APPOINTMENTS.includes(name);
  });
};

const readStoredValue = (key, fallback) => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const writeStoredValue = (key, value) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const syncWithSupabase = async (table, rows) => {
  try {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  } catch (error) {
    console.error(`No se pudo sincronizar ${table}:`, error);
    throw error;
  }
};

const insertPatientInSupabase = async (patient) => {
  const { error } = await supabase.from('patients').insert([patient]);
  if (error) throw error;
};

const insertAppointmentInSupabase = async (appointment) => {
  // Convert hour to minutes integer if it's a HH:MM string, because the DB expects bigint minutes
  const a = { ...appointment };
  if (typeof a.hour === 'string') {
    const [hh, mm] = a.hour.split(':').map((s) => parseInt(s, 10));
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
      a.hour = hh * 60 + mm;
    }
  }
  const { error } = await supabase.from('appointments').insert([a]);
  if (error) throw error;
};

const updateAppointmentInSupabase = async (appointment) => {
  const { error } = await supabase.from('appointments').update({ status: appointment.status }).eq('id', appointment.id);
  if (error) throw error;
};

const getSupabaseErrorMessage = (error) => {
  if (!error) {
    return 'No se pudo guardar en Supabase.';
  }

  if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
    return 'La tabla no existe en Supabase. Creá la tabla antes de seguir.';
  }

  if (error.message?.includes('policy') || error.message?.includes('permission')) {
    return 'Supabase está rechazando la escritura por permisos. Revisá las políticas de la tabla.';
  }

  return error.message || 'No se pudo guardar en Supabase.';
};

const loadFromSupabaseOrStorage = async (table, key, fallback) => {
  const stored = readStoredValue(key, fallback);

  try {
    const { data, error } = await supabase.from(table).select('*').order('id', { ascending: false });
    if (error) throw error;

    // If Supabase returns any array (including empty), treat it as authoritative
    // and overwrite localStorage so deletions on the server are reflected locally.
    if (Array.isArray(data)) {
      writeStoredValue(key, data);
      return data;
    }
  } catch (error) {
    console.error(`No se pudo cargar ${table} desde Supabase:`, error);
  }

  return stored;
};

function Interface() {
  const location = useLocation();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patientForm, setPatientForm] = useState({ name: '', phone: '', treatment: '', status: 'Nuevo' });
  const [appointmentForm, setAppointmentForm] = useState({ patient: '', date: '', time: '', treatment: '', status: 'Pendiente' });
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const navigate = useNavigate();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modalImage, setModalImage] = useState(null);
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const syncedPatients = sanitizeRecords(
        await loadFromSupabaseOrStorage('patients', STORAGE_KEYS.patients, []),
        'patients'
      );
        let syncedAppointments = sanitizeRecords(
          await loadFromSupabaseOrStorage('appointments', STORAGE_KEYS.appointments, []),
          'appointments'
        );

        // Convert appointments hour from minutes (bigint in DB) to HH:MM for the UI
        const minutesToHHMM = (m) => {
          if (typeof m !== 'number') return m;
          const hh = String(Math.floor(m / 60)).padStart(2, '0');
          const mm = String(m % 60).padStart(2, '0');
          return `${hh}:${mm}`;
        };

        // Normalize appointments: ensure we have patient_id and patient (name) for UI
        syncedAppointments = syncedAppointments.map((a) => {
          const pid = a.patient_id ?? (typeof a.patient === 'string' ? (syncedPatients.find((p) => p.name === a.patient)?.id) : null);
          const patientName = (pid ? (syncedPatients.find((p) => p.id === pid)?.name) : (a.patient || 'Desconocido'));
          return {
            ...a,
            hour: minutesToHHMM(a.hour),
            patient_id: pid,
            patient: patientName,
            patientName
          };
        });

      setPatients(syncedPatients);
      setAppointments(syncedAppointments);
    };

    loadData();
  }, []);

  const menuItems = [
    { label: 'Inicio', icon: '🏠', path: '/Interface' },
    { label: 'Pacientes', icon: '🧑‍⚕️', path: '/Interface/pacientes' },
    { label: 'Turnos', icon: '🗓️', path: '/Interface/turnos' },
    { label: 'Agenda', icon: '📅', path: '/Interface/agenda' },
    { label: 'Tratamientos', icon: '🦷', path: '/Interface/tratamientos' },
    { label: 'Facturación', icon: '💳', path: '/Interface/facturacion' },
    { label: 'Configuración', icon: '⚙️', path: '/Interface/configuracion' }
  ];

  const cards = [
    {
      title: 'Pacientes activos',
      value: patients.length.toString(),
      subtitle: `${patients.filter((patient) => patient.status === 'En seguimiento').length} en seguimiento`
    },
    {
      title: 'Turnos hoy',
      value: appointments.length.toString(),
      subtitle: `${appointments.filter((appointment) => appointment.status === 'Confirmado').length} confirmados`
    },
    {
      title: 'Próximo control',
      value: appointments[0]?.hour ?? '—',
      subtitle: appointments[0]?.patient ?? 'Sin turnos'
    }
  ];

  const filteredPatients = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return patients.filter((patient) => (
      patient.name.toLowerCase().includes(query) ||
      patient.treatment.toLowerCase().includes(query) ||
      patient.phone.toLowerCase().includes(query)
    ));
  }, [patients, searchTerm]);

  const openPatient = (patientId) => {
    const p = patients.find((x) => String(x.id) === String(patientId));
    setSelectedPatient(p || null);
  };

  const openPatientAndNavigate = (patientId) => {
    openPatient(patientId);
    navigate('/Interface/pacientes');
  };

  const clearPendingImagePreview = () => {
    setPendingImageFile(null);
    setPendingImagePreviewUrl(null);
  };

  const uploadPendingImage = async () => {
    if (!pendingImageFile || !selectedPatient || !selectedPatient.id) {
      setFeedback('No hay imagen pendiente para subir.');
      return;
    }

    setFeedback('Subiendo placa a Storage...');
    setUploadProgress(0);

    try {
      const url = await uploadOdontogram(pendingImageFile, selectedPatient.id, (p) => setUploadProgress(p));
      const existingImages = (selectedPatient.odontogram && Array.isArray(selectedPatient.odontogram.images))
        ? selectedPatient.odontogram.images.filter((img) => typeof img === 'string')
        : [];
      const imagesWithUrl = [...existingImages, url];
      const updated = {
        ...selectedPatient,
        odontogram: {
          ...(selectedPatient.odontogram || {}),
          image_url: url,
          images: imagesWithUrl,
          uploading: false
        }
      };
      await updatePatient(updated);
      setFeedback('Placa subida correctamente a Storage.');
      clearPendingImagePreview();
    } catch (err) {
      console.error('Upload error:', err);
      const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
      setFeedback(`No se pudo subir a Storage. Error: ${msg}`);
    } finally {
      setUploadProgress(0);
    }
  };

  const updatePatient = async (updated) => {
    const next = patients.map((p) => (String(p.id) === String(updated.id) ? updated : p));
    setPatients(next);
    writeStoredValue(STORAGE_KEYS.patients, next);
    try {
      await syncWithSupabase('patients', [updated]);
      setFeedback('Ficha de paciente actualizada en Supabase.');
    } catch (err) {
      console.error('Error actualizando paciente en Supabase:', err);
      // If Supabase schema cache doesn't yet include the new column, retry without odontogram
      const msg = String(err?.message || err || '');
      if (msg.includes("Could not find the 'odontogram'") || msg.toLowerCase().includes('schema cache')) {
        try {
          const sanitized = { ...updated };
          delete sanitized.odontogram;
          await syncWithSupabase('patients', [sanitized]);
          setFeedback('Ficha guardada en Supabase (sin odontograma). Odontograma guardado localmente.');
        } catch (err2) {
          console.error('Retry without odontogram also failed:', err2);
          setFeedback(`Ficha actualizada localmente. Error: ${err2.message || err2}`);
        }
      } else {
        setFeedback(`Ficha actualizada localmente. Error: ${err.message || err}`);
      }
    }
    setSelectedPatient(updated);
  };

  const syncOdontogram = async (patient) => {
    if (!patient || !patient.id) {
      setFeedback('No hay paciente seleccionado para sincronizar.');
      return;
    }
    if (!patient.odontogram) {
      setFeedback('El paciente no tiene odontograma para sincronizar.');
      return;
    }
    setFeedback('Sincronizando odontograma con Supabase...');
    try {
      // Update only the odontogram field for existing patient to avoid insert errors
      const { error } = await supabase.from('patients').update({ odontogram: patient.odontogram }).eq('id', patient.id);
      if (error) throw error;
      setFeedback('Odontograma sincronizado en Supabase.');
    } catch (err) {
      console.error('Error sincronizando odontograma:', err);
      setFeedback(`No se pudo sincronizar odontograma: ${err?.message || err}`);
    }
  };

  const handleTopSearchChange = (value) => {
    setSearchTerm(value);
    const found = patients.find((p) => String(p.id) === String(value) || p.name.toLowerCase() === String(value).trim().toLowerCase());
    if (found) {
      openPatientAndNavigate(found.id);
    }
  };

  const filteredAppointments = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return appointments.filter((appointment) => (
      (String(appointment.patient || appointment.patientName).toLowerCase().includes(query)) ||
      appointment.treatment.toLowerCase().includes(query) ||
      appointment.hour.toLowerCase().includes(query)
    ));
  }, [appointments, searchTerm]);

  const sectionMeta = {
    '/Interface': {
      title: 'Bienvenido, Dra. Valeria',
      eyebrow: 'Panel de control',
      heroTitle: 'Agenda activa y pacientes del día',
      heroText: 'Revisa turnos, tratamientos y estado general del consultorio desde un solo lugar.',
      badge: `${patients.length} pacientes registrados`
    },
    '/Interface/pacientes': {
      title: 'Pacientes',
      eyebrow: 'Gestión clínica',
      heroTitle: 'Historial y seguimiento de pacientes',
      heroText: 'Controla fichas, próximos controles y tratamientos activos.',
      badge: `${patients.length} fichas activas`
    },
    '/Interface/turnos': {
      title: 'Turnos',
      eyebrow: 'Agenda diaria',
      heroTitle: 'Administración de turnos',
      heroText: 'Confirma, reprograma y organiza las consultas del día.',
      badge: `${appointments.filter((appointment) => appointment.status === 'Pendiente').length} por confirmar`
    },
    '/Interface/agenda': {
      title: 'Agenda',
      eyebrow: 'Calendario',
      heroTitle: 'Calendario del consultorio',
      heroText: 'Visualiza tareas, controles y procedimientos en un solo panel.',
      badge: 'Próxima semana'
    },
    '/Interface/tratamientos': {
      title: 'Tratamientos',
      eyebrow: 'Plan de trabajo',
      heroTitle: 'Seguimiento de tratamientos',
      heroText: 'Mantén al día cada plan odontológico y su avance.',
      badge: '6 planes activos'
    },
    '/Interface/facturacion': {
      title: 'Facturación',
      eyebrow: 'Cobros',
      heroTitle: 'Control de pagos y facturas',
      heroText: 'Administra cobros, pendientes y movimientos del día.',
      badge: '$245.000 hoy'
    },
    '/Interface/configuracion': {
      title: 'Configuración',
      eyebrow: 'Opciones del sistema',
      heroTitle: 'Ajustes del consultorio',
      heroText: 'Configura usuarios, recordatorios y preferencias operativas.',
      badge: 'Sistema listo'
    }
  };

  const currentSection = sectionMeta[location.pathname] || sectionMeta['/Interface'];

  // Generate all time slots between 08:00 and 20:00 at 15-minute increments
  const generateTimeSlots = () => {
    const slots = [];
    for (let t = 8 * 60; t <= 20 * 60; t += 15) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0');
      const mm = String(t % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  };

  const allTimeSlots = generateTimeSlots();

  const formatToday = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getAvailableTimesForDate = (dateValue) => {
    const target = dateValue && dateValue.trim() ? dateValue : formatToday();
    const occupied = new Set(
      appointments
        .filter((a) => {
          const aDate = (a.date && a.date !== 'Hoy') ? a.date : formatToday();
          return aDate === target;
        })
        .map((a) => a.hour)
    );

    return allTimeSlots.filter((t) => !occupied.has(t));
  };

  const handlePatientSubmit = async (event) => {
    event.preventDefault();
    if (!patientForm.name.trim() || !patientForm.treatment.trim()) {
      setFeedback('Completá el nombre y el tratamiento para guardar el paciente.');
      return;
    }

    const newPatient = {
      id: Date.now(),
      name: patientForm.name.trim(),
      phone: patientForm.phone.trim() || 'Sin teléfono',
      treatment: patientForm.treatment.trim(),
      status: patientForm.status
    };

    const nextPatients = [newPatient, ...patients];
    setPatients(nextPatients);
    writeStoredValue(STORAGE_KEYS.patients, nextPatients);
    try {
      await insertPatientInSupabase(newPatient);
      setFeedback(`Paciente agregado y guardado en Supabase: ${newPatient.name}`);
    } catch (error) {
      setFeedback(`Paciente guardado localmente. ${getSupabaseErrorMessage(error)}`);
    }
    setPatientForm({ name: '', phone: '', treatment: '', status: 'Nuevo' });
  };

  const handleAppointmentSubmit = async (event) => {
    event.preventDefault();
    if (!appointmentForm.patient.trim() || !appointmentForm.time.trim()) {
      setFeedback('Ingresá el paciente y el horario para crear el turno.');
      return;
    }

    // Validate patient exists locally (appointmentForm.patient may hold id or name)
    const patientValue = appointmentForm.patient;
    const patientExists = patients.some((p) => (
      String(p.id) === String(patientValue) || p.name.toLowerCase() === String(patientValue).trim().toLowerCase()
    ));
    if (!patientExists) {
      setFeedback('Seleccioná un paciente existente de la lista o escribí su nombre exactamente.');
      return;
    }

    // Validate time format HH:MM and 15-minute increments, and min/max bounds
    const timeValue = appointmentForm.time.trim();
    if (!/^\d{1,2}:\d{2}$/.test(timeValue)) {
      setFeedback('El horario debe tener el formato HH:MM, por ejemplo 09:30.');
      return;
    }
    const [hhStr, mmStr] = timeValue.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    if (Number.isNaN(hh) || Number.isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      setFeedback('Horario inválido.');
      return;
    }
    if (mm % 15 !== 0) {
      setFeedback('El horario debe ser múltiplo de 15 minutos (ej: 08:00, 08:15, 08:30).');
      return;
    }
    const minTime = 8 * 60; // 08:00 in minutes
    const maxTime = 20 * 60; // 20:00 in minutes
    const totalMinutes = hh * 60 + mm;
    if (totalMinutes < minTime || totalMinutes > maxTime) {
      setFeedback('El horario debe estar entre 08:00 y 20:00.');
      return;
    }

    const selectedPatient = patients.find((p) => (
      String(p.id) === String(appointmentForm.patient) || p.name.toLowerCase() === String(appointmentForm.patient).trim().toLowerCase()
    ));
    // appointment for UI should include patient name so it displays immediately
    const displayAppointment = {
      id: Date.now(),
      patient: selectedPatient ? selectedPatient.name : '',
      patient_id: selectedPatient ? selectedPatient.id : null,
      hour: appointmentForm.time.trim(),
      date: appointmentForm.date.trim() || 'Hoy',
      treatment: appointmentForm.treatment.trim() || 'Consulta',
      status: appointmentForm.status
    };

    const nextAppointments = [displayAppointment, ...appointments];
    setAppointments(nextAppointments);
    writeStoredValue(STORAGE_KEYS.appointments, nextAppointments);
    try {
      // send to DB only the fields it expects (omit patient text column)
      const dbAppointment = { ...displayAppointment };
      delete dbAppointment.patient;
      await insertAppointmentInSupabase(dbAppointment);
      setFeedback(`Turno agregado y guardado en Supabase para ${displayAppointment.patient}`);
    } catch (error) {
      if (error?.message?.includes('invalid input syntax for type bigint')) {
        setFeedback('Turno guardado localmente. Error al insertar en Supabase: un campo numérico recibió texto (revisá el esquema de appointments en Supabase).');
      } else {
        setFeedback(`Turno guardado localmente. ${getSupabaseErrorMessage(error)}`);
      }
    }
    setAppointmentForm({ patient: '', date: '', time: '', treatment: '', status: 'Pendiente' });
  };

  const toggleAppointmentStatus = (id) => {
    const nextAppointments = appointments.map((appointment) => (
      appointment.id === id
        ? { ...appointment, status: appointment.status === 'Confirmado' ? 'Pendiente' : 'Confirmado' }
        : appointment
    ));

    const updatedAppointment = nextAppointments.find((appointment) => appointment.id === id);

    setAppointments(nextAppointments);
    writeStoredValue(STORAGE_KEYS.appointments, nextAppointments);
    if (updatedAppointment) {
      updateAppointmentInSupabase(updatedAppointment).catch((error) => {
        console.error('No se pudo actualizar el turno:', error);
      });
    }
  };

  return (
    <div className="clinic-layout">
      <aside className="clinic-sidebar">
        <div className="brand-block">
          <div className="brand-icon">🦷</div>
          <div>
            <h2>Dental Smile</h2>
            <p>Consultorio dental</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>Resumen de hoy</p>
          <strong>3 turnos pendientes</strong>
        </div>
      </aside>

      <div className="clinic-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{currentSection.eyebrow}</p>
            <h1>{currentSection.title}</h1>
          </div>

          <div className="topbar-actions">
            <TopPatientSearch
              patients={patients}
              onSelect={(p) => openPatientAndNavigate(p.id)}
              onSearchChange={(v) => setSearchTerm(v)}
            />
            <button className="primary-btn" type="button">+ Nuevo turno</button>
          </div>
        </header>

        <section className="hero-panel">
          <div>
            <p className="eyebrow">Resumen del día</p>
            <h2>{currentSection.heroTitle}</h2>
            <p>{currentSection.heroText}</p>
          </div>
          <div className="hero-badge">{currentSection.badge}</div>
        </section>

        {feedback ? <p className="feedback">{feedback}</p> : null}

        <Routes>
          <Route
            path="/"
            element={
              <>
                <section className="stats-grid">
                  {cards.map((card) => (
                    <article key={card.title} className="stat-card">
                      <p>{card.title}</p>
                      <h3>{card.value}</h3>
                      <span>{card.subtitle}</span>
                    </article>
                  ))}
                </section>

                <section className="content-grid">
                  <article className="panel">
                    <div className="panel-header">
                      <h3>Próximos turnos</h3>
                      <button className="ghost-btn" type="button">Ver todos</button>
                    </div>

                    <ul className="schedule-list">
                      {filteredAppointments.slice(0, 4).map((item) => (
                        <li key={item.id}>
                          <div>
                            <strong>{item.patient}</strong>
                            <p>{item.treatment}</p>
                          </div>
                          <div className="list-actions">
                            <span>{item.hour}</span>
                            <button className="mini-btn" type="button" onClick={() => toggleAppointmentStatus(item.id)}>
                              {item.status === 'Confirmado' ? 'Pendiente' : 'Confirmar'}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>

                  <article className="panel">
                    <div className="panel-header">
                      <h3>Pacientes recientes</h3>
                      <span className="pill">Actualizado</span>
                    </div>

                    <ul className="schedule-list">
                      {filteredPatients.slice(0, 4).map((patient) => (
                        <li key={patient.id}>
                          <div>
                            <strong>{patient.name}</strong>
                            <p>{patient.treatment}</p>
                          </div>
                          <span>{patient.status}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </section>
              </>
            }
          />

          <Route
            path="pacientes"
            element={
              <section className="content-grid">
                <article className="panel">
                  <div className="panel-header">
                    <h3>Registrar paciente</h3>
                    <span className="pill">Nuevo</span>
                  </div>

                  <form className="panel-form" onSubmit={handlePatientSubmit}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="patient-name">Nombre del paciente</label>
                        <input id="patient-name" value={patientForm.name} onChange={(event) => setPatientForm({ ...patientForm, name: event.target.value })} placeholder="Ej: Ana Gómez" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="patient-phone">Teléfono</label>
                        <input id="patient-phone" value={patientForm.phone} onChange={(event) => setPatientForm({ ...patientForm, phone: event.target.value })} placeholder="381-1234" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="patient-treatment">Tratamiento</label>
                        <input id="patient-treatment" value={patientForm.treatment} onChange={(event) => setPatientForm({ ...patientForm, treatment: event.target.value })} placeholder="Ej: Ortodoncia" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="patient-status">Estado</label>
                        <select id="patient-status" value={patientForm.status} onChange={(event) => setPatientForm({ ...patientForm, status: event.target.value })}>
                          <option value="Nuevo">Nuevo</option>
                          <option value="En seguimiento">En seguimiento</option>
                          <option value="Pendiente">Pendiente</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button className="primary-btn" type="submit">Agregar paciente</button>
                    </div>
                  </form>
                </article>

                <article className="panel">
                  <div className="panel-header">
                    <h3>Pacientes registrados</h3>
                    <span className="pill">{patients.length} en total</span>
                  </div>
                    <ul className="schedule-list">
                    {filteredPatients.map((patient) => (
                      <li key={patient.id} onClick={() => openPatient(patient.id)} className="clickable-row">
                        <div>
                          <strong>{patient.name}</strong>
                          <p>{patient.treatment} · {patient.phone}</p>
                        </div>
                        <span>{patient.status}</span>
                      </li>
                    ))}
                    </ul>
                </article>
                {selectedPatient ? (
                  <article className="panel">
                    <div className="panel-header">
                      <h3>Ficha: {selectedPatient.name}</h3>
                      <button className="ghost-btn" type="button" onClick={() => setSelectedPatient(null)}>Cerrar</button>
                    </div>

                    <div className="patient-details">
                      <p><strong>Teléfono:</strong> {selectedPatient.phone}</p>
                      <p><strong>Tratamiento:</strong> {selectedPatient.treatment}</p>
                      <p><strong>Estado:</strong> {selectedPatient.status}</p>

                            <div className="odontogram">
                              <h4>Imágenes</h4>
                              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <label htmlFor="odontogram-upload" style={{ fontWeight: '600' }}>Seleccionar archivo</label>
                                <input
                                  id="odontogram-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files && e.target.files[0];
                                    if (!file) return;
                                    if (!selectedPatient || !selectedPatient.id) {
                                      setFeedback('Seleccioná un paciente válido antes de subir la imagen.');
                                      return;
                                    }

                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      const previewUrl = event.target?.result;
                                      if (typeof previewUrl === 'string') {
                                        setPendingImageFile(file);
                                        setPendingImagePreviewUrl(previewUrl);
                                        setFeedback('Vista previa lista. Confirmá la subida.');
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </div>
                              {pendingImagePreviewUrl ? (
                                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{ width: '95%', maxWidth: 560, background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                                    <div style={{ padding: 18 }}>
                                      <h4 style={{ margin: 0 }}>Vista previa de la imagen</h4>
                                      <p style={{ margin: '8px 0 16px', color: '#555' }}>Revisá la imagen antes de confirmar la subida.</p>
                                      <img src={pendingImagePreviewUrl} alt="Vista previa" style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 380 }} />
                                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                                        <button className="ghost-btn" type="button" onClick={() => {
                                          clearPendingImagePreview();
                                          setFeedback('Vista previa cancelada.');
                                        }}>Cancelar</button>
                                        <button className="primary-btn" type="button" onClick={uploadPendingImage}>Confirmar subida</button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                              <div className="odontogram-placeholder">
                                {selectedPatient.odontogram?.image_url ? (
                                  <img src={selectedPatient.odontogram.image_url} alt="Imagen" style={{ maxWidth: '100%', borderRadius: 6 }} />
                                ) : (
                                  <div>No hay imagen cargada</div>
                                )}
                                <div style={{ marginTop: 10 }}>
                                  <h5>Galería</h5>
                                  <ImageGallery images={(selectedPatient.odontogram && selectedPatient.odontogram.images) || []} onSelect={(img) => setModalImage(img)} />
                                  {modalImage ? <ImageModal src={modalImage} alt="Imagen seleccionada" onClose={() => setModalImage(null)} /> : null}
                                  <div style={{ marginTop: 8 }}>
                                    <button className="ghost-btn" type="button" onClick={() => {
                                      // remove last image from gallery
                                      const imgs = (selectedPatient.odontogram && selectedPatient.odontogram.images) || [];
                                      if (imgs.length === 0) return setFeedback('No hay imágenes para borrar');
                                      const newImgs = imgs.slice(0, imgs.length - 1);
                                      const updated = { ...selectedPatient, odontogram: { ...(selectedPatient.odontogram || {}), images: newImgs, image_url: newImgs[newImgs.length-1] || undefined } };
                                      updatePatient(updated);
                                    }}>Borrar última imagen</button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ marginTop: 12 }}>
                              <h4>Odontograma interactivo</h4>
                              <Odontogram
                                teeth={(selectedPatient.odontogram && selectedPatient.odontogram.teeth) || {}}
                                onChange={(nextTeeth) => {
                                  const updated = { ...selectedPatient, odontogram: { ...(selectedPatient.odontogram || {}), teeth: nextTeeth } };
                                  updatePatient(updated);
                                }}
                              />
                              {selectedPatient.odontogram?.uploading || uploadProgress > 0 ? (
                                <div style={{ marginTop: 8 }}>
                                  <div style={{ height: 8, background: '#eee', borderRadius: 6, overflow: 'hidden', width: 320 }}>
                                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 200ms' }} />
                                  </div>
                                  <div style={{ fontSize: 12, marginTop: 6 }}>{uploadProgress}%</div>
                                </div>
                              ) : null}
                            <div style={{ marginTop: 8 }}>
                              <button className="ghost-btn" type="button" onClick={() => syncOdontogram(selectedPatient)}>Sincronizar odontograma</button>
                            </div>
                            </div>

                            <div className="patient-appointments">
                        <h4>Turnos</h4>
                        <ul className="schedule-list">
                          {appointments.filter((a) => String(a.patient_id) === String(selectedPatient.id) || (a.patient && a.patient.toLowerCase() === selectedPatient.name.toLowerCase())).map((a) => (
                            <li key={a.id}>
                              <div>
                                <strong>{a.treatment}</strong>
                                <p>{a.date} · {a.hour}</p>
                              </div>
                              <div className="list-actions">
                                <span>{a.status}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                ) : null}
              </section>
            }
          />

          <Route
            path="turnos"
            element={
              <section className="content-grid">
                <article className="panel">
                  <div className="panel-header">
                    <h3>Programar turno</h3>
                    <span className="pill">Agenda</span>
                  </div>

                  <form className="panel-form" onSubmit={handleAppointmentSubmit}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="appointment-patient">Paciente</label>
                        <input
                          id="appointment-patient"
                          list="patients-list"
                          value={appointmentForm.patient}
                          onChange={(event) => setAppointmentForm({ ...appointmentForm, patient: event.target.value })}
                          placeholder="Buscar paciente por nombre"
                        />
                        <datalist id="patients-list">
                          {patients.map((p) => (
                            <option key={p.id} value={p.name}>{`${p.name} · ${p.treatment}`}</option>
                          ))}
                        </datalist>
                      </div>
                      <div className="form-group">
                        <label htmlFor="appointment-date">Fecha</label>
                        <input
                          id="appointment-date"
                          type="date"
                          value={appointmentForm.date}
                          onChange={(event) => {
                            const newDate = event.target.value;
                            const available = getAvailableTimesForDate(newDate);
                            // If current selected time is no longer available for the new date, clear it
                            const nextTime = available.includes(appointmentForm.time) ? appointmentForm.time : '';
                            setAppointmentForm({ ...appointmentForm, date: newDate, time: nextTime });
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="appointment-time">Horario</label>
                          <select id="appointment-time" value={appointmentForm.time} onChange={(event) => setAppointmentForm({ ...appointmentForm, time: event.target.value })}>
                            <option value="">-- Seleccionar horario --</option>
                            {getAvailableTimesForDate(appointmentForm.date).map((tm) => (
                              <option key={tm} value={tm}>{tm}</option>
                            ))}
                          </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="appointment-treatment">Tratamiento</label>
                        <input id="appointment-treatment" value={appointmentForm.treatment} onChange={(event) => setAppointmentForm({ ...appointmentForm, treatment: event.target.value })} placeholder="Ej: Limpieza" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="appointment-status">Estado</label>
                        <select id="appointment-status" value={appointmentForm.status} onChange={(event) => setAppointmentForm({ ...appointmentForm, status: event.target.value })}>
                          <option value="Pendiente">Pendiente</option>
                          <option value="Confirmado">Confirmado</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button className="primary-btn" type="submit">Guardar turno</button>
                    </div>
                  </form>
                </article>

                <article className="panel">
                  <div className="panel-header">
                    <h3>Turnos del día</h3>
                    <span className="pill">{appointments.length} cargados</span>
                  </div>
                  <ul className="schedule-list">
                    {filteredAppointments.map((item) => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.patient}</strong>
                          <p>{item.treatment} · {item.date || 'Hoy'}</p>
                        </div>
                        <div className="list-actions">
                          <span>{item.hour}</span>
                          <button className="mini-btn" type="button" onClick={() => toggleAppointmentStatus(item.id)}>
                            {item.status === 'Confirmado' ? 'Pendiente' : 'Confirmar'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              </section>
            }
          />

          <Route
            path="agenda"
            element={
              <section className="content-grid">
                <article className="panel">
                  <div className="panel-header">
                    <h3>Calendario semanal</h3>
                    <span className="pill">Semana</span>
                  </div>
                  <ul className="schedule-list">
                    <li><div><strong>Lunes</strong><p>Cirugías menores</p></div><span>4</span></li>
                    <li><div><strong>Miércoles</strong><p>Controles</p></div><span>6</span></li>
                    <li><div><strong>Viernes</strong><p>Atención extendida</p></div><span>5</span></li>
                  </ul>
                </article>

                <article className="panel">
                  <div className="panel-header">
                    <h3>Eventos importantes</h3>
                    <span className="pill">Próximo</span>
                  </div>
                  <div className="reminders">
                    <div className="reminder-item"><strong>Capacitación</strong><p>Reunión de equipo el jueves.</p></div>
                    <div className="reminder-item"><strong>Entrega de implantes</strong><p>Confirmar stock para viernes.</p></div>
                  </div>
                </article>
              </section>
            }
          />

          <Route
            path="tratamientos"
            element={
              <section className="content-grid">
                <article className="panel">
                  <div className="panel-header">
                    <h3>Tratamientos activos</h3>
                    <span className="pill">En curso</span>
                  </div>
                  <ul className="schedule-list">
                    <li><div><strong>Ortodoncia</strong><p>3 semanas de avance</p></div><span>Activo</span></li>
                    <li><div><strong>Implante</strong><p>Plan de cirugía</p></div><span>Pendiente</span></li>
                  </ul>
                </article>

                <article className="panel">
                  <div className="panel-header">
                    <h3>Próximas etapas</h3>
                    <span className="pill">Seguimiento</span>
                  </div>
                  <div className="reminders">
                    <div className="reminder-item"><strong>Revisión de brackets</strong><p>Programar cita esta semana.</p></div>
                    <div className="reminder-item"><strong>Control de implante</strong><p>Confirmar indicaciones médicas.</p></div>
                  </div>
                </article>
              </section>
            }
          />

          <Route
            path="facturacion"
            element={
              <section className="content-grid">
                <article className="panel">
                  <div className="panel-header">
                    <h3>Movimientos del día</h3>
                    <button className="ghost-btn" type="button">Exportar</button>
                  </div>
                  <div className="reminders">
                    <div className="reminder-item">
                      <strong>No hay movimientos cargados todavía</strong>
                      <p>Los pagos y facturas aparecerán aquí cuando los registres.</p>
                    </div>
                  </div>
                </article>

                <article className="panel">
                  <div className="panel-header">
                    <h3>Estado de pagos</h3>
                    <span className="pill">Al día</span>
                  </div>
                  <div className="reminders">
                    <div className="reminder-item"><strong>2 pagos pendientes</strong><p>Enviar recordatorios por WhatsApp.</p></div>
                    <div className="reminder-item"><strong>Facturas emitidas</strong><p>7 en total hoy.</p></div>
                  </div>
                </article>
              </section>
            }
          />

          <Route
            path="configuracion"
            element={
              <section className="content-grid">
                <article className="panel">
                  <div className="panel-header">
                    <h3>Preferencias</h3>
                    <span className="pill">Sistema</span>
                  </div>
                  <ul className="schedule-list">
                    <li><div><strong>Notificaciones</strong><p>Recordatorios automáticos</p></div><span>ON</span></li>
                    <li><div><strong>Usuarios</strong><p>Accesos del equipo</p></div><span>3</span></li>
                  </ul>
                </article>

                <article className="panel">
                  <div className="panel-header">
                    <h3>Configuración rápida</h3>
                    <span className="pill">Listo</span>
                  </div>
                  <div className="reminders">
                    <div className="reminder-item"><strong>Plantillas</strong><p>Editar mensajes de turnos.</p></div>
                    <div className="reminder-item"><strong>Horarios</strong><p>Adaptar agenda del consultorio.</p></div>
                  </div>
                </article>
              </section>
            }
          />

          <Route path="*" element={<Navigate to="/Interface" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default Interface;