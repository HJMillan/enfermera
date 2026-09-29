# Plan de implementación

Cubre todos los hallazgos del análisis del 29/09/2026. Está ordenado por riesgo: primero lo que puede perder o corromper datos, al final la calidad del código y la documentación.

Convenciones:
- **[App]** = frontend (`src/`). **[GAS]** = `google-apps-script/Code.gs`. Cada cambio en GAS exige pegar el script en Apps Script y publicar una versión nueva.
- Tamaño estimado: **S** menos de 1 h, **M** de 1 a 3 h, **L** más de 3 h.
- Regla de despliegue: primero se publica el GAS compatible con la app vieja y la nueva; después se publica la app.

---

## Fase 0 · Decisiones previas (no son de código)

- [x] **Valores marcados de antemano en Vía y LPP** (Tegaderm, retorno venoso, infusión continua, adherencia total, colchón, nutrición oral). **Decisión: se dejan como están.**
- [x] **Braden.** Hoy solo se pide si el paciente tiene LPP. **Decisión: por ahora queda así.**
- [x] **Rótulo: "Nombre" y "Enfermero".** **Decisión: se separan** (ver 4.4).
- [x] **Configuración regional de la planilla de Google.** **Decisión: Argentina, zona `America/Argentina/Buenos_Aires`**, en la planilla (Archivo › Configuración) y en el proyecto de Apps Script (Configuración del proyecto). Se ajusta a mano antes de la entrega 2.
- [x] **Destinatarios del mail.** **Decisión: los actuales son los definitivos** (`jesusmillan86@gmail.com`, `pamelaestua91@gmail.com`) y quedan fijos en Code.gs (ver 1.1).

---

## Fase 1 · Mail y seguridad mínima

**Objetivo:** los destinatarios se manejan solo desde el código del servidor, no se ven ni se editan en la app, y el webhook deja de estar abierto.

### 1.1 Destinatarios fijos en el servidor (S) — [GAS] + [App]
- [GAS] Renombrar `DEFAULT_RECIPIENTS` a `RECIPIENTS` como única fuente.
- [GAS] `doPost` › `SEND_SHIFT_SUMMARY` **ignora `payload.recipients`** y usa siempre `RECIPIENTS` (`Code.gs:167-170`).
- [GAS] Quitar `destinatarios` de la respuesta del health check (`Code.gs:246`).
- [App] Borrar `DEFAULT_NOTIFICATION_EMAILS`, `getNotificationEmails`, `setNotificationEmails` y la clave `NOTIFICATION_EMAILS` de `storageService.ts`.
- [App] Al iniciar la app, borrar la clave vieja `pe_notification_emails` del localStorage.
- [App] `SettingsModal.tsx`: quitar el campo de correos y su estado (líneas 7-8, 25, 61-62, 177-190 aprox.).
- [App] `ShiftSummaryModal.tsx`: no mostrar correos. El texto pasa a ser "Se enviará a los destinatarios configurados".
- [App] `webhookService.requestShiftSummaryEmail()`: sin parámetro ni `recipients` en el payload. El mensaje de éxito no nombra a nadie.
- **Hecho cuando:** buscar el texto `@gmail` en `src/` y en `dist/` no devuelve nada, y un POST con `recipients: ['x@x.com']` manda el mail igual a `RECIPIENTS`.

### 1.2 Token compartido (S) — [GAS] + [App]
- [GAS] Constante `API_TOKEN`, o mejor una Script Property `API_TOKEN`. `doPost` y `doGet?action=GET_STATS` rechazan las llamadas sin token válido. El health check sin token solo responde `{status:'online'}`.
- [App] Campo "Clave" en Ajustes, guardado en localStorage. Se envía en el cuerpo del POST y como parámetro `token` en la llamada de estadísticas.
- [App] En producción **no** definir `VITE_WEBHOOK_URL` en el build. La URL y la clave se cargan una vez en Ajustes, así no quedan dentro del JavaScript público.
- Compatibilidad: una semana con `REQUIRE_TOKEN = false` (registra en el log, no rechaza). Después se pasa a `true`.

