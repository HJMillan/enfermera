/**
 * PLANILLA ENFERMERA - Google Apps Script (Producción)
 * Versión: 1.3.0
 *
 * Webhook de la app: inserta registros en Google Sheets, lee estadísticas
 * y envía el reporte de Cierre de Turno por mail.
 *
 * CONFIGURACIÓN
 * - Zona horaria del proyecto (Configuración del proyecto) y de la planilla
 *   (Archivo › Configuración): America/Argentina/Buenos_Aires, región Argentina.
 * - Clave de acceso (opcional pero recomendada): Configuración del proyecto ›
 *   Propiedades del script › API_TOKEN = <clave>. La misma clave se carga en
 *   Ajustes de la app. Sin esa propiedad el webhook acepta cualquier llamada.
 * - Destinatarios del reporte: constante RECIPIENTS (la app no puede cambiarlos).
 *
 * Las columnas se leen y escriben por NOMBRE de cabecera, no por posición.
 */

// Si el script está vinculado al Sheet (Extensiones > Apps Script), dejar vacío ('').
// Si se utiliza como script independiente (standalone), colocar el ID de la hoja de cálculo:
var SPREADSHEET_ID = '';

/** Debe coincidir con SCRIPT_VERSION en src/config/version.ts */
var SCRIPT_VERSION = '1.3.0';

var TZ = 'America/Argentina/Buenos_Aires';

/** Únicos destinatarios del reporte de cierre. Se ignora cualquier lista enviada por la app. */
var RECIPIENTS = ['jesusmillan86@gmail.com', 'pamelaestua91@gmail.com'];

var COL_MAIL = 'Mail Enviado';
var COL_ID = 'ID Registro';

// Cabeceras oficiales. Las de datos coinciden 1:1 con src/services/sheetMapper.ts.
// El orden solo importa al crear una hoja nueva; en hojas existentes se usa el nombre.
var HEADERS_ACCESO_PERIFERICO = [
  'Fecha/Hora',          // 0
  'Sector',              // 1
  'Habitación',          // 2
  'Cama',                // 3
  'HC',                  // 4
  'Cant. Enfermeras',    // 5
  'Cant. Auxiliares',    // 6
  'Acceso (SI)',         // 7
  'Acceso (NO)',         // 8
  'Tipo Acceso Alt.',    // 9  (acceso_central | percutaneo | nada | Libre | Quimio | ...)
  'Acceso Central Ubic.',// 10 (Y/I | Y/D | S/I | S/D)
  'Cantidad',            // 11
  'Ubicación MSD',       // 12
  'Ubicación MSI',       // 13
  'Ubicación MII',       // 14
  'Ubicación MID',       // 15
  'Rótulo (SI/NO)',      // 16
  'Rótulo Fecha',        // 17
  'Rótulo Nombre',       // 18
  'Rótulo Legajo',       // 19
  'Rótulo Enfermero',    // 20
  'Rótulo Turno',        // 21
  'Rótulo ABB',          // 22
  'Visibilidad (SI)',    // 23
  'Visibilidad (NO)',    // 24
  'Fijación Tegaderm',   // 25
  'Fijación Cinta',      // 26
  'Tipo Cinta',          // 27
  'Fijación Hipafix',    // 28
  'Fijación Venda',      // 29
  'Fijación Contención', // 30
  'Adherencia',          // 31
  'Llave 3 Vías',        // 32
  'Tapón Multifunción',  // 33
  'Infiltración',        // 34
  'Eritematoso',         // 35
  'Retorno',             // 36
  'Infusión Tipo',       // 37
  'Observaciones',       // 38
  'Fecha Ingreso',       // 39
  'Sexo',                // 40
  COL_MAIL,              // 41
  COL_ID                 // 42
];

var HEADERS_UPP = [
  'Fecha/Hora',                // 0
  'Sector',                    // 1
  'Habitación',                // 2
  'Cama',                      // 3
  'HC',                        // 4
  'Cant. Enfermeras',          // 5
  'Cant. Auxiliares',          // 6
  'Fecha Ingreso',             // 7
  'Área Cerrada (SI/NO)',      // 8
  'UPP (SI)',                  // 9
  'UPP (NO)',                  // 10
  'Cantidad',                  // 11
  'Ubicación Sacra',           // 12
  'Ubicación Talón',           // 13
  'Ubicación Glúteo',          // 14
  'Ubicación Posterior',       // 15
  'Ubicación Otro',            // 16
  'Grado I',                   // 17
  'Grado II',                  // 18
  'Grado III',                 // 19
  'Grado IV',                  // 20
  'Tratamiento (SI/NO)',       // 21
  'Tipo Tratamiento',          // 22
  'Detalle Tratamiento',       // 23
  'Dispositivo Apoyo (SI/NO)', // 24
  'Disp. Aro',                 // 25
  'Disp. Guantes Agua',        // 26
  'Disp. Otro',                // 27
  'Escala de Braden',          // 28
  'Nutrición Oral',            // 29
  'Nutrición NPT',             // 30
  'Nutrición Enteral SN',      // 31
  'Nutrición Enteral BG',      // 32
  'Colchón Anti-escaras (SI)', // 33
  'Colchón Anti-escaras (NO)', // 34
  'Obs Colchón',               // 35
  'Sexo',                      // 36
  COL_MAIL,                    // 37
  COL_ID                       // 38
];

var HEADERS_SONDAS = [
  'Fecha/Hora',         // 0
  'Sector',             // 1
  'Habitación',         // 2
  'Cama',               // 3
  'HC',                 // 4
  'Cant. Enfermeras',   // 5
  'Cant. Auxiliares',   // 6
  'Fecha Ingreso',      // 7
  'Sexo',               // 8
  'Tiene Sonda',        // 9
  'Numero Sonda',       // 10
  'Lumenes',            // 11
  'Fijacion',           // 12
  'Ubicacion Correcta', // 13
  'Motivo Ubicacion',   // 14
  'Observaciones',      // 15
  'Estado Cama',        // 16 (Libre | Quimio | ... vacío si el paciente está)
  COL_MAIL,             // 17
  COL_ID                // 18
];

var SHEETS = {
  ACCESO_PERIFERICO: { name: 'Acceso Periférico', headers: HEADERS_ACCESO_PERIFERICO },
  UPP: { name: 'UPP', headers: HEADERS_UPP },
  SONDA_VESICAL: { name: 'Sondas Vesicales', headers: HEADERS_SONDAS }
};

/** Columnas que se guardan siempre como texto (evita que Sheets convierta fechas o quite ceros). */
var TEXT_COLUMNS = ['Fecha/Hora', 'Habitación', 'Cama', 'HC', 'Fecha Ingreso', COL_ID];

// ---------------------------------------------------------------------------
// UTILIDADES GENERALES
// ---------------------------------------------------------------------------

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('No se encontró una Hoja de Cálculo activa. Si el script no está dentro de la hoja (Extensiones > Apps Script), configura la variable SPREADSHEET_ID.');
  }
  return ss;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function respondPayload(payload, callback) {
  if (payload && typeof payload === 'object' && !payload.version) {
    payload.version = SCRIPT_VERSION;
  }
  var json = JSON.stringify(payload);
  if (callback && /^[A-Za-z_][A-Za-z0-9_]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse(payload);
}

/** Resultado interno de las acciones: objeto plano, luego se serializa como JSON o JSONP. */
function result(status, message, extra) {
  var out = { status: status, message: message };
  if (extra) {
    for (var k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
    }
  }
  return out;
}

function getApiToken() {
  return String(PropertiesService.getScriptProperties().getProperty('API_TOKEN') || '').trim();
}

/** Sin API_TOKEN configurado se acepta todo (compatibilidad). Con token, debe coincidir. */
function isAuthorized(token) {
  var expected = getApiToken();
  if (!expected) return true;
  return String(token || '') === expected;
}

function escapeHtml(val) {
  return String(val === null || val === undefined ? '' : val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Evita que un texto se interprete como fórmula en Sheets o en Excel. */
function neutralizeFormula(val) {
  if (typeof val !== 'string') return val;
  if (/^[=+@]/.test(val) || /^-[^\d]/.test(val)) return "'" + val;
  return val;
}

function escapeCsv(val) {
  var str = String(val === null || val === undefined ? '' : val);
  str = neutralizeFormula(str);
  return '"' + str.replace(/"/g, '""') + '"';
}

function isYes(val) {
  return String(val || '').trim().toUpperCase() === 'SI';
}

function isNo(val) {
  return String(val || '').trim().toUpperCase() === 'NO';
}

function ynCell(val) {
  if (isYes(val)) return 'si';
  if (isNo(val)) return 'no';
  return '';
}

function isFlag(val) {
  var s = String(val || '').toLowerCase();
  return s === '1' || s === 'true' || s === 'si' || s === 'yes';
}

function isMailSent(val) {
  return String(val || '').toUpperCase().trim().indexOf('SI') === 0;
}

// ---------------------------------------------------------------------------
// HOJAS Y CABECERAS
// ---------------------------------------------------------------------------

function styleHeaderCell(range) {
  range.setFontWeight('bold').setBackground('#e0f2fe');
}

/**
 * Asegura que la hoja exista y tenga todas las cabeceras esperadas.
 * Las cabeceras faltantes se agregan AL FINAL: como todo se lee y escribe por nombre,
 * la posición no importa y no se desalinean datos existentes.
 */
function ensureSheetWithHeaders(ss, sheetName, expectedHeaders) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    styleHeaderCell(sheet.getRange(1, 1, 1, expectedHeaders.length));
    sheet.setFrozenRows(1);
    applyTextFormat(sheet);
    return sheet;
  }

  var current = readHeaderRow(sheet);
  var present = {};
  for (var i = 0; i < current.length; i++) present[current[i]] = true;

  var missing = [];
  for (var j = 0; j < expectedHeaders.length; j++) {
    if (!present[expectedHeaders[j]]) missing.push(expectedHeaders[j]);
  }
  if (missing.length > 0) {
    var startCol = current.length + 1;
    if (sheet.getMaxColumns() < current.length + missing.length) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), current.length + missing.length - sheet.getMaxColumns());
    }
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
    styleHeaderCell(sheet.getRange(1, startCol, 1, missing.length));
    applyTextFormat(sheet);
  }
  return sheet;
}

