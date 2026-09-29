import assert from 'node:assert';
import { it } from 'vitest';
import { ctx, sheets, mails, post, get, setProps, makeSheet } from './gasSim.js';

it('Code.gs: inserción, idempotencia, ACK, estadísticas, borrado, mail y token', () => {

const HA = ctx.HEADERS_ACCESO_PERIFERICO.slice(0, -2);
const HS = ctx.HEADERS_SONDAS.slice(0, -2);
const HU = ctx.HEADERS_UPP.slice(0, -2);

function viaRow(over) {
  const r = HA.map(() => '');
  Object.assign(r, { 0: '05/03/2026 10:00', 1: 'B', 2: '201', 3: '1', 4: '00123' });
  for (const [k, v] of Object.entries(over || {})) r[HA.indexOf(k)] = v;
  return r;
}

// 1. inserción nueva con headers
let res = post({ formType: 'ACCESO_PERIFERICO', recordId: 'rec_1', headers: HA, rowValues: viaRow({ 'Acceso (SI)': 'SI', 'Visibilidad (NO)': 'NO', 'Rótulo (SI/NO)': 'SI', 'Rótulo Fecha': 'SI', 'Rótulo Nombre': 'SI', 'Rótulo Legajo': 'SI', 'Rótulo Enfermero': 'SI', 'Rótulo Turno': 'SI', 'Rótulo ABB': 'SI', Observaciones: '=HYPERLINK("x")' }) });
assert.equal(res.status, 'success', JSON.stringify(res));
const sv = sheets['Acceso Periférico'];
const hdr = sv.data[0];
assert.equal(sv.data.length, 2);
assert.equal(sv.data[1][hdr.indexOf('ID Registro')], 'rec_1');
assert.equal(sv.data[1][hdr.indexOf('Mail Enviado')], 'NO');
assert.equal(sv.data[1][hdr.indexOf('HC')], '00123');
assert.ok(String(sv.data[1][hdr.indexOf('Observaciones')]).startsWith("'="), 'fórmula neutralizada');

// 2. duplicado
res = post({ formType: 'ACCESO_PERIFERICO', recordId: 'rec_1', headers: HA, rowValues: viaRow() });
assert.equal(res.duplicate, true);
assert.equal(sv.data.length, 2);

// 3. payload legado sin headers
res = post({ formType: 'ACCESO_PERIFERICO', rowValues: viaRow({ 'Acceso (NO)': 'NO', 'Tipo Acceso Alt.': 'Libre', Cama: '2' }) });
assert.equal(res.status, 'success');
assert.equal(sv.data[2][hdr.indexOf('Tipo Acceso Alt.')], 'Libre');

// 4. formType desconocido
res = post({ formType: 'OTRO', rowValues: [] });
assert.equal(res.status, 'error');

// 5. hoja vieja con columnas en otro orden y sin ID Registro
const old = makeSheet('UPP');
sheets['UPP'] = old;
const oldHeaders = HU.slice().reverse().concat(['Mail Enviado']);
old.data.push(oldHeaders);
res = post({ formType: 'UPP', recordId: 'rec_u1', headers: HU, rowValues: HU.map((h) => (h === 'Sector' ? 'C' : h === 'UPP (SI)' ? 'SI' : h === 'Escala de Braden' ? 10 : h === 'Habitación' ? '240' : h === 'Cama' ? '3' : h === 'Fecha/Hora' ? '06/03/2026 09:00' : '')) });
assert.equal(res.status, 'success', JSON.stringify(res));
const uh = old.data[0];
assert.equal(uh[uh.length - 1], 'ID Registro', 'ID agregado al final');
assert.equal(old.data[1][uh.indexOf('Sector')], 'C');
assert.equal(old.data[1][uh.indexOf('Escala de Braden')], 10);

// 6. sondas con estado de cama
res = post({ formType: 'SONDA_VESICAL', recordId: 'rec_s1', headers: HS, rowValues: HS.map((h) => ({ 'Fecha/Hora': '05/03/2026 11:00', Sector: 'B', 'Habitación': '201', Cama: '1', 'Estado Cama': 'Quimio' }[h] || '')) });
res = post({ formType: 'SONDA_VESICAL', recordId: 'rec_s2', headers: HS, rowValues: HS.map((h) => ({ 'Fecha/Hora': '05/03/2026 11:00', Sector: 'B', 'Habitación': '201', Cama: '2', 'Tiene Sonda': 'SI', Lumenes: '2' }[h] || '')) });

// 7. ACK
res = get({ action: 'ACK', ids: 'rec_1,rec_x,rec_s2' });
assert.deepEqual(res.found.sort(), ['rec_1', 'rec_s2']);

// 8. estadísticas
res = get({ action: 'GET_STATS', from: '2026-03-05', to: '2026-03-06' });
assert.equal(res.status, 'success', JSON.stringify(res));
assert.equal(res.vias.puncionNoVisible, 1, 'punción no visible');
assert.equal(res.vias.rotuloCompleto, 1);
assert.equal(res.vias.noEvaluables, 1);
assert.equal(res.sondas.noEvaluables, 1);
assert.equal(res.sondas.conSonda, 1);
assert.equal(res.sondas.sinSonda, 0);
assert.equal(res.cobertura.noEvaluablesSondas, 1);
assert.equal(res.upp.bradenAlto, 1);
assert.ok(res.vias.respuestas.some((r) => r.label === 'Nombre'));
res = get({ action: 'GET_STATS', from: '2026-03-06', to: '2026-03-06', ronda: 'vias' });
assert.equal(res.cobertura.viasUnicas, 0, 'filtro por fecha');

// 9. borrar
res = get({ action: 'DELETE_RECORD', id: 'rec_s1' });
assert.equal(res.deleted, true);

// 10. mail: ignora recipients, incluye sondas, marca todo
res = post({ action: 'SEND_SHIFT_SUMMARY', recipients: ['atacante@x.com'] });
assert.equal(res.status, 'success', JSON.stringify(res));
assert.equal(mails.length, 1);
assert.equal(mails[0].to, ctx.RECIPIENTS.join(','));
assert.ok(mails[0].htmlBody.includes('Sondas Vesicales'));
assert.ok(!mails[0].htmlBody.includes('<script'), 'sin HTML crudo');
assert.equal(res.sondasCount, 1);
assert.ok(String(sv.data[1][hdr.indexOf('Mail Enviado')]).startsWith('SI ('));
res = get({ action: 'DELETE_RECORD', id: 'rec_1' });
assert.equal(res.code, 'ALREADY_MAILED');

// 11. HTML escapado
post({ formType: 'ACCESO_PERIFERICO', recordId: 'rec_h', headers: HA, rowValues: viaRow({ HC: '<script>x</script>', Cama: '3' }) });
post({ action: 'SEND_SHIFT_SUMMARY' });
assert.ok(mails[1].htmlBody.includes('&lt;script&gt;'));

// 12. health check y token
res = get({});
assert.equal(res.status, 'online');
assert.equal(res.destinatarios, undefined);
setProps({ API_TOKEN: 'abc' });
res = post({ formType: 'ACCESO_PERIFERICO', recordId: 'rec_t', headers: HA, rowValues: viaRow() });
assert.equal(res.message, 'No autorizado');
res = get({ action: 'GET_STATS' });
assert.equal(res.code, 'UNAUTHORIZED');
res = get({ token: 'abc' });
assert.equal(res.authorized, true);
res = get({ action: 'ACK', ids: 'rec_1', token: 'abc' });
assert.deepEqual(res.found, ['rec_1']);

});

