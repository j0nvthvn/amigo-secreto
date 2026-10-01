import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inviteUrl, parseInviteToken } from './links';

const token = 'abcdefghijklmnopqrstuv';

test('arma el link personal', () => {
  assert.equal(inviteUrl('https://tetoco.jflores.tech/', token), `https://tetoco.jflores.tech/r/${token}`);
});

test('lee el token desde un link, un mensaje o el token solo', () => {
  assert.equal(parseInviteToken(`https://tetoco.jflores.tech/r/${token}`), token);
  assert.equal(parseInviteToken(`Hola Camila, te invito: https://tetoco.jflores.tech/r/${token}`), token);
  assert.equal(parseInviteToken(`  ${token} `), token);
  assert.equal(parseInviteToken(`https://tetoco.jflores.tech/r/${token}?x=1`), token);
});

test('rechaza tokens de otro largo', () => {
  assert.equal(parseInviteToken('https://tetoco.jflores.tech/r/corto'), null);
  assert.equal(parseInviteToken(`https://tetoco.jflores.tech/r/${token}x`), null);
});
