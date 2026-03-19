export type CommandItem = {
  id: string;
  label: string;
  type: "command" | "note" | "task" | "code" | "reminder" | "canvas";
  color?: string;
  icon: any;
  hint?: string;
  keywords?: string[];
  action: () => void;
};