### 1.3 Endurecer entradas (S) — [GAS]
- Escapar el HTML de cada valor que entra al cuerpo del mail (`Code.gs:600-666`).
- Evitar que un texto se interprete como fórmula: todo valor que empiece con `= + - @` se guarda con un `'` adelante, tanto en `appendRow` como en el CSV adjunto.
- Rechazar un `formType` desconocido en lugar de mandarlo en silencio a Acceso Periférico (`Code.gs:174`).

---

## Fase 2 · Integridad de datos en el dispositivo — [App]

### 2.1 No perder registros pendientes (M)
- `saveRecordLocally`: el tope de 200 solo recorta registros `SYNCED`; los `PENDING` y `FAILED` no se descartan nunca.
- `ShiftSummaryModal` › "Nuevo día": si hay pendientes, bloquear o pedir confirmación explícita ("Hay N sin enviar"), y borrar solo los enviados.
- Envolver en `try/catch` todas las escrituras en localStorage (`storageService.ts`, `StatsView.tsx:298`). Si fallan, avisar con un toast y no tirar abajo la app.

### 2.2 Estado de sincronización real (M)
- Sin webhook, el registro queda en un estado nuevo `LOCAL`, no `SYNCED`. Al configurar la URL se ofrece "Enviar N registros locales".
- `getStoredWebhookUrl`: si el usuario la borró (queda `""`), respetarlo y no volver al valor de `.env`.
- Confirmar el envío de verdad. Con `no-cors` la respuesta es opaca y no se puede leer. Opción recomendada: después del POST, consultar por JSONP una acción `ACK?id=<recordId>` que responde si la fila existe. Solo entonces se marca `SYNCED`. Mientras tanto queda `SENT`, y se vuelve a verificar al abrir el Historial o antes del cierre.
- "Probar conexión" usa JSONP (`doGet` sin acción, con token) en vez de un POST `no-cors`.
- `HistoryView` › "Sincronizar pendientes": mostrar el resultado ("5 enviados, 1 falló") y avisar si no hay webhook.
- `ShiftSummaryModal`: refrescar los registros después de sincronizar.

### 2.3 Exportar a CSV (S)
- Usar `Blob` en lugar de un data URI con `encodeURI`, porque un `#` corta el archivo.
- Agregar BOM UTF-8 para que Excel muestre bien los acentos.
- Nombre del archivo con la fecha local, no UTC.

---

## Fase 3 · Contrato entre la app y el Sheet — [GAS] + [App]

### 3.1 Id de registro e idempotencia (M)
- [App] El payload ya lleva `recordId`: agregarlo a `rowValues` como columna **"ID Registro"**, al final, después de Mail Enviado, para no correr las columnas existentes.
- [GAS] Antes de `appendRow`, si el id ya existe, no insertar y responder OK. Así los reintentos no duplican filas.
- [GAS] Usar `LockService` en `doPost` y en `enviarReporteTurno`.

### 3.2 "Deshacer" también borra la fila del Sheet (S)
- [GAS] Acción `DELETE_RECORD {recordId}`: busca la fila por id y la borra, solo si todavía no se envió por mail.
- [App] `handleUndo` borra el registro local y, si ya se había enviado, despacha `DELETE_RECORD`.

### 3.3 Fechas y textos que Sheets convierte solo (M)
- [GAS] Antes de `appendRow`, poner las columnas de fecha, HC, habitación, cama y ID Registro en formato texto (`@`) **en toda la columna**, no solo cuando se crea la hoja.
- [App] Sin cambio de formato visible: `fechaHora` sigue siendo `dd/mm/aaaa HH:mm`, pero como texto. `fechaIngreso` pasa a `dd/mm/aaaa`, igual que la otra fecha.
- [GAS] `parseSheetDate` y `ymdAR` usan la misma zona horaria de forma explícita.
- [GAS] Script único para corregir las filas existentes con día y mes invertidos (con respaldo previo de la hoja).

### 3.4 Leer columnas por nombre (M) — [GAS]
- Reemplazar los índices fijos (`V`, `U`, `S` en `Code.gs:881-905`) por un mapa `nombre de cabecera → índice` que se arma al leer la hoja.
- Escribir las filas también por nombre, según el orden de cabeceras que manda la app. Con eso deja de romperse la migración de cabeceras (`Code.gs:316-332`), y "Mail Enviado" se busca por nombre, nunca "la última columna".

