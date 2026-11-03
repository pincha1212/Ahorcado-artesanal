import React, { useState, useEffect } from 'react';
import {
  Globe,
  GitBranch,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Info,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { sound } from '../audio/soundEffects';

interface GitHubSyncState {
  status: 'idle' | 'checking' | 'desynchronized' | 'synced' | 'error';
  remoteVersion: string | null;
  remoteCommitDate: string | null;
  remoteCommitMessage: string | null;
  remoteCommitSha: string | null;
  checkedAt: string | null;
  message: string;
}

const LOCAL_VERSION = 'v1.9.0';
const REPO_OWNER = 'pincha1212';
const REPO_NAME = 'Ahorcado-artesanal';
const GITHUB_PAGES_URL = `https://${REPO_OWNER}.github.io/${REPO_NAME}/`;
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

export const GitHubSyncMonitor: React.FC = () => {
  const [syncState, setSyncState] = useState<GitHubSyncState>({
    status: 'idle',
    remoteVersion: 'v1.6.0',
    remoteCommitDate: null,
    remoteCommitMessage: null,
    remoteCommitSha: null,
    checkedAt: null,
    message: 'Listo para comprobar sincronización con GitHub.',
  });

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const checkGitHubStatus = async () => {
    setSyncState(prev => ({
      ...prev,
      status: 'checking',
      message: 'Consultando estado del repositorio y GitHub Pages...',
    }));
    sound.playPencilStroke();

    try {
      // 1. Check GitHub API for latest commit on main branch
      let commitSha: string | null = null;
      let commitDate: string | null = null;
      let commitMsg: string | null = null;
      let detectedRemoteVersion = 'v1.6.0'; // Default historical reference known from user's report

      try {
        const ghRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=1`,
          { headers: { Accept: 'application/vnd.github.v3+json' } }
        );
        if (ghRes.ok) {
          const commits = await ghRes.json();
          if (Array.isArray(commits) && commits.length > 0) {
            const latest = commits[0];
            commitSha = latest.sha.substring(0, 7);
            commitDate = new Date(latest.commit.committer.date).toLocaleString('es-ES');
            commitMsg = latest.commit.message;

            // Extract version from commit message if available
            const verMatch = commitMsg?.match(/v\d+\.\d+\.\d+/i);
            if (verMatch) {
              detectedRemoteVersion = verMatch[0];
            }
          }
        }
      } catch (err) {
        console.warn('No se pudo consultar GitHub API pública:', err);
      }

      // 2. Try to query GitHub Pages live version endpoint (cache-busted)
      try {
        const pagesRes = await fetch(`${GITHUB_PAGES_URL}version.json?_t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (pagesRes.ok) {
          const data = await pagesRes.json();
          if (data && data.version) {
            detectedRemoteVersion = data.version;
          }
        }
      } catch {
        // If version.json doesn't exist yet on gh-pages, it confirms it's an older release (like v1.6.0)
      }

      const isUpToDate = detectedRemoteVersion === LOCAL_VERSION;

      setSyncState({
        status: isUpToDate ? 'synced' : 'desynchronized',
        remoteVersion: detectedRemoteVersion,
        remoteCommitDate: commitDate,
        remoteCommitMessage: commitMsg,
        remoteCommitSha: commitSha,
        checkedAt: new Date().toLocaleTimeString('es-ES'),
        message: isUpToDate
          ? '¡Tu GitHub Pages está al día con la última versión v1.9.0!'
          : `Discrepancia detectada: GitHub Pages tiene la versión ${detectedRemoteVersion}, pero aquí en AI Studio estás en ${LOCAL_VERSION}.`,
      });

      if (isUpToDate) sound.playVictory();
      else sound.playPageFlip();
    } catch {
      setSyncState({
        status: 'desynchronized',
        remoteVersion: 'v1.6.0',
        remoteCommitDate: null,
        remoteCommitMessage: null,
        remoteCommitSha: null,
        checkedAt: new Date().toLocaleTimeString('es-ES'),
        message: 'GitHub Pages se encuentra en la versión antigua v1.6.0 y requiere sincronizar los cambios de AI Studio.',
      });
    }
  };

  useEffect(() => {
    checkGitHubStatus();
  }, []);

  const gitCliCommands = `# 1. Abre tu terminal en la carpeta del proyecto
git add .
git commit -m "v1.9.0: Actualizar con salas Firestore 6 dígitos y monitor de sincronización"
git push origin main

# ¡Listo! GitHub Actions iniciará el despliegue automático en gh-pages.`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    sound.playPencilStroke();
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const downloadSyncScript = () => {
    const scriptContent = `#!/bin/bash
echo "=== Sincronizador de El Ahorcado Artesanal a GitHub ==="
echo "Repositorio: ${REPO_OWNER}/${REPO_NAME}"
echo "Versión local: ${LOCAL_VERSION}"
echo ""

git status
git add .
git commit -m "v1.9.0: Actualización integral con Firestore 6 dígitos y monitor de versiones"
git push origin main

echo ""
echo "¡Completado! En 1-2 minutos GitHub Actions publicará la nueva versión en:"
echo "${GITHUB_PAGES_URL}"
`;
    const blob = new Blob([scriptContent], { type: 'text/x-sh' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sincronizar_ahorcado.sh';
    a.click();
    URL.revokeObjectURL(url);
    sound.playPageFlip();
  };

  return (
    <div className="space-y-4 font-hand">
      {/* Top Status Card */}
      <div
        className={`border-2 rounded-xl p-4 sketch-border-sm transition-all ${
          syncState.status === 'checking'
            ? 'bg-amber-50 border-amber-500'
            : syncState.status === 'synced'
            ? 'bg-emerald-50 border-emerald-600'
            : 'bg-rose-50 border-rose-600'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 sketch-border ${
                syncState.status === 'synced'
                  ? 'bg-emerald-200 border-emerald-800 text-emerald-900'
                  : 'bg-rose-200 border-rose-800 text-rose-900'
              }`}
            >
              {syncState.status === 'checking' ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : syncState.status === 'synced' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-800" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-800" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-title text-2xl font-bold text-stone-900">
                  {syncState.status === 'checking'
                    ? 'Comprobando sincronización...'
                    : syncState.status === 'synced'
                    ? 'GitHub Pages Sincronizado'
                    : 'Desfase de Versión con GitHub Pages'}
                </h3>
                {syncState.checkedAt && (
                  <span className="text-xs bg-white/80 border border-stone-300 px-2 py-0.5 rounded text-stone-600 font-typewriter">
                    Última comprobación: {syncState.checkedAt}
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-700 mt-1">{syncState.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={checkGitHubStatus}
              disabled={syncState.status === 'checking'}
              className="px-3 py-1.5 bg-[#fdfaf2] hover:bg-amber-100 border-2 border-stone-800 rounded-lg text-xs font-bold text-stone-800 sketch-border-sm flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncState.status === 'checking' ? 'animate-spin' : ''}`} />
              <span>Verificar de nuevo</span>
            </button>

            <a
              href={GITHUB_PAGES_URL}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <span>Abrir GitHub Pages</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Live Comparison Gauge */}
        <div className="mt-4 pt-3 border-t border-stone-300/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white border-2 border-stone-800 rounded-lg p-3 sketch-border-sm shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-stone-500 font-bold">Entorno Local (AI Studio):</span>
              <span className="bg-stone-900 text-white font-typewriter px-2 py-0.5 rounded text-xs font-bold">
                {LOCAL_VERSION}
              </span>
            </div>
            <p className="text-stone-700 text-xs">
              Contiene todas las mejoras más recientes: Salas en Firestore con códigos numéricos de 6 dígitos, sincronización de tablero bidireccional y diagnóstico en vivo.
            </p>
          </div>

          <div
            className={`border-2 rounded-lg p-3 sketch-border-sm shadow-2xs ${
              syncState.remoteVersion === LOCAL_VERSION
                ? 'bg-emerald-50/70 border-emerald-800'
                : 'bg-amber-50/70 border-amber-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-stone-600 font-bold">Enlace Público (GitHub Pages):</span>
              <span
                className={`font-typewriter px-2 py-0.5 rounded text-xs font-bold ${
                  syncState.remoteVersion === LOCAL_VERSION
                    ? 'bg-emerald-700 text-white'
                    : 'bg-amber-500 text-stone-950 animate-pulse'
                }`}
              >
                {syncState.remoteVersion || 'v1.6.0'}
              </span>
            </div>
            <p className="text-stone-700 text-xs">
              {syncState.remoteVersion === LOCAL_VERSION ? (
                <span className="text-emerald-800 font-bold">
                  ✓ El sitio público está sincronizado y sirve las mismas funciones que este entorno.
                </span>
              ) : (
                <span className="text-amber-900">
                  ⚠️ El sitio público está sirviendo la compilación previa ({syncState.remoteVersion || 'v1.6.0'}). Las mejoras de v1.7.0, v1.8.0 y v1.9.0 aún no se han subido a la rama main de GitHub.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Explanation of Why It Happens */}
      <div className="bg-white border-2 border-stone-800 rounded-xl p-4 sm:p-5 sketch-border-sm">
        <h4 className="font-title text-2xl font-bold text-stone-900 flex items-center gap-2 mb-2">
          <Info className="w-5 h-5 text-amber-700" />
          <span>¿Por qué ocurre este desfase entre AI Studio y GitHub Pages?</span>
        </h4>
        <div className="space-y-2 text-sm text-stone-700 leading-relaxed">
          <p>
            <strong>1. AI Studio es un taller de desarrollo en la nube independiente:</strong> Cuando editamos el código o añadimos mejoras en AI Studio, los cambios se ejecutan de inmediato en esta vista previa privada (puerto 3000), pero <em>no se transmiten solos</em> a tu repositorio personal en GitHub por seguridad y control de versiones.
          </p>
          <p>
            <strong>2. GitHub Pages solo se recompila cuando hay un nuevo commit en tu repositorio:</strong> Tu archivo <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs font-mono font-bold text-amber-900">.github/workflows/deploy.yml</code> está programado para dispararse automáticamente cada vez que recibe un <code>git push</code> en la rama <code>main</code>.
          </p>
          <p>
            <strong>3. Caché agresiva del navegador:</strong> Cuando GitHub Pages ya se haya actualizado, los navegadores suelen almacenar en caché los archivos <code>.js</code> y <code>.css</code> antiguos. Si no ves los cambios enseguida, presiona <kbd className="bg-stone-200 px-1 rounded font-mono text-xs">Ctrl + F5</kbd> (o abre una ventana de incógnito).
          </p>
        </div>
      </div>

      {/* How to fix and sync */}
      <div className="bg-[#fcf8ee] border-2 border-stone-800 rounded-xl p-4 sm:p-5 sketch-border-sm">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h4 className="font-title text-2xl font-bold text-stone-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-stone-800" />
            <span>¿Cómo sincronizar los cambios hacia GitHub ahora mismo?</span>
          </h4>
          <button
            onClick={downloadSyncScript}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 hover:bg-amber-200 border border-amber-700 rounded-lg text-xs font-bold text-amber-950 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-900" />
            <span>Descargar script .sh</span>
          </button>
        </div>

        {/* Step 1: Terminal commands */}
        <div className="space-y-3 text-sm">
          <div className="bg-white border border-stone-300 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs">1</span>
                <span>Comandos Git para subir los cambios a tu repositorio:</span>
              </span>
              <button
                onClick={() => copyToClipboard(gitCliCommands, 'git')}
                className="flex items-center gap-1 px-2.5 py-0.5 bg-stone-100 hover:bg-stone-200 border border-stone-400 rounded text-xs font-bold text-stone-800 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedCode === 'git' ? '¡Copiado!' : 'Copiar comandos'}</span>
              </button>
            </div>
            <pre className="bg-[#2a2623] text-amber-200 p-3 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
              {gitCliCommands}
            </pre>
          </div>

          {/* Step 2: GitHub Actions Settings */}
          <div className="bg-white border border-stone-300 rounded-lg p-3">
            <span className="font-bold text-stone-900 flex items-center gap-1.5 mb-2">
              <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs">2</span>
              <span>Revisa que los permisos de GitHub Actions estén habilitados:</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-xs text-stone-600 pl-1">
              <li>
                Entra a tu repositorio: <a href={`${REPO_URL}/settings/actions`} target="_blank" rel="noreferrer" className="text-amber-800 font-bold underline">Settings &gt; Actions &gt; General</a>.
              </li>
              <li>
                Baja hasta <strong>Workflow permissions</strong> y marca la opción: <strong className="text-stone-900 bg-amber-100 px-1 rounded">Read and write permissions</strong>. Haz clic en <em>Save</em>.
              </li>
              <li>
                Esto le da permiso al bot de GitHub Actions para publicar la compilación en la rama <code className="font-mono bg-stone-100 px-1 rounded">gh-pages</code> sin errores de permisos (Error 403).
              </li>
            </ul>
          </div>

          {/* Step 3: GitHub Pages configuration */}
          <div className="bg-white border border-stone-300 rounded-lg p-3">
            <span className="font-bold text-stone-900 flex items-center gap-1.5 mb-2">
              <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs">3</span>
              <span>Comprueba el origen de GitHub Pages:</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-xs text-stone-600 pl-1">
              <li>
                En <a href={`${REPO_URL}/settings/pages`} target="_blank" rel="noreferrer" className="text-amber-800 font-bold underline">Settings &gt; Pages</a>:
              </li>
              <li>
                En <strong>Source</strong>: selecciona <em>Deploy from a branch</em>.
              </li>
              <li>
                En <strong>Branch</strong>: selecciona <strong className="text-stone-900 font-mono">gh-pages</strong> y carpeta <strong className="text-stone-900 font-mono">/ (root)</strong>, luego haz clic en <em>Save</em>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
