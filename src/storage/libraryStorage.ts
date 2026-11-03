import { DEFAULT_WORDS, DEFAULT_CATEGORIES } from '../data/defaultWords';
import { WordItem, PlayerStats, DifficultyLevel, ModuleAuditStatus } from '../types/game';

const STORAGE_KEY_WORDS = 'ahorcado_words_v1';
const STORAGE_KEY_CATEGORIES = 'ahorcado_categories_v1';
const STORAGE_KEY_STATS = 'ahorcado_stats_v1';

export const APP_VERSIONS = [
  {
    version: 'v1.8.0',
    releaseDate: 'Nov 2026',
    title: 'Colección Games en Firestore con Códigos de 6 Dígitos y Sincronización Total',
    highlights: [
      'Creación de partidas en la colección games de Google Cloud Firestore con generación de código numérico de 6 dígitos (ej: 482910).',
      'Lógica de unión a sala mediante el código de 6 dígitos con validación estricta y control de cupo para 2 jugadores.',
      'Sincronización bidireccional en tiempo real del estado completo del tablero: letras elegidas (guessedLetters), intentos y trazos (mistakes), palabra oculta y revelada (displayWord).',
      'Bloqueo y control estricto de turnos en modo Por Turnos Alternados, impidiendo entradas fuera de turno con indicador visual de espera.',
      'Despliegue y validación de reglas de seguridad firestore.rules para la ruta /games/{gameId} con regex ^[0-9]{6}$.',
      'Actualización del esquema formal en firebase-blueprint.json registrando la colección /games/{gameId}.',
    ],
    auditedModules: [
      { id: 'mod-games-firestore-6dig', name: 'Gestor de Partidas /games en Firestore', version: '1.8.0', status: 'passed' as const, description: 'Generación de códigos numéricos de 6 dígitos y persistencia en colección games.', features: ['Código 6 dígitos numéricos', 'Colección /games', 'Validación 2 jugadores', 'onSnapshot sync'] },
      { id: 'mod-board-sync-realtime', name: 'Sincronizador de Tablero en Tiempo Real', version: '1.8.0', status: 'passed' as const, description: 'Sincronización instantánea de letras arriesgadas, intentos restantes y canvas de ahorcado.', features: ['guessedLetters sync', 'mistakes sync', 'displayWord sync', 'Control de turnos'] },
    ],
  },
  {
    version: 'v1.7.0',
    releaseDate: 'Nov 2026',
    title: 'Multijugador en la Nube con Google Cloud Firestore',
    highlights: [
      'Integración oficial de base de datos en la nube Google Cloud Firestore para partidas multijugador online.',
      'Sincronización bidireccional instantánea en tiempo real mediante listeners onSnapshot entre ambos jugadores.',
      'Esquema formal firebase-blueprint.json y despliegue de reglas de seguridad endurecidas firestore.rules.',
      'Módulo FirestoreRoomManager con arquitectura robusta de salas de 6 letras, validación y sincronización de puntajes.',
      'Compatibilidad universal: permite jugar a distancia entre móviles, PCs, tablets y despliegues en GitHub Pages sin servidor Express.',
      'Control defensivo de errores conforme a FirestoreErrorInfo y fallback de alta disponibilidad a WebRTC P2P.',
    ],
    auditedModules: [
      { id: 'mod-firestore-cloud', name: 'Gestor de Salas Cloud Firestore', version: '1.7.0', status: 'passed' as const, description: 'Sincronización en tiempo real sin servidor intermediario en la nube de Google.', features: ['Salas en Firebase', 'onSnapshot listeners', 'Gestión de turnos', 'Validación de letras'] },
      { id: 'mod-security-rules', name: 'Reglas de Seguridad y Blueprint Firestore', version: '1.7.0', status: 'passed' as const, description: 'Reglas ABAC desplegadas para control de acceso y estructura de salas.', features: ['firestore.rules', 'firebase-blueprint.json', 'handleFirestoreError', 'Prevención de trampas'] },
    ],
  },
  {
    version: 'v1.6.0',
    releaseDate: 'Nov 2026',
    title: 'Compatibilidad GitHub Pages & Multijugador P2P Sin Servidor',
    highlights: [
      'Multijugador Híbrido P2P WebRTC: permite jugar online en tiempo real en GitHub Pages sin necesidad de servidor backend.',
      'Resolución de error en GitHub Actions: compatibilidad con npm install y archivo package-lock.json sin fallos de caché.',
      'Configuración de rutas relativas (base: ./) para despliegue en cualquier subdirectorio de GitHub Pages.',
      'Flujo automatizado de GitHub Actions (.github/workflows/deploy.yml) para compilación y despliegue continuo en la rama gh-pages.',
      'Generador semántico híbrido con modo offline/estático automático si no existe servidor backend.',
      'Reparación de entrada de teclado físico para caracteres con diacríticos (Á, É, Í, Ó, Ú, Ü).',
      'Corrección en la fórmula de puntaje excluyendo espacios de letras descubiertas.',
      'Redimensionamiento reactivo en tiempo real del lienzo 2D en dispositivos móviles y rotación de pantalla.',
    ],
    auditedModules: [
      { id: 'mod-p2p-multiplayer', name: 'Motor Multijugador WebRTC P2P (PeerJS)', version: '1.6.0', status: 'passed' as const, description: 'Salas multijugador directas navegador-a-navegador para GitHub Pages.', features: ['Salas P2P por código', 'Enmascaramiento host', 'DataChannels WebRTC', 'BroadcastChannel local'] },
      { id: 'mod-gh-pages', name: 'Módulo de Despliegue GitHub Pages & CI/CD', version: '1.6.0', status: 'passed' as const, description: 'Rutas relativas, flujo GitHub Actions sin fallos de lockfile y compatibilidad SPA.', features: ['base: ./', 'Workflow deploy.yml', 'package-lock.json', 'Redirección 404 SPA'] },
      { id: 'mod-keyboard-fix', name: 'Controlador de Teclado Físico & Diacríticos', version: '1.6.0', status: 'passed' as const, description: 'Traducción de teclas físicas españolas con tildes a letras normalizadas.', features: ['Captura de Á/É/Í/Ó/Ú', 'Filtro de inputs', 'Fórmula limpia de puntaje'] },
    ],
  },
  {
    version: 'v1.5.0',
    releaseDate: 'Nov 2026',
    title: 'Acústica de Grafito Web Audio & Módulo de Auditoría',
    highlights: [
      'Sintetizador Web Audio API: sonido de fricción de grafito, chasquido de tiza y rasguño de error.',
      'Panel de Auditoría de Funciones para monitoreo y diagnóstico interactivo de submódulos.',
      'Control de volumen y silencio con persistencia local.',
    ],
    auditedModules: [
      { id: 'mod-audio', name: 'Motor de Audio Web Audio API', version: '1.5.0', status: 'passed' as const, description: 'Generación paramétrica sin archivos externos pesados.', features: ['Fricción grafito', 'Acorde victoria', 'Rasguño error', 'Volteo de página'] },
      { id: 'mod-audit', name: 'Sistema de Trazabilidad y Diagnóstico', version: '1.5.0', status: 'passed' as const, description: 'Inspección de contratos de software y registro de versiones.', features: ['Autodiagnóstico', 'Registro de hitos', 'Control de integridad'] },
    ],
  },
  {
    version: 'v1.4.0',
    releaseDate: 'Nov 2026',
    title: 'Multijugador Online en Tiempo Real',
    highlights: [
      'Salas privadas con código de 6 caracteres con sincronización backend.',
      'Protección anti-trampas: palabra secreta enmascarada del lado servidor.',
      'Modo Duelo, Por Turnos y Palabra Secreta entre amigos.',
    ],
    auditedModules: [
      { id: 'mod-online', name: 'Gestor de Salas Express', version: '1.4.0', status: 'passed' as const, description: 'Salas con códigos únicos, control de rondas y validación en servidor.', features: ['Códigos de 6 caracteres', 'Ocultamiento de palabra', 'Sincronización por polling/SSE'] },
    ],
  },
  {
    version: 'v1.3.0',
    releaseDate: 'Nov 2026',
    title: 'Multijugador Local "Pasa el Cuaderno"',
    highlights: [
      'Pasa el dispositivo entre 2 jugadores con pantalla de traspaso confidencial.',
      'Modalidad 1: Palabra secreta con pista personalizada.',
      'Modalidad 2: Duelo rápido con palabras aleatorias y rondas alternadas.',
      'Marcador acumulado de rondas.',
    ],
    auditedModules: [
      { id: 'mod-local-multi', name: 'Módulo Local Pass & Play', version: '1.3.0', status: 'passed' as const, description: 'Juego por turnos cara a cara sin necesidad de internet.', features: ['Ocultamiento de entrada', 'Transición de turno', 'Marcador'] },
    ],
  },
  {
    version: 'v1.2.0',
    releaseDate: 'Nov 2026',
    title: 'Biblioteca de Cuaderno & Colecciones Temáticas',
    highlights: [
      'Almacenamiento persistente en navegador (LocalStorage estructurado).',
      'CRUD completo de palabras: crear, editar, eliminar, marcar favoritos.',
      'Carpetas/Colecciones independientes con conteo de palabras.',
      'Exportación e Importación de copias de seguridad en formato JSON.',
    ],
    auditedModules: [
      { id: 'mod-library', name: 'Biblioteca y Almacenamiento Local', version: '1.2.0', status: 'passed' as const, description: 'Base de datos cliente indexada con copias de seguridad JSON.', features: ['Gestión de colecciones', 'Filtro por dificultad', 'Búsqueda instantánea', 'Exportar/Importar'] },
    ],
  },
  {
    version: 'v1.1.0',
    releaseDate: 'Nov 2026',
    title: 'Generador Inteligente con Gemini 3.8 Flash',
    highlights: [
      'Conexión backend segura con el modelo oficial Gemini 3.8 Flash.',
      'Generación estructurada JSON por lotes (5, 10, 20 o 50 palabras).',
      'Validación de dificultad (Fácil, Normal, Difícil, Experto) y pistas pedagógicas sin spoilers.',
      'Guardado voluntario selectivo o en lote hacia la biblioteca.',
    ],
    auditedModules: [
      { id: 'mod-gemini', name: 'Servicio de Inteligencia Artificial', version: '1.1.0', status: 'passed' as const, description: 'Procesamiento semántico con esquema JSON estricto.', features: ['Modelo gemini-3.8-flash', 'Reglas anti-spoiler', 'Validación ortográfica española'] },
    ],
  },
  {
    version: 'v1.0.0',
    releaseDate: 'Nov 2026',
    title: 'Motor Clásico de Ahorcado & Lienzo de Grafito 2D',
    highlights: [
      'Dibujo artesanal en Canvas 2D con simulación de trazos irregulares de lápiz.',
      'Animación progresiva de trazos y punta de lápiz viva.',
      'Teclado completo con letra Ñ y soporte físico de teclado.',
      'Normalización estricta de acentos en español (Á->A pero conservando Ñ).',
    ],
    auditedModules: [
      { id: 'mod-engine-2d', name: 'Lienzo Artesanal Canvas 2D', version: '1.0.0', status: 'passed' as const, description: 'Renderizado orgánico procedural sobre textura de papel.', features: ['8 fases de dibujo', 'Animación de lápiz', 'Jitter orgánico', 'Soporte Retina/HiDPI'] },
      { id: 'mod-rules', name: 'Motor de Reglas y Acentos', version: '1.0.0', status: 'passed' as const, description: 'Lógica pura testeada unitariamente con node:test.', features: ['Tratamiento de diacríticos', 'Fórmulas de puntaje', 'Condiciones de victoria/derrota'] },
    ],
  },
];

