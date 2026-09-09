/**
 * PLANILLA ENFERMERA - Google Apps Script
 * Endpoint Webhook para inserción automática en Google Sheets y
 * despacho de reporte de Cierre de Turno por Correo Electrónico.
 * 
 * DESTINATARIOS PREDETERMINADOS:
 * - jesusmillan86@gmail.com
 * - pamelaestua91@gmail.com
 * 
 * FORMATO DE FECHA: Español estándar (dd/MM/yyyy HH:mm)
 */

var DEFAULT_RECIPIENTS = ['jesusmillan86@gmail.com', 'pamelaestua91@gmail.com'];

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
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = formType === 'ACCESO_PERIFERICO' ? 'Acceso Periférico' : 'UPP';
    var sheet = ss.getSheetByName(sheetName);
    
    // Si la hoja no existe, la creamos y colocamos las cabeceras con la columna de control 'Mail Enviado'
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      if (formType === 'ACCESO_PERIFERICO') {
        sheet.appendRow([
          'Fecha/Hora', 'Sector', 'Habitación', 'Cama',
          'Acceso (SI)', 'Acceso (NO)', 'Cantidad',
          'MSD', 'MSI', 'MII', 'MID',
          'Rótulo Fecha', 'ABB (S/N)', 'Rótulo Nombre', 'Legajo', 'Turno',
          'Visibilidad (SI)', 'Visibilidad (NO)',
          'Tegaderm', 'Cinta', 'Hipafix', 'Venda', 'Contención Mec.',
          'Adherencia', 'Llave 3 Vías', 'Tapón Multif.',
          'Infiltración', 'Eritematoso', 'Retorno', 'Infusión',
          'Mail Enviado'
        ]);
      } else {
        sheet.appendRow([
          'Fecha/Hora', 'Sector', 'Habitación', 'Cama',
          'UPP (SI)', 'UPP (NO)', 'Cantidad',
          'Sacra', 'Talón', 'Glúteo', 'Posterior', 'Otro',
          'Grado', 'Tratamiento (SI/NO)', 'Tipo Tratamiento', 'Detalle',
          'Escala Braden', 'Oral', 'NPT', 'Enteral SN', 'Enteral BG',
          'Colchón (SI)', 'Colchón (NO)', 'Obs Colchón',
          'Mail Enviado'
        ]);
      }
      sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold').setBackground('#e0f2fe');
      sheet.setFrozenRows(1);
    } else {
      // Verificar que la última columna sea 'Mail Enviado'
      var lastCol = sheet.getLastColumn();
      var headerVal = sheet.getRange(1, lastCol).getValue();
      if (headerVal !== 'Mail Enviado') {
        sheet.getRange(1, lastCol + 1).setValue('Mail Enviado').setFontWeight('bold').setBackground('#e0f2fe');
      }
    }
    
    // Asegurar que el registro nuevo ingrese con 'NO' en Mail Enviado
    var expectedBaseLength = formType === 'ACCESO_PERIFERICO' ? 30 : 24;
    while (rowValues.length < expectedBaseLength) {
      rowValues.push('');
    }
    rowValues.push('NO'); // Columna Mail Enviado
    
    sheet.appendRow(rowValues);
    
    return jsonResponse({ status: 'success', message: 'Fila agregada correctamente a ' + sheetName });
      
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

function doGet() {
  return jsonResponse({ 
    status: 'online', 
    service: 'Planilla Enfermera Webhook Activo',
    destinatarios: DEFAULT_RECIPIENTS 
  });
}

/**
 * Función que busca registros con Mail Enviado !== 'SI',
 * arma el resumen clínico, envía el email y marca las filas como enviadas.
 */