function readHeaderRow(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  var raw = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var out = [];
  for (var i = 0; i < raw.length; i++) out.push(String(raw[i] || '').trim());
  return out;
}

/** Mapa nombre de cabecera → índice 0-based. */
function headerIndex(headerRow) {
  var map = {};
  for (var i = 0; i < headerRow.length; i++) {
    if (headerRow[i] && map[headerRow[i]] === undefined) map[headerRow[i]] = i;
  }
  return map;
}

var DATE_COLUMNS = { 'Fecha/Hora': true, 'Fecha Ingreso': true };

/**
 * Aplica formato texto a las columnas de TEXT_COLUMNS en toda la hoja.
 * Antes convierte a texto lo que Sheets ya había transformado (fechas en Date o
 * número serial, números de habitación): si solo se cambiara el formato, una fecha
 * quedaría mostrada como número serial y dejaría de leerse.
 */
function applyTextFormat(sheet) {
  var idx = headerIndex(readHeaderRow(sheet));
  var rows = sheet.getMaxRows();
  var lastRow = sheet.getLastRow();
  for (var i = 0; i < TEXT_COLUMNS.length; i++) {
    var name = TEXT_COLUMNS[i];
    var col = idx[name];
    if (col === undefined) continue;
    var converted = null;
    if (lastRow >= 2) {
      var values = sheet.getRange(2, col + 1, lastRow - 1, 1).getValues();
      var dirty = false;
      for (var r = 0; r < values.length; r++) {
        var val = values[r][0];
        if (val === '' || val === null || typeof val === 'string') continue;
        var text = DATE_COLUMNS[name] ? dateCellToText(val, name === 'Fecha/Hora', false) : String(val);
        if (text !== null) {
          values[r][0] = text;
          dirty = true;
        }
      }
      if (dirty) converted = values;
    }
    sheet.getRange(1, col + 1, rows, 1).setNumberFormat('@');
    if (converted) sheet.getRange(2, col + 1, converted.length, 1).setValues(converted);
  }
}

/** Componentes de fecha de una celda Date o número serial de Sheets (días desde 30/12/1899). */
function dateCellParts(val) {
  if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())) {
    var p = Utilities.formatDate(val, TZ, 'yyyy-MM-dd-HH-mm').split('-');
    return { y: Number(p[0]), mo: Number(p[1]), d: Number(p[2]), h: Number(p[3]), mi: Number(p[4]) };
  }
  if (typeof val === 'number' && val > 1 && val < 2958466) {
    // El serial representa la hora local de la planilla: se lee en UTC para no correrlo.
    var dt = new Date(Math.round((val - 25569) * 86400000));
    return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes() };
  }
  return null;
}

/** Date o serial → "dd/MM/yyyy[ HH:mm]". swap intercambia día y mes. null si no es fecha. */
function dateCellToText(val, withTime, swap) {
  var c = dateCellParts(val);
  if (!c) return null;
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  var dmy = swap ? pad(c.mo) + '/' + pad(c.d) + '/' + c.y : pad(c.d) + '/' + pad(c.mo) + '/' + c.y;
  return withTime ? dmy + ' ' + pad(c.h) + ':' + pad(c.mi) : dmy;
}

/**
 * Lee todas las filas de datos y las devuelve reordenadas según `canonical`
 * (el array HEADERS_*), así los índices fijos V/U/S siguen siendo válidos
 * aunque la hoja tenga las columnas en otro orden.
 */
function readCanonicalRows(sheet, canonical, useDisplay) {
  if (!sheet || sheet.getLastRow() < 2) return { rows: [], rowNumbers: [], idx: {} };
  var headerRow = readHeaderRow(sheet);
  var idx = headerIndex(headerRow);
  var range = sheet.getRange(2, 1, sheet.getLastRow() - 1, headerRow.length);
  var raw = useDisplay ? range.getDisplayValues() : range.getValues();
  var rows = [];
  var rowNumbers = [];
  for (var r = 0; r < raw.length; r++) {
    var src = raw[r];
    var row = [];
    for (var c = 0; c < canonical.length; c++) {
      var at = idx[canonical[c]];
      row.push(at === undefined ? '' : src[at]);
    }
    rows.push(row);
    rowNumbers.push(r + 2);
  }
  return { rows: rows, rowNumbers: rowNumbers, idx: idx };
}

// ---------------------------------------------------------------------------
// ENTRADAS HTTP
// ---------------------------------------------------------------------------

/**
 * POST desde la app (no-cors: la app no puede leer esta respuesta).
 * Acciones: registro nuevo (por defecto), SEND_SHIFT_SUMMARY, DELETE_RECORD, PING.
 */
function doPost(e) {
  try {
    var contents = e && e.postData ? e.postData.contents : '';
    if (!contents) {
      return jsonResponse(result('error', 'Cuerpo de petición vacío'));
    }
    var payload = JSON.parse(contents);

    if (!isAuthorized(payload.token)) {
      return jsonResponse(result('error', 'No autorizado'));
    }

    if (payload.action === 'PING' || payload.action === 'TEST_CONNECTION') {
      return jsonResponse(result('success', 'Conexión exitosa con el Webhook de Planilla Enfermera.'));
    }
    if (payload.action === 'SEND_SHIFT_SUMMARY') {
      return jsonResponse(withLock(enviarReporteTurno));
    }
    if (payload.action === 'DELETE_RECORD') {
      return jsonResponse(withLock(function () { return deleteRecord(payload.recordId); }));
    }
    return jsonResponse(withLock(function () { return insertRecord(payload); }));
  } catch (error) {
    return jsonResponse(result('error', error.toString()));
  }
}

/**
 * GET (JSON o JSONP con ?callback=).
 * - sin acción: health check (sin datos sensibles).
 * - GET_STATS: estadísticas.
 * - ACK&ids=a,b,c: qué registros existen en el Sheet.
 * - SEND_SHIFT_SUMMARY / DELETE_RECORD&id=: igual que por POST, pero con respuesta legible.
 */
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = String(params.action || '').toUpperCase();
  var callback = String(params.callback || '');

  try {
    var authorized = isAuthorized(params.token);

    if (!action) {
      return respondPayload({
        status: 'online',
        version: SCRIPT_VERSION,
        authorized: authorized,
        tokenRequired: Boolean(getApiToken())
      }, callback);
    }

    if (!authorized) {
      return respondPayload(result('error', 'No autorizado: revisá la clave en Ajustes.', { code: 'UNAUTHORIZED' }), callback);
    }

    if (action === 'GET_STATS') {
      return respondPayload(getStatisticsCached(params), callback);
    }
    if (action === 'ACK') {
      return respondPayload(ackRecords(String(params.ids || '')), callback);
    }
    if (action === 'SEND_SHIFT_SUMMARY') {
      return respondPayload(withLock(enviarReporteTurno), callback);
    }
    if (action === 'DELETE_RECORD') {
      return respondPayload(withLock(function () { return deleteRecord(params.id); }), callback);
    }
    return respondPayload(result('error', 'Acción desconocida: ' + action), callback);
  } catch (error) {
    return respondPayload(result('error', error.toString()), callback);
  }
}

