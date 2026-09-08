/**
 * PLANILLA ENFERMERA - Google Apps Script
 * Endpoint Webhook para inserción automática en Google Sheets.
 * 
 * INSTRUCCIONES:
 * 1. En tu Google Sheet, ve a: Extensiones > Apps Script.
 * 2. Pega todo este código reemplazando el contenido existente.
 * 3. Haz clic en "Implementar" (Deploy) > "Nueva implementación".
 * 4. Selecciona tipo "Aplicación web" (Web App).
 * 5. Configura:
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier usuario" (Anyone)
 * 6. Copia la URL generada y pégala en la configuración de la App Móvil.
 */

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var payload = JSON.parse(contents);
    
    var formType = payload.formType; // 'ACCESO_PERIFERICO' o 'UPP'
    var rowValues = payload.rowValues;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = formType === 'ACCESO_PERIFERICO' ? 'Acceso Periférico' : 'UPP';
    var sheet = ss.getSheetByName(sheetName);
    
    // Si la hoja no existe, la creamos y colocamos las cabeceras
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
          'Infiltración', 'Eritematoso', 'Retorno', 'Infusión'
        ]);
      } else {
        sheet.appendRow([
          'Fecha/Hora', 'Sector', 'Habitación', 'Cama',
          'UPP (SI)', 'UPP (NO)', 'Cantidad',
          'Sacra', 'Talón', 'Glúteo', 'Posterior', 'Otro',
          'Grado', 'Tratamiento (SI/NO)', 'Tipo Tratamiento', 'Detalle',
          'Escala Braden', 'Oral', 'NPT', 'Enteral SN', 'Enteral BG',
          'Colchón (SI)', 'Colchón (NO)', 'Obs Colchón'
        ]);
      }
      sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold').setBackground('#e0f2fe');
    }
    
    // Insertar la fila recibida
    sheet.appendRow(rowValues);
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Fila agregada correctamente' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'online', service: 'Planilla Enfermera Webhook Activo' }))
    .setMimeType(ContentService.MimeType.JSON);
}
