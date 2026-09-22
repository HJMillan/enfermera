/**
 * PLANILLA ENFERMERA - Google Apps Script (Producción)
 * Versión: 1.1.0 — Números (GET_STATS JSONP) + stamp de versión en ping/stats
 *
 * Endpoint Webhook para inserción automática en Google Sheets,
 * estadísticas de lectura del archivo y reporte de Cierre de Turno.
 * 
 * DESTINATARIOS PREDETERMINADOS:
 * - jesusmillan86@gmail.com
 * - pamelaestua91@gmail.com
 * 
 * FORMATO DE FECHA: Español estándar (dd/MM/yyyy HH:mm) - America/Argentina/Buenos_Aires
 */

// Si el script está vinculado al Sheet (Extensiones > Apps Script), dejar vacío ('').
// Si se utiliza como script independiente (standalone), colocar el ID de la hoja de cálculo:
var SPREADSHEET_ID = '';

/** Debe coincidir con SCRIPT_VERSION en src/config/version.ts */
var SCRIPT_VERSION = '1.1.0';

var DEFAULT_RECIPIENTS = ['jesusmillan86@gmail.com', 'pamelaestua91@gmail.com'];

// Cabeceras oficiales sincronizadas 1:1 con sheetMapper.ts
var HEADERS_ACCESO_PERIFERICO = [
  'Fecha/Hora',          // A (0)
  'Sector',              // B (1)
  'Habitación',          // C (2)
  'Cama',                // D (3)
  'HC',                  // E (4)
  'Cant. Enfermeras',    // F (5)
  'Cant. Auxiliares',    // G (6)
  'Acceso (SI)',         // H (7)
  'Acceso (NO)',         // I (8)
  'Tipo Acceso Alt.',    // J (9) (acceso_central | percutaneo | Libre | Quimio | Quirófano | Diálisis | Estudio / Rayos | Traslado)
  'Acceso Central Ubic.',// K (10) (Y/I | Y/D | S/I | S/D)
  'Cantidad',            // L (11)
  'Ubicación MSD',       // M (12)
  'Ubicación MSI',       // N (13)
  'Ubicación MII',       // O (14)
  'Ubicación MID',       // P (15)
  'Rótulo (SI/NO)',      // Q (16)
  'Rótulo Fecha',        // R (17)
  'Rótulo Nombre',       // S (18)
  'Rótulo Legajo',       // T (19)
  'Rótulo Enfermero',    // U (20)
  'Rótulo Turno',        // V (21)
  'Rótulo ABB',          // W (22)
  'Visibilidad (SI)',    // X (23)
  'Visibilidad (NO)',    // Y (24)
  'Fijación Tegaderm',   // Z (25)
  'Fijación Cinta',      // AA (26)
  'Tipo Cinta',          // AB (27)
  'Fijación Hipafix',    // AC (28)
  'Fijación Venda',      // AD (29)
  'Fijación Contención', // AE (30)
  'Adherencia',          // AF (31)
  'Llave 3 Vías',        // AG (32)
  'Tapón Multifunción',  // AH (33)
  'Infiltración',        // AI (34)
  'Eritematoso',         // AJ (35)
  'Retorno',             // AK (36)
  'Infusión Tipo',       // AL (37)
  'Observaciones',       // AM (38)
  'Mail Enviado'         // AN (39)
];

var HEADERS_UPP = [
  'Fecha/Hora',                // A (0)
  'Sector',                    // B (1)
  'Habitación',                // C (2)
  'Cama',                      // D (3)
  'HC',                        // E (4)
  'Cant. Enfermeras',          // F (5)
  'Cant. Auxiliares',          // G (6)
  'Fecha Ingreso',             // H (7)
  'Área Cerrada (SI/NO)',      // I (8)
  'UPP (SI)',                  // J (9)
  'UPP (NO)',                  // K (10)
  'Cantidad',                  // L (11)
  'Ubicación Sacra',           // M (12)
  'Ubicación Talón',           // N (13)
  'Ubicación Glúteo',          // O (14)
  'Ubicación Posterior',       // P (15)
  'Ubicación Otro',            // Q (16)
  'Grado I',                   // R (17)
  'Grado II',                  // S (18)
  'Grado III',                 // T (19)
  'Grado IV',                  // U (20)
  'Tratamiento (SI/NO)',       // V (21)
  'Tipo Tratamiento',          // W (22)
  'Detalle Tratamiento',       // X (23)
  'Dispositivo Apoyo (SI/NO)', // Y (24)
  'Disp. Aro',                 // Z (25)
  'Disp. Guantes Agua',        // AA (26)
  'Disp. Otro',                // AB (27)
  'Escala de Braden',          // AC (28)
  'Nutrición Oral',            // AD (29)
  'Nutrición NPT',             // AE (30)
  'Nutrición Enteral SN',      // AF (31)
  'Nutrición Enteral BG',      // AG (32)
  'Colchón Anti-escaras (SI)', // AH (33)
  'Colchón Anti-escaras (NO)', // AI (34)
  'Obs Colchón',               // AJ (35)
  'Mail Enviado'               // AK (36)
];

/**
 * Obtiene la referencia a la Hoja de Cálculo activa o por ID
 */
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

/**
 * Manejador principal de peticiones POST (Webhook desde la App)
 */