/** Serializa las operaciones que escriben en la planilla. */
function withLock(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return result('error', 'La planilla está ocupada. Probá de nuevo en unos segundos.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// REGISTROS
// ---------------------------------------------------------------------------

function findRowById(sheet, recordId) {
  if (!recordId || !sheet || sheet.getLastRow() < 2) return -1;
  var idx = headerIndex(readHeaderRow(sheet));
  var col = idx[COL_ID];
  if (col === undefined) return -1;
  var values = sheet.getRange(2, col + 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(recordId)) return i + 2;
  }
  return -1;
}

function insertRecord(payload) {
  var formType = payload.formType;
  var cfg = SHEETS[formType];
  if (!cfg) {
    return result('error', 'Tipo de registro desconocido: ' + formType);
  }

  var ss = getSpreadsheet();
  var sheet = ensureSheetWithHeaders(ss, cfg.name, cfg.headers);
  var recordId = String(payload.recordId || '').trim();

  // Idempotencia: un reintento del mismo registro no duplica la fila.
  if (recordId && findRowById(sheet, recordId) !== -1) {
    return result('success', 'El registro ya estaba en ' + cfg.name, { duplicate: true });
  }

  var values = payload.rowValues || [];
  // App >= 1.3 manda los nombres de columna; versiones viejas mandan solo la posición.
  var names = Array.isArray(payload.headers) && payload.headers.length > 0
    ? payload.headers
    : cfg.headers.slice(0, cfg.headers.length - 2);

  var byName = {};
  for (var i = 0; i < names.length; i++) {
    byName[String(names[i]).trim()] = values[i] === undefined || values[i] === null ? '' : values[i];
  }
  byName[COL_MAIL] = 'NO';
  byName[COL_ID] = recordId;

  // Si la app manda una columna que la hoja no tiene, se agrega al final.
  var headerRow = readHeaderRow(sheet);
  var present = headerIndex(headerRow);
  var extra = [];
  for (var name in byName) {
    if (Object.prototype.hasOwnProperty.call(byName, name) && present[name] === undefined && name) extra.push(name);
  }
  if (extra.length > 0) {
    ensureSheetWithHeaders(ss, cfg.name, headerRow.concat(extra));
    headerRow = readHeaderRow(sheet);
  }

  var row = [];
  var formats = [];
  for (var c = 0; c < headerRow.length; c++) {
    var colName = headerRow[c];
    var val = Object.prototype.hasOwnProperty.call(byName, colName) ? byName[colName] : '';
    var isText = TEXT_COLUMNS.indexOf(colName) !== -1 || typeof val !== 'number';
    row.push(isText ? neutralizeFormula(String(val)) : val);
    formats.push(isText ? '@' : (Number.isInteger(val) ? '0' : '0.##'));
  }

  var target = sheet.getLastRow() + 1;
  if (target > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 1);
  }
  var range = sheet.getRange(target, 1, 1, row.length);
  range.setNumberFormats([formats]);
  range.setValues([row]);
  CacheService.getScriptCache().remove('stats_gen');

  return result('success', 'Fila agregada correctamente a ' + cfg.name, { rowNumber: target });
}

function deleteRecord(recordId) {
  recordId = String(recordId || '').trim();
  if (!recordId) return result('error', 'Falta el id del registro.');
  var ss = getSpreadsheet();
  for (var key in SHEETS) {
    if (!Object.prototype.hasOwnProperty.call(SHEETS, key)) continue;
    var sheet = ss.getSheetByName(SHEETS[key].name);
    var rowNum = findRowById(sheet, recordId);
    if (rowNum === -1) continue;
    var idx = headerIndex(readHeaderRow(sheet));
    if (idx[COL_MAIL] !== undefined && isMailSent(sheet.getRange(rowNum, idx[COL_MAIL] + 1).getValue())) {
      return result('error', 'El registro ya se envió en el reporte por mail; no se borró del Sheet.', { code: 'ALREADY_MAILED' });
    }
    sheet.deleteRow(rowNum);
    CacheService.getScriptCache().remove('stats_gen');
    return result('success', 'Registro borrado del Sheet.', { deleted: true });
  }
  return result('success', 'El registro no estaba en el Sheet.', { deleted: false });
}

/** Devuelve cuáles de los ids recibidos existen en alguna hoja. */
function ackRecords(idsParam) {
  var wanted = {};
  var ids = idsParam.split(',');
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i].trim();
    if (id) wanted[id] = true;
  }
  var found = [];
  var ss = getSpreadsheet();
  for (var key in SHEETS) {
    if (!Object.prototype.hasOwnProperty.call(SHEETS, key)) continue;
    var sheet = ss.getSheetByName(SHEETS[key].name);
    if (!sheet || sheet.getLastRow() < 2) continue;
    var col = headerIndex(readHeaderRow(sheet))[COL_ID];
    if (col === undefined) continue;
    var values = sheet.getRange(2, col + 1, sheet.getLastRow() - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      var v = String(values[r][0]);
      if (wanted[v]) {
        found.push(v);
        delete wanted[v];
      }
    }
  }
  return result('success', 'OK', { found: found });
}

// ---------------------------------------------------------------------------
// REPORTE DE CIERRE DE TURNO
// ---------------------------------------------------------------------------

function formatBedStatusBadge(statusRaw) {
  var s = String(statusRaw || '').trim();
  var sLow = s.toLowerCase();
  var badge = function (bg, color, text) {
    return '<span style="background-color:' + bg + '; color:' + color + '; padding:3px 7px; border-radius:4px; font-weight:bold;">' + text + '</span>';
  };
  if (!s || sLow === 'nada' || sLow === 'sin via' || sLow === 'sin_acceso') {
    return '<span style="color:#64748b;">Sin Acceso</span>';
  }
  if (sLow === 'libre') return badge('#e0f2fe', '#0369a1', '🛏️ Libre');
  if (sLow === 'quimio' || sLow === 'quimioterapia') return badge('#fef3c7', '#b45309', '🧪 Quimio');
  if (sLow === 'quirófano' || sLow === 'quirofano') return badge('#fee2e2', '#b91c1c', '🏥 Quirófano');
  if (sLow === 'diálisis' || sLow === 'dialisis') return badge('#ede9fe', '#6d28d9', '💉 Diálisis');
  if (sLow.indexOf('estudio') !== -1 || sLow.indexOf('rayos') !== -1) return badge('#f3e8ff', '#7e22ce', '📋 Estudio/Rayos');
  if (sLow.indexOf('traslado') !== -1) return badge('#ffedd5', '#c2410c', '🔄 Traslado');
  if (sLow === 'acceso_central') return badge('#f1f5f9', '#0f172a', 'Vía Central');
  if (sLow === 'percutaneo') return badge('#f1f5f9', '#0f172a', 'Percutáneo');
  return badge('#f1f5f9', '#475569', escapeHtml(s));
}

/** Filas pendientes de mail de una hoja, en orden canónico y con sus números de fila reales. */
function readPendingForMail(ss, cfg) {
  var sheet = ss.getSheetByName(cfg.name);
  var empty = { sheet: sheet, rows: [], rowNumbers: [], mailCol: -1, headers: cfg.headers };
  if (!sheet || sheet.getLastRow() < 2) return empty;
  var data = readCanonicalRows(sheet, cfg.headers, true);
  var mailPos = cfg.headers.indexOf(COL_MAIL);
  var mailCol = data.idx[COL_MAIL];
  if (mailCol === undefined) return empty; // sin columna Mail Enviado no se marca nada
  var rows = [];
  var rowNumbers = [];
  for (var i = 0; i < data.rows.length; i++) {
    if (isBlankBed(data.rows[i], 1, 2, 3)) continue;
    if (!isMailSent(data.rows[i][mailPos])) {
      rows.push(data.rows[i]);
      rowNumbers.push(data.rowNumbers[i]);
    }
  }
  return { sheet: sheet, rows: rows, rowNumbers: rowNumbers, mailCol: mailCol, headers: cfg.headers };
}

/** Marca "Mail Enviado" con una sola escritura por hoja. */
function markMailSent(pack, mark) {
  if (!pack.sheet || pack.rowNumbers.length === 0 || pack.mailCol < 0) return;
  var sheet = pack.sheet;
  var n = sheet.getLastRow() - 1;
  var range = sheet.getRange(2, pack.mailCol + 1, n, 1);
  var values = range.getValues();
  for (var i = 0; i < pack.rowNumbers.length; i++) {
    values[pack.rowNumbers[i] - 2][0] = mark;
  }
  range.setValues(values);
}

function kpiCard(value, label, color, highlight) {
  var border = highlight ? highlight.border : '#cbd5e1';
  var bg = highlight ? highlight.bg : '#ffffff';
  return '<div style="flex: 1; min-width: 110px; padding: 12px; border-radius: 10px; border: 1px solid ' + border + '; background-color: ' + bg + '; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">' +
    '<div style="font-size: 22px; font-weight: bold; color: ' + color + ';">' + value + '</div>' +
    '<div style="font-size: 10px; color: ' + color + '; text-transform: uppercase; font-weight: 600;">' + label + '</div>' +
    '</div>';
}

var TH = 'padding: 7px 8px; border: 1px solid #e2e8f0;';
var TD = 'padding: 6px 8px; border: 1px solid #e2e8f0;';