function enviarReporteTurno(recipients) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetVias = ss.getSheetByName('Acceso Periférico');
  var sheetUpp = ss.getSheetByName('UPP');
  
  var pendingVias = [];
  var pendingUpp = [];
  var viasRowIndexes = [];
  var uppRowIndexes = [];
  
  // 1. Recorrer Vías usando getDisplayValues() para respetar formato de fecha en español
  if (sheetVias && sheetVias.getLastRow() > 1) {
    var lastRowVias = sheetVias.getLastRow();
    var lastColVias = sheetVias.getLastColumn();
    var valuesVias = sheetVias.getRange(2, 1, lastRowVias - 1, lastColVias).getDisplayValues();
    var colStatusIndex = lastColVias - 1; // índice 0-based
    
    for (var i = 0; i < valuesVias.length; i++) {
      var row = valuesVias[i];
      var status = String(row[colStatusIndex] || '').toUpperCase().trim();
      if (!status.startsWith('SI')) {
        pendingVias.push(row);
        viasRowIndexes.push(i + 2); // Fila real 1-based
      }
    }
  }
  
  // 2. Recorrer UPP usando getDisplayValues()
  if (sheetUpp && sheetUpp.getLastRow() > 1) {
    var lastRowUpp = sheetUpp.getLastRow();
    var lastColUpp = sheetUpp.getLastColumn();
    var valuesUpp = sheetUpp.getRange(2, 1, lastRowUpp - 1, lastColUpp).getDisplayValues();
    var colStatusIndexUpp = lastColUpp - 1;
    
    for (var j = 0; j < valuesUpp.length; j++) {
      var rowU = valuesUpp[j];
      var statusU = String(rowU[colStatusIndexUpp] || '').toUpperCase().trim();
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
      message: 'No hay registros pendientes de envío. Todos los pacientes ya fueron reportados previamente.',
      count: 0
    });
  }
  
  // 3. Analizar métricas clínicas para el cuerpo del mail
  var viasConAlerta = 0;
  var viasSinAcceso = 0;
  var viasConAcceso = 0;
  
  for (var v = 0; v < pendingVias.length; v++) {
    var rV = pendingVias[v];
    var tieneAcceso = rV[4] === 'SI';
    if (tieneAcceso) {
      viasConAcceso++;
      var infiltracion = rV[26] === 'SI';
      var eritematoso = rV[27] === 'SI';
      if (infiltracion || eritematoso) {
        viasConAlerta++;
      }
    } else {
      viasSinAcceso++;
    }
  }
  
  var uppConLesion = 0;
  var uppSinLesion = 0;
  for (var u = 0; u < pendingUpp.length; u++) {
    var rU = pendingUpp[u];
    var tieneU = rU[4] === 'SI';
    if (tieneU) {
      uppConLesion++;
    } else {
      uppSinLesion++;
    }
  }
  
  // 4. Construir cuerpo del Correo en HTML profesional (Fecha en español dd/MM/yyyy HH:mm)
  var fechaHoy = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm');
  var subject = '[Reporte Enfermería] Cierre de Turno - ' + fechaHoy + ' (' + totalPending + ' registros)';
  
  var html = '<div style="font-family: Arial, sans-serif; max-width: 720px; margin: auto; padding: 20px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">';
  html += '<div style="background-color: #0369a1; padding: 18px; border-radius: 8px; color: #ffffff; text-align: center;">';
  html += '<h2 style="margin: 0; font-size: 20px;">🏥 Reporte de Relevamiento de Enfermería</h2>';
  html += '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Cierre de Turno / Registros Pendientes Despachados</p>';
  html += '</div>';
  
  html += '<p style="margin-top: 16px; font-size: 14px;"><b>Fecha de Emisión:</b> ' + fechaHoy + ' hs</p>';
  html += '<p style="font-size: 13px; color: #64748b;">Se adjunta el reporte consolidado de los pacientes relevados que estaban pendientes de envío.</p>';
  
  // Tarjetas de Métricas
  html += '<div style="display: flex; gap: 10px; margin: 16px 0; text-align: center;">';
  
  html += '<div style="flex: 1; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1;">';
  html += '<div style="font-size: 24px; font-weight: bold; color: #0284c7;">' + totalPending + '</div>';
  html += '<div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Registros</div>';
  html += '</div>';
  
  html += '<div style="flex: 1; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1;">';
  html += '<div style="font-size: 24px; font-weight: bold; color: #059669;">' + viasConAcceso + '</div>';
  html += '<div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Vías Activas</div>';
  html += '</div>';
  
  html += '<div style="flex: 1; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid ' + (viasConAlerta > 0 ? '#fca5a5' : '#cbd5e1') + '; background-color: ' + (viasConAlerta > 0 ? '#fef2f2' : '#ffffff') + ';">';
  html += '<div style="font-size: 24px; font-weight: bold; color: ' + (viasConAlerta > 0 ? '#dc2626' : '#64748b') + ';">' + viasConAlerta + '</div>';
  html += '<div style="font-size: 11px; color: ' + (viasConAlerta > 0 ? '#dc2626' : '#64748b') + '; text-transform: uppercase;">Alertas Vía</div>';
  html += '</div>';
  
  html += '<div style="flex: 1; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid ' + (uppConLesion > 0 ? '#fcd34d' : '#cbd5e1') + '; background-color: ' + (uppConLesion > 0 ? '#fffbeb' : '#ffffff') + ';">';
  html += '<div style="font-size: 24px; font-weight: bold; color: ' + (uppConLesion > 0 ? '#d97706' : '#64748b') + ';">' + uppConLesion + '</div>';
  html += '<div style="font-size: 11px; color: ' + (uppConLesion > 0 ? '#d97706' : '#64748b') + '; text-transform: uppercase;">UPP Activas</div>';
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
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Vía</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Ubicación</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Enfermero / Legajo</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Estado / Signos</th>';
    html += '</tr>';
    
    for (var pv = 0; pv < pendingVias.length; pv++) {
      var rowP = pendingVias[pv];
      var hasV = rowP[4] === 'SI';
      var ubic = '';
      if (rowP[7] === 'SI') ubic = 'MSD';
      else if (rowP[8] === 'SI') ubic = 'MSI';
      else if (rowP[9] === 'SI') ubic = 'MII';
      else if (rowP[10] === 'SI') ubic = 'MID';
      
      var enf = (rowP[13] || '-') + ' (' + (rowP[14] || '-') + ')';
      var alerta = '';
      if (rowP[26] === 'SI') alerta += '<span style="color:#dc2626; font-weight:bold;">Infiltración! </span>';
      if (rowP[27] === 'SI') alerta += '<span style="color:#dc2626; font-weight:bold;">Eritematoso! </span>';
      if (!alerta && hasV) alerta = '<span style="color:#059669;">Normal</span>';
      if (!hasV) alerta = '<span style="color:#64748b;">Sin acceso</span>';
      
      html += '<tr>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: monospace;">' + rowP[0] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + rowP[1] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;"><b>' + rowP[2] + '</b> - ' + rowP[3] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (hasV ? 'SI (' + rowP[6] + ')' : 'NO') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (ubic || '-') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + enf + '</td>';
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
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Tiene UPP</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Grado</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Tratamiento</th>';
    html += '<th style="padding: 6px 8px; border: 1px solid #e2e8f0;">Braden</th>';
    html += '</tr>';
    
    for (var pu = 0; pu < pendingUpp.length; pu++) {
      var rowU2 = pendingUpp[pu];
      var hasU = rowU2[4] === 'SI';
      html += '<tr>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: monospace;">' + rowU2[0] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + rowU2[1] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;"><b>' + rowU2[2] + '</b> - ' + rowU2[3] + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (hasU ? '<span style="color:#d97706; font-weight:bold;">SI (' + rowU2[6] + ')</span>' : 'NO') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (rowU2[12] || '-') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (rowU2[14] || '-') + '</td>';
      html += '<td style="padding: 6px 8px; border: 1px solid #e2e8f0;">' + (rowU2[16] || '-') + '</td>';
      html += '</tr>';
    }
    html += '</table>';
  }
  
  html += '<div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">';
  html += 'Planilla Enfermera - Sistema Automático de Relevamiento Clínico';
  html += '</div>';
  html += '</div>';
  
  // 5. Crear archivo CSV adjunto con los datos completos formateados en español
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
  
  // 7. Marcar las filas enviadas con 'SI' en Google Sheets para evitar duplicación
  var timeMark = 'SI (' + fechaHoy + ')';
  if (sheetVias && viasRowIndexes.length > 0) {
    var lastColV = sheetVias.getLastColumn();
    for (var idxV = 0; idxV < viasRowIndexes.length; idxV++) {
      sheetVias.getRange(viasRowIndexes[idxV], lastColV).setValue(timeMark);
    }
  }
  if (sheetUpp && uppRowIndexes.length > 0) {
    var lastColU = sheetUpp.getLastColumn();
    for (var idxU = 0; idxU < uppRowIndexes.length; idxU++) {
      sheetUpp.getRange(uppRowIndexes[idxU], lastColU).setValue(timeMark);
    }
  }
  
  return jsonResponse({
    status: 'success',
    message: 'Reporte enviado con éxito por correo a ' + recipientString,
    count: totalPending,
    viasCount: pendingVias.length,
    uppCount: pendingUpp.length
  });
}

function verificarYEnviarPendientesAutomatico() {
  enviarReporteTurno(DEFAULT_RECIPIENTS);
}

function escapeCsv(val) {
  // Si viniera algún objeto Date, forzamos formato dd/MM/yyyy HH:mm
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