function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : '';
    if (!contents) {
      return jsonResponse({ status: 'error', message: 'Cuerpo de petición vacío' });
    }
    
    var payload = JSON.parse(contents);
    
    // CASO 1: Test de Conectividad o Ping
    if (payload.action === 'PING' || payload.action === 'TEST_CONNECTION') {
      return jsonResponse({
        status: 'success',
        message: 'Conexión exitosa con el Webhook de Planilla Enfermera.'
      });
    }
    
    // CASO 2: Solicitud de Cierre de Turno y Envío de Reporte por Correo
    if (payload.action === 'SEND_SHIFT_SUMMARY') {
      var recipients = (payload.recipients && payload.recipients.length > 0) 
        ? payload.recipients 
        : DEFAULT_RECIPIENTS;
      return enviarReporteTurno(recipients);
    }
    
    // CASO 3: Inserción de un nuevo registro de paciente
    var formType = payload.formType; // 'ACCESO_PERIFERICO' o 'UPP'
    var rowValues = payload.rowValues || [];
    
    var ss = getSpreadsheet();
    var isVias = formType === 'ACCESO_PERIFERICO';
    var sheetName = isVias ? 'Acceso Periférico' : 'UPP';
    var expectedHeaders = isVias ? HEADERS_ACCESO_PERIFERICO : HEADERS_UPP;
    
    // Asegurar que la hoja exista y tenga los encabezados correspondientes
    var sheet = ensureSheetWithHeaders(ss, sheetName, expectedHeaders);
    
    // Asegurar que el tamaño base de la fila coincida con los datos (sin Mail Enviado)
    var expectedBaseLength = expectedHeaders.length - 1; // 39 para vías, 36 para UPP
    while (rowValues.length < expectedBaseLength) {
      rowValues.push('');
    }
    
    // Columna 'Mail Enviado' inicia con 'NO'
    rowValues[expectedBaseLength] = 'NO';
    
    // Forzar que Cama, Habitación y HC se almacenen como texto para no truncar ceros
    if (rowValues[2] !== undefined && rowValues[2] !== '') rowValues[2] = String(rowValues[2]);
    if (rowValues[3] !== undefined && rowValues[3] !== '') rowValues[3] = String(rowValues[3]);
    if (rowValues[4] !== undefined && rowValues[4] !== '') rowValues[4] = String(rowValues[4]);
    
    sheet.appendRow(rowValues);
    
    return jsonResponse({
      status: 'success',
      message: 'Fila agregada correctamente a ' + sheetName,
      rowNumber: sheet.getLastRow()
    });
      
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Health check y lectura de estadísticas (JSON o JSONP).
 * Estadísticas: GET ?action=GET_STATS&callback=peStats_xxx&from=yyyy-MM-dd&to=yyyy-MM-dd
 */
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = String(params.action || '').toUpperCase();
  var callback = String(params.callback || '');

  try {
    if (action === 'GET_STATS') {
      return respondPayload(buildStatistics(params), callback);
    }

    var ss = null;
    var ssTitle = 'No vinculado';
    try {
      ss = getSpreadsheet();
      ssTitle = ss.getName();
    } catch (err) {
      ssTitle = 'Error: ' + err.message;
    }

    return respondPayload({
      status: 'online',
      version: SCRIPT_VERSION,
      service: 'Planilla Enfermera Webhook Activo (Producción)',
      spreadsheet: ssTitle,
      destinatarios: DEFAULT_RECIPIENTS,
      servidores: 'Google Apps Script / V8 Engine'
    }, callback);
  } catch (error) {
    return respondPayload({
      status: 'error',
      message: error.toString()
    }, callback);
  }
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

/**
 * Asegura la existencia de la hoja y garantiza cabeceras completas
 */
function ensureSheetWithHeaders(ss, sheetName, expectedHeaders) {
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(expectedHeaders);
    sheet.getRange(1, 1, 1, expectedHeaders.length)
      .setFontWeight('bold')
      .setBackground('#e0f2fe');
    sheet.setFrozenRows(1);
    sheet.getRange('C:E').setNumberFormat('@');
    return sheet;
  }
  
  // Si la hoja está completamente vacía
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.appendRow(expectedHeaders);
    sheet.getRange(1, 1, 1, expectedHeaders.length)
      .setFontWeight('bold')
      .setBackground('#e0f2fe');
    sheet.setFrozenRows(1);
    sheet.getRange('C:E').setNumberFormat('@');
    return sheet;
  }
  
  // Si ya tiene columnas, verificar si las cabeceras están completas
  var lastCol = sheet.getLastColumn();
  var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Si le faltan columnas o no tiene 'Mail Enviado'
  if (currentHeaders.length < expectedHeaders.length) {
    for (var c = currentHeaders.length; c < expectedHeaders.length; c++) {
      sheet.getRange(1, c + 1)
        .setValue(expectedHeaders[c])
        .setFontWeight('bold')
        .setBackground('#e0f2fe');
    }
  }
  
  return sheet;
}

/**
 * Busca dinámicamente el índice 0-based de una columna por su nombre de encabezado
 */
function findColumnIndex(sheet, headerName) {
  if (!sheet || sheet.getLastColumn() === 0) return -1;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var target = headerName.trim().toLowerCase();
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim().toLowerCase() === target) {
      return i; // 0-based
    }
  }
  return -1;
}

/**
 * Helper para formatear visualmente el estado de la cama
 */
function formatBedStatusBadge(statusRaw) {
  var s = String(statusRaw || '').trim();
  var sLow = s.toLowerCase();
  if (!s || sLow === 'nada' || sLow === 'sin via' || sLow === 'sin_acceso') {
    return '<span style="color:#64748b;">Sin Acceso</span>';
  }
  if (sLow === 'libre') {
    return '<span style="background-color:#e0f2fe; color:#0369a1; padding:3px 7px; border-radius:4px; font-weight:bold;">🛏️ Libre</span>';
  }
  if (sLow === 'quimio' || sLow === 'quimioterapia') {
    return '<span style="background-color:#fef3c7; color:#b45309; padding:3px 7px; border-radius:4px; font-weight:bold;">🧪 Quimio</span>';
  }
  if (sLow === 'quirófano' || sLow === 'quirofano') {
    return '<span style="background-color:#fee2e2; color:#b91c1c; padding:3px 7px; border-radius:4px; font-weight:bold;">🏥 Quirófano</span>';
  }
  if (sLow === 'diálisis' || sLow === 'dialisis') {
    return '<span style="background-color:#ede9fe; color:#6d28d9; padding:3px 7px; border-radius:4px; font-weight:bold;">💉 Diálisis</span>';
  }
  if (sLow.indexOf('estudio') !== -1 || sLow.indexOf('rayos') !== -1) {
    return '<span style="background-color:#f3e8ff; color:#7e22ce; padding:3px 7px; border-radius:4px; font-weight:bold;">📋 Estudio/Rayos</span>';
  }
  if (sLow.indexOf('traslado') !== -1) {
    return '<span style="background-color:#ffedd5; color:#c2410c; padding:3px 7px; border-radius:4px; font-weight:bold;">🔄 Traslado</span>';
  }
  if (sLow === 'acceso_central') {
    return '<span style="background-color:#f1f5f9; color:#0f172a; padding:3px 7px; border-radius:4px; font-weight:bold;">Vía Central</span>';
  }
  if (sLow === 'percutaneo') {
    return '<span style="background-color:#f1f5f9; color:#0f172a; padding:3px 7px; border-radius:4px; font-weight:bold;">Percutáneo</span>';
  }
  return '<span style="background-color:#f1f5f9; color:#475569; padding:3px 7px; border-radius:4px; font-weight:bold;">' + s + '</span>';
}