function tableStart(title, count, columns) {
  var html = '<h3 style="color: #0369a1; font-size: 15px; margin-top: 22px; border-bottom: 2px solid #e0f2fe; padding-bottom: 4px;">' + title + ' (' + count + ')</h3>';
  html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff;">';
  html += '<tr style="background: #f1f5f9; text-align: left; color: #475569;">';
  for (var i = 0; i < columns.length; i++) html += '<th style="' + TH + '">' + columns[i] + '</th>';
  return html + '</tr>';
}

function tableRow(cells) {
  var html = '<tr>';
  for (var i = 0; i < cells.length; i++) html += '<td style="' + TD + '">' + cells[i] + '</td>';
  return html + '</tr>';
}

/** Celdas comunes de ubicación: fecha, sector, hab/cama, HC (ya escapadas). */
function placeCells(row) {
  return [
    '<span style="font-family: monospace; font-size: 11px;">' + escapeHtml(row[0]) + '</span>',
    escapeHtml(row[1]),
    '<b>' + escapeHtml(row[2]) + '</b> - Cama ' + escapeHtml(row[3]),
    escapeHtml(row[4] || '-')
  ];
}

/**
 * Envía por mail todos los registros con Mail Enviado != SI y los marca.
 * Destinatarios: siempre RECIPIENTS.
 */
function enviarReporteTurno() {
  var ss = getSpreadsheet();
  var vias = readPendingForMail(ss, SHEETS.ACCESO_PERIFERICO);
  var upp = readPendingForMail(ss, SHEETS.UPP);
  var sondas = readPendingForMail(ss, SHEETS.SONDA_VESICAL);

  var totalPending = vias.rows.length + upp.rows.length + sondas.rows.length;
  if (totalPending === 0) {
    return result('success', 'No hay registros pendientes de envío. Todos los pacientes ya fueron reportados.', { count: 0 });
  }

  // Métricas
  var viasConAcceso = 0;
  var viasConAlerta = 0;
  var camasLibresOAusentes = 0;
  for (var v = 0; v < vias.rows.length; v++) {
    var rV = vias.rows[v];
    if (isYes(rV[7])) {
      viasConAcceso++;
      if (isYes(rV[34]) || isYes(rV[35])) viasConAlerta++;
    } else if (isSpecialViasRow(rV)) {
      camasLibresOAusentes++;
    }
  }
  var uppConLesion = 0;
  for (var u = 0; u < upp.rows.length; u++) {
    if (isYes(upp.rows[u][9])) uppConLesion++;
  }
  var sondasCon = 0;
  for (var s = 0; s < sondas.rows.length; s++) {
    if (isYes(sondas.rows[s][9])) sondasCon++;
  }

  var fechaHoy = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm');
  var subject = '[Reporte Enfermería] Cierre de Turno - ' + fechaHoy + ' (' + totalPending + ' registros)';

  var html = '<div style="font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 780px; margin: auto; padding: 20px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">';
  html += '<div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 20px; border-radius: 10px; color: #ffffff; text-align: center;">';
  html += '<h2 style="margin: 0; font-size: 22px;">🏥 Reporte de Relevamiento de Enfermería</h2>';
  html += '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.95;">Cierre de Turno / Registros Clínicos Despachados</p>';
  html += '</div>';
  html += '<p style="margin-top: 16px; font-size: 14px;"><b>Fecha y Hora de Emisión:</b> ' + fechaHoy + ' hs</p>';
  html += '<p style="font-size: 13px; color: #64748b;">Consolidado de pacientes relevados que estaban pendientes de reporte.</p>';

  html += '<div style="display: flex; gap: 8px; margin: 16px 0; text-align: center; flex-wrap: wrap;">';
  html += kpiCard(totalPending, 'Total Registros', '#0284c7');
  html += kpiCard(viasConAcceso, 'Vías Activas', '#059669');
  html += kpiCard(viasConAlerta, 'Alertas Vía', viasConAlerta > 0 ? '#dc2626' : '#64748b', viasConAlerta > 0 ? { border: '#fca5a5', bg: '#fef2f2' } : null);
  html += kpiCard(uppConLesion, 'LPP Activas', uppConLesion > 0 ? '#d97706' : '#64748b', uppConLesion > 0 ? { border: '#fcd34d', bg: '#fffbeb' } : null);
  html += kpiCard(sondasCon, 'Con Sonda', '#0f766e');
  html += kpiCard(camasLibresOAusentes, 'Libres/Ausentes', '#475569');
  html += '</div>';

  if (vias.rows.length > 0) {
    html += tableStart('💉 Accesos Vasculares Relevados', vias.rows.length,
      ['Fecha/Hora', 'Sector', 'Hab/Cama', 'HC', 'Estado de Cama / Acceso', 'Ubicación', 'Rótulo', 'Alertas']);
    for (var pv = 0; pv < vias.rows.length; pv++) {
      var rowP = vias.rows[pv];
      var hasV = isYes(rowP[7]);
      var ubicList = [];
      if (isYes(rowP[12])) ubicList.push('MSD');
      if (isYes(rowP[13])) ubicList.push('MSI');
      if (isYes(rowP[14])) ubicList.push('MII');
      if (isYes(rowP[15])) ubicList.push('MID');

      var estadoAcceso;
      if (hasV) {
        estadoAcceso = '<span style="color:#059669; font-weight:bold;">Con Vía (' + escapeHtml(rowP[11] || '1') + ')</span>';
      } else if (rowP[9] === 'acceso_central') {
        estadoAcceso = 'Central (' + escapeHtml(rowP[10] || 'S/D') + ')';
      } else if (rowP[9] === 'percutaneo') {
        estadoAcceso = 'Percutáneo';
      } else {
        estadoAcceso = formatBedStatusBadge(rowP[9]);
      }

      var rotuloInfo = isYes(rowP[16]) ? '<span style="color:#059669; font-weight:bold;">SÍ</span>' : (isNo(rowP[16]) ? '<span style="color:#dc2626;">NO</span>' : '-');
      var alerta = '';
      if (isYes(rowP[34])) alerta += '<span style="background-color:#fee2e2; color:#dc2626; padding:2px 5px; border-radius:3px; font-weight:bold;">Infiltración </span>';
      if (isYes(rowP[35])) alerta += '<span style="background-color:#fee2e2; color:#dc2626; padding:2px 5px; border-radius:3px; font-weight:bold;">Eritema </span>';
      if (!alerta && hasV) alerta = '<span style="color:#059669;">Sin signos</span>';
      if (!hasV) alerta = '<span style="color:#94a3b8;">-</span>';

      html += tableRow(placeCells(rowP).concat([estadoAcceso, ubicList.join(', ') || '-', rotuloInfo, alerta]));
    }
    html += '</table>';
  }

  if (upp.rows.length > 0) {
    html += tableStart('🩹 Lesiones por presión (LPP) Relevadas', upp.rows.length,
      ['Fecha/Hora', 'Sector', 'Hab/Cama', 'HC', 'Tiene LPP / Estado', 'Grados', 'Tratamiento', 'Disp. Apoyo', 'Braden']);
    for (var pu = 0; pu < upp.rows.length; pu++) {
      var rowU = upp.rows[pu];
      var hasU = isYes(rowU[9]);
      var grados = [];
      if (isYes(rowU[17])) grados.push('I');
      if (isYes(rowU[18])) grados.push('II');
      if (isYes(rowU[19])) grados.push('III');
      if (isYes(rowU[20])) grados.push('IV');
      var dispApoyo = isYes(rowU[24]) ? '<span style="color:#059669; font-weight:bold;">SÍ</span>' : (isNo(rowU[24]) ? 'NO' : '-');

      var estadoUpp;
      if (hasU) {
        estadoUpp = '<span style="background-color:#fef3c7; color:#d97706; padding:2px 6px; border-radius:4px; font-weight:bold;">SÍ (' + escapeHtml(rowU[11] || '1') + ')</span>';
      } else if (isSpecialUppRow(rowU)) {
        estadoUpp = formatBedStatusBadge(String(rowU[35]).replace(/paciente ausente \/ cama libre:\s*/i, '').trim());
      } else {
        estadoUpp = '<span style="color:#059669;">Sin lesiones</span>';
      }

      html += tableRow(placeCells(rowU).concat([
        estadoUpp,
        grados.join(', ') || '-',
        escapeHtml(rowU[22] || '-'),
        dispApoyo,
        escapeHtml(rowU[28] || '-')
      ]));
    }
    html += '</table>';
  }

  if (sondas.rows.length > 0) {
    html += tableStart('🩺 Sondas Vesicales Relevadas', sondas.rows.length,
      ['Fecha/Hora', 'Sector', 'Hab/Cama', 'HC', 'Estado', 'Fr', 'Lúmenes', 'Fijación', 'Ubicación']);
    for (var ps = 0; ps < sondas.rows.length; ps++) {
      var rowS = sondas.rows[ps];
      var estadoS;
      if (isSpecialSondaRow(rowS)) {
        estadoS = formatBedStatusBadge(sondaEstado(rowS));
      } else if (isYes(rowS[9])) {
        estadoS = '<span style="color:#0f766e; font-weight:bold;">Con sonda</span>';
      } else {
        estadoS = '<span style="color:#64748b;">Sin sonda</span>';
      }
      var ubic = isNo(rowS[13]) ? '<span style="color:#dc2626;">NO</span> ' + escapeHtml(rowS[14] || '') : escapeHtml(rowS[13] || '-');
      html += tableRow(placeCells(rowS).concat([
        estadoS,
        escapeHtml(rowS[10] || '-'),
        escapeHtml(rowS[11] || '-'),
        escapeHtml(rowS[12] || '-'),
        ubic
      ]));
    }
    html += '</table>';
  }

  html += '<div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">';
  html += 'Planilla Enfermera — Sistema Automático de Relevamiento Clínico y Seguridad del Paciente';
  html += '</div></div>';

  // CSV adjunto
  var csvLines = [];
  var packs = [
    { title: '--- ACCESO PERIFERICO ---', pack: vias },
    { title: '--- LESIONES POR PRESION (LPP) ---', pack: upp },
    { title: '--- SONDAS VESICALES ---', pack: sondas }
  ];
  for (var pk = 0; pk < packs.length; pk++) {
    var p = packs[pk].pack;
    if (p.rows.length === 0) continue;
    csvLines.push(packs[pk].title);
    csvLines.push(p.headers.map(escapeCsv).join(','));
    for (var cr = 0; cr < p.rows.length; cr++) csvLines.push(p.rows[cr].map(escapeCsv).join(','));
    csvLines.push('');
  }
  var csvBlob = Utilities.newBlob('\uFEFF' + csvLines.join('\r\n'), 'text/csv',
    'reporte_turno_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd_HHmm') + '.csv');

  MailApp.sendEmail({
    to: RECIPIENTS.join(','),
    subject: subject,
    htmlBody: html,
    attachments: [csvBlob]
  });

  var mark = 'SI (' + fechaHoy + ')';
  markMailSent(vias, mark);
  markMailSent(upp, mark);
  markMailSent(sondas, mark);
  SpreadsheetApp.flush();

  return result('success', 'Reporte enviado por mail (' + totalPending + ' registros).', {
    count: totalPending,
    viasCount: vias.rows.length,
    uppCount: upp.rows.length,
    sondasCount: sondas.rows.length
  });
}

