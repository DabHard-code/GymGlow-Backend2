import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatedPublicAlias, publicAliasForAthlete } from './public-alias';

test('public names never fall back to a private athlete name', () => {
  const athlete = { id: 'athlete-123', name: 'Jane Smith' };
  for (const publicDisplayName of [null, undefined, '', '   ', 'Jane Smith', ' JANE  SMITH ', 'Jane-Smith']) {
    assert.equal(publicAliasForAthlete({ ...athlete, publicDisplayName }), generatedPublicAlias(athlete.id));
  }
});

test('intentional aliases and generated aliases stay consistent across leaderboards', () => {
  assert.equal(publicAliasForAthlete({ id: 'athlete-123', name: 'Jane Smith', publicDisplayName: '  Beam Queen  ' }), 'Beam Queen');
  assert.equal(publicAliasForAthlete({ id: 'athlete-123' }), generatedPublicAlias('athlete-123'));
});
