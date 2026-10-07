import React, { useEffect, useState } from 'react';

export default function WorkspaceTrustNotice({ platform, workspacePath }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let disposed = false;
    setState(null);
    setError('');
    if (!workspacePath) return;
    const update = (next) => {
      if (!disposed && next.path === workspacePath) setState(current => current && current.revision > next.revision ? current : next);
    };
    const subscription = platform.trust.onChanged(update);
    void platform.trust.status(workspacePath).then(result => {
      if (disposed) return;
      if (result.ok) update(result.data); else setError(result.error.message);
    });
    return () => { disposed = true; if (subscription.ok) subscription.data(); };
  }, [platform, workspacePath]);
  if (!workspacePath) return null;
  const trusted = state?.path === workspacePath && state.trusted;
  const change = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await (trusted ? platform.trust.revoke(workspacePath) : platform.trust.request(workspacePath));
      if (result.ok) setState(result.data); else setError(result.error.message);
    } finally { setBusy(false); }
  };
  return <div className="shrink-0 border-b border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200" role="status" data-workspace-trust={trusted ? 'trusted' : 'restricted'}>
    <strong>{trusted ? 'Trusted workspace' : 'Restricted workspace'}</strong>
    <span className="ml-2">{trusted ? 'Native execution is enabled for this folder.' : 'File editing and safe Git inspection are available. Terminal, language servers and Git changes require trust.'}</span>
    <button className="ml-3 underline disabled:opacity-50" disabled={busy || state?.storageError || platform.trust.capability.state !== 'available'} onClick={() => { void change(); }}>
      {busy ? 'Waiting…' : trusted ? 'Revoke trust' : 'Review trust…'}
    </button>
    {error && <span className="ml-2 text-orange-200" role="alert">{error}</span>}
    {state?.storageError && <span className="ml-2 text-orange-200">Trust storage is unavailable; execution stays restricted.</span>}
  </div>;
}