// ---------------------------------------------------------------------------
// MENÚ DE GOOGLE SHEETS & DISPARADORES
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏥 Planilla Enfermera')
    .addItem('📧 Despachar Reporte de Turno por Mail', 'menuDespacharReporte')
    .addItem('🛠️ Verificar / Inicializar Hojas y Cabeceras', 'menuInicializarHojas')
    .addItem('📊 Ver Estado de Registros Pendientes', 'menuVerPendientes')
    .addItem('📅 Normalizar fechas a texto', 'menuNormalizarFechas')
    .addSeparator()
    .addItem('⏰ Programar Envío Automático Diario (16:00 hs)', 'menuCrearDisparadorDiario')
    .addToUi();
}

function menuDespacharReporte() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'Cierre de Turno',
    '¿Enviar por correo el reporte de los registros pendientes a:\n' + RECIPIENTS.join(', ') + '?',
    ui.ButtonSet.YES_NO
  );
  if (resp === ui.Button.YES) {
    var res = withLock(enviarReporteTurno);
    ui.alert(res.status === 'success' ? 'Éxito' : 'Atención', res.message, ui.ButtonSet.OK);
  }
}

function menuInicializarHojas() {
  var ss = getSpreadsheet();
  for (var key in SHEETS) {
    if (!Object.prototype.hasOwnProperty.call(SHEETS, key)) continue;
    var sheet = ensureSheetWithHeaders(ss, SHEETS[key].name, SHEETS[key].headers);
    applyTextFormat(sheet);
  }
  SpreadsheetApp.getUi().alert(
    'Configuración Completa',
    'Las hojas "Acceso Periférico", "UPP" y "Sondas Vesicales" fueron verificadas: cabeceras completas y columnas de fecha, habitación, cama e HC en formato texto.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function menuVerPendientes() {
  var ss = getSpreadsheet();
  var lines = [];
  var total = 0;
  var labels = { ACCESO_PERIFERICO: 'Vías Periféricas', UPP: 'LPP', SONDA_VESICAL: 'Sondas Vesicales' };
  for (var key in SHEETS) {
    if (!Object.prototype.hasOwnProperty.call(SHEETS, key)) continue;
    var n = readPendingForMail(ss, SHEETS[key]).rows.length;
    total += n;
    lines.push('• ' + labels[key] + ': ' + n + ' pendientes');
  }
  SpreadsheetApp.getUi().alert(
    'Registros Pendientes de Envío',
    lines.join('\n') + '\nTotal: ' + total + ' registros.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Convierte a texto dd/MM/yyyy HH:mm las celdas de fecha que Sheets transformó en Date.
 * Si la planilla estuvo en configuración regional EE.UU., esas fechas tienen día y mes
 * invertidos: el menú pregunta y, si corresponde, los intercambia.
 */
function menuNormalizarFechas() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'Normalizar fechas',
    'Se convertirán a texto las fechas de "Fecha/Hora" y "Fecha Ingreso" en las tres hojas.\n\n' +
    'Hacé una copia de la planilla antes de seguir.\n\n' +
    '¿La planilla estuvo configurada en inglés (EE.UU.) mientras se cargaban datos? ' +
    'Respondé SÍ para intercambiar día y mes de las fechas convertidas, NO para dejarlas como están.',
    ui.ButtonSet.YES_NO_CANCEL
  );
  if (resp === ui.Button.CANCEL || resp === ui.Button.CLOSE) return;
  var swap = resp === ui.Button.YES;

  var ss = getSpreadsheet();
  var changed = 0;
  var cols = ['Fecha/Hora', 'Fecha Ingreso'];
  for (var key in SHEETS) {
    if (!Object.prototype.hasOwnProperty.call(SHEETS, key)) continue;
    var sheet = ss.getSheetByName(SHEETS[key].name);
    if (!sheet || sheet.getLastRow() < 2) continue;
    var idx = headerIndex(readHeaderRow(sheet));
    for (var c = 0; c < cols.length; c++) {
      var col = idx[cols[c]];
      if (col === undefined) continue;
      var range = sheet.getRange(2, col + 1, sheet.getLastRow() - 1, 1);
      var values = range.getValues();
      var dirty = false;
      for (var r = 0; r < values.length; r++) {
        var text = dateCellToText(values[r][0], cols[c] === 'Fecha/Hora', swap);
        if (text === null) continue;
        values[r][0] = text;
        dirty = true;
        changed++;
      }
      if (dirty) {
        range.setNumberFormat('@');
        range.setValues(values);
      }
    }
  }
  CacheService.getScriptCache().remove('stats_gen');
  ui.alert('Listo', changed + ' celdas convertidas a texto.', ui.ButtonSet.OK);
}

function menuCrearDisparadorDiario() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'verificarYEnviarPendientesAutomatico') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('verificarYEnviarPendientesAutomatico')
    .timeBased()
    .everyDays(1)
    .atHour(16)
    .inTimezone(TZ)
    .create();
  SpreadsheetApp.getUi().alert(
    'Disparador Programado',
    'Se programó el envío automático diario para las 16:00 hs (fin del turno 8-16 hs).',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function verificarYEnviarPendientesAutomatico() {
  withLock(enviarReporteTurno);
}

// ---------------------------------------------------------------------------
// ESTADÍSTICAS (lectura del archivo, no de la sesión del celular)
// ---------------------------------------------------------------------------

var SECTOR_ROOM_CONFIG = {
  'PB': { min: 1, max: 8, exclusions: [] },
  '1° Piso': { min: 101, max: 110, exclusions: [105, 106] },
  'Maternidad': { min: 242, max: 261, exclusions: [252, 253, 254, 255, 256, 257, 258, 259] },
  'A': { min: 230, max: 236, exclusions: [] },
  'B': { min: 201, max: 215, exclusions: [] },
  'C': { min: 237, max: 256, exclusions: [242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252] },
  'D': { min: 216, max: 229, exclusions: [] },
  'E': { min: 262, max: 277, exclusions: [] }
};

var BEDS_PER_ROOM = 4;

var SECTOR_PLACE_CAPACITY = {
  'UCE': 8,
  'RCA': 16
};

var STATS_SECTORS = ['PB', '1° Piso', 'Maternidad', 'A', 'B', 'C', 'D', 'E', 'UCE', 'RCA'];

var SPECIAL_BED_STATUSES = ['Libre', 'Quimio', 'Quirófano', 'Diálisis', 'Estudio / Rayos', 'Traslado'];

// Índices en el orden canónico de HEADERS_* (las filas se reordenan al leer).
var V = {
  fecha: 0, sector: 1, hab: 2, cama: 3, hc: 4, enf: 5, aux: 6,
  accesoSi: 7, accesoNo: 8, tipoAlt: 9,
  msd: 12, msi: 13, mii: 14, mid: 15,
  rotulo: 16, rotFecha: 17, rotNombre: 18, rotLegajo: 19, rotEnf: 20, rotTurno: 21, rotAbb: 22,
  visSi: 23, visNo: 24, adherencia: 31,
  infiltracion: 34, eritema: 35, retorno: 36, infusion: 37
};

var U = {
  fecha: 0, sector: 1, hab: 2, cama: 3, hc: 4, enf: 5, aux: 6,
  areaCerrada: 8, uppSi: 9, uppNo: 10,
  sacra: 12, talon: 13, gluteo: 14, posterior: 15, ubicOtro: 16,
  gradoI: 17, gradoII: 18, gradoIII: 19, gradoIV: 20,
  tratamiento: 21, tipoTrat: 22,
  disp: 24, aro: 25, guantes: 26, dispOtro: 27,
  braden: 28, nutOral: 29, nutNpt: 30, nutSn: 31, nutBg: 32,
  colchonSi: 33, colchonNo: 34, obs: 35
};

var S = {
  fecha: 0, sector: 1, hab: 2, cama: 3, hc: 4, enf: 5, aux: 6,
  ingreso: 7, sexo: 8, tiene: 9, numero: 10, lumenes: 11,
  fijacion: 12, ubicacion: 13, motivo: 14, obs: 15, estado: 16
};

/**
 * Cachea la respuesta 60 s por combinación de filtros. Cada inserción o borrado
 * cambia la "generación" y deja inválidas las entradas anteriores.
 */
function getStatisticsCached(params) {
  var cache = CacheService.getScriptCache();
  var gen = cache.get('stats_gen');
  if (!gen) {
    gen = String(new Date().getTime());
    cache.put('stats_gen', gen, 21600);
  }
  var keyParts = ['from', 'to', 'sector', 'ronda', 'evaluables', 'alertas', 'conVia', 'rotulo', 'conUpp', 'braden'];
  var key = 'stats_' + gen;
  for (var i = 0; i < keyParts.length; i++) key += '|' + String(params[keyParts[i]] || '');
  key = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, key));

  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var stats = buildStatistics(params);
  var json = JSON.stringify(stats);
  if (json.length < 90000) cache.put(key, json, 60);
  return stats;
}