export function getSavedWords(): WordItem[] {
  if (typeof window === 'undefined') return DEFAULT_WORDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_WORDS, JSON.stringify(DEFAULT_WORDS));
      return DEFAULT_WORDS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_WORDS;
  }
}

export function saveWords(words: WordItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_WORDS, JSON.stringify(words));
  } catch (err) {
    console.error('Error saving words to storage:', err);
  }
}

export function getSavedCategories(): string[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
  } catch (err) {
    console.error('Error saving categories:', err);
  }
}

const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  wordsDiscovered: 0,
  bestStreak: 0,
  currentStreak: 0,
  correctLetters: 0,
  incorrectLetters: 0,
  favoriteCategories: {},
  difficultyPlayed: {
    facil: 0,
    normal: 0,
    dificil: 0,
    experto: 0,
  },
  totalTimeSeconds: 0,
};

export function getPlayerStats(): PlayerStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    if (!raw) return DEFAULT_STATS;
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATS;
  }
}

export function recordGameResult(
  won: boolean,
  category: string,
  difficulty: DifficultyLevel,
  correctCount: number,
  incorrectCount: number,
  elapsedSeconds: number
): PlayerStats {
  const current = getPlayerStats();
  const nextStreak = won ? current.currentStreak + 1 : 0;
  const nextBestStreak = Math.max(current.bestStreak, nextStreak);

  const updated: PlayerStats = {
    ...current,
    gamesPlayed: current.gamesPlayed + 1,
    gamesWon: current.gamesWon + (won ? 1 : 0),
    gamesLost: current.gamesLost + (won ? 0 : 1),
    wordsDiscovered: current.wordsDiscovered + (won ? 1 : 0),
    currentStreak: nextStreak,
    bestStreak: nextBestStreak,
    correctLetters: current.correctLetters + correctCount,
    incorrectLetters: current.incorrectLetters + incorrectCount,
    totalTimeSeconds: current.totalTimeSeconds + elapsedSeconds,
    favoriteCategories: {
      ...current.favoriteCategories,
      [category]: (current.favoriteCategories[category] || 0) + 1,
    },
    difficultyPlayed: {
      ...current.difficultyPlayed,
      [difficulty]: (current.difficultyPlayed[difficulty] || 0) + 1,
    },
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(updated));
  }
  return updated;
}
