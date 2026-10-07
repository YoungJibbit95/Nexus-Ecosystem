// Test-only entry served by run-visual-foundation; never imported by App.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import '../globals.css';
import SearchPanel from '../components/editor/SearchPanel.jsx';
import ProblemsPanel from '../components/editor/ProblemsPanel.jsx';
import CodeEditor from '../components/editor/CodeEditor.jsx';
import { PanelShell, PanelBody, PanelState, PanelSection, PanelActionButton, useNexusReducedMotion } from '../components/editor/panels/PanelChrome.jsx';
import { resolveNexusTheme } from '../theme/nexusThemeResolver.js';
import { createUiSmokeSettingsFixture } from './uiSmokeFixtures.js';

const code = Array.from({ length: 65 }, (_, index) => `export const fixture${index} = "semantic panel search result ${index}";`).join('\n');
const files = [{ id: 'fixture', type: 'file', name: 'visual-foundation-with-a-long-document-name.ts', path: 'src/workbench/visual-foundation-with-a-long-document-name.ts', content: code }];
const problems = Array.from({ length: 25 }, (_, index) => ({
  id: `problem-${index}`, severity: index % 3 === 0 ? 8 : index % 3 === 1 ? 4 : 2,
  resource: files[0].path, source: 'fixture', code: `TEST${index}`,
  message: `Diagnostic fixture ${index}: long readable text for overflow and selection qualification.`, startLineNumber: index + 1, startColumn: 1,
}));
const events = [];
function Fixture() {
  const [config, setConfig] = React.useState({});
  const [document, setDocument] = React.useState(code);
  const [expanded, setExpanded] = React.useState(true);
  const reduceMotion = useNexusReducedMotion();
  const settings = { ...createUiSmokeSettingsFixture(), lsp_enabled: false, ...config.settings };
  React.useEffect(() => {
    window.foundationFixture = { configure: setConfig, events };
    return () => { delete window.foundationFixture; };
  }, []);
  React.useEffect(() => {
    for (const [key, value] of Object.entries(resolveNexusTheme(settings).cssVars)) window.document.documentElement.style.setProperty(key, value);
  }, [config]);
  return (
    <div className="nx-code-shell" data-fixture="visual-foundation" data-reduced={reduceMotion} style={{ width: '100vw', height: '100vh', display: 'grid', gridTemplateRows: '28px minmax(0, 1fr)', background: 'var(--wb-surface-window)' }}>
      <div style={{ padding: '4px 12px', color: 'var(--wb-text-primary)', background: 'var(--wb-surface-chrome)', fontSize: 11 }}>Nexus Code · visual foundation fixture · no account or native service</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 30%) minmax(0, 1fr)', minHeight: 0 }}>
        <SearchPanel files={config.empty ? [] : files} onFileSelect={(id) => events.push({ kind: 'file', id })} />
        <div style={{ display: 'grid', gridTemplateRows: 'minmax(100px, 1fr) minmax(140px, 42%)', minHeight: 0, minWidth: 0 }}>
          <CodeEditor code={document} fileName={files[0].name} filePath={files[0].path} onChange={setDocument} settings={settings} showLineNumbers tabSize={2} wordWrap={false} />
          {config.states ? (
            <PanelShell ariaLabel="State fixtures"><PanelBody>
              <PanelSection title="Long section heading with a persistent action" expanded={expanded} onToggle={() => setExpanded(value => !value)}>
                <PanelState title="Loading fixture" detail="A test-only pending state." spinning compact />
                <PanelState title="Error fixture" detail="A test-only failure with a retry action." tone="danger" actionLabel="Retry fixture" onAction={() => events.push({ kind: 'retry' })} compact />
                <PanelActionButton disabled>Unavailable fixture</PanelActionButton>
              </PanelSection>
            </PanelBody></PanelShell>
          ) : <ProblemsPanel problems={config.empty ? [] : problems} onSelectProblem={(problem) => events.push({ kind: 'problem', id: problem.id })} />}
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<Fixture />);
