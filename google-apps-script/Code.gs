/**
 * PLANILLA ENFERMERA - Google Apps Script (Versión de Producción Actualizada)
 * 
 * Endpoint Webhook para inserción automática en Google Sheets y
 * despacho de reporte de Cierre de Turno por Correo Electrónico.
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
 * Health check para peticiones GET
 */
function doGet() {
  var ss = null;
  var ssTitle = 'No vinculado';
  try {
    ss = getSpreadsheet();
    ssTitle = ss.getName();
  } catch (e) {
    ssTitle = 'Error: ' + e.message;
  }

  return jsonResponse({ 
    status: 'online', 
    service: 'Planilla Enfermera Webhook Activo (Producción)',
    spreadsheet: ssTitle,
    destinatarios: DEFAULT_RECIPIENTS,
    servidores: 'Google Apps Script / V8 Engine'
  });
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
