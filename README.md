# Planilla Enfermera

PWA para relevar pacientes en la recorrida de enfermería del turno de 8:00 a 16:00 hs. Funciona sin conexión, guarda primero en el dispositivo y sincroniza cada registro con una planilla de Google Sheets a través de un Google Apps Script.

## Qué hace

Tres rondas, cada una con su formulario y su hoja en el Sheet:

| Ronda | Hoja del Sheet | Qué se releva |
|---|---|---|
| 1 · Vías periféricas | `Acceso Periférico` | Acceso periférico o alternativo (central, percutáneo), ubicación, rótulo (fecha, nombre, legajo, enfermero, turno, ABB), visibilidad, fijación, conectores, signos, infusión |
| 2 · LPP | `UPP` | Lesiones por presión: área cerrada, ubicación, grados, tratamiento, dispositivos de apoyo, Braden, nutrición, colchón |
| 3 · Sondas vesicales | `Sondas Vesicales` | Fr, lúmenes, fijación, ubicación |

Cada cama puede marcarse como libre o con el paciente ausente (quirófano, quimio, diálisis, estudio, traslado): se guarda sin el resto del formulario y las estadísticas la excluyen.

Además:
- **Estadísticas**: se leen del Sheet (no del dispositivo), con filtros por fecha, sector y ronda.
- **Historial**: registros del dispositivo con su estado de sincronización.
- **Cierre de turno**: envía los pendientes y pide al script el reporte por mail. Los destinatarios están fijos en `Code.gs` y no se pueden ver ni cambiar desde la app.

### Sectores

`PB`, `1° Piso`, `Maternidad`, `A`–`E` (habitaciones con hasta 4 camas; rangos y exclusiones en [`src/config/sectorConfig.ts`](src/config/sectorConfig.ts)), `UCE` (8 camas) y `RCA` (12 boxes y 4 sillones). Los rangos de habitaciones están repetidos en `Code.gs` (`SECTOR_ROOM_CONFIG`) para calcular la capacidad: si cambian, hay que cambiarlos en los dos lugares.

Los requerimientos originales están en [`docs/directivas.md`](docs/directivas.md).

## Desarrollo

Requisitos: Node 20 o superior.

```bash
npm install
npm run dev       # servidor local con recarga
npm test          # pruebas (Vitest), incluida la simulación de Code.gs
npm run lint      # ESLint
npm run build     # tipos + build de producción en dist/
npm run preview   # sirve dist/ localmente
```

En `localhost` no se registra el service worker, para que la caché no tape los cambios.

### Variables

`.env` (ver [`.env.example`](.env.example)):

| Variable | Uso |
|---|---|
| `VITE_WEBHOOK_URL` | URL del Apps Script **solo para desarrollo**. En producción dejala vacía: todo lo que empieza con `VITE_` queda dentro del JavaScript público. La URL y la clave se cargan una vez en Ajustes (⚙️) y quedan en el dispositivo. |

Si en Ajustes se deja la URL vacía, la app trabaja solo en el dispositivo aunque exista `VITE_WEBHOOK_URL`.

## Estructura

```
src/
  App.tsx                     pantalla principal, atajos de teclado, guardado
  components/
    forms/                    formularios de las tres rondas
    history/                  Historial (lista, detalle por ronda)
    stats/                    Estadísticas (filtros, gráficos, secciones)
    common/                   cabecera del paciente, modales, avisos
  config/                     sectores, turno, rótulo y Braden, versión
  services/
    sheetMapper.ts            formulario → fila del Sheet (nombres de columna)
    storageService.ts         localStorage: historial, contexto, ajustes, CSV
    webhookService.ts         envío, confirmación (ACK), deshacer, reporte, estadísticas
  utils/                      fechas, validaciones, teclado, service worker
google-apps-script/
  Code.gs                     webhook, reporte por mail y estadísticas
  tests/                      simulación de Google Sheets para probar Code.gs
sw/sw.js                      plantilla del service worker (el build genera dist/sw.js)
```

## Sincronización con el Sheet

1. Al guardar, el registro va primero al historial del dispositivo con un id único.
2. La app lo envía por `POST` al Apps Script. Con `mode: no-cors` la respuesta no se puede leer, así que el registro queda **Enviado, sin confirmar**.
3. Unos segundos después la app pregunta por JSONP (`GET ?action=ACK&ids=...`) qué ids están en el Sheet. Los encontrados pasan a **En el Sheet**; los que no, a **Falló** y se reenvían.
4. Los reenvíos no duplican filas: el script ignora un id que ya existe (columna `ID Registro`).
5. Se sincroniza al abrir la app, al volver la conexión, al cerrar Ajustes, con **Sincronizar** en el Historial y antes del reporte de cierre.

