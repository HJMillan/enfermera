import { Bandage, Droplets, ShieldAlert, Syringe } from 'lucide-react';
import type { StatsAlerta, StatsPayload, StatsSondasBlock, StatsUppBlock, StatsViasBlock } from '../../types/stats';
import { formatPlace } from '../../config/sectorConfig';
import { BRADEN } from '../../config/clinical';
import { ChartBlock, CountTile, Donut, HBar, RespuestaBar, StackedBar, StatsSection } from './StatsCharts';
import {
  ALERT_COLOR,
  BRADEN_TEXT,
  DISP_LABEL,
  GRADO_HINT,
  INFUSION_LABEL,
  NUT_LABEL,
  UPP_UBIC,
  VIA_UBIC,
  displayAlertTipo,
  groupAlertas,
  pct,
  rename,
} from './statsUtils';

export function ViasSection({ vias }: { vias: StatsViasBlock }) {
  const noEval = vias.noEvaluables || 0;
  const evaluables = Math.max(0, vias.evaluadas - noEval);
  const rotuloDen = vias.rotuloCompleto + vias.rotuloIncompleto;
  const infusiones = vias.infusiones.filter((t) => t.count > 0);
  const ubicaciones = vias.ubicaciones.filter((u) => u.count > 0);

  return (
    <StatsSection
      title="Cómo están las vías"
      icon={<Syringe className="w-4 h-4 text-sky-700" />}
      help="Una cama, un dato: si se cargó más de una vez, cuenta la última. El catéter periférico es el del brazo o la pierna."
    >
      {vias.evaluadas === 0 ? (
        <p className="text-xs text-slate-600">No hay camas de vías en este recorte del archivo.</p>
      ) : (
        <div className="space-y-5">
          <div className="space-y-1">
            {/* Centro y leyenda usan el mismo total: camas con paciente (sin libres/ausentes). */}
            <Donut
              center={`${pct(vias.conPeriferico, evaluables)}%`}
              sub="brazo o pierna"
              slices={[
                { label: 'Catéter en brazo o pierna', value: vias.conPeriferico, color: '#0284c7', hint: 'Acceso periférico' },
                { label: 'Vía central', value: vias.central, color: '#4f46e5', hint: 'No se evalúa como periférico' },
                { label: 'Percutáneo', value: vias.percutaneo, color: '#7c3aed' },
                { label: 'Sin vía', value: vias.nada, color: '#94a3b8' },
              ]}
            />
            {noEval > 0 && (
              <p className="text-[11px] text-slate-500 font-medium">
                {noEval} cama{noEval === 1 ? '' : 's'} libre{noEval === 1 ? '' : 's'} o con el paciente ausente, fuera del porcentaje.
              </p>
            )}
          </div>

          {rotuloDen > 0 && (
            <ChartBlock title="Rótulo de la vía" help="Completo = fecha, nombre, legajo, enfermero, turno y ABB.">
              <StackedBar
                total={rotuloDen}
                segments={[
                  { label: 'Completo', value: vias.rotuloCompleto, color: '#059669' },
                  { label: 'Falta algún dato', value: vias.rotuloIncompleto, color: '#d97706' },
                ]}
              />
            </ChartBlock>
          )}

          {(vias.respuestas || []).some((r) => r.si + r.no + r.vacio > 0) && (
            <ChartBlock
              title="Rótulo y visibilidad: sí, no y vacío"
              help="Cada barra cuenta las camas donde esa pregunta correspondía. Vacío es cuando correspondía y no se marcó sí ni no."
            >
              <div className="space-y-3">
                {(vias.respuestas || []).map((item) => (
                  <RespuestaBar key={item.label} item={item} />
                ))}
              </div>
            </ChartBlock>
          )}

          {vias.conPeriferico > 0 && (
            <ChartBlock title={`Problemas del catéter (${vias.conPeriferico} periféricos)`}>
              <HBar label="Infiltración (se salió al tejido)" value={vias.infiltracion} total={vias.conPeriferico} color="#e11d48" />
              <HBar label="Piel enrojecida alrededor" value={vias.eritema} total={vias.conPeriferico} color="#f43f5e" />
              <HBar label="Sin retorno de sangre" value={vias.sinRetorno} total={vias.conPeriferico} color="#ea580c" />
              <HBar label="No se ve el punto de punción" value={vias.puncionNoVisible} total={vias.conPeriferico} color="#d97706" />
            </ChartBlock>
          )}

          {vias.conPeriferico > 0 && (
            <ChartBlock title="Cómo está pegada la curación">
              <StackedBar
                total={vias.conPeriferico}
                segments={[
                  {
                    label: 'Bien adherida',
                    value: Math.max(0, vias.conPeriferico - vias.adherenciaParcial - vias.adherenciaNula),
                    color: '#059669',
                  },
                  { label: 'A medias', value: vias.adherenciaParcial, color: '#64748b' },
                  { label: 'No pega', value: vias.adherenciaNula, color: '#334155' },
                ]}
              />
            </ChartBlock>
          )}

          {ubicaciones.length > 0 && (
            <ChartBlock title="Dónde está el catéter">
              {ubicaciones.map((u) => (
                <HBar key={u.label} label={rename(u.label, VIA_UBIC)} value={u.count} total={vias.conPeriferico} color="#0369a1" />
              ))}
            </ChartBlock>
          )}

          {infusiones.length > 0 && (
            <ChartBlock title="Cómo corre el suero">
              {infusiones.map((t) => (
                <HBar key={t.label} label={rename(t.label, INFUSION_LABEL)} value={t.count} total={vias.conPeriferico} color="#0ea5e9" />
              ))}
            </ChartBlock>
          )}
        </div>
      )}
    </StatsSection>
  );
}

