import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveNexusTheme, THEME_PRESETS, BACKGROUND_PRESETS } from './nexusThemeResolver.js';
import { contrastRatio } from './workbenchTokens.ts';

test('semantic colors remain readable across presets, backgrounds and light/dark custom surfaces', () => {
  const settings = [
    ...Object.keys(THEME_PRESETS).map(theme => ({ theme })),
    ...Object.keys(BACKGROUND_PRESETS).map(background => ({ background })),
    { custom_surface: '#f4f1ec', custom_input_surface: '#ffffff', primary_accent: '#b22f4a' },
    { custom_surface: '#151e28', custom_input_surface: '#101820', primary_accent: '#24c4ac' },
    ...Array.from({ length: 16 }, (_, index) => ({ custom_surface: `#${(index * 17).toString(16).padStart(2, '0').repeat(3)}` })),
    { custom_surface: '#ffffff', custom_input_surface: '#000000', primary_accent: '#ffffff' },
  ];
  for (const setting of settings) {
    const { cssVars: tokens } = resolveNexusTheme(setting);
    for (const key of ['primary', 'secondary', 'muted']) {
      for (const surface of ['panel', 'chrome', 'overlay']) {
        assert.ok(contrastRatio(tokens[`--wb-text-${key}`], tokens[`--wb-surface-${surface}`]) >= 4.5, JSON.stringify({ setting, key, surface }));
      }
    }
    for (const state of ['accent', 'success', 'warning', 'danger', 'info']) {
      assert.ok(contrastRatio(tokens[`--wb-${state}`], tokens['--wb-surface-panel']) >= 4.5, state);
    }
    assert.ok(contrastRatio(tokens['--wb-input-text'], tokens['--wb-input']) >= 4.5);
    assert.ok(contrastRatio(tokens['--wb-input-placeholder'], tokens['--wb-input']) >= 4.5);
    assert.ok(contrastRatio(tokens['--wb-focus'], tokens['--wb-surface-panel']) >= 3);
    assert.ok(contrastRatio(tokens['--wb-focus'], tokens['--wb-input']) >= 3);
    assert.ok(contrastRatio(tokens['--wb-selection-text'], tokens['--wb-selection']) >= 4.5);
    assert.notEqual(tokens['--wb-surface-panel'], tokens['--wb-surface-editor']);
  }
});

test('custom appearance derives tokens without mutating settings or legacy theme/syntax contracts', () => {
  const settings = Object.freeze({ theme: 'dracula_classic', background: 'void', primary_accent: '#abc', secondary_accent: '#456789', custom_surface: '#203040', custom_input_surface: '#304050', panel_background_mode: 'glass-shader', unknown_future_option: 'preserved' });
  const theme = resolveNexusTheme(settings);
  assert.equal(theme.cssVars['--nexus-primary'], '#aabbcc');
  assert.equal(theme.cssVars['--nexus-accent-2'], '#456789');
  assert.equal(theme.cssVars['--nexus-surface'], 'rgba(32, 48, 64, 0.84)');
  assert.equal(theme.cssVars['--nexus-control-surface'], 'rgba(48, 64, 80, 0.28)');
  assert.match(theme.cssVars['--nexus-panel-surface'], /^linear-gradient/);
  assert.equal(theme.cssVars['--wb-surface-chrome'], '#203040');
  assert.equal(theme.cssVars['--wb-input'], '#304050');
  assert.equal(theme.cssVars['--wb-surface-editor'], '#000000');
  assert.deepEqual(theme.syntax, THEME_PRESETS.dracula_classic.syntax);
  assert.equal(settings.unknown_future_option, 'preserved');
});

test('invalid legacy colors and theme aliases keep existing fallbacks', () => {
  const normal = resolveNexusTheme({});
  const invalid = resolveNexusTheme({ theme: 'missing', primary_accent: 'garbage', custom_surface: 'url(bad)', custom_input_surface: '' });
  assert.deepEqual(invalid.cssVars, normal.cssVars);
  assert.deepEqual(resolveNexusTheme({ theme: 'nexus_zed' }).cssVars, normal.cssVars);
});