function buildStatistics(params) {
  var fromIso = String(params.from || '').trim();
  var toIso = String(params.to || '').trim();
  var sectorFilter = String(params.sector || '').trim();
  var ronda = String(params.ronda || 'ambas').toLowerCase();
  var onlyEvaluables = isFlag(params.evaluables);
  var onlyAlertas = isFlag(params.alertas);
  var onlyConVia = isFlag(params.conVia);
  var onlyRotuloInc = String(params.rotulo || '').toLowerCase() === 'incompleto';
  var onlyConUpp = isFlag(params.conUpp);
  var onlyBradenAlto = String(params.braden || '').toLowerCase() === 'alto';

  var loadVias = ronda === 'ambas' || ronda === 'vias';
  var loadUpp = ronda === 'ambas' || ronda === 'upp';
  var loadSondas = ronda === 'ambas' || ronda === 'sondas';

  var ss = getSpreadsheet();
  var viasRaw = loadVias ? readCanonicalRows(ss.getSheetByName(SHEETS.ACCESO_PERIFERICO.name), HEADERS_ACCESO_PERIFERICO, false).rows : [];
  var uppRaw = loadUpp ? readCanonicalRows(ss.getSheetByName(SHEETS.UPP.name), HEADERS_UPP, false).rows : [];
  var sondasRaw = loadSondas ? readCanonicalRows(ss.getSheetByName(SHEETS.SONDA_VESICAL.name), HEADERS_SONDAS, false).rows : [];

  var viasDated = filterByDateAndSector(viasRaw, fromIso, toIso, sectorFilter);
  var uppDated = filterByDateAndSector(uppRaw, fromIso, toIso, sectorFilter);
  var sondasDated = filterByDateAndSector(sondasRaw, fromIso, toIso, sectorFilter);

  var viasEval = lastRowByBed(viasDated);
  var uppEval = lastRowByBed(uppDated);
  var sondasEval = lastRowByBed(sondasDated);

  if (onlyEvaluables) {
    viasEval = viasEval.filter(function (row) { return !isSpecialViasRow(row); });
    uppEval = uppEval.filter(function (row) { return !isSpecialUppRow(row); });
    sondasEval = sondasEval.filter(function (row) { return !isSpecialSondaRow(row); });
  }
  if (onlyConVia) {
    viasEval = viasEval.filter(function (row) { return isYes(row[V.accesoSi]); });
  }
  if (onlyRotuloInc) {
    viasEval = viasEval.filter(function (row) { return rotuloStatus(row) === 'incompleto'; });
  }
  if (onlyConUpp) {
    uppEval = uppEval.filter(function (row) { return isYes(row[U.uppSi]); });
  }
  if (onlyBradenAlto) {
    uppEval = uppEval.filter(function (row) { return bradenBand(row[U.braden]) === 'alto'; });
  }
  if (onlyAlertas) {
    viasEval = viasEval.filter(function (row) { return viasAlertTipos(row).length > 0; });
    uppEval = uppEval.filter(function (row) { return uppAlertTipos(row).length > 0; });
  }

  var noEvalVias = viasEval.filter(isSpecialViasRow).length;
  var noEvalUpp = uppEval.filter(isSpecialUppRow).length;
  var noEvalSondas = sondasEval.filter(isSpecialSondaRow).length;

  var alertasPack = collectAlertas(viasEval, uppEval, 30);

  return {
    status: 'success',
    version: SCRIPT_VERSION,
    generatedAt: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'),
    from: fromIso || null,
    to: toIso || null,
    sector: sectorFilter || null,
    ronda: ronda,
    cobertura: {
      registrosVias: viasDated.length,
      registrosUpp: uppDated.length,
      registrosSondas: sondasDated.length,
      viasUnicas: viasEval.length,
      uppUnicas: uppEval.length,
      sondasUnicas: sondasEval.length,
      noEvaluablesVias: noEvalVias,
      noEvaluablesUpp: noEvalUpp,
      noEvaluablesSondas: noEvalSondas,
      capacidad: sectorCapacity(sectorFilter),
      porSector: summarizeBySector(viasEval, uppEval, sondasEval, sectorFilter)
    },
    vias: summarizeVias(viasEval),
    upp: summarizeUpp(uppEval),
    sondas: summarizeSondas(sondasEval),
    alertas: alertasPack.items,
    alertasTotal: alertasPack.total
  };
}

/**
 * Lee la fecha de una celda (texto dd/MM/yyyy HH:mm o Date) sin depender de la
 * zona horaria del script. Devuelve { ymd: 'yyyy-MM-dd', ts } donde ts sirve solo
 * para comparar (hora local de Argentina expresada como UTC).
 */
function readSheetDate(val) {
  var y, mo, d, h, mi;
  var c = dateCellParts(val);
  if (c) {
    y = c.y; mo = c.mo; d = c.d; h = c.h; mi = c.mi;
  } else {
    var m = String(val || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (!m) return null;
    d = Number(m[1]); mo = Number(m[2]); y = Number(m[3]); h = Number(m[4] || 0); mi = Number(m[5] || 0);
  }
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  return { ymd: y + '-' + pad(mo) + '-' + pad(d), ts: Date.UTC(y, mo - 1, d, h, mi) };
}

function cellStr(row, idx) {
  if (!row || idx >= row.length || row[idx] == null || row[idx] === '') return '';
  var val = row[idx];
  if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, TZ, 'dd/MM/yyyy HH:mm');
  }
  return String(val).trim();
}

function isBlankBed(row, sectorIdx, habIdx, camaIdx) {
  return !cellStr(row, sectorIdx) || !cellStr(row, habIdx) || !cellStr(row, camaIdx);
}

// Las tres hojas comparten las posiciones 0-3 (fecha, sector, habitación, cama) y 5-6 (personal).
function filterByDateAndSector(rows, fromIso, toIso, sector) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (isBlankBed(row, 1, 2, 3)) continue;
    if (sector && cellStr(row, 1) !== sector) continue;
    if (fromIso || toIso) {
      var d = readSheetDate(row[0]);
      if (!d) continue;
      if (fromIso && d.ymd < fromIso) continue;
      if (toIso && d.ymd > toIso) continue;
    }
    out.push(row);
  }
  return out;
}

