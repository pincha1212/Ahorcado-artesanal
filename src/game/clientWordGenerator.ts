import { WordItem, DifficultyLevel } from '../types/game';

interface ThematicDictionary {
  [themeKey: string]: Array<{ word: string; hint: string; difficulty: DifficultyLevel }>;
}

const THEMATIC_KNOWLEDGE_BASE: ThematicDictionary = {
  mitologia: [
    { word: 'ZEUS', hint: 'Rey supremo de los dioses del Olimpo y señor del rayo.', difficulty: 'facil' },
    { word: 'POSEIDÓN', hint: 'Dios de los mares, tempestades y terremotos.', difficulty: 'facil' },
    { word: 'HADES', hint: 'Señor del inframundo y las sombras subterráneas.', difficulty: 'facil' },
    { word: 'ATENEA', hint: 'Diosa de la sabiduría y la estrategia militar justa.', difficulty: 'facil' },
    { word: 'MINOTAURO', hint: 'Criatura con cabeza de toro encerrada en el laberinto de Creta.', difficulty: 'normal' },
    { word: 'PEGASO', hint: 'Corcel alado nacido de la sangre de Medusa.', difficulty: 'normal' },
    { word: 'QUIMERA', hint: 'Bestia con cabeza de león, cuerpo de cabra y cola de serpiente.', difficulty: 'normal' },
    { word: 'VALQUIRIA', hint: 'Doncella guerrera nórdica que conduce a los caídos al Valhalla.', difficulty: 'normal' },
    { word: 'PROMETEO', hint: 'Titán que desafió a los dioses entregando el fuego sagrado a la humanidad.', difficulty: 'dificil' },
    { word: 'CENTAURO', hint: 'Ser mitológico con torso humano y cuerpo de caballo.', difficulty: 'dificil' },
    { word: 'LABERINTO', hint: 'Compleja red de corredores construida por Dédalo.', difficulty: 'dificil' },
    { word: 'CERBERO', hint: 'Perro guardián de tres cabezas que vigila las puertas del Hades.', difficulty: 'dificil' },
    { word: 'OROPÉNDOLA', hint: 'Ave dorada metamorfoseada en las fábulas clásicas.', difficulty: 'experto' },
    { word: 'HIPOCAMPO', hint: 'Criatura marina mitológica con parte superior de caballo y cola de pez.', difficulty: 'experto' },
    { word: 'OUROBOROS', hint: 'Emblema serpenteante que muerde su propia cola simbolizando la eternidad.', difficulty: 'experto' },
  ],
  videojuegos: [
    { word: 'TETRIS', hint: 'Rompecabezas soviético de tetrominós descendentes.', difficulty: 'facil' },
    { word: 'MINECRAFT', hint: 'Universo de supervivencia y construcción con bloques pixelados.', difficulty: 'facil' },
    { word: 'PACMAN', hint: 'Héroe esférico amarillo perseguido por fantasmas en un laberinto.', difficulty: 'facil' },
    { word: 'TRIFUERZA', hint: 'Artefacto dorado de Hyrule con los poderes de Valor, Poder y Sabiduría.', difficulty: 'normal' },
    { word: 'PIKACHU', hint: 'Roedor eléctrico con mejillas rojas y cola en forma de relámpago.', difficulty: 'normal' },
    { word: 'JOYSTICK', hint: 'Palanca de mando para controlar videojuegos clásicos.', difficulty: 'normal' },
    { word: 'DARK SOULS', hint: 'Franquicia de FromSoftware célebre por sus hogueras y castigos implacables.', difficulty: 'dificil' },
    { word: 'SPEEDRUN', hint: 'Hazaña de completar un juego en el menor tiempo récord posible.', difficulty: 'dificil' },
    { word: 'METROID', hint: 'Aventura intergaláctica protagonizada por la cazarrecompensas Samus Aran.', difficulty: 'dificil' },
    { word: 'PORTAL GUN', hint: 'Dispositivo capaz de enlazar dos puntos en el espacio mediante túneles cuánticos.', difficulty: 'experto' },
    { word: 'RETROGAMIN', hint: 'Cultura de coleccionismo y juego de consolas y arcades de épocas pasadas.', difficulty: 'experto' },
  ],
  animales: [
    { word: 'LEOPARDO', hint: 'Felino veloz célebre por sus manchas oscuras y destreza en los árboles.', difficulty: 'facil' },
    { word: 'DELFÍN', hint: 'Cetáceo inteligente con ecolocalización y salto acrobático.', difficulty: 'facil' },
    { word: 'JIRAFA', hint: 'Mamífero africano de cuello alargado que alcanza las copas de las acacias.', difficulty: 'facil' },
    { word: 'CAMALEÓN', hint: 'Reptil con ojos independientes y capacidad de mimetismo dérmico.', difficulty: 'normal' },
    { word: 'PANGOLÍN', hint: 'Mamífero insectívoro recubierto por escamas de queratina superpuestas.', difficulty: 'normal' },
    { word: 'MANTARRAYA', hint: 'Gigante marino cartilaginoso con grandes aletas pectorales como alas.', difficulty: 'normal' },
    { word: 'ORNITORRINCO', hint: 'Monotrema australiano con pico de pato y espolones venenosos.', difficulty: 'dificil' },
    { word: 'NUDIBRANQUIO', hint: 'Babosa marina colorida con branquias desnudas en su dorso.', difficulty: 'dificil' },
    { word: 'AXOLOTE', hint: 'Anfibio endémico mexicano que conserva rasgos juveniles y regenera órganos.', difficulty: 'experto' },
    { word: 'CELACANTO', hint: 'Pez fósil viviente que se creía extinguido desde el Cretácico.', difficulty: 'experto' },
  ],
  historia: [
    { word: 'PIRÁMIDE', hint: 'Monumento funerario triangular del Egipto de los faraones.', difficulty: 'facil' },
    { word: 'COLISEO', hint: 'Anfiteatro romano de combate de gladiadores en la colina Capitolina.', difficulty: 'facil' },
    { word: 'GLADIADOR', hint: 'Luchador que combatía en la arena para deleite del público romano.', difficulty: 'facil' },
    { word: 'RENACIMIENTO', hint: 'Época de florecimiento artístico y científico europeo tras la Edad Media.', difficulty: 'normal' },
    { word: 'JEROGLÍFICO', hint: 'Sistema de escritura figurativo del antiguo Egipto descifrado con la Piedra Rosetta.', difficulty: 'normal' },
    { word: 'FEUDALISMO', hint: 'Organización política y social medieval basada en el vasallaje y feudos.', difficulty: 'normal' },
    { word: 'MESOPOTAMIA', hint: 'Región fértil entre el Tigris y el Éufrates donde floreció la escritura cuneiforme.', difficulty: 'dificil' },
    { word: 'ILUSTRACIÓN', hint: 'Movimiento intelectual del siglo XVIII guiado por la razón y los derechos humanos.', difficulty: 'dificil' },
    { word: 'PALEOLÍTICO', hint: 'Primera etapa de la Edad de Piedra caracterizada por el tallado de piedra y caza.', difficulty: 'experto' },
  ],
  ciencia: [
    { word: 'GRAVEDAD', hint: 'Atracción cósmica que gobierna las órbitas planetarias y la caída de los cuerpos.', difficulty: 'facil' },
    { word: 'FUTURO', hint: 'Horizonte temporal que todavía está por suceder.', difficulty: 'facil' },
    { word: 'FOTOSÍNTESIS', hint: 'Conversión vegetal de luz solar y agua en glucosa y oxígeno.', difficulty: 'normal' },
    { word: 'SUPERNOVA', hint: 'Explosión estelar cataclísmica que deja tras de sí una nebulosa o estrella de neutrones.', difficulty: 'normal' },
    { word: 'TELESCOPIO', hint: 'Instrumento óptico para escudriñar astros lejanos en el cosmos.', difficulty: 'normal' },
    { word: 'CUÁNTICO', hint: 'Física que describe el comportamiento probabilístico de partículas subatómicas.', difficulty: 'dificil' },
    { word: 'EXOPLANETA', hint: 'Mundo que orbita una estrella diferente a nuestro Sol.', difficulty: 'dificil' },
    { word: 'CRISPR CAS', hint: 'Técnica biológica para la edición molecular precisa de secuencias genéticas.', difficulty: 'experto' },
    { word: 'SINGULARIDAD', hint: 'Punto central de un agujero negro donde la densidad se vuelve infinita.', difficulty: 'experto' },
  ],
};

