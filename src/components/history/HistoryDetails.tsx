import {
  AlertCircle,
  Activity,
  Bandage,
  Calendar,
  Check,
  Droplets,
  Eye,
  HeartPulse,
  Layers,
  LifeBuoy,
  ShieldAlert,
  Tag,
  X,
} from 'lucide-react';
import type { AccesoPerifericoForm, SondaVesicalForm, UppForm } from '../../types/form';
import { formatIsoDateDisplay } from '../../utils/dateUtils';
import { MOTIVO_UBICACION_LABEL } from '../../services/sheetMapper';
import { BRADEN_LABEL, bradenBand } from '../../config/clinical';
import { listFrom, rotuloAudit, ynBadgeClass, ynBadgeText, type YnState } from './historyUtils';

const CARD = 'bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2';
const CARD_HEAD = 'flex items-center justify-between border-b border-slate-100 pb-1.5';
const CARD_TITLE = 'font-bold text-slate-800 text-xs flex items-center gap-1.5';
const LABEL = 'text-[11px] font-bold text-slate-600 block';
const CHIP = 'text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200';

function RotuloItemMark({ label, state }: { label: string; state: YnState }) {
  const tone =
    state === 'si'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : state === 'no'
        ? 'bg-rose-50 text-rose-800 border-rose-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center justify-between border ${tone}`}>
      <span>{label}</span>
      {state === 'si' ? (
        <Check className="w-3 h-3 text-emerald-600" aria-label="sí" />
      ) : state === 'no' ? (
        <X className="w-3 h-3 text-rose-600" aria-label="no" />
      ) : (
        <span className="text-slate-500" aria-label="vacío">—</span>
      )}
    </span>
  );
}

function RotuloGrid({ data }: { data: AccesoPerifericoForm }) {
  const items = rotuloAudit(data);
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-1 pt-1">
      {items.map((it) => (
        <RotuloItemMark key={it.label} label={it.label} state={it.state} />
      ))}
    </div>
  );
}

function ChipList({ items, empty }: { items: string[]; empty: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.length > 0 ? (
        items.map((it) => (
          <span key={it} className={CHIP}>
            {it}
          </span>
        ))
      ) : (
        <span className="text-slate-600 italic text-[11px]">{empty}</span>
      )}
    </div>
  );
}

function Observaciones({ text, tone = 'slate' }: { text?: string; tone?: 'slate' | 'sky' | 'rose' }) {
  if (!text) return null;
  const tones = {
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    sky: 'bg-sky-50/60 border-sky-100 text-sky-900',
    rose: 'bg-rose-50/60 border-rose-100 text-rose-900',
  };
  return (
    <div className={`p-2.5 rounded-lg border space-y-0.5 ${tones[tone]}`}>
      <span className="font-bold text-[11px] block">Observaciones:</span>
      <p className="italic text-xs text-slate-700">{text}</p>
    </div>
  );
}

