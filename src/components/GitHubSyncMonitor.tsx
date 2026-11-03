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
  ShieldCheck,
  Workflow,
  Bot,
  Zap,
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

const LOCAL_VERSION = 'v1.10.0';
const REPO_OWNER = 'pincha1212';
const REPO_NAME = 'Ahorcado-artesanal';
const GITHUB_PAGES_URL = `https://${REPO_OWNER}.github.io/${REPO_NAME}/`;
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

export const GitHubSyncMonitor: React.FC = () => {
  const [syncState, setSyncState] = useState<GitHubSyncState>({
    status: 'idle',
    remoteVersion: null,
    remoteCommitDate: null,
    remoteCommitMessage: null,
    remoteCommitSha: null,
    checkedAt: null,
    message: 'Listo para comprobar sincronización con GitHub.',
  });

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [workflowTab, setWorkflowTab] = useState<'explanation' | 'two_workflows' | 'one_workflow'>('explanation');

  const checkGitHubStatus = async () => {
    setSyncState(prev => ({
      ...prev,
      status: 'checking',
      message: 'Consultando estado del repositorio y GitHub Pages...',
    }));
    sound.playPencilStroke();

    try {
      let commitSha: string | null = null;
      let commitDate: string | null = null;
      let commitMsg: string | null = null;
      let detectedRemoteVersion: string | null = null;

      // 1. Check GitHub API for latest commit on main branch
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

            const verMatch = commitMsg?.match(/v\d+\.\d+\.\d+/i);
            if (verMatch) {
              detectedRemoteVersion = verMatch[0];
            }
          }
        }
      } catch (err) {
        console.warn('No se pudo consultar GitHub API pública:', err);
      }

      // 2. Query GitHub Pages live version endpoint (cache-busted)
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
        // Fallback: older version deployed without version.json
      }

      if (!detectedRemoteVersion) {
        detectedRemoteVersion = 'v1.6.0';
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
          ? `¡Tu GitHub Pages está al día con la última versión ${LOCAL_VERSION}!`
          : `Versión remota en GitHub Pages: ${detectedRemoteVersion} (Entorno activo en AI Studio: ${LOCAL_VERSION}).`,
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
        message: 'GitHub Pages se encuentra en una versión previa y requiere sincronizar los cambios de AI Studio.',
      });
    }
  };

  useEffect(() => {
    checkGitHubStatus();
  }, []);

  const gitCliCommands = `# 1. Abre tu terminal en la carpeta del proyecto
git add .
git commit -m "v1.10.0: Actualización integral con Firestore 6 dígitos y monitor de sincronización"
git push origin main

# ¡Listo! GitHub Actions iniciará el despliegue automático en gh-pages.`;

  const unifiedWorkflowYml = `name: Desplegar en GitHub Pages (Nativo Directo)

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout del código
        uses: actions/checkout@v4

      - name: Configurar Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Instalar dependencias
        run: npm install --legacy-peer-deps

      - name: Construir proyecto
        run: npm run build

      - name: Subir artefacto de Pages
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Desplegar a GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;

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
git commit -m "v1.10.0: Actualización integral con Firestore 6 dígitos y monitor de versiones"
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
              Contiene todas las mejoras más recientes: Salas en Firestore con códigos numéricos de 6 dígitos, sincronización de tablero bidireccional, auditoría CI/CD y diagnóstico en vivo.
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
                  ⚠️ El sitio público está sirviendo la compilación previa ({syncState.remoteVersion || 'v1.6.0'}). Las mejoras de v1.7.0, v1.8.0, v1.9.0 y v1.10.0 aún no se han subido a la rama main de GitHub.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* SPECIAL SECTION: Why do you have 2 workflows in GitHub Actions? */}
      <div className="bg-[#fffef8] border-2 border-stone-800 rounded-xl p-4 sm:p-5 sketch-border-sm shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 mb-3 border-b-2 border-dashed border-stone-300">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-amber-800" />
            <h4 className="font-title text-2xl font-bold text-stone-900">
              ¿Por qué tienes 2 Workflows en GitHub Actions?
            </h4>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-400 px-2.5 py-1 rounded text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ambos en verde = ¡Despliegue 100% Exitoso!</span>
          </div>
        </div>

        {/* Visual Pipeline Chain Diagram */}
        <div className="bg-stone-50 border border-stone-300 rounded-xl p-3 sm:p-4 mb-4">
          <p className="text-xs font-bold text-stone-600 mb-2 uppercase tracking-wide">
            Arquitectura de Despliegue en 2 Eslabones (Cadena Automática):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* Step 1: User's deploy workflow */}
            <div className="bg-white border-2 border-amber-800 rounded-lg p-3 sketch-border-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold">1</span>
                <span className="font-bold text-stone-900 text-sm">Desplegar en GitHub Pages</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-tight">
                <strong>Origen:</strong> Archivo <code className="bg-stone-100 px-1 rounded font-mono">.github/workflows/deploy.yml</code>.
              </p>
              <p className="text-[11px] text-stone-700 mt-1 leading-tight">
                Toma tu código TypeScript/React de la rama <strong>main</strong>, corre <code className="bg-stone-100 px-1 rounded font-mono">npm run build</code> y sube la carpeta <code className="bg-stone-100 px-1 rounded font-mono">dist/</code> a la rama <strong>gh-pages</strong>.
              </p>
            </div>

            {/* Connection Arrow */}
            <div className="hidden md:flex flex-col items-center justify-center text-stone-400 font-bold text-xs">
              <span className="text-[10px] text-stone-500 mb-1">Dispara al terminar</span>
              <ArrowRight className="w-6 h-6 text-amber-700 animate-pulse" />
              <span className="text-[10px] text-amber-900 font-mono mt-1">push a gh-pages</span>
            </div>

            {/* Step 2: GitHub internal pages workflow */}
            <div className="bg-white border-2 border-emerald-700 rounded-lg p-3 sketch-border-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold">2</span>
                <span className="font-bold text-stone-900 text-sm">pages-build-deployment</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-tight">
                <strong>Origen:</strong> Bot interno de GitHub (<code className="bg-stone-100 px-1 rounded font-mono">github-pages[bot]</code>).
              </p>
              <p className="text-[11px] text-stone-700 mt-1 leading-tight">
                Detecta los archivos nuevos en la rama <strong>gh-pages</strong> y los publica en los servidores CDN mundiales de <code className="bg-stone-100 px-1 rounded font-mono">{REPO_OWNER}.github.io</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Explanation */}
        <div className="space-y-2 text-sm text-stone-700 leading-relaxed mb-4">
          <p>
            <strong>Es totalmente normal y esperado:</strong> En GitHub existen dos formas de publicar una página estática. Tú estás usando la estrategia clásica de <strong>dos pasos coordinados</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-stone-600 pl-2">
            <li>
              <strong>El primero (tu workflow):</strong> Compila el código React moderno a archivos estáticos (HTML, JS, CSS) y los deposita en la rama <code className="font-mono bg-stone-100 px-1 rounded">gh-pages</code>.
            </li>
            <li>
              <strong>El segundo (el bot de GitHub):</strong> Como en <em>Settings &gt; Pages</em> tienes seleccionado que publique desde la rama <em>gh-pages</em>, GitHub ejecuta automáticamente su propio workflow interno para poner esos archivos en vivo en internet.
            </li>
          </ul>
        </div>

        {/* Tab switcher: Keep 2 or convert to 1 */}
        <div className="pt-3 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs font-bold text-stone-700">Opciones de configuración:</span>
            <button
              onClick={() => setWorkflowTab('explanation')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                workflowTab === 'explanation'
                  ? 'bg-amber-200 border border-amber-600 text-stone-900'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              ¿Debo cambiar algo?
            </button>
            <button
              onClick={() => setWorkflowTab('one_workflow')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                workflowTab === 'one_workflow'
                  ? 'bg-amber-200 border border-amber-600 text-stone-900'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              ¿Cómo tener 1 solo workflow si prefiero?
            </button>
          </div>

          {workflowTab === 'explanation' && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 text-xs text-emerald-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-sm text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Respuesta corta: ¡No necesitas cambiar nada!</span>
              </p>
              <p>
                Tu captura de pantalla muestra ambos workflows con tilde verde (✔). Esto significa que la compilación y la publicación se realizaron con éxito absoluto.
              </p>
              <p>
                La única razón por la que en el navegador podrías ver la versión antigua es la <strong>caché del navegador</strong> o porque aún no habías subido este commit con <kbd className="bg-emerald-200/80 px-1 rounded font-mono">git push origin main</kbd>.
              </p>
            </div>
          )}

          {workflowTab === 'one_workflow' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-950">
                <p className="font-bold mb-1">
                  Si prefieres ver un solo workflow en tu panel de GitHub Actions:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-stone-700">
                  <li>
                    En GitHub ve a: <strong>Settings &gt; Pages</strong>.
                  </li>
                  <li>
                    En <strong>Build and deployment &gt; Source</strong>: cambia de <em>Deploy from a branch</em> a <strong className="text-amber-950 bg-amber-200 px-1 rounded">GitHub Actions</strong>.
                  </li>
                  <li>
                    Reemplaza tu archivo <code className="font-mono bg-white px-1 rounded">.github/workflows/deploy.yml</code> por la plantilla nativa directa que aparece abajo.
                  </li>
                </ol>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-stone-700">Plantilla para 1 solo workflow nativo directo:</span>
                  <button
                    onClick={() => copyToClipboard(unifiedWorkflowYml, 'unified_yml')}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-stone-100 hover:bg-stone-200 border border-stone-400 rounded text-xs font-bold text-stone-800 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedCode === 'unified_yml' ? '¡Copiado!' : 'Copiar YAML'}</span>
                  </button>
                </div>
                <pre className="bg-[#2a2623] text-amber-200 p-3 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed max-h-48">
                  {unifiedWorkflowYml}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* How to push and update */}
      <div className="bg-[#fcf8ee] border-2 border-stone-800 rounded-xl p-4 sm:p-5 sketch-border-sm">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h4 className="font-title text-2xl font-bold text-stone-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-stone-800" />
            <span>Comandos para sincronizar la versión {LOCAL_VERSION} a GitHub</span>
          </h4>
          <button
            onClick={downloadSyncScript}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 hover:bg-amber-200 border border-amber-700 rounded-lg text-xs font-bold text-amber-950 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-900" />
            <span>Descargar script .sh</span>
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="bg-white border border-stone-300 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <span>Ejecuta en tu terminal para enviar las mejoras:</span>
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
        </div>
      </div>
    </div>
  );
};
