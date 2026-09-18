import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Download, LifeBuoy } from 'lucide-react';
import { exportRecordsToCSV, getStoredRecords } from '../../services/storageService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error no controlado:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleExportBackup = () => {
    try {
      exportRecordsToCSV();
    } catch (e) {
      alert('Error al exportar respaldo: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  public render() {
    if (this.state.hasError) {
      const recordsCount = getStoredRecords().length;

      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 text-center animate-fade-in">
            <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-extrabold text-slate-900">
                Ocurrió un error inesperado
              </h1>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                La aplicación se detuvo para proteger los registros de enfermería.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs text-left flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <b>Tus datos están a salvo:</b> Hay <b>{recordsCount}</b> registros guardados en la memoria local de este dispositivo.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recargar Aplicación</span>
              </button>

              {recordsCount > 0 && (
                <button
                  type="button"
                  onClick={this.handleExportBackup}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Respaldo CSV</span>
                </button>
              )}
            </div>

            {this.state.error && (
              <details className="text-left pt-2 border-t border-slate-100">
                <summary className="text-[11px] font-bold text-slate-600 cursor-pointer hover:text-slate-800">
                  Ver detalle técnico para soporte de sistemas
                </summary>
                <pre className="mt-2 p-2.5 bg-slate-900 text-slate-100 text-[10px] font-mono rounded-lg overflow-x-auto max-h-36">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
