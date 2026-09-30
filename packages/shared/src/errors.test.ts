import assert from 'node:assert/strict';
import { test } from 'node:test';
import { errorMessages, errorText, toErrorCode, unknownErrorMessage } from './errors';

test('define los 18 códigos de la API', () => {
  assert.equal(Object.keys(errorMessages).length, 18);
});

test('lee el código desde el message de un error P0001', () => {
  assert.equal(toErrorCode({ code: 'P0001', message: 'name_taken', details: null }), 'name_taken');
});

test('lee el código desde una respuesta de Edge Function', () => {
  assert.equal(toErrorCode({ ok: false, code: 'draw_impossible', message: 'Texto del motor' }), 'draw_impossible');
});

test('ignora códigos desconocidos', () => {
  assert.equal(toErrorCode({ code: '42501', message: 'permission denied' }), null);
  assert.equal(toErrorCode('not_owner'), null);
  assert.equal(errorText(new Error('boom')), unknownErrorMessage);
});

test('no confunde propiedades heredadas con códigos', () => {
  assert.equal(toErrorCode({ message: 'toString' }), null);
});
