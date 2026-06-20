import { MobileSettingsShell } from "./settings/MobileSettingsShell";

export function SettingsView(props: { onOpenWalkthrough?: () => void } = {}) {
  return <MobileSettingsShell {...props} />;
}