Los registros sin confirmar no se borran nunca solos: el historial conserva como máximo 200 registros ya confirmados y todos los pendientes. **Nuevo día** borra solo lo confirmado.

**Deshacer** (y borrar desde el Historial) también borra la fila del Sheet, salvo que ya se haya enviado en un reporte por mail.

## Google Apps Script

### Instalación

1. Abrí la planilla › **Extensiones › Apps Script** y pegá [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
2. **Configuración del proyecto**: zona horaria `America/Argentina/Buenos_Aires`. En la planilla, **Archivo › Configuración**: configuración regional Argentina y la misma zona horaria.
3. **Configuración del proyecto › Propiedades del script**: agregá `API_TOKEN` con una clave larga. Sin esa propiedad el webhook acepta llamadas de cualquiera.
4. **Implementar › Nueva implementación** › tipo **Aplicación web**, ejecutar como vos, acceso **Cualquier usuario**. Copiá la URL.
5. En la app, **Ajustes (⚙️)**: pegá la URL y la clave, y tocá **Probar conexión**.
6. En la planilla, menú **🏥 Planilla Enfermera**:
   - **Verificar / Inicializar Hojas y Cabeceras**: crea las hojas y pone en formato texto fecha, habitación, cama, HC e id.
   - **Programar Envío Automático Diario (16:00 hs)**: opcional.

### Actualizar el script

Cada cambio en `Code.gs`: pegarlo y **Implementar › Administrar implementaciones › editar › Nueva versión** (la URL no cambia). Subí `SCRIPT_VERSION` en `Code.gs` y en [`src/config/version.ts`](src/config/version.ts); la app avisa en Estadísticas si no coinciden. Publicá primero el script y después la app.

### Columnas

El script lee y escribe **por nombre de columna**, no por posición: se pueden reordenar columnas en la planilla sin romper nada. Las columnas nuevas se agregan al final. La app manda los nombres en cada registro; las listas están en `sheetMapper.ts` y deben coincidir con `HEADERS_*` de `Code.gs` (lo verifica `npm test`).

### Pasar de la versión 1.2 a la 1.3

Hacelo en este orden:

1. **Script primero.** Pegá el Code.gs 1.3 y publicá una nueva versión *sin* crear todavía `API_TOKEN`. El script nuevo acepta los registros de la app vieja. Al revés no: la app 1.3 contra el script 1.2 pierde el estado de cama de Sondas, no puede confirmar registros y no puede cerrar el turno.
2. **URL en Ajustes.** En cada dispositivo abrí Ajustes y tocá **Guardar Configuración** con la URL cargada. La v1.2 tomaba la URL del build; la 1.3 se publica sin ella. Si no se guarda, el dispositivo pasa a "Modo Local": los registros se guardan en el celular y se envían recién cuando se configura la URL.
3. **App después.** Publicá la app 1.3 y en cada dispositivo tocá **Actualizar** en el aviso de versión nueva.
4. **Clave al final.** Recién cuando todos los dispositivos estén en la 1.3, creá `API_TOKEN` y cargala en Ajustes. La app vieja no ve el rechazo del script y daría por enviados registros que no llegaron.

Además:

- Las hojas existentes reciben al final las columnas `ID Registro` (las tres) y `Estado Cama` (Sondas) la primera vez que llega un registro, o con **Verificar / Inicializar Hojas**.
- Si la planilla estuvo en configuración regional EE.UU., algunas fechas se guardaron como fecha con día y mes invertidos. Hacé una copia de la planilla y usá **📅 Normalizar fechas a texto** (pregunta si hay que invertir día y mes).

### Destinatarios del reporte

Constante `RECIPIENTS` en `Code.gs`. El script ignora cualquier lista enviada por la app.

## Publicar una versión

1. Subí `version` en `package.json` (es la única fuente: llega a la app y al service worker).
2. `npm test && npm run build`.
3. Publicá el contenido de `dist/` en el hosting.

El service worker sirve `index.html` primero desde la red, así un deploy nuevo nunca deja la app apuntando a archivos viejos. Cuando detecta una versión nueva, la app muestra **Hay una versión nueva · Actualizar**.