### 3.5 Errores de cálculo en el servidor (S) — [GAS]
- `puncionNoVisible`: usar `isNo(row[V.visNo])` en lugar de `isYes` (`Code.gs:1362`).
- Sondas en el mail de cierre, en `menuInicializarHojas` y en `menuVerPendientes`.
- Sondas: excluir las camas libres o ausentes. La app escribe el motivo en la columna "Tiene Sonda" en vez de "NO", y el servidor aplica los filtros evaluables y alertas.
- Marcar "Mail Enviado" con un solo `setValues` por bloque en vez de un `setValue` por fila.
- Guardar las estadísticas en `CacheService` 60 s, con clave por filtros.
- Borrar la rama `Date` de `escapeCsv`, que nunca se usa, y unificar las funciones de sí/no.

---

## Fase 4 · Flujo de carga en los formularios — [App]

### 4.1 Navegación de camas (S)
- Después de guardar la **última cama** de la habitación, pasar a la cama 1 de la siguiente habitación válida (`stepBed` + `getNextValidRoom`). En la última habitación del sector, quedarse ahí y avisar "Sector completo".
- Bloquear el guardado si `isValidRoom` es falso, con el mensaje "La habitación X no existe en el sector Y".

### 4.2 Atajos de teclado (S)
- Agregar un handler global de `Enter` (con el foco fuera de un campo de texto) que llame a `form.requestSubmit()` sobre el formulario activo.
- Los atajos `N`, `S`, `+`, `-` y `Enter` se ignoran si hay un modal abierto.

### 4.3 Validaciones faltantes (S)
- Vía › Acceso central: exigir la ubicación (Y/I, Y/D, S/I, S/D).
- Vía › Cinta: exigir el tipo de cinta.
- **Cinta transparente:** dejarla una sola vez, dentro de los tipos de cinta, y sacar el chip aparte con la lógica que no hace nada (`AccesoPerifericoForm.tsx:509-537`).
- LPP: exigir al menos una ubicación y un grado si tiene LPP.

### 4.4 Rótulo: separar Nombre y Enfermero (S)
- `AccesoPerifericoForm.tsx`:
  - Agregar el ítem "Nombre" a la grilla del rótulo, que queda en Fecha, Nombre, Legajo, Enfermero, Turno y ABB.
  - Sacar la copia `rotuloTieneNombre = rotuloTieneEnfermero` (línea 186).
  - "Todo SÍ" sigue marcando los seis.
- `sheetMapper.ts`: la columna S usa solo `rotuloTieneNombre` y la U solo `rotuloTieneEnfermero` (líneas 78 y 80). No cambian las columnas del Sheet.
- `HistoryView.tsx` (líneas 281 y 297): mostrar Nombre y Enfermero por separado.
- Registros viejos: ya traían los dos valores iguales, así que se leen bien sin compatibilidad extra.
- [GAS] Revisar que "rótulo completo" en las estadísticas cuente la columna S como un ítem independiente.

Sin cambios por decisión de la Fase 0: los valores marcados de antemano y Braden solo con LPP.

- LPP › "¿Pasó por área cerrada?": escribir vacío (no `NO`) cuando no se preguntó (`sheetMapper.ts:160`).

---

## Fase 5 · Estadísticas, Historial y modales — [App]

- `StatsView`:
  - La lectura guardada solo se muestra si los filtros coinciden (`:324`).
  - Recalcular los presets de fecha al volver a la pestaña o al cambiar el día (`:86-98`).
  - Tarjeta "Libres / ausentes" de sondas con su propio dato (`:690-697`).
  - Mismo denominador en el centro del gráfico circular y en la leyenda (`:720-738`).
  - `alertasTotal` real fuera de "ambas" (`:367`).
  - Ocultar "Infusiones" si todo está en 0 (`:838`).
  - "Limpiar" solo resetea los filtros extra (`:603`).
  - Colores de alerta por tipo, no por posición (`:1146`).
  - Forma funcional en `setFilters` (`:471`, `:591`).
- `SectorBedMatrixModal`: "Censada hoy" filtra por la fecha de hoy. La capacidad sale de `COMMON_BEDS.length` y el porcentaje se limita a 100.
- `ShiftSummaryModal`: contar camas únicas, no registros.
- Turno "8:00 a 16:00": pasar a una constante en `config/shift.ts` (se usa en `App.tsx` y `ShiftSummaryModal.tsx`).