export function UppSection({ upp }: { upp: StatsUppBlock }) {
  const noEval = upp.noEvaluables || 0;
  const pielSana = Math.max(0, upp.evaluadas - upp.conUpp - noEval);
  const bradenSinDato = Math.max(0, upp.conUpp - upp.bradenAlto - upp.bradenModerado - upp.bradenBajo);
  const nonZero = <T extends { count: number }>(list: T[]) => list.filter((x) => x.count > 0);

  return (
    <StatsSection
      title="Cómo está la piel"
      icon={<Bandage className="w-4 h-4 text-rose-700" />}
      help={`LPP (lesión por presión) = daño de la piel por quedar mucho tiempo en la misma posición. Cuanto más bajo el Braden, más riesgo (${BRADEN.altoMax} o menos es alto).`}
    >
      {upp.evaluadas === 0 ? (
        <p className="text-xs text-slate-600">No hay camas de piel en este recorte del archivo.</p>
      ) : (
        <div className="space-y-5">
          <div className="space-y-1">
            <Donut
              center={String(upp.conUpp)}
              sub={upp.conUpp === 1 ? 'cama con úlcera' : 'camas con úlcera'}
              slices={[
                { label: 'Con úlcera', value: upp.conUpp, color: '#e11d48' },
                { label: 'Piel sin úlcera', value: pielSana, color: '#059669' },
              ]}
            />
            {noEval > 0 && (
              <p className="text-[11px] text-slate-500 font-medium">
                {noEval} cama{noEval === 1 ? '' : 's'} libre{noEval === 1 ? '' : 's'} o con el paciente ausente, fuera del gráfico.
              </p>
            )}
          </div>

          {upp.conUpp > 0 && (
            <>
              <ChartBlock title="Qué tan profunda es">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['I', 'II', 'III', 'IV'] as const).map((g) => (
                    <div key={g} className="bg-rose-50 border border-rose-100 rounded-[var(--radius-sm)] p-2.5">
                      <span className="block text-[10px] font-extrabold text-rose-800">Grado {g}</span>
                      <span className="block text-xl font-black text-rose-950 tabular-nums">{upp.grados[g]}</span>
                      <span className="block text-[10px] font-medium text-rose-700 leading-tight">{GRADO_HINT[g]}</span>
                    </div>
                  ))}
                </div>
              </ChartBlock>

              <ChartBlock title="Riesgo Braden (solo camas con úlcera)">
                <StackedBar
                  total={upp.conUpp}
                  segments={[
                    { label: BRADEN_TEXT.alto, value: upp.bradenAlto, color: '#be123c' },
                    { label: BRADEN_TEXT.moderado, value: upp.bradenModerado, color: '#d97706' },
                    { label: BRADEN_TEXT.bajo, value: upp.bradenBajo, color: '#059669' },
                    { label: 'Sin puntaje', value: bradenSinDato, color: '#94a3b8' },
                  ]}
                />
              </ChartBlock>

              <ChartBlock title="Cuidados puestos">
                <HBar label="Ya está en tratamiento" value={upp.conTratamiento} total={upp.conUpp} color="#059669" />
                <HBar label="Pasó por área cerrada" value={upp.areaCerrada} total={upp.conUpp} color="#475569" />
                <HBar label="Colchón anti-escaras" value={upp.colchonSi} total={upp.conUpp} color="#0284c7" />
              </ChartBlock>
            </>
          )}

          {nonZero(upp.ubicaciones).length > 0 && (
            <ChartBlock title="Dónde está la úlcera">
              {nonZero(upp.ubicaciones).map((u) => (
                <HBar key={u.label} label={rename(u.label, UPP_UBIC)} value={u.count} total={upp.conUpp} color="#be123c" />
              ))}
            </ChartBlock>
          )}

          {nonZero(upp.tratamientos).length > 0 && (
            <ChartBlock title="Qué curación se está usando">
              {nonZero(upp.tratamientos).map((t) => (
                <HBar key={t.label} label={t.label} value={t.count} total={upp.conUpp} color="#fb7185" />
              ))}
            </ChartBlock>
          )}

          {nonZero(upp.dispositivos).length > 0 && (
            <ChartBlock title="Apoyos para aliviar presión">
              {nonZero(upp.dispositivos).map((d) => (
                <HBar key={d.label} label={rename(d.label, DISP_LABEL)} value={d.count} total={upp.conUpp} color="#6366f1" />
              ))}
            </ChartBlock>
          )}

          {nonZero(upp.nutricion).length > 0 && (
            <ChartBlock title="Cómo se alimenta">
              {nonZero(upp.nutricion).map((n) => (
                <HBar key={n.label} label={rename(n.label, NUT_LABEL)} value={n.count} total={upp.conUpp} color="#10b981" />
              ))}
            </ChartBlock>
          )}
        </div>
      )}
    </StatsSection>
  );
}

