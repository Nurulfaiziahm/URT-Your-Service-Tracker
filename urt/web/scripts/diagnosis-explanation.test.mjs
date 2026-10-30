import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnosisExplanation, diagnosisItemDescription } from '../src/features/tickets/diagnosis-explanation.ts';

test('customer draft explains recognized findings without copying private notes or measurements', () => {
  const explanation = diagnosisExplanation('IC charger rusak. Tegangan drop 0.5V. Password pelanggan: PRIVATE-123; margin internal 20%');
  assert.match(explanation, /masalah pada/);
  assert.match(explanation, /komponen elektronik/);
  assert.match(explanation, /pengisian daya/);
  assert.match(explanation, /suplai daya/);
  assert.match(explanation, /persetujuan Anda sebelum perbaikan dimulai/);
  assert.doesNotMatch(explanation, /PRIVATE|Password|margin|0\.5|20%/);
});

test('estimate item suggestions use recognized parts and omit private notes', () => {
  const note = 'Keyboard rusak. Password pelanggan: PRIVATE-123';
  assert.match(diagnosisItemDescription(note, 'labor'), /^Jasa pemeriksaan dan penanganan keyboard/);
  assert.match(diagnosisItemDescription(note, 'part'), /^Suku cadang untuk keyboard/);
  assert.doesNotMatch(diagnosisItemDescription(note, 'labor'), /PRIVATE|Password/);
  assert.equal(diagnosisItemDescription('', 'labor'), 'Jasa pemeriksaan dan penanganan perangkat');
});

test('uncertain and normal findings do not become confirmed faults or repairs', () => {
  for (const notes of ['Tidak ada korsleting. IC tidak rusak.', 'Tegangan normal; baterai masih baik.', 'IC belum dipastikan rusak.']) {
    assert.doesNotMatch(diagnosisExplanation(notes), /menunjukkan masalah/);
  }
  assert.match(diagnosisExplanation('Layar tidak menyala.'), /masalah pada layar/);
  assert.equal(diagnosisExplanation('  \n '), '');
  assert.match(diagnosisExplanation('PRIVATE-123'), /pemeriksaan awal/);
  assert.doesNotMatch(diagnosisExplanation('PRIVATE-123'), /PRIVATE/);
});