function YesNoTile({ label, value }: { label: string; value?: boolean }) {
  return (
    <div
      className={`p-2 rounded-md border flex items-center justify-between ${
        value ? 'bg-sky-50/80 border-sky-200 text-sky-900' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}
    >
      <span className="text-xs font-bold">{label}</span>
      <span className="text-[11px] font-extrabold">{value ? 'SÍ' : 'NO'}</span>
    </div>
  );
}

function SignTile({ active, onText, offText, danger = true }: { active?: boolean; onText: string; offText: string; danger?: boolean }) {
  const tone = active
    ? danger
      ? 'bg-rose-100 text-rose-800 border-rose-300'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : danger
      ? 'bg-slate-50 text-slate-700 border-slate-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';
  return <span className={`text-[10px] font-bold p-1.5 rounded text-center border ${tone}`}>{active ? onText : offText}</span>;
}

export function AccesoDetail({ data }: { data: AccesoPerifericoForm }) {
  if (!data.tieneAcceso) {
    return (
      <div className={`${CARD} space-y-2.5`}>
        <div className={CARD_HEAD}>
          <span className={CARD_TITLE}>Situación / Acceso Alternativo</span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            Sin Acceso Periférico
          </span>
        </div>

        {data.motivoAusente || data.tipoAccesoAlternativo === 'ausente' ? (
          <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Paciente Ausente / Cama: {data.motivoAusente || 'Libre'}</span>
          </div>
        ) : data.tipoAccesoAlternativo === 'acceso_central' ? (
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Tipo: Acceso Central</span>
            <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Ubicación: {data.accesoCentralUbicacion || 'S/D'}
            </span>
          </div>
        ) : data.tipoAccesoAlternativo === 'percutaneo' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Tipo: Catéter Percutáneo</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${ynBadgeClass(data.tieneRotulo)}`}>
                Rótulo: {ynBadgeText(data.tieneRotulo, 'SÍ (Colocado)', 'NO')}
              </span>
            </div>
            <RotuloGrid data={data} />
          </div>
        ) : (
          <div className="text-xs text-slate-600 font-semibold">Sin vía periférica ni accesos activos registrados.</div>
        )}

        <Observaciones text={data.observaciones} />
      </div>
    );
  }

  const ubicaciones = listFrom([
    data.ubicacionMSD && 'MSD (Brazo Der)',
    data.ubicacionMSI && 'MSI (Brazo Izq)',
    data.ubicacionMID && 'MID (Pierna Der)',
    data.ubicacionMII && 'MII (Pierna Izq)',
  ]);
  const fijacion = listFrom([
    data.fijacionTegaderm && 'Tegaderm',
    data.fijacionCinta &&
      (data.fijacionCintaTipo === 'transparente'
        ? 'Cinta transparente'
        : data.fijacionCintaTipo
          ? `Cinta (${data.fijacionCintaTipo})`
          : 'Cinta'),
    data.fijacionHipafix && 'Hipafix',
    data.fijacionVenda && 'Venda',
    data.fijacionContencionMecanica && 'Contención Mecánica',
  ]);
  const adhTone =
    data.fijacionAdherencia === 'total'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : data.fijacionAdherencia === 'parcial'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-rose-50 text-rose-800 border-rose-200';

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className={CARD}>
          <div className={CARD_HEAD}>
            <span className={CARD_TITLE}>
              <Tag className="w-3.5 h-3.5 text-sky-700" />
              Vía y Rótulo de Identificación
            </span>
            <span className="text-[10px] font-extrabold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              {data.cuantas || 1} {data.cuantas === 1 ? 'vía' : 'vías'}
            </span>
          </div>
          <div>
            <span className={`${LABEL} mb-1`}>Ubicación anatómica:</span>
            <ChipList items={ubicaciones} empty="-" />
          </div>
          <div className="pt-1.5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-600">Rótulo:</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${ynBadgeClass(data.tieneRotulo)}`}>
                {ynBadgeText(data.tieneRotulo, 'SÍ (Colocado)', 'NO (Sin rótulo)')}
              </span>
            </div>
            <RotuloGrid data={data} />
          </div>
        </div>

        <div className={CARD}>
          <div className={CARD_HEAD}>
            <span className={CARD_TITLE}>
              <Eye className="w-3.5 h-3.5 text-sky-700" />
              Inspección y Fijación
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1 border ${
                data.visibilidad === true
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : data.visibilidad === false
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {data.visibilidad === true ? 'Punto visible' : data.visibilidad === false ? 'No visible' : 'Vacío'}
            </span>
          </div>
          <div>
            <span className={`${LABEL} mb-1`}>Materiales de fijación:</span>
            <ChipList items={fijacion} empty="Sin fijación declarada" />
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-600">Adherencia:</span>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded uppercase border ${adhTone}`}>
              {data.fijacionAdherencia || '-'}
            </span>
          </div>
        </div>

        <div className={CARD}>
          <div className={CARD_HEAD}>
            <span className={CARD_TITLE}>
              <Layers className="w-3.5 h-3.5 text-sky-700" />
              Conectores
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <YesNoTile label="Llave 3 vías" value={data.lumenesLlave3Vias} />
            <YesNoTile label="Tapón multif." value={data.lumenesTaponMultifuncion} />
          </div>
        </div>

        <div className={CARD}>
          <div className={CARD_HEAD}>
            <span className={CARD_TITLE}>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              Evaluación Clínica e Infusión
            </span>
            <span className="text-[11px] font-extrabold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 capitalize flex items-center gap-1">
              <Activity className="w-3 h-3 text-sky-700" />
              {data.infusionType || 'Sin infusión'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <SignTile active={data.caracteristicasInfiltracion} onText="Infiltración" offText="Sin infiltración" />
            <SignTile active={data.caracteristicasEritematoso} onText="Eritematoso" offText="Sin eritema" />
            <SignTile active={data.caracteristicasRetorno} onText="Retorno venoso" offText="Sin retorno" danger={false} />
          </div>
        </div>
      </div>

      <Observaciones text={data.observaciones} tone="sky" />
    </div>
  );
}

