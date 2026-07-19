export const findPatientByNameOrId = (patients, value) => {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  return patients.find((p) => String(p.id) === v || p.name.toLowerCase() === v) || null;
};

export const filterPatientsByQuery = (patients, query) => {
  if (!query) return patients;
  const q = String(query).trim().toLowerCase();
  return patients.filter((p) => (
    p.name.toLowerCase().includes(q) ||
    (p.treatment || '').toLowerCase().includes(q) ||
    (p.phone || '').toLowerCase().includes(q)
  ));
};