/** Último registro de cada cama (sector|habitación|cama) dentro del rango. */
function lastRowByBed(rows) {
  var map = {};
  var order = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var key = cellStr(row, 1) + '|' + cellStr(row, 2) + '|' + cellStr(row, 3);
    var prev = map[key];
    if (!prev) {
      map[key] = row;
      order.push(key);
      continue;
    }
    var dNew = readSheetDate(row[0]);
    var dOld = readSheetDate(prev[0]);
    if (!dOld || (dNew && dNew.ts >= dOld.ts)) map[key] = row;
  }
  return order.map(function (k) { return map[k]; });
}

function parseStaffCount(val) {
  if (val === '' || val == null) return null;
  var n = Number(val);
  if (isNaN(n) || n < 0) return null;
  return n;
}

function applyStaff(slot, row) {
  var d = readSheetDate(row[0]);
  var ts = d ? d.ts : 0;
  if (slot._staffAt && ts < slot._staffAt) return;
  slot._staffAt = ts;
  var en = parseStaffCount(row[5]);
  var ax = parseStaffCount(row[6]);
  if (en !== null) slot.enfermeras = en;
  if (ax !== null) slot.auxiliares = ax;
}

function countRooms(cfg) {
  var n = 0;
  var ex = {};
  var exclusions = cfg.exclusions || [];
  for (var i = 0; i < exclusions.length; i++) ex[exclusions[i]] = true;
  for (var r = cfg.min; r <= cfg.max; r++) {
    if (!ex[r]) n++;
  }
  return n;
}

function sectorCapacity(sector) {
  if (sector) {
    if (Object.prototype.hasOwnProperty.call(SECTOR_PLACE_CAPACITY, sector)) {
      return SECTOR_PLACE_CAPACITY[sector];
    }
    return SECTOR_ROOM_CONFIG[sector] ? countRooms(SECTOR_ROOM_CONFIG[sector]) * BEDS_PER_ROOM : 0;
  }
  var total = 0;
  for (var k in SECTOR_ROOM_CONFIG) {
    if (Object.prototype.hasOwnProperty.call(SECTOR_ROOM_CONFIG, k)) {
      total += countRooms(SECTOR_ROOM_CONFIG[k]) * BEDS_PER_ROOM;
    }
  }
  for (var p in SECTOR_PLACE_CAPACITY) {
    if (Object.prototype.hasOwnProperty.call(SECTOR_PLACE_CAPACITY, p)) {
      total += SECTOR_PLACE_CAPACITY[p];
    }
  }
  return total;
}

function isSpecialStatus(text) {
  var low = String(text || '').trim().toLowerCase();
  if (!low) return false;
  if (low === 'ausente') return true;
  for (var i = 0; i < SPECIAL_BED_STATUSES.length; i++) {
    if (low === SPECIAL_BED_STATUSES[i].toLowerCase()) return true;
  }
  return low.indexOf('estudio') !== -1 || low.indexOf('rayos') !== -1;
}

function isSpecialViasRow(row) {
  return isSpecialStatus(cellStr(row, V.tipoAlt));
}

function isSpecialUppRow(row) {
  var obs = cellStr(row, U.obs).toLowerCase();
  return obs.indexOf('paciente ausente') !== -1 || obs.indexOf('cama libre:') !== -1;
}

/** Estado de cama en Sondas. Filas viejas (sin "Estado Cama") lo tenían al inicio de Observaciones. */
function sondaEstado(row) {
  var estado = cellStr(row, S.estado);
  if (estado) return estado;
  if (isYes(row[S.tiene])) return '';
  var obs = cellStr(row, S.obs);
  var head = obs.split(' - ')[0];
  return isSpecialStatus(head) ? head : '';
}

function isSpecialSondaRow(row) {
  return Boolean(sondaEstado(row));
}

function rotuloApplies(row) {
  return isYes(row[V.accesoSi]) || cellStr(row, V.tipoAlt).toLowerCase() === 'percutaneo';
}

function rotuloItemApplies(row) {
  return rotuloApplies(row) && isYes(row[V.rotulo]);
}

function rotuloStatus(row) {
  if (!rotuloApplies(row)) return 'na';
  if (!ynCell(row[V.rotulo])) return 'na';
  if (!isYes(row[V.rotulo])) return 'incompleto';
  var items = [V.rotFecha, V.rotNombre, V.rotLegajo, V.rotEnf, V.rotTurno, V.rotAbb];
  for (var i = 0; i < items.length; i++) {
    if (!isYes(row[items[i]])) return 'incompleto';
  }
  return 'completo';
}

function bradenBand(val) {
  var n = Number(val);
  if (val === '' || val == null || isNaN(n)) return '';
  if (n <= 12) return 'alto';
  if (n <= 14) return 'moderado';
  return 'bajo';
}

function viasAlertTipos(row) {
  var tipos = [];
  if (isYes(row[V.infiltracion])) tipos.push('Infiltración');
  if (isYes(row[V.eritema])) tipos.push('Eritema');
  if (rotuloStatus(row) === 'incompleto') tipos.push('Rótulo incompleto');
  return tipos;
}

function uppAlertTipos(row) {
  var tipos = [];
  if (isYes(row[U.gradoIII]) || isYes(row[U.gradoIV])) tipos.push('LPP III-IV');
  if (bradenBand(row[U.braden]) === 'alto') tipos.push('Braden alto');
  return tipos;
}

function bump(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function mapToItems(map) {
  var items = [];
  for (var k in map) {
    if (map.hasOwnProperty(k)) items.push({ label: k, count: map[k] });
  }
  items.sort(function (a, b) { return b.count - a.count; });
  return items;
}

function readVisibilidad(row) {
  if (isYes(row[V.visSi])) return 'si';
  if (isNo(row[V.visNo])) return 'no';
  return '';
}

function countRespuesta(rows, applies, read) {
  var out = { si: 0, no: 0, vacio: 0 };
  for (var i = 0; i < rows.length; i++) {
    if (!applies(rows[i])) continue;
    var answer = read(rows[i]);
    if (answer === 'si') out.si++;
    else if (answer === 'no') out.no++;
    else out.vacio++;
  }
  return out;
}

function respuestaItem(label, counts) {
  return { label: label, si: counts.si, no: counts.no, vacio: counts.vacio };
}

function rotuloRespuestas(rows) {
  var col = function (idx) { return function (row) { return ynCell(row[idx]); }; };
  return [
    respuestaItem('Tiene rótulo', countRespuesta(rows, rotuloApplies, col(V.rotulo))),
    respuestaItem('Fecha', countRespuesta(rows, rotuloItemApplies, col(V.rotFecha))),
    respuestaItem('Nombre', countRespuesta(rows, rotuloItemApplies, col(V.rotNombre))),
    respuestaItem('Legajo', countRespuesta(rows, rotuloItemApplies, col(V.rotLegajo))),
    respuestaItem('Enfermero', countRespuesta(rows, rotuloItemApplies, col(V.rotEnf))),
    respuestaItem('Turno', countRespuesta(rows, rotuloItemApplies, col(V.rotTurno))),
    respuestaItem('ABB', countRespuesta(rows, rotuloItemApplies, col(V.rotAbb))),
    respuestaItem('Visibilidad', countRespuesta(rows, function (row) {
      return isYes(row[V.accesoSi]);
    }, readVisibilidad))
  ];
}

function summarizeVias(rows) {
  var out = {
    evaluadas: rows.length,
    conPeriferico: 0, central: 0, percutaneo: 0, nada: 0, noEvaluables: 0,
    rotuloSi: 0, rotuloCompleto: 0, rotuloIncompleto: 0,
    infiltracion: 0, eritema: 0, sinRetorno: 0, puncionNoVisible: 0,
    adherenciaParcial: 0, adherenciaNula: 0
  };
  var infusiones = {};
  var ubicaciones = { MSD: 0, MSI: 0, MID: 0, MII: 0 };

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var tipo = cellStr(row, V.tipoAlt).toLowerCase();
    if (isYes(row[V.accesoSi])) {
      out.conPeriferico++;
      if (isYes(row[V.msd])) ubicaciones.MSD++;
      if (isYes(row[V.msi])) ubicaciones.MSI++;
      if (isYes(row[V.mid])) ubicaciones.MID++;
      if (isYes(row[V.mii])) ubicaciones.MII++;
      if (isYes(row[V.infiltracion])) out.infiltracion++;
      if (isYes(row[V.eritema])) out.eritema++;
      if (isNo(row[V.retorno])) out.sinRetorno++;
      if (isNo(row[V.visNo])) out.puncionNoVisible++;
      var adh = cellStr(row, V.adherencia).toLowerCase();
      if (adh === 'parcial') out.adherenciaParcial++;
      if (adh === 'nula') out.adherenciaNula++;
      var inf = cellStr(row, V.infusion);
      if (inf) bump(infusiones, inf.charAt(0).toUpperCase() + inf.slice(1));
    } else if (tipo === 'acceso_central') {
      out.central++;
    } else if (tipo === 'percutaneo') {
      out.percutaneo++;
    } else if (isSpecialViasRow(row)) {
      out.noEvaluables++;
    } else {
      out.nada++;
    }

    var rs = rotuloStatus(row);
    if (rs === 'completo') {
      out.rotuloSi++;
      out.rotuloCompleto++;
    } else if (rs === 'incompleto') {
      out.rotuloIncompleto++;
      if (isYes(row[V.rotulo])) out.rotuloSi++;
    }
  }

  out.infusiones = mapToItems(infusiones);
  out.ubicaciones = [
    { label: 'MSD', count: ubicaciones.MSD },
    { label: 'MSI', count: ubicaciones.MSI },
    { label: 'MID', count: ubicaciones.MID },
    { label: 'MII', count: ubicaciones.MII }
  ];
  out.respuestas = rotuloRespuestas(rows);
  return out;
}