export function SondaDetail({ data }: { data: SondaVesicalForm }) {
  const motivo = MOTIVO_UBICACION_LABEL[data.ubicacionMotivo || ''] || '';
  return (
    <div className={CARD}>
      <div className="flex items-center justify-between">
        <span className={CARD_TITLE}>
          <Droplets className="w-3.5 h-3.5 text-teal-700" />
          Sonda vesical
        </span>
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
          {data.motivoAusente || (data.tieneSonda === 'SI' ? 'Con sonda' : 'Sin sonda')}
        </span>
      </div>
      {data.tieneSonda === 'SI' && !data.motivoAusente && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className={LABEL}>Fr:</span>
            <span className="font-semibold text-slate-800">{data.numeroSonda || '-'}</span>
          </div>
          <div>
            <span className={LABEL}>Lúmenes:</span>
            <span className="font-semibold text-slate-800">{data.lumenes || '-'}</span>
          </div>
          <div>
            <span className={LABEL}>Fijación:</span>
            <span className="font-semibold text-slate-800">{data.fijacion || '-'}</span>
          </div>
          <div>
            <span className={LABEL}>Ubicación:</span>
            <span className="font-semibold text-slate-800">
              {data.ubicacionCorrecta === 'NO' ? `NO${motivo ? ` (${motivo})` : ''}` : data.ubicacionCorrecta || '-'}
            </span>
          </div>
        </div>
      )}
      <Observaciones text={data.observaciones} />
    </div>
  );
}