it('Code.gs: hoja vieja con fechas Date y seriales se convierte a texto y sigue en las estadísticas', () => {
  setProps({});
  const HU = ctx.HEADERS_UPP.slice(0, -2);
  const old = makeSheet('UPP');
  sheets['UPP'] = old;
  const rowWith = (fecha, cama) => HU.map((h) => ({ 'Fecha/Hora': fecha, Sector: 'D', 'Habitación': 216, Cama: cama, 'UPP (SI)': 'SI', 'Escala de Braden': 11 }[h] ?? ''));
  const serial = Date.UTC(2026, 2, 10, 9, 30) / 86400000 + 25569;
  old.data.push([...HU, 'Mail Enviado']);
  old.data.push(rowWith(new Date(2026, 2, 10, 8, 15), '1'));
  old.data.push(rowWith(serial, '2'));

  const res = post({ formType: 'UPP', recordId: 'rec_new', headers: HU, rowValues: rowWith('10/03/2026 10:00', '3') });
  assert.equal(res.status, 'success');
  const h = old.data[0];
  assert.equal(old.data[1][h.indexOf('Fecha/Hora')], '10/03/2026 08:15');
  assert.equal(old.data[2][h.indexOf('Fecha/Hora')], '10/03/2026 09:30');
  assert.equal(old.data[1][h.indexOf('Habitación')], '216');

  const stats = get({ action: 'GET_STATS', from: '2026-03-10', to: '2026-03-10', ronda: 'upp', sector: 'D' });
  assert.equal(stats.cobertura.uppUnicas, 3);
  assert.equal(stats.upp.bradenAlto, 3);
});