function summarizeUpp(rows) {
  var conUpp = 0;
  var noEvaluables = 0;
  var gI = 0, gII = 0, gIII = 0, gIV = 0;
  var bAlto = 0, bMod = 0, bBajo = 0;
  var areaCerrada = 0;
  var conTrat = 0;
  var tratamientos = {};
  var conDisp = 0;
  var dispositivos = { Aro: 0, 'Guantes con agua': 0, Otro: 0 };
  var colchonSi = 0;
  var nutricion = { Oral: 0, NPT: 0, 'Enteral SN': 0, 'Enteral BG': 0 };
  var ubicaciones = { Sacra: 0, Talón: 0, Glúteo: 0, Posterior: 0, Otra: 0 };

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (isSpecialUppRow(row)) {
      noEvaluables++;
      continue;
    }
    if (!isYes(row[U.uppSi])) continue;
    conUpp++;
    if (isYes(row[U.gradoI])) gI++;
    if (isYes(row[U.gradoII])) gII++;
    if (isYes(row[U.gradoIII])) gIII++;
    if (isYes(row[U.gradoIV])) gIV++;
    var band = bradenBand(row[U.braden]);
    if (band === 'alto') bAlto++;
    else if (band === 'moderado') bMod++;
    else if (band === 'bajo') bBajo++;
    if (/^SI/i.test(cellStr(row, U.areaCerrada))) areaCerrada++;
    if (isYes(row[U.tratamiento])) conTrat++;
    var tipo = cellStr(row, U.tipoTrat);
    if (tipo) {
      var parts = tipo.split(',');
      for (var p = 0; p < parts.length; p++) bump(tratamientos, parts[p].trim());
    }
    if (isYes(row[U.disp])) {
      conDisp++;
      if (isYes(row[U.aro])) dispositivos.Aro++;
      if (isYes(row[U.guantes])) dispositivos['Guantes con agua']++;
      if (cellStr(row, U.dispOtro)) dispositivos.Otro++;
    }
    if (isYes(row[U.colchonSi])) colchonSi++;
    if (isYes(row[U.nutOral])) nutricion.Oral++;
    if (isYes(row[U.nutNpt])) nutricion.NPT++;
    if (isYes(row[U.nutSn])) nutricion['Enteral SN']++;
    if (isYes(row[U.nutBg])) nutricion['Enteral BG']++;
    if (isYes(row[U.sacra])) ubicaciones.Sacra++;
    if (isYes(row[U.talon])) ubicaciones.Talón++;
    if (isYes(row[U.gluteo])) ubicaciones.Glúteo++;
    if (isYes(row[U.posterior])) ubicaciones.Posterior++;
    if (cellStr(row, U.ubicOtro)) ubicaciones.Otra++;
  }

  return {
    evaluadas: rows.length,
    conUpp: conUpp,
    noEvaluables: noEvaluables,
    grados: { I: gI, II: gII, III: gIII, IV: gIV },
    bradenAlto: bAlto,
    bradenModerado: bMod,
    bradenBajo: bBajo,
    areaCerrada: areaCerrada,
    conTratamiento: conTrat,
    tratamientos: mapToItems(tratamientos).slice(0, 8),
    conDispositivo: conDisp,
    dispositivos: [
      { label: 'Aro', count: dispositivos.Aro },
      { label: 'Guantes con agua', count: dispositivos['Guantes con agua'] },
      { label: 'Otro', count: dispositivos.Otro }
    ],
    colchonSi: colchonSi,
    nutricion: [
      { label: 'Oral', count: nutricion.Oral },
      { label: 'NPT', count: nutricion.NPT },
      { label: 'Enteral SN', count: nutricion['Enteral SN'] },
      { label: 'Enteral BG', count: nutricion['Enteral BG'] }
    ],
    ubicaciones: [
      { label: 'Sacra', count: ubicaciones.Sacra },
      { label: 'Talón', count: ubicaciones.Talón },
      { label: 'Glúteo', count: ubicaciones.Glúteo },
      { label: 'Posterior', count: ubicaciones.Posterior },
      { label: 'Otra', count: ubicaciones.Otra }
    ]
  };
}

function summarizeSondas(rows) {
  var out = {
    evaluadas: rows.length,
    conSonda: 0,
    sinSonda: 0,
    noEvaluables: 0,
    lumenes2: 0,
    lumenes3: 0,
    fijacionSi: 0,
    ubicacionNo: 0
  };
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (isSpecialSondaRow(row)) {
      out.noEvaluables++;
    } else if (isYes(row[S.tiene])) {
      out.conSonda++;
      var lum = cellStr(row, S.lumenes);
      if (lum === '2') out.lumenes2++;
      if (lum === '3') out.lumenes3++;
      if (isYes(row[S.fijacion])) out.fijacionSi++;
      if (isNo(row[S.ubicacion])) out.ubicacionNo++;
    } else {
      out.sinSonda++;
    }
  }
  return out;
}

function emptySectorRow(sector) {
  return {
    sector: sector,
    viasUnicas: 0,
    viasEvaluables: 0,
    noEvaluablesVias: 0,
    uppUnicas: 0,
    sondasUnicas: 0,
    capacidad: sectorCapacity(sector),
    conPeriferico: 0,
    alertasVia: 0,
    conUpp: 0,
    conSonda: 0,
    bradenAlto: 0,
    rotuloIncompleto: 0,
    enfermeras: 0,
    auxiliares: 0,
    _staffAt: 0
  };
}

function publicSectorRow(slot) {
  var out = {};
  for (var k in slot) {
    if (Object.prototype.hasOwnProperty.call(slot, k) && k.charAt(0) !== '_') out[k] = slot[k];
  }
  return out;
}

function summarizeBySector(viasRows, uppRows, sondasRows, sectorFilter) {
  var list = sectorFilter ? [sectorFilter] : STATS_SECTORS.slice();
  var map = {};
  for (var s = 0; s < list.length; s++) map[list[s]] = emptySectorRow(list[s]);
  var slotFor = function (row) {
    var sec = cellStr(row, 1);
    if (!map[sec]) map[sec] = emptySectorRow(sec);
    return map[sec];
  };

  for (var i = 0; i < viasRows.length; i++) {
    var row = viasRows[i];
    var slot = slotFor(row);
    slot.viasUnicas++;
    if (isSpecialViasRow(row)) {
      slot.noEvaluablesVias++;
    } else {
      slot.viasEvaluables++;
      if (isYes(row[V.accesoSi])) slot.conPeriferico++;
    }
    if (viasAlertTipos(row).length > 0) slot.alertasVia++;
    if (rotuloStatus(row) === 'incompleto') slot.rotuloIncompleto++;
    applyStaff(slot, row);
  }

  for (var j = 0; j < uppRows.length; j++) {
    var urow = uppRows[j];
    var uslot = slotFor(urow);
    uslot.uppUnicas++;
    if (isYes(urow[U.uppSi])) uslot.conUpp++;
    if (bradenBand(urow[U.braden]) === 'alto') uslot.bradenAlto++;
    applyStaff(uslot, urow);
  }

  for (var k = 0; k < sondasRows.length; k++) {
    var srow = sondasRows[k];
    var sslot = slotFor(srow);
    sslot.sondasUnicas++;
    if (isYes(srow[S.tiene])) sslot.conSonda++;
    applyStaff(sslot, srow);
  }

  var out = [];
  for (var l = 0; l < list.length; l++) out.push(publicSectorRow(map[list[l]]));
  if (!sectorFilter) {
    for (var extra in map) {
      if (map.hasOwnProperty(extra) && list.indexOf(extra) === -1) out.push(publicSectorRow(map[extra]));
    }
  }
  return out;
}

function collectAlertas(viasRows, uppRows, limit) {
  var items = [];
  var push = function (row, tipos) {
    for (var t = 0; t < tipos.length; t++) {
      items.push({ tipo: tipos[t], sector: cellStr(row, 1), habitacion: cellStr(row, 2), cama: cellStr(row, 3) });
    }
  };
  for (var i = 0; i < viasRows.length; i++) push(viasRows[i], viasAlertTipos(viasRows[i]));
  for (var j = 0; j < uppRows.length; j++) push(uppRows[j], uppAlertTipos(uppRows[j]));
  return { items: items.slice(0, limit), total: items.length };
}