export function SondasSection({ sondas }: { sondas: StatsSondasBlock }) {
  return (
    <StatsSection
      title="Cómo están las sondas"
      icon={<Droplets className="w-4 h-4 text-teal-700" />}
      help="Una cama, un dato: si se cargó más de una vez, cuenta la última."
    >
      {sondas.evaluadas === 0 ? (
        <p className="text-xs text-slate-600">No hay camas de sondas en este recorte del archivo.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <CountTile label="Con sonda" value={sondas.conSonda} tone="teal" />
            <CountTile label="Sin sonda" value={sondas.sinSonda} tone="slate" />
            <CountTile label="2 lúmenes" value={sondas.lumenes2} tone="emerald" />
            <CountTile label="3 lúmenes" value={sondas.lumenes3} tone="amber" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CountTile label="Con fijación" value={sondas.fijacionSi} hint="Sobre las que tienen sonda" tone="emerald" />
            <CountTile
              label="Ubicación no correcta"
              value={sondas.ubicacionNo}
              hint="Nefrectomía, Bricker o nada"
              tone={sondas.ubicacionNo ? 'amber' : 'slate'}
            />
          </div>
        </div>
      )}
    </StatsSection>
  );
}

type Cobertura = NonNullable<StatsPayload['cobertura']>;