/**
 * Intelligent Client-Side Semantic Word Generator for GitHub Pages & Offline Environments.
 */
export function generateClientWords(
  topic: string,
  difficulty: DifficultyLevel,
  count: number,
  includeHints: boolean
): WordItem[] {
  const normTopic = topic.toLowerCase().trim();
  let matchedBank: Array<{ word: string; hint: string; difficulty: DifficultyLevel }> = [];

  // Match domain keywords
  for (const [key, list] of Object.entries(THEMATIC_KNOWLEDGE_BASE)) {
    if (normTopic.includes(key) || key.includes(normTopic)) {
      matchedBank = list;
      break;
    }
  }

  // If no direct domain matched, combine relevant items
  if (matchedBank.length === 0) {
    matchedBank = Object.values(THEMATIC_KNOWLEDGE_BASE).flat();
  }

  // Filter or sort by difficulty
  const sorted = [...matchedBank].sort((a, b) => {
    if (a.difficulty === difficulty) return -1;
    if (b.difficulty === difficulty) return 1;
    return 0;
  });

  // Pick up to count
  const picked = sorted.slice(0, count);

  return picked.map((item, idx) => ({
    id: `client-${Date.now()}-${idx}`,
    word: item.word,
    category: topic,
    difficulty: item.difficulty,
    hint: includeHints ? item.hint : '',
    length: item.word.replace(/\s+/g, '').length,
    language: 'es',
    createdAt: new Date().toISOString(),
    source: 'ai',
  }));
}
