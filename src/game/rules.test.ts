import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeChar,
  isLetterInWord,
  getDisplayMask,
  checkWinCondition,
  checkLossCondition,
  calculateRoundScore,
  validateCustomWord,
} from './rules';

test('normalizeChar removes accents but preserves Ñ', () => {
  assert.equal(normalizeChar('á'), 'A');
  assert.equal(normalizeChar('É'), 'E');
  assert.equal(normalizeChar('í'), 'I');
  assert.equal(normalizeChar('ó'), 'O');
  assert.equal(normalizeChar('Ú'), 'U');
  assert.equal(normalizeChar('ü'), 'U');
  assert.equal(normalizeChar('ñ'), 'Ñ');
  assert.equal(normalizeChar('Ñ'), 'Ñ');
  assert.equal(normalizeChar('z'), 'Z');
});

test('isLetterInWord matches correctly with and without accents', () => {
  assert.equal(isLetterInWord('A', 'ÁRBOL'), true);
  assert.equal(isLetterInWord('O', 'CAMIÓN'), true);
  assert.equal(isLetterInWord('N', 'PIÑA'), false);
  assert.equal(isLetterInWord('Ñ', 'PIÑA'), true);
  assert.equal(isLetterInWord('X', 'ZEUS'), false);
});

test('getDisplayMask masks undiscovered letters while showing spaces and found letters', () => {
  const guessed = new Set(['M', 'A']);
  const mask = getDisplayMask('MI CASA', guessed);
  assert.deepEqual(mask, ['M', '_', ' ', '_', 'A', '_', 'A']);
});

test('checkWinCondition recognizes full word discovery', () => {
  const word = 'FÉNIX';
  const guessed = new Set(['F', 'E', 'N', 'I', 'X']);
  assert.equal(checkWinCondition(word, guessed), true);

  const incompleteGuessed = new Set(['F', 'E', 'N']);
  assert.equal(checkWinCondition(word, incompleteGuessed), false);
});

test('checkLossCondition checks mistake threshold', () => {
  assert.equal(checkLossCondition(5, 6), false);
  assert.equal(checkLossCondition(6, 6), true);
  assert.equal(checkLossCondition(7, 6), true);
});

test('calculateRoundScore rewards accuracy, health and difficulty', () => {
  const easyScore = calculateRoundScore(4, 1, 6, false, 'facil');
  const expertScore = calculateRoundScore(4, 1, 6, false, 'experto');
  assert.ok(expertScore > easyScore, 'Expert score should be higher due to multiplier');
  assert.ok(easyScore > 0, 'Score should be positive on victory');
});

test('normalizeChar handles accented physical keyboard keys correctly', () => {
  const spanishKeys = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ü', 'Ñ'];
  const expected = ['A', 'E', 'I', 'O', 'U', 'U', 'Ñ', 'A', 'E', 'I', 'O', 'U', 'U', 'Ñ'];
  spanishKeys.forEach((key, i) => {
    assert.equal(normalizeChar(key), expected[i]);
  });
});

test('distinct letters calculation properly excludes spaces and punctuation', () => {
  const phrase = 'DARK SOULS 3!';
  const lettersOnly = Array.from(phrase).filter(c => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]$/.test(c));
  const distinct = new Set(lettersOnly.map(c => normalizeChar(c)));
  assert.equal(distinct.size, 8); // D, A, R, K, S, O, U, L
});

test('validateCustomWord detects invalid inputs and leaks in hints', () => {
  assert.equal(validateCustomWord('A').valid, false);
  assert.equal(validateCustomWord('Supercalifragilisticoespialidoso123').valid, false);
  assert.equal(validateCustomWord('PERRO', 'Es un perro fiel').valid, false);
  assert.equal(validateCustomWord('GATO', 'Animal felino doméstico').valid, true);
});