export function SectorsSection({
  cobertura,
  showVias,
  showUpp,
  showSondas,
}: {
  cobertura: Cobertura;
  showVias: boolean;
  showUpp: boolean;
  showSondas: boolean;
}) {
  const rows = cobertura.porSector.filter(
    (row) => row.viasUnicas > 0 || row.uppUnicas > 0 || (row.sondasUnicas ?? 0) > 0 || row.enfermeras > 0 || row.auxiliares > 0
  );

  return (
    <StatsSection title="Comparar sectores" help="La barra llena = todas las camas recorridas de ese sector en este recorte.">
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-xs text-slate-600">Nadie cargó camas en este recorte.</p>}
        {rows.map((row) => {
          const perifDen =
            typeof row.viasEvaluables === 'number' ? row.viasEvaluables : Math.max(0, row.viasUnicas - (row.noEvaluablesVias || 0));
          return (
            <div key={row.sector} className="rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50/70 p-3 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-extrabold text-slate-900 text-sm">{row.sector}</p>
                <p className="text-[11px] font-semibold text-slate-600">
                  {`${row.enfermeras} ${row.enfermeras === 1 ? 'enfermera' : 'enfermeras'} · ${row.auxiliares} ${row.auxiliares === 1 ? 'auxiliar' : 'auxiliares'}`}
                </p>
              </div>
              {showVias && (
                <HBar
                  label={`Catéter periférico (${row.conPeriferico} de ${perifDen} con paciente)`}
                  value={row.conPeriferico}
                  total={perifDen}
                  color="#0284c7"
                />
              )}
              {showVias && row.alertasVia > 0 && (
                <HBar label="Avisos de vía" value={row.alertasVia} total={row.viasUnicas} color="#d97706" />
              )}
              {showUpp && (
                <HBar label={`Con úlcera (${row.conUpp} de ${row.uppUnicas} camas)`} value={row.conUpp} total={row.uppUnicas} color="#e11d48" />
              )}
              {showUpp && row.bradenAlto > 0 && (
                <HBar label="Riesgo alto de úlcera" value={row.bradenAlto} total={row.uppUnicas} color="#be123c" />
              )}
              {showSondas && (
                <HBar
                  label={`Con sonda (${row.conSonda ?? 0} de ${row.sondasUnicas ?? 0} camas)`}
                  value={row.conSonda ?? 0}
                  total={row.sondasUnicas ?? 0}
                  color="#0f766e"
                />
              )}
            </div>
          );
        })}
      </div>
    </StatsSection>
  );
}

export function AlertsSection({ alertas, total }: { alertas: StatsAlerta[]; total: number }) {
  const shown = alertas.length;
  if (shown === 0) return null;
  const grupos = groupAlertas(alertas);

  return (
    <StatsSection
      title={`Qué hay que revisar (${shown}${total > shown ? ` de ${total}` : ''})`}
      icon={<ShieldAlert className="w-4 h-4 text-amber-500" />}
      help="Agrupado por tipo. La cama se muestra como sector · habitación · cama."
    >
      {total > shown && <p className="text-[11px] text-slate-600">Hay más en el archivo; se listan las primeras {shown}.</p>}
      <StackedBar
        total={shown}
        segments={grupos.map((g) => ({ label: g.tipo, value: g.count, color: ALERT_COLOR[g.tipo] || '#64748b' }))}
      />
      <div className="space-y-3">
        {grupos.map((g) => (
          <div key={g.tipo} className="space-y-1.5">
            <div>
              <p className="text-xs font-extrabold text-amber-950">
                {g.tipo} <span className="tabular-nums text-amber-800">· {g.count}</span>
              </p>
              {g.hint && <p className="text-[11px] font-medium text-slate-600">{g.hint}</p>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {alertas
                .filter((a) => displayAlertTipo(a.tipo) === g.tipo)
                .map((a, idx) => (
                  <span
                    key={`${a.tipo}-${a.sector}-${a.habitacion}-${a.cama}-${idx}`}
                    className="text-[11px] font-bold text-slate-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1"
                  >
                    {a.sector} · {formatPlace(a.sector, a.habitacion, a.cama)}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </StatsSection>
  );
}