---

## Fase 6 · PWA y service worker — [App]

- `sw.js`:
  - Navegaciones y `index.html` **primero desde la red**, con la caché como respaldo sin conexión.
  - Los assets con hash se sirven primero desde la caché.
  - Cachear solo lo del mismo origen (`type === 'basic'`).
  - El `catch` devuelve siempre un `Response` (hoy puede devolver `undefined`).
- Aviso de versión nueva: escuchar `updatefound`/`controllerchange` y mostrar un toast "Hay una versión nueva · Recargar".
- **Una sola fuente de versión:** `vite.config.ts` lee `package.json` y la inyecta con `define` como `__APP_VERSION__`. Un plugin pequeño escribe la versión en `sw.js` durante el build. Así `version.ts` y el `CACHE_NAME` escrito a mano desaparecen.
- `beforeinstallprompt`: capturarlo en `App` al cargar, no en `SettingsModal`.

---

## Fase 7 · Interfaz, CSS y accesibilidad — [App]

- Clases que no generan estilo:
  - `xs:` → `sm:`, o definir `--breakpoint-xs` en `@theme`. Hoy "Ronda 1:" y "Pantalla Activa" nunca se ven.
  - Definir `animate-fade-in` en `@theme` (keyframes), porque se usa unas 20 veces y hoy no hace nada.
  - `py-0.2` → `py-0.5`.
- Modales (Ajustes, Cierre, Mapa de camas): `role="dialog"`, `aria-modal`, cierre con Esc, foco atrapado y `aria-label` en el botón X.
- `aria-pressed` en los chips, `aria-expanded` en los desplegables, y `role="tablist"`/`aria-selected` en `ModuleTabs`.
- Cabecera del Historial: usar `<button>` en vez de un `div` con onClick.
- `<label htmlFor>` en los campos de Ajustes.
- Quitar `user-select: none` global y aplicarlo solo a botones y chips.

---

## Fase 8 · Calidad de código — [App]

- Lint: mover `pct` y las constantes de `StatsCharts.tsx` a `statsUtils.ts` para que el archivo solo exporte componentes.
- Dividir `StatsView.tsx` (1184 líneas) y `HistoryView.tsx` (1072) en subcomponentes por ronda.
- Quitar duplicados:
  - La auditoría del rótulo (`HistoryView:275-303`).
  - `MOTIVO_UBICACION_LABEL` (usar el de `sheetMapper`).
  - `RespuestaBar` frente a `StackedBar`.
  - `isoDate` frente a `getCurrentDateISO`.
  - Umbrales de Braden en `config/braden.ts`.
- Tests con Vitest para `sheetMapper` (cantidad y orden de columnas contra las cabeceras), `sectorConfig` (rangos, exclusiones, `stepBed`), `patientValidation` y `dateUtils`.
- `scripts/seed-demo-stats.mjs`: borrarlo, o reescribirlo importando `sheetMapper` y sumando sondas y limpieza de filas TEST.
- `.env.example`: documentar la nueva configuración de producción (sin URL en el build).

---

## Fase 9 · Documentación

- `README.md` real:
  - Qué hace la app, las tres rondas y los sectores (incluidos UCE y RCA).
  - Instalación y variables.
  - Cómo publicar el Apps Script (Implementar › Nueva versión, permisos, disparador de las 16 h, Script Properties, token).
  - Cómo subir la versión y publicar la app.
- `directivas.md`: mover las imágenes en base64 a `docs/img/*.png` y referenciarlas.
- Sacar las directivas pegadas al final del README actual.

---

## Orden sugerido de entregas

| Entrega | Fases | Publicación |
|---|---|---|
| 1 | 1.1, 1.3, 2.1, 2.3, 3.5 (puncionNoVisible), 4.1 | GAS + App |
| 2 | 3.1, 3.2, 3.3, 3.4, 2.2 | GAS + App (incluye migrar el Sheet) |
| 3 | 1.2, 6 | GAS + App |
| 4 | 4.2-4.4, 5 | App (+ GAS si hay que ajustar "rótulo completo") |
| 5 | 7, 8, 9 | App |

Cada entrega termina con `tsc`, lint, tests, `vite build`, prueba manual de las tres rondas y subida de versión (patch o minor).