/**
 * Función que busca registros con Mail Enviado !== 'SI',
 * arma el resumen clínico, envía el email y marca las filas como enviadas.
 */
function enviarReporteTurno(recipients) {
  var ss = getSpreadsheet();
  var sheetVias = ss.getSheetByName('Acceso Periférico');
  var sheetUpp = ss.getSheetByName('UPP');
  
  var pendingVias = [];
  var pendingUpp = [];
  var viasRowIndexes = [];
  var uppRowIndexes = [];
  
  var colMailVias = -1;
  var colMailUpp = -1;
  
  // 1. Recorrer Vías
  if (sheetVias && sheetVias.getLastRow() > 1) {
    colMailVias = findColumnIndex(sheetVias, 'Mail Enviado');
    if (colMailVias === -1) colMailVias = sheetVias.getLastColumn() - 1;
    
    var lastRowVias = sheetVias.getLastRow();
    var lastColVias = sheetVias.getLastColumn();
    var valuesVias = sheetVias.getRange(2, 1, lastRowVias - 1, lastColVias).getDisplayValues();
    
    for (var i = 0; i < valuesVias.length; i++) {
      var row = valuesVias[i];
      var status = String(row[colMailVias] || '').toUpperCase().trim();
      if (!status.startsWith('SI')) {
        pendingVias.push(row);
        viasRowIndexes.push(i + 2); // Fila real 1-based
      }
    }
  }
  
  // 2. Recorrer UPP
  if (sheetUpp && sheetUpp.getLastRow() > 1) {
    colMailUpp = findColumnIndex(sheetUpp, 'Mail Enviado');
    if (colMailUpp === -1) colMailUpp = sheetUpp.getLastColumn() - 1;
    
    var lastRowUpp = sheetUpp.getLastRow();
    var lastColUpp = sheetUpp.getLastColumn();
    var valuesUpp = sheetUpp.getRange(2, 1, lastRowUpp - 1, lastColUpp).getDisplayValues();
    
    for (var j = 0; j < valuesUpp.length; j++) {
      var rowU = valuesUpp[j];
      var statusU = String(rowU[colMailUpp] || '').toUpperCase().trim();
      if (!statusU.startsWith('SI')) {
        pendingUpp.push(rowU);
        uppRowIndexes.push(j + 2);
      }
    }
  }
  
  var totalPending = pendingVias.length + pendingUpp.length;
  if (totalPending === 0) {
    return jsonResponse({
      status: 'success',
      message: 'No hay registros pendientes de envío. Todos los pacientes del turno ya fueron reportados previamente.',
      count: 0
    });
  }
  
  // 3. Analizar métricas clínicas para el cuerpo del mail
  var viasConAlerta = 0;
  var viasSinAcceso = 0;
  var viasConAcceso = 0;
  var viasCentral = 0;
  var viasPercutaneo = 0;
  var camasLibresOAusentes = 0;
  
  for (var v = 0; v < pendingVias.length; v++) {
    var rV = pendingVias[v];
    var tieneAcceso = rV[7] === 'SI';
    var tipoAlt = String(rV[9] || '').trim().toLowerCase();
    
    if (tieneAcceso) {
      viasConAcceso++;
      var infiltracion = rV[34] === 'SI';
      var eritematoso = rV[35] === 'SI';
      if (infiltracion || eritematoso) {
        viasConAlerta++;
      }
    } else {
      var esEspecial = tipoAlt && !['acceso_central', 'percutaneo', 'nada', 'sin via', 'sin_acceso'].includes(tipoAlt);
      if (esEspecial) {
        camasLibresOAusentes++;
      } else {
        viasSinAcceso++;
        if (tipoAlt === 'acceso_central') viasCentral++;
        if (tipoAlt === 'percutaneo') viasPercutaneo++;
      }
    }
  }
  
  var uppConLesion = 0;
  var uppSinLesion = 0;
  for (var u = 0; u < pendingUpp.length; u++) {
    var rU = pendingUpp[u];
    var tieneU = rU[9] === 'SI';
    if (tieneU) {
      uppConLesion++;
    } else {
      uppSinLesion++;
    }
  }
  
  // 4. Construir cuerpo del Correo en HTML profesional
  var fechaHoy = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm');
  var subject = '[Reporte Enfermería] Cierre de Turno - ' + fechaHoy + ' (' + totalPending + ' registros)';
  
  var html = '<div style="font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 780px; margin: auto; padding: 20px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">';
  html += '<div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 20px; border-radius: 10px; color: #ffffff; text-align: center;">';
  html += '<h2 style="margin: 0; font-size: 22px; letter-spacing: -0.02em;">🏥 Reporte de Relevamiento de Enfermería</h2>';
  html += '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.95;">Cierre de Turno / Registros Clínicos Despachados</p>';
  html += '</div>';
  
  html += '<p style="margin-top: 16px; font-size: 14px;"><b>Fecha y Hora de Emisión:</b> ' + fechaHoy + ' hs</p>';
  html += '<p style="font-size: 13px; color: #64748b;">Consolidado de pacientes relevados en la guardia que estaban pendientes de sincronización.</p>';
  
  // Tarjetas de Métricas (Apple KPI style)
  html += '<div style="display: flex; gap: 8px; margin: 16px 0; text-align: center; flex-wrap: wrap;">';
  
  html += '<div style="flex: 1; min-width: 110px; background: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">';
  html += '<div style="font-size: 22px; font-weight: bold; color: #0284c7;">' + totalPending + '</div>';
  html += '<div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Total Registros</div>';
  html += '</div>';
  
  html += '<div style="flex: 1; min-width: 110px; background: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">';
  html += '<div style="font-size: 22px; font-weight: bold; color: #059669;">' + viasConAcceso + '</div>';
  html += '<div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Vías Activas</div>';
  html += '</div>';
  
  html += '<div style="flex: 1; min-width: 110px; background: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid ' + (viasConAlerta > 0 ? '#fca5a5' : '#cbd5e1') + '; background-color: ' + (viasConAlerta > 0 ? '#fef2f2' : '#ffffff') + '; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">';
  html += '<div style="font-size: 22px; font-weight: bold; color: ' + (viasConAlerta > 0 ? '#dc2626' : '#64748b') + ';">' + viasConAlerta + '</div>';
  html += '<div style="font-size: 10px; color: ' + (viasConAlerta > 0 ? '#dc2626' : '#64748b') + '; text-transform: uppercase; font-weight: 600;">Alertas Vía</div>';
  html += '</div>';
  
  html += '<div style="flex: 1; min-width: 110px; background: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid ' + (uppConLesion > 0 ? '#fcd34d' : '#cbd5e1') + '; background-color: ' + (uppConLesion > 0 ? '#fffbeb' : '#ffffff') + '; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">';
  html += '<div style="font-size: 22px; font-weight: bold; color: ' + (uppConLesion > 0 ? '#d97706' : '#64748b') + ';">' + uppConLesion + '</div>';
  html += '<div style="font-size: 10px; color: ' + (uppConLesion > 0 ? '#d97706' : '#64748b') + '; text-transform: uppercase; font-weight: 600;">UPP Activas</div>';
  html += '</div>';

  html += '<div style="flex: 1; min-width: 110px; background: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">';
  html += '<div style="font-size: 22px; font-weight: bold; color: #475569;">' + camasLibresOAusentes + '</div>';
  html += '<div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Libres/Ausentes</div>';
  html += '</div>';
  
  html += '</div>';
  
  // Tabla Resumen Vías Pendientes
  if (pendingVias.length > 0) {
    html += '<h3 style="color: #0369a1; font-size: 15px; margin-top: 22px; border-bottom: 2px solid #e0f2fe; padding-bottom: 4px;">💉 Accesos Vasculares Relevados (' + pendingVias.length + ')</h3>';
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff; border-radius: 6px; overflow: hidden;">';
    html += '<tr style="background: #f1f5f9; text-align: left; color: #475569;">';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Fecha/Hora</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Sector</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Hab/Cama</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">HC</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Estado de Cama / Acceso</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Ubicación</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Rótulo</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Alertas</th>';
    html += '</tr>';
    
    for (var pv = 0; pv < pendingVias.length; pv++) {
      var rowP = pendingVias[pv];
      var hasV = rowP[7] === 'SI';
      var ubicList = [];
      if (rowP[12] === 'SI') ubicList.push('MSD');
      if (rowP[13] === 'SI') ubicList.push('MSI');
      if (rowP[14] === 'SI') ubicList.push('MII');
      if (rowP[15] === 'SI') ubicList.push('MID');
      
      var estadoAcceso = '';
      if (hasV) {
        estadoAcceso = '<span style="color:#059669; font-weight:bold;">Con Vía (' + (rowP[11] || '1') + ')</span>';
      } else if (rowP[9] === 'acceso_central') {
        estadoAcceso = 'Central (' + (rowP[10] || 'S/D') + ')';
      } else if (rowP[9] === 'percutaneo') {
        estadoAcceso = 'Percutáneo';
      } else {
        estadoAcceso = formatBedStatusBadge(rowP[9]);
      }
      
      var rotuloInfo = rowP[16] === 'SI' ? '<span style="color:#059669; font-weight:bold;">SÍ</span>' : (rowP[16] === 'NO' ? '<span style="color:#dc2626;">NO</span>' : '-');
      
      var alerta = '';
      if (rowP[34] === 'SI') alerta += '<span style="background-color:#fee2e2; color:#dc2626; padding:2px 5px; border-radius:3px; font-weight:bold;">Infiltración! </span>';
      if (rowP[35] === 'SI') alerta += '<span style="background-color:#fee2e2; color:#dc2626; padding:2px 5px; border-radius:3px; font-weight:bold;">Eritema! </span>';
      if (!alerta && hasV) alerta = '<span style="color:#059669;">Sin signos</span>';
      if (!hasV) alerta = '<span style="color:#94a3b8;">-</span>';
      
      html += '<tr style="border-bottom: 1px solid #f1f5f9;">';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">' + rowP[0] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + rowP[1] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;"><b>' + rowP[2] + '</b> - Cama ' + rowP[3] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (rowP[4] || '-') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + estadoAcceso + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (ubicList.join(', ') || '-') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + rotuloInfo + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + alerta + '</td>';
      html += '</tr>';
    }
    html += '</table>';
  }
  
  // Tabla Resumen UPP Pendientes
  if (pendingUpp.length > 0) {
    html += '<h3 style="color: #0369a1; font-size: 15px; margin-top: 24px; border-bottom: 2px solid #e0f2fe; padding-bottom: 4px;">🩹 Úlceras por Presión (UPP) Relevadas (' + pendingUpp.length + ')</h3>';
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff; border-radius: 6px; overflow: hidden;">';
    html += '<tr style="background: #f1f5f9; text-align: left; color: #475569;">';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Fecha/Hora</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Sector</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Hab/Cama</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">HC</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Tiene UPP / Estado</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Grados</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Tratamiento</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Disp. Apoyo</th>';
    html += '<th style="padding: 7px 8px; border: 1px solid #e2e8f0;">Braden</th>';
    html += '</tr>';
    
    for (var pu = 0; pu < pendingUpp.length; pu++) {
      var rowU2 = pendingUpp[pu];
      var hasU = rowU2[9] === 'SI';
      
      var grados = [];
      if (rowU2[17] === 'SI') grados.push('I');
      if (rowU2[18] === 'SI') grados.push('II');
      if (rowU2[19] === 'SI') grados.push('III');
      if (rowU2[20] === 'SI') grados.push('IV');
      
      var dispApoyo = rowU2[24] === 'SI' ? '<span style="color:#059669; font-weight:bold;">SÍ</span>' : (rowU2[24] === 'NO' ? 'NO' : '-');
      
      var obsColchon = String(rowU2[35] || '').trim();
      var esLibreOAusenteUpp = !hasU && obsColchon.toLowerCase().indexOf('paciente ausente / cama libre:') !== -1;
      var motivoAusente = '';
      if (esLibreOAusenteUpp) {
        motivoAusente = obsColchon.replace(/paciente ausente \/ cama libre:\s*/i, '').trim();
      }
      
      var estadoUppHtml = '';
      if (hasU) {
        estadoUppHtml = '<span style="background-color:#fef3c7; color:#d97706; padding:2px 6px; border-radius:4px; font-weight:bold;">SÍ (' + (rowU2[11] || '1') + ')</span>';
      } else if (esLibreOAusenteUpp) {
        estadoUppHtml = formatBedStatusBadge(motivoAusente);
      } else {
        estadoUppHtml = '<span style="color:#059669;">Sin lesiones</span>';
      }
      
      html += '<tr style="border-bottom: 1px solid #f1f5f9;">';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">' + rowU2[0] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + rowU2[1] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;"><b>' + rowU2[2] + '</b> - Cama ' + rowU2[3] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (rowU2[4] || '-') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + estadoUppHtml + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (grados.join(', ') || '-') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (rowU2[22] || '-') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + dispApoyo + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (rowU2[28] || '-') + '</td>';
      html += '</tr>';
    }
    html += '</table>';
  }
  
  html += '<div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">';
  html += 'Planilla Enfermera — Sistema Automático de Relevamiento Clínico y Seguridad del Paciente';
  html += '</div>';
  html += '</div>';
  
  // 5. Crear archivo CSV adjunto
  var csvLines = [];
  if (pendingVias.length > 0) {
    csvLines.push('--- ACCESO PERIFERICO ---');
    var hV = sheetVias.getRange(1, 1, 1, sheetVias.getLastColumn()).getDisplayValues()[0];
    csvLines.push(hV.map(escapeCsv).join(','));
    for (var c1 = 0; c1 < pendingVias.length; c1++) {
      csvLines.push(pendingVias[c1].map(escapeCsv).join(','));
    }
    csvLines.push('');
  }
  if (pendingUpp.length > 0) {
    csvLines.push('--- ULCERAS POR PRESION (UPP) ---');
    var hU = sheetUpp.getRange(1, 1, 1, sheetUpp.getLastColumn()).getDisplayValues()[0];
    csvLines.push(hU.map(escapeCsv).join(','));
    for (var c2 = 0; c2 < pendingUpp.length; c2++) {
      csvLines.push(pendingUpp[c2].map(escapeCsv).join(','));
    }
  }
  
  var csvBlob = Utilities.newBlob(csvLines.join('\r\n'), 'text/csv', 'reporte_turno_' + Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyyMMdd_HHmm') + '.csv');
  
  // 6. Enviar el Correo
  var recipientString = Array.isArray(recipients) ? recipients.join(',') : recipients;
  MailApp.sendEmail({
    to: recipientString,
    subject: subject,
    htmlBody: html,
    attachments: [csvBlob]
  });
  
  // 7. Marcar las filas enviadas con 'SI' en Google Sheets de forma segura
  var timeMark = 'SI (' + fechaHoy + ')';
  if (sheetVias && viasRowIndexes.length > 0) {
    var mailColV = (colMailVias !== -1 ? colMailVias : sheetVias.getLastColumn() - 1) + 1;
    for (var idxV = 0; idxV < viasRowIndexes.length; idxV++) {
      sheetVias.getRange(viasRowIndexes[idxV], mailColV).setValue(timeMark);
    }
  }
  if (sheetUpp && uppRowIndexes.length > 0) {
    var mailColU = (colMailUpp !== -1 ? colMailUpp : sheetUpp.getLastColumn() - 1) + 1;
    for (var idxU = 0; idxU < uppRowIndexes.length; idxU++) {
      sheetUpp.getRange(uppRowIndexes[idxU], mailColU).setValue(timeMark);
    }
  }
  
  SpreadsheetApp.flush();
  
  return jsonResponse({
    status: 'success',
    message: 'Reporte enviado con éxito por correo a ' + recipientString,
    count: totalPending,
    viasCount: pendingVias.length,
    uppCount: pendingUpp.length
  });
}

function escapeCsv(val) {
  if (val instanceof Date) {
    var hours = val.getHours();
    var mins = val.getMinutes();
    if (hours !== 0 || mins !== 0) {
      val = Utilities.formatDate(val, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm');
    } else {
      val = Utilities.formatDate(val, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
    }
  }
  var str = String(val === null || val === undefined ? '' : val);
  return '"' + str.replace(/"/g, '""') + '"';
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// MENÚ DE GOOGLE SHEETS & TRIGGERS
// ---------------------------------------------------------------------------

/**
 * Agrega el menú interactivo cuando un usuario abre la Hoja de Cálculo
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🏥 Planilla Enfermera')
    .addItem('📧 Despachar Reporte de Turno por Mail', 'menuDespacharReporte')
    .addItem('🛠️ Verificar / Inicializar Hojas y Cabeceras', 'menuInicializarHojas')
    .addItem('📊 Ver Estado de Registros Pendientes', 'menuVerPendientes')
    .addSeparator()
    .addItem('⏰ Programar Envío Automático Diario (16:00 hs)', 'menuCrearDisparadorDiario')
    .addToUi();
}

function menuDespacharReporte() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'Cierre de Turno',
    '¿Deseas enviar por correo el reporte consolidado de los registros pendientes a:\n' + DEFAULT_RECIPIENTS.join(', ') + '?',
    ui.ButtonSet.YES_NO
  );
  if (resp === ui.Button.YES) {
    var result = JSON.parse(enviarReporteTurno(DEFAULT_RECIPIENTS).getContent());
    ui.alert(result.status === 'success' ? 'Éxito' : 'Atención', result.message, ui.ButtonSet.OK);
  }
}

function menuInicializarHojas() {
  var ui = SpreadsheetApp.getUi();
  var ss = getSpreadsheet();
  ensureSheetWithHeaders(ss, 'Acceso Periférico', HEADERS_ACCESO_PERIFERICO);
  ensureSheetWithHeaders(ss, 'UPP', HEADERS_UPP);
  ui.alert('Configuración Completa', 'Las hojas "Acceso Periférico" y "UPP" han sido verificadas con sus cabeceras oficiales y formato de texto.', ui.ButtonSet.OK);
}

function menuVerPendientes() {
  var ui = SpreadsheetApp.getUi();
  var ss = getSpreadsheet();
  var sheetVias = ss.getSheetByName('Acceso Periférico');
  var sheetUpp = ss.getSheetByName('UPP');
  
  var pendV = 0;
  var pendU = 0;
  
  if (sheetVias && sheetVias.getLastRow() > 1) {
    var cV = findColumnIndex(sheetVias, 'Mail Enviado');
    if (cV !== -1) {
      var valsV = sheetVias.getRange(2, cV + 1, sheetVias.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < valsV.length; i++) {
        if (!String(valsV[i][0]).toUpperCase().startsWith('SI')) pendV++;
      }
    }
  }
  
  if (sheetUpp && sheetUpp.getLastRow() > 1) {
    var cU = findColumnIndex(sheetUpp, 'Mail Enviado');
    if (cU !== -1) {
      var valsU = sheetUpp.getRange(2, cU + 1, sheetUpp.getLastRow() - 1, 1).getValues();
      for (var j = 0; j < valsU.length; j++) {
        if (!String(valsU[j][0]).toUpperCase().startsWith('SI')) pendU++;
      }
    }
  }
  
  ui.alert(
    'Registros Pendientes de Envío',
    '• Vías Periféricas: ' + pendV + ' pendientes\n' +
    '• UPP: ' + pendU + ' pendientes\n' +
    'Total: ' + (pendV + pendU) + ' registros.',
    ui.ButtonSet.OK
  );
}

function menuCrearDisparadorDiario() {
  var ui = SpreadsheetApp.getUi();
  
  // Eliminar disparadores previos de esta función para evitar duplicados
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'verificarYEnviarPendientesAutomatico') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Crear disparador todos los días entre 16:00 y 17:00 hs
  ScriptApp.newTrigger('verificarYEnviarPendientesAutomatico')
    .timeBased()
    .everyDays(1)
    .atHour(16)
    .inTimezone('America/Argentina/Buenos_Aires')
    .create();
    
  ui.alert('Disparador Programado', 'Se ha programado el envío automático diario para las 16:00 hs (Fin del turno 8-16hs).', ui.ButtonSet.OK);
}

function verificarYEnviarPendientesAutomatico() {
  enviarReporteTurno(DEFAULT_RECIPIENTS);
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

var STATS_SECTORS = ['PB', '1° Piso', 'Maternidad', 'A', 'B', 'C', 'D', 'E'];

var SPECIAL_BED_STATUSES = ['Libre', 'Quimio', 'Quirófano', 'Diálisis', 'Estudio / Rayos', 'Traslado'];

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

  var loadVias = ronda !== 'upp';
  var loadUpp = ronda !== 'vias';

  var ss = getSpreadsheet();
  var viasRaw = loadVias ? readSheetRows(ss, 'Acceso Periférico') : [];
  var uppRaw = loadUpp ? readSheetRows(ss, 'UPP') : [];

  var viasDated = filterByDateAndSector(viasRaw, fromIso, toIso, sectorFilter, V.fecha, V.sector, V.hab, V.cama);
  var uppDated = filterByDateAndSector(uppRaw, fromIso, toIso, sectorFilter, U.fecha, U.sector, U.hab, U.cama);

  var viasLast = lastRowByBed(viasDated, V.fecha, V.sector, V.hab, V.cama);
  var uppLast = lastRowByBed(uppDated, U.fecha, U.sector, U.hab, U.cama);

  var viasEval = [];
  var uppEval = [];

  for (var i = 0; i < viasLast.length; i++) {
    if (onlyEvaluables && isSpecialViasRow(viasLast[i])) continue;
    viasEval.push(viasLast[i]);
  }
  for (var j = 0; j < uppLast.length; j++) {
    if (onlyEvaluables && isSpecialUppRow(uppLast[j])) continue;
    uppEval.push(uppLast[j]);
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

  var noEvalVias = 0;
  var noEvalUpp = 0;
  for (var nv = 0; nv < viasEval.length; nv++) {
    if (isSpecialViasRow(viasEval[nv])) noEvalVias++;
  }
  for (var nu = 0; nu < uppEval.length; nu++) {
    if (isSpecialUppRow(uppEval[nu])) noEvalUpp++;
  }

  var viasStats = summarizeVias(viasEval);
  var uppStats = summarizeUpp(uppEval);
  var porSector = summarizeBySector(viasEval, uppEval, sectorFilter);
  var alertasPack = collectAlertas(viasEval, uppEval, 30);

  var generatedAt = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm');

  return {
    status: 'success',
    generatedAt: generatedAt,
    from: fromIso || null,
    to: toIso || null,
    sector: sectorFilter || null,
    ronda: ronda,
    cobertura: {
      registrosVias: viasDated.length,
      registrosUpp: uppDated.length,
      viasUnicas: viasEval.length,
      uppUnicas: uppEval.length,
      noEvaluablesVias: noEvalVias,
      noEvaluablesUpp: noEvalUpp,
      capacidad: sectorCapacity(sectorFilter),
      porSector: porSector
    },
    vias: viasStats,
    upp: uppStats,
    alertas: alertasPack.items,
    alertasTotal: alertasPack.total
  };
}

function isFlag(val) {
  var s = String(val || '').toLowerCase();
  return s === '1' || s === 'true' || s === 'si' || s === 'yes';
}

function ymdAR(d) {
  return Utilities.formatDate(d, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
}

function isBlankBed(row, sectorIdx, habIdx, camaIdx) {
  return !cellStr(row, sectorIdx) || !cellStr(row, habIdx) || !cellStr(row, camaIdx);
}

function isNo(val) {
  return String(val || '').trim().toUpperCase() === 'NO';
}

function parseStaffCount(val) {
  if (val === '' || val == null) return null;
  var n = Number(val);
  if (isNaN(n) || n < 0) return null;
  return n;
}

function applyStaff(slot, row, fechaIdx, enfIdx, auxIdx) {
  var d = parseSheetDate(row[fechaIdx]);
  var ts = d ? d.getTime() : 0;
  if (slot._staffAt && ts < slot._staffAt) return;
  if (!slot._staffAt || ts > slot._staffAt) slot._staffAt = ts;
  var en = parseStaffCount(row[enfIdx]);
  var ax = parseStaffCount(row[auxIdx]);
  if (en !== null) slot.enfermeras = en;
  if (ax !== null) slot.auxiliares = ax;
}

function publicSectorRow(slot) {
  return {
    sector: slot.sector,
    viasUnicas: slot.viasUnicas,
    viasEvaluables: slot.viasEvaluables,
    noEvaluablesVias: slot.noEvaluablesVias,
    uppUnicas: slot.uppUnicas,
    capacidad: slot.capacidad,
    conPeriferico: slot.conPeriferico,
    alertasVia: slot.alertasVia,
    conUpp: slot.conUpp,
    bradenAlto: slot.bradenAlto,
    rotuloIncompleto: slot.rotuloIncompleto,
    enfermeras: slot.enfermeras,
    auxiliares: slot.auxiliares
  };
}

function parseSheetDate(val) {
  if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())) {
    return val;
  }
  var s = String(val || '').trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), 0, 0);
}

function isYes(val) {
  return String(val || '').trim().toUpperCase() === 'SI';
}

function cellStr(row, idx) {
  if (!row || idx >= row.length || row[idx] == null || row[idx] === '') return '';
  var val = row[idx];
  if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm');
  }
  return String(val).trim();
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
    return SECTOR_ROOM_CONFIG[sector] ? countRooms(SECTOR_ROOM_CONFIG[sector]) * 4 : 0;
  }
  var total = 0;
  for (var k in SECTOR_ROOM_CONFIG) {
    if (SECTOR_ROOM_CONFIG.hasOwnProperty(k)) {
      total += countRooms(SECTOR_ROOM_CONFIG[k]) * 4;
    }
  }
  return total;
}

function readSheetRows(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function filterByDateAndSector(rows, fromIso, toIso, sector, fechaIdx, sectorIdx, habIdx, camaIdx) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (isBlankBed(row, sectorIdx, habIdx, camaIdx)) continue;
    if (sector && cellStr(row, sectorIdx) !== sector) continue;
    if (fromIso || toIso) {
      var d = parseSheetDate(row[fechaIdx]);
      if (!d) continue;
      var ymd = ymdAR(d);
      if (fromIso && ymd < fromIso) continue;
      if (toIso && ymd > toIso) continue;
    }
    out.push(row);
  }
  return out;
}

function lastRowByBed(rows, fechaIdx, sectorIdx, habIdx, camaIdx) {
  var map = {};
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (isBlankBed(row, sectorIdx, habIdx, camaIdx)) continue;
    var key = cellStr(row, sectorIdx) + '|' + cellStr(row, habIdx) + '|' + cellStr(row, camaIdx);
    var prev = map[key];
    if (!prev) {
      map[key] = row;
      continue;
    }
    var dNew = parseSheetDate(row[fechaIdx]);
    var dOld = parseSheetDate(prev[fechaIdx]);
    if (!dOld || (dNew && dNew >= dOld)) {
      map[key] = row;
    }
  }
  var out = [];
  for (var k in map) {
    if (map.hasOwnProperty(k)) out.push(map[k]);
  }
  return out;
}

function isSpecialViasRow(row) {
  var tipo = cellStr(row, V.tipoAlt);
  if (!tipo) return false;
  var low = tipo.toLowerCase();
  if (low === 'acceso_central' || low === 'percutaneo' || low === 'nada' || low === 'ausente') {
    if (low === 'ausente') return true;
    return false;
  }
  for (var i = 0; i < SPECIAL_BED_STATUSES.length; i++) {
    if (tipo === SPECIAL_BED_STATUSES[i] || low === SPECIAL_BED_STATUSES[i].toLowerCase()) return true;
  }
  if (low.indexOf('estudio') !== -1 || low.indexOf('rayos') !== -1) return true;
  return false;
}

function isSpecialUppRow(row) {
  var obs = cellStr(row, U.obs).toLowerCase();
  return obs.indexOf('paciente ausente') !== -1 || obs.indexOf('cama libre:') !== -1;
}

function rotuloApplies(row) {
  return isYes(row[V.accesoSi]) || cellStr(row, V.tipoAlt).toLowerCase() === 'percutaneo';
}

function rotuloStatus(row) {
  if (!rotuloApplies(row)) return 'na';
  if (!isYes(row[V.rotulo])) return 'incompleto';
  var enfOk = isYes(row[V.rotEnf]) || isYes(row[V.rotNombre]);
  if (isYes(row[V.rotFecha]) && enfOk && isYes(row[V.rotLegajo]) && isYes(row[V.rotTurno]) && isYes(row[V.rotAbb])) {
    return 'completo';
  }
  return 'incompleto';
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
  if (isYes(row[U.gradoIII]) || isYes(row[U.gradoIV])) tipos.push('UPP III-IV');
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

function summarizeVias(rows) {
  var conPeriferico = 0;
  var central = 0;
  var percutaneo = 0;
  var nada = 0;
  var noEvaluables = 0;
  var rotuloSi = 0;
  var rotuloCompleto = 0;
  var rotuloIncompleto = 0;
  var infiltracion = 0;
  var eritema = 0;
  var sinRetorno = 0;
  var noVisible = 0;
  var adhParcial = 0;
  var adhNula = 0;
  var infusiones = {};
  var ubicaciones = { MSD: 0, MSI: 0, MID: 0, MII: 0 };

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var tipo = cellStr(row, V.tipoAlt).toLowerCase();
    if (isYes(row[V.accesoSi])) {
      conPeriferico++;
      if (isYes(row[V.msd])) ubicaciones.MSD++;
      if (isYes(row[V.msi])) ubicaciones.MSI++;
      if (isYes(row[V.mid])) ubicaciones.MID++;
      if (isYes(row[V.mii])) ubicaciones.MII++;
      if (isYes(row[V.infiltracion])) infiltracion++;
      if (isYes(row[V.eritema])) eritema++;
      if (isNo(row[V.retorno])) sinRetorno++;
      if (isYes(row[V.visNo])) noVisible++;
      var adh = cellStr(row, V.adherencia).toLowerCase();
      if (adh === 'parcial') adhParcial++;
      if (adh === 'nula') adhNula++;
      var inf = cellStr(row, V.infusion);
      if (inf) bump(infusiones, inf.charAt(0).toUpperCase() + inf.slice(1));
    } else if (tipo === 'acceso_central') {
      central++;
    } else if (tipo === 'percutaneo') {
      percutaneo++;
    } else if (isSpecialViasRow(row)) {
      noEvaluables++;
    } else {
      nada++;
    }

    var rs = rotuloStatus(row);
    if (rs === 'completo') {
      rotuloSi++;
      rotuloCompleto++;
    } else if (rs === 'incompleto') {
      rotuloIncompleto++;
      if (isYes(row[V.rotulo])) rotuloSi++;
    }
  }

  return {
    evaluadas: rows.length,
    conPeriferico: conPeriferico,
    central: central,
    percutaneo: percutaneo,
    nada: nada,
    noEvaluables: noEvaluables,
    rotuloSi: rotuloSi,
    rotuloCompleto: rotuloCompleto,
    rotuloIncompleto: rotuloIncompleto,
    infiltracion: infiltracion,
    eritema: eritema,
    sinRetorno: sinRetorno,
    puncionNoVisible: noVisible,
    adherenciaParcial: adhParcial,
    adherenciaNula: adhNula,
    infusiones: mapToItems(infusiones),
    ubicaciones: [
      { label: 'MSD', count: ubicaciones.MSD },
      { label: 'MSI', count: ubicaciones.MSI },
      { label: 'MID', count: ubicaciones.MID },
      { label: 'MII', count: ubicaciones.MII }
    ]
  };
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
    var area = cellStr(row, U.areaCerrada);
    if (isYes(row[U.areaCerrada]) || /^SI/i.test(area)) areaCerrada++;
    if (isYes(row[U.tratamiento])) conTrat++;
    var tipo = cellStr(row, U.tipoTrat);
    if (tipo) {
      var parts = tipo.split(',');
      for (var p = 0; p < parts.length; p++) {
        var t = parts[p].trim();
        if (t) bump(tratamientos, t);
      }
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

function emptySectorRow(sector) {
  return {
    sector: sector,
    viasUnicas: 0,
    viasEvaluables: 0,
    noEvaluablesVias: 0,
    uppUnicas: 0,
    capacidad: sectorCapacity(sector),
    conPeriferico: 0,
    alertasVia: 0,
    conUpp: 0,
    bradenAlto: 0,
    rotuloIncompleto: 0,
    enfermeras: 0,
    auxiliares: 0,
    _staffAt: 0
  };
}

function summarizeBySector(viasRows, uppRows, sectorFilter) {
  var list = sectorFilter ? [sectorFilter] : STATS_SECTORS.slice();
  var map = {};
  for (var s = 0; s < list.length; s++) {
    map[list[s]] = emptySectorRow(list[s]);
  }

  for (var i = 0; i < viasRows.length; i++) {
    var row = viasRows[i];
    var sec = cellStr(row, V.sector);
    if (!map[sec]) map[sec] = emptySectorRow(sec);
    var slot = map[sec];
    slot.viasUnicas++;
    if (isSpecialViasRow(row)) {
      slot.noEvaluablesVias++;
    } else {
      slot.viasEvaluables++;
      if (isYes(row[V.accesoSi])) slot.conPeriferico++;
    }
    if (viasAlertTipos(row).length > 0) slot.alertasVia++;
    if (rotuloStatus(row) === 'incompleto') slot.rotuloIncompleto++;
    applyStaff(slot, row, V.fecha, V.enf, V.aux);
  }

  for (var j = 0; j < uppRows.length; j++) {
    var urow = uppRows[j];
    var usec = cellStr(urow, U.sector);
    if (!map[usec]) map[usec] = emptySectorRow(usec);
    var uslot = map[usec];
    uslot.uppUnicas++;
    if (isYes(urow[U.uppSi])) uslot.conUpp++;
    if (bradenBand(urow[U.braden]) === 'alto') uslot.bradenAlto++;
    applyStaff(uslot, urow, U.fecha, U.enf, U.aux);
  }

  var out = [];
  for (var k = 0; k < list.length; k++) out.push(publicSectorRow(map[list[k]]));
  if (!sectorFilter) {
    for (var extra in map) {
      if (map.hasOwnProperty(extra) && list.indexOf(extra) === -1) {
        out.push(publicSectorRow(map[extra]));
      }
    }
  }
  return out;
}

function collectAlertas(viasRows, uppRows, limit) {
  var items = [];
  for (var i = 0; i < viasRows.length; i++) {
    var row = viasRows[i];
    var tipos = viasAlertTipos(row);
    for (var t = 0; t < tipos.length; t++) {
      items.push({
        tipo: tipos[t],
        sector: cellStr(row, V.sector),
        habitacion: cellStr(row, V.hab),
        cama: cellStr(row, V.cama)
      });
    }
  }
  for (var j = 0; j < uppRows.length; j++) {
    var urow = uppRows[j];
    var utipos = uppAlertTipos(urow);
    for (var u = 0; u < utipos.length; u++) {
      items.push({
        tipo: utipos[u],
        sector: cellStr(urow, U.sector),
        habitacion: cellStr(urow, U.hab),
        cama: cellStr(urow, U.cama)
      });
    }
  }
  return { items: items.slice(0, limit), total: items.length };
}