export function UppDetail({ data }: { data: UppForm }) {
  if (!data.tieneUpp) {
    return (
      <div className={CARD}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 text-xs">Evaluación de Piel</span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            {data.motivoAusente ? `Cama / Paciente: ${data.motivoAusente}` : 'Piel Íntegra / Sin LPP'}
          </span>
        </div>
        <Observaciones text={data.observaciones} />
      </div>
    );
  }

  const ubicaciones = listFrom([
    data.ubicacionSacra && 'Sacra',
    data.ubicacionTalon && 'Talón',
    data.ubicacionGluteo && 'Glúteo',
    data.ubicacionPosterior && 'Posterior',
    data.ubicacionOtro?.trim(),
  ]);
  const grados = listFrom([data.gradoI && 'I', data.gradoII && 'II', data.gradoIII && 'III', data.gradoIV && 'IV']).join(', ');
  const tratamientos = data.tratamientos?.length ? data.tratamientos.join(', ') : data.tipoTratamiento || '-';
  const dispositivos = data.tieneDispositivoApoyo
    ? listFrom([data.dispositivoAro && 'Aro', data.dispositivoGuantesAgua && 'Guantes con agua', data.dispositivoOtro]).join(', ') || 'SÍ'
    : 'NO';
  // `nutricion` como texto suelto viene de registros de versiones anteriores.
  const nutricion =
    listFrom([
      (data.nutricionOral || data.nutricion === 'oral') && 'Oral',
      (data.nutricionNpt || data.nutricion === 'NPT') && 'NPT',
      (data.nutricionEnteralSn || data.nutricion === 'enteral SN') && 'Enteral SN',
      (data.nutricionEnteralBg || data.nutricion === 'enteral BG') && 'Enteral BG',
    ]).join(', ') ||
    data.nutricion ||
    '-';
  const band = data.escalaBraden !== undefined ? bradenBand(data.escalaBraden) : null;
  const bandTone = {
    alto: 'bg-rose-100 text-rose-800 border-rose-200',
    moderado: 'bg-amber-100 text-amber-800 border-amber-200',
    bajo: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className={CARD}>
          <div className={CARD_HEAD}>
            <span className={CARD_TITLE}>
              <Calendar className="w-3.5 h-3.5 text-rose-700" />
              Ingreso y Procedencia
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className={LABEL}>Fecha Ingreso:</span>
              <span className="font-semibold text-slate-800">
                {data.fechaIngreso ? formatIsoDateDisplay(data.fechaIngreso) : '-'}
              </span>
            </div>
            <div>
              <span className={LABEL}>Área Cerrada:</span>
              <span className="font-semibold text-slate-800">
                {data.pasoAreaCerrada ? `SÍ ${data.areaCerradaCual ? `(${data.areaCerradaCual})` : ''}` : 'NO'}
              </span>
            </div>
          </div>
        </div>

        <div className={CARD}>
          <div className={CARD_HEAD}>
            <span className={CARD_TITLE}>
              <Bandage className="w-3.5 h-3.5 text-rose-700" />
              Lesiones y Ubicación
            </span>
            <span className="text-[10px] font-extrabold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {data.cuantas || 1} {data.cuantas === 1 ? 'lesión' : 'lesiones'}
            </span>
          </div>
          <div>
            <span className={`${LABEL} mb-1`}>Ubicación anatómica:</span>
            <ChipList items={ubicaciones} empty="No especificada" />
          </div>
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Grados:</span>
            <span className="text-[11px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {grados ? `Grado ${grados}` : 'Sin grado'}
            </span>
          </div>
        </div>

        <div className={CARD}>
          <div className={CARD_HEAD}>
            <span className={CARD_TITLE}>
              <LifeBuoy className="w-3.5 h-3.5 text-sky-700" />
              Tratamiento y Apoyo
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                data.tieneTratamiento
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {data.tieneTratamiento ? 'Tratamiento Activo' : 'Sin Tratamiento'}
            </span>
          </div>
          <div>
            <span className={`${LABEL} mb-0.5`}>Curación / Insumos:</span>
            <span className="text-xs text-slate-800 font-semibold block">{tratamientos}</span>
          </div>
          <div className="pt-1.5 border-t border-slate-100">
            <span className={`${LABEL} mb-0.5`}>Dispositivo de apoyo:</span>
            <span className="text-xs text-slate-800 font-semibold block">{dispositivos}</span>
          </div>
        </div>

        <div className={CARD}>
          <div className={CARD_HEAD}>
            <span className={CARD_TITLE}>
              <HeartPulse className="w-3.5 h-3.5 text-rose-700" />
              Braden, Nutrición y Cuidados
            </span>
            {band && (
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${bandTone[band]}`}>
                Braden: {data.escalaBraden} pts · {BRADEN_LABEL[band]}
              </span>
            )}
          </div>
          <div>
            <span className={`${LABEL} mb-0.5`}>Nutrición:</span>
            <span className="text-xs text-slate-800 font-semibold block">{nutricion}</span>
          </div>
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Colchón anti-escaras:</span>
            <span
              className={`text-[11px] font-extrabold px-2 py-0.5 rounded border ${
                data.colchonAntiEscaras
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {data.colchonAntiEscaras ? 'SÍ' : 'NO'}
            </span>
          </div>
          {data.observacionesColchon && (
            <div className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-200">
              Obs. colchón: {data.observacionesColchon}
            </div>
          )}
        </div>
      </div>

      <Observaciones text={data.observaciones} tone="rose" />
    </div>
  );
}
