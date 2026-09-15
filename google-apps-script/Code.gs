/**
 * PLANILLA ENFERMERA - Google Apps Script (Versión de Producción)
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
  'Fecha/Hora', 'Sector', 'Habitación', 'Cama', 'HC',
  'Cant. Enfermeras', 'Cant. Auxiliares',
  'Acceso (SI)', 'Acceso (NO)', 'Tipo Acceso Alt.', 'Acceso Central Ubic.',
  'Cantidad', 'MSD', 'MSI', 'MII', 'MID',
  'Rótulo (SI/NO)', 'Rótulo Fecha', 'Rótulo Nombre', 'Rótulo Legajo',
  'Rótulo Enfermero', 'Rótulo Turno', 'Rótulo ABB',
  'Visibilidad (SI)', 'Visibilidad (NO)',
  'Tegaderm', 'Cinta', 'Tipo Cinta', 'Hipafix', 'Venda', 'Contención Mec.',
  'Adherencia', 'Llave 3 Vías', 'Tapón Multif.',
  'Infiltración', 'Eritematoso', 'Retorno', 'Infusión',
  'Observaciones',
  'Mail Enviado'
];

var HEADERS_UPP = [
  'Fecha/Hora', 'Sector', 'Habitación', 'Cama', 'HC',
  'Cant. Enfermeras', 'Cant. Auxiliares',
  'Fecha Ingreso', 'Área Cerrada',
  'UPP (SI)', 'UPP (NO)', 'Cantidad',
  'Sacra', 'Talón', 'Glúteo', 'Posterior', 'Otro',
  'Grado I', 'Grado II', 'Grado III', 'Grado IV',
  'Tratamiento (SI/NO)', 'Tipo Tratamiento', 'Detalle',
  'Disp. Apoyo (SI/NO)', 'Disp. Aro', 'Disp. Guantes Agua', 'Disp. Otro',
  'Escala Braden', 'Oral', 'NPT', 'Enteral SN', 'Enteral BG',
  'Colchón (SI)', 'Colchón (NO)', 'Obs Colchón',
  'Mail Enviado'
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
    
    // CASO 1: Solicitud de Cierre de Turno y Envío de Reporte por Correo
    if (payload.action === 'SEND_SHIFT_SUMMARY') {
      var recipients = (payload.recipients && payload.recipients.length > 0) 
        ? payload.recipients 
        : DEFAULT_RECIPIENTS;
      return enviarReporteTurno(recipients);
    }
    
    // CASO 2: Inserción de un nuevo registro de paciente
    var formType = payload.formType; // 'ACCESO_PERIFERICO' o 'UPP'
    var rowValues = payload.rowValues || [];
    
    var ss = getSpreadsheet();
    var isVias = formType === 'ACCESO_PERIFERICO';
    var sheetName = isVias ? 'Acceso Periférico' : 'UPP';
    var expectedHeaders = isVias ? HEADERS_ACCESO_PERIFERICO : HEADERS_UPP;
    
    // Asegurar que la hoja exista y tenga los encabezados correspondientes
    var sheet = ensureSheetWithHeaders(ss, sheetName, expectedHeaders);
    
    // Asegurar que el tamaño base de la fila coincida con los datos (sin Mail Enviado)
    var expectedBaseLength = expectedHeaders.length - 1; // 38 para vías, 36 para UPP
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
  
  for (var v = 0; v < pendingVias.length; v++) {
    var rV = pendingVias[v];
    var tieneAcceso = rV[7] === 'SI';
    if (tieneAcceso) {
      viasConAcceso++;
      var infiltracion = rV[34] === 'SI';
      var eritematoso = rV[35] === 'SI';
      if (infiltracion || eritematoso) {
        viasConAlerta++;
      }
    } else {
      viasSinAcceso++;
      if (rV[9] === 'acceso_central') viasCentral++;
      if (rV[9] === 'percutaneo') viasPercutaneo++;
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
  
  var html = '<div style="font-family: Arial, sans-serif; max-width: 760px; margin: auto; padding: 20px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">';
  html += '<div style="background-color: #0369a1; padding: 18px; border-radius: 8px; color: #ffffff; text-align: center;">';
  html += '<h2 style="margin: 0; font-size: 20px;">🏥 Reporte de Relevamiento de Enfermería</h2>';
  html += '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Cierre de Turno / Registros Despachados</p>';
  html += '</div>';
  
  html += '<p style="margin-top: 16px; font-size: 14px;"><b>Fecha de Emisión:</b> ' + fechaHoy + ' hs</p>';
  html += '<p style="font-size: 13px; color: #64748b;">Se adjunta el reporte consolidado de los pacientes relevados que estaban pendientes de envío.</p>';
  
  // Tarjetas de Métricas
  html += '<div style="display: flex; gap: 8px; margin: 16px 0; text-align: center; flex-wrap: wrap;">';
  
  html += '<div style="flex: 1; min-width: 100px; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1;">';
  html += '<div style="font-size: 22px; font-weight: bold; color: #0284c7;">' + totalPending + '</div>';
  html += '<div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Total Registros</div>';
  html += '</div>';
  
  html += '<div style="flex: 1; min-width: 100px; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1;">';
  html += '<div style="font-size: 22px; font-weight: bold; color: #059669;">' + viasConAcceso + '</div>';
  html += '<div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Vías Activas</div>';
  html += '</div>';
  
  html += '<div style="flex: 1; min-width: 100px; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid ' + (viasConAlerta > 0 ? '#fca5a5' : '#cbd5e1') + '; background-color: ' + (viasConAlerta > 0 ? '#fef2f2' : '#ffffff') + ';">';
  html += '<div style="font-size: 22px; font-weight: bold; color: ' + (viasConAlerta > 0 ? '#dc2626' : '#64748b') + ';">' + viasConAlerta + '</div>';
  html += '<div style="font-size: 10px; color: ' + (viasConAlerta > 0 ? '#dc2626' : '#64748b') + '; text-transform: uppercase;">Alertas Vía</div>';
  html += '</div>';
  
  html += '<div style="flex: 1; min-width: 100px; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid ' + (uppConLesion > 0 ? '#fcd34d' : '#cbd5e1') + '; background-color: ' + (uppConLesion > 0 ? '#fffbeb' : '#ffffff') + ';">';
  html += '<div style="font-size: 22px; font-weight: bold; color: ' + (uppConLesion > 0 ? '#d97706' : '#64748b') + ';">' + uppConLesion + '</div>';
  html += '<div style="font-size: 10px; color: ' + (uppConLesion > 0 ? '#d97706' : '#64748b') + '; text-transform: uppercase;">UPP Activas</div>';
  html += '</div>';
  
  html += '</div>';
  
  // Tabla Resumen Vías Pendientes
  if (pendingVias.length > 0) {
    html += '<h3 style="color: #0369a1; font-size: 15px; margin-top: 20px; border-bottom: 2px solid #e0f2fe; padding-bottom: 4px;">💉 Accesos Periféricos Relevados (' + pendingVias.length + ')</h3>';
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff;">';
    html += '<tr style="background: #f1f5f9; text-align: left; color: #475569;">';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Fecha/Hora</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Sector</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Hab/Cama</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">HC</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Estado Acceso</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Ubicación</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Rótulo</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Alertas</th>';
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
        estadoAcceso = 'Con Vía (' + rowP[11] + ')';
      } else if (rowP[9] === 'acceso_central') {
        estadoAcceso = 'Central (' + (rowP[10] || 'S/D') + ')';
      } else if (rowP[9] === 'percutaneo') {
        estadoAcceso = 'Percutáneo';
      } else {
        estadoAcceso = 'Sin Acceso';
      }
      
      var rotuloInfo = rowP[16] === 'SI' ? 'SÍ' : (rowP[16] === 'NO' ? 'NO' : '-');
      
      var alerta = '';
      if (rowP[34] === 'SI') alerta += '<span style="color:#dc2626; font-weight:bold;">Infiltración! </span>';
      if (rowP[35] === 'SI') alerta += '<span style="color:#dc2626; font-weight:bold;">Eritematoso! </span>';
      if (!alerta && hasV) alerta = '<span style="color:#059669;">Normal</span>';
      if (!hasV) alerta = '<span style="color:#64748b;">-</span>';
      
      html += '<tr>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: monospace;">' + rowP[0] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + rowP[1] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;"><b>' + rowP[2] + '</b> - ' + rowP[3] + '</td>';
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
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff;">';
    html += '<tr style="background: #f1f5f9; text-align: left; color: #475569;">';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Fecha/Hora</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Sector</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Hab/Cama</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">HC</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Tiene UPP</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Grados</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Tratamiento</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Disp. Apoyo</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Braden</th>';
    html += '</tr>';
    
    for (var pu = 0; pu < pendingUpp.length; pu++) {
      var rowU2 = pendingUpp[pu];
      var hasU = rowU2[9] === 'SI';
      
      var grados = [];
      if (rowU2[17] === 'SI') grados.push('I');
      if (rowU2[18] === 'SI') grados.push('II');
      if (rowU2[19] === 'SI') grados.push('III');
      if (rowU2[20] === 'SI') grados.push('IV');
      
      var dispApoyo = rowU2[24] === 'SI' ? 'SÍ' : (rowU2[24] === 'NO' ? 'NO' : '-');
      
      html += '<tr>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: monospace;">' + rowU2[0] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + rowU2[1] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;"><b>' + rowU2[2] + '</b> - ' + rowU2[3] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (rowU2[4] || '-') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (hasU ? '<span style="color:#d97706; font-weight:bold;">SI (' + rowU2[11] + ')</span>' : 'NO') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (grados.join(', ') || '-') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (rowU2[22] || '-') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + dispApoyo + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (rowU2[28] || '-') + '</td>';
      html += '</tr>';
    }
    html += '</table>';
  }
  
  html += '<div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">';
  html += 'Planilla Enfermera - Sistema Automático de Relevamiento Clínico';
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
  
  var csvBlob = Utilities.newBlob(csvLines.join('\r\n'), 'text/csv', 'reporte_turno_' + Utilities.formatDate(new Date(), 'GMT-3', 'yyyyMMdd_HHmm') + '.csv');
  
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
