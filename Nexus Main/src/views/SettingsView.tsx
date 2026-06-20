import { SettingsShell } from "./settings/SettingsShell";

export function SettingsView(props: { onOpenWalkthrough?: () => void } = {}) {
  return <SettingsShell {...props} />;
}
