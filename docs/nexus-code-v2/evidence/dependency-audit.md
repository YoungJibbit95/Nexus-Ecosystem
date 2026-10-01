# Direct runtime dependencies

Generated from the production import graph, with an explicit audit refinement for framer-motion (small interactions can move to CSS; retain justified shared transitions). REQUIRED means currently used, not a permanent design decision. LEGACY and UNUSED are removal candidates only. No dependency was removed in Wave 0. Toolchain dependencies are classified separately in 01-problem-inventory.md.

| Dependency | Class | Evidence |
| --- | --- | --- |
| @codemirror/autocomplete | REQUIRED | src/components/editor/CodeEditor.jsx, src/pages/editor/featureModel/completions.js |
| @codemirror/commands | REQUIRED | src/components/editor/CodeEditor.jsx |
| @codemirror/lang-cpp | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lang-css | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lang-html | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lang-java | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lang-javascript | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lang-json | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lang-markdown | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lang-php | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lang-python | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lang-rust | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lang-sql | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lang-xml | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/language | REQUIRED | src/components/editor/CodeEditor.jsx, src/ide/languages/codeMirrorLanguages.js, src/pages/editor/featureModel/highlightStyle.js |
| @codemirror/legacy-modes | REQUIRED | src/ide/languages/codeMirrorLanguages.js |
| @codemirror/lint | REQUIRED | src/components/editor/CodeEditor.jsx |
| @codemirror/search | REQUIRED | src/components/editor/CodeEditor.jsx |
| @codemirror/state | REQUIRED | src/components/editor/CodeEditor.jsx |
| @codemirror/theme-one-dark | UNUSED | No literal import found; removal requires dynamic/config review |
| @codemirror/view | REQUIRED | src/components/editor/CodeEditor.jsx, src/components/editor/codeEditorRenderingModel.js |
| @hello-pangea/dnd | UNUSED | No literal import found; removal requires dynamic/config review |
| @hookform/resolvers | UNUSED | No literal import found; removal requires dynamic/config review |
| @radix-ui/react-accordion | LEGACY | Scaffold/test imports only |
| @radix-ui/react-alert-dialog | LEGACY | Scaffold/test imports only |
| @radix-ui/react-aspect-ratio | LEGACY | Scaffold/test imports only |
| @radix-ui/react-avatar | LEGACY | Scaffold/test imports only |
| @radix-ui/react-checkbox | LEGACY | Scaffold/test imports only |
| @radix-ui/react-collapsible | LEGACY | Scaffold/test imports only |
| @radix-ui/react-context-menu | LEGACY | Scaffold/test imports only |
| @radix-ui/react-dialog | LEGACY | Scaffold/test imports only |
| @radix-ui/react-dropdown-menu | LEGACY | Scaffold/test imports only |
| @radix-ui/react-hover-card | LEGACY | Scaffold/test imports only |
| @radix-ui/react-label | LEGACY | Scaffold/test imports only |
| @radix-ui/react-menubar | LEGACY | Scaffold/test imports only |
| @radix-ui/react-navigation-menu | LEGACY | Scaffold/test imports only |
| @radix-ui/react-popover | LEGACY | Scaffold/test imports only |
| @radix-ui/react-progress | LEGACY | Scaffold/test imports only |
| @radix-ui/react-radio-group | LEGACY | Scaffold/test imports only |
| @radix-ui/react-scroll-area | LEGACY | Scaffold/test imports only |
| @radix-ui/react-select | LEGACY | Scaffold/test imports only |
| @radix-ui/react-separator | LEGACY | Scaffold/test imports only |
| @radix-ui/react-slider | LEGACY | Scaffold/test imports only |
| @radix-ui/react-slot | LEGACY | Scaffold/test imports only |
| @radix-ui/react-switch | LEGACY | Scaffold/test imports only |
| @radix-ui/react-tabs | LEGACY | Scaffold/test imports only |
| @radix-ui/react-toast | UNUSED | No literal import found; removal requires dynamic/config review |
| @radix-ui/react-toggle | LEGACY | Scaffold/test imports only |
| @radix-ui/react-toggle-group | LEGACY | Scaffold/test imports only |
| @radix-ui/react-tooltip | LEGACY | Scaffold/test imports only |
| @stripe/react-stripe-js | UNUSED | No literal import found; removal requires dynamic/config review |
| @stripe/stripe-js | UNUSED | No literal import found; removal requires dynamic/config review |
| @tanstack/react-query | LEGACY | Scaffold/test imports only |
| @uiw/react-codemirror | REQUIRED | src/components/editor/CodeEditor.jsx |
| canvas-confetti | UNUSED | No literal import found; removal requires dynamic/config review |
| class-variance-authority | REQUIRED | src/components/ui/toast.jsx |
| clsx | REQUIRED | src/lib/utils.js |
| cmdk | LEGACY | Scaffold/test imports only |
| codemirror | UNUSED | No literal import found; removal requires dynamic/config review |
| date-fns | UNUSED | No literal import found; removal requires dynamic/config review |
| embla-carousel-react | LEGACY | Scaffold/test imports only |
| framer-motion | USED BUT REPLACEABLE | src/components/editor/CommandPalette.jsx, src/components/editor/DebugPanel.jsx, src/components/editor/ExtensionsPanel.jsx, src/components/editor/FileExplorer.jsx, src/components/editor/GitPanel.jsx, src/components/editor/panels/PanelChrome.jsx, src/components/editor/ProblemsPanel.jsx, src/components/editor/SearchPanel.jsx, src/components/editor/settings/SettingsNavigation.jsx, src/components/editor/settings/SettingsWidgets.jsx, src/components/editor/SettingsPanel.jsx, src/components/editor/SpotlightSearch.jsx, src/components/editor/TabBar.jsx, src/components/editor/Terminal.jsx, src/components/editor/TitleBar.jsx, src/components/editor/WelcomeScreen.jsx, src/pages/Editor.jsx |
| html2canvas | UNUSED | No literal import found; removal requires dynamic/config review |
| input-otp | LEGACY | Scaffold/test imports only |
| jspdf | UNUSED | No literal import found; removal requires dynamic/config review |
| lodash | UNUSED | No literal import found; removal requires dynamic/config review |
| lucide-react | REQUIRED | src/components/editor/AccountPanel.jsx, src/components/editor/CommandPalette.jsx, src/components/editor/DebugPanel.jsx, src/components/editor/ExtensionsPanel.jsx, src/components/editor/FileExplorer.jsx, src/components/editor/github/GitHubRepositoryInputCard.jsx, src/components/editor/github/GitHubWorkbenchActions.jsx, src/components/editor/github/githubWorkbenchData.js, src/components/editor/github/GitHubWorkbenchList.jsx, src/components/editor/github/GitHubWorkbenchPanel.jsx, src/components/editor/github/githubWorkbenchPrimitives.jsx, src/components/editor/GitPanel.jsx, src/components/editor/panels/PanelChrome.jsx, src/components/editor/ProblemsPanel.jsx, src/components/editor/SearchPanel.jsx, src/components/editor/settings/KeybindingManager.jsx, src/components/editor/settings/settingsCatalog.jsx, src/components/editor/settings/SettingsNavigation.jsx, src/components/editor/settings/SettingsPrimitives.jsx, src/components/editor/settings/SettingsWidgets.jsx, src/components/editor/SettingsPanel.jsx, src/components/editor/settingsShared.jsx, src/components/editor/Sidebar.jsx, src/components/editor/SpotlightSearch.jsx, src/components/editor/TabBar.jsx, src/components/editor/Terminal.jsx, src/components/editor/TitleBar.jsx, src/components/editor/WelcomeScreen.jsx, src/components/ui/toast.jsx, src/pages/editor/commandPaletteModel.js, src/pages/editor/editorShared.jsx, src/pages/editor/editorWorkbenchChrome.jsx, src/pages/Editor.jsx |
| moment | UNUSED | No literal import found; removal requires dynamic/config review |
| next-themes | REQUIRED | src/main.jsx |
| octokit | UNUSED | No literal import found; removal requires dynamic/config review |
| react | REQUIRED | src/app/AppScreens.jsx, src/app/useNexusCodeBoot.js, src/App.jsx, src/components/editor/AccountPanel.jsx, src/components/editor/CodeEditor.jsx, src/components/editor/CommandPalette.jsx, src/components/editor/DebugPanel.jsx, src/components/editor/ExtensionsPanel.jsx, src/components/editor/FileExplorer.jsx, src/components/editor/github/GitHubRepositoryInputCard.jsx, src/components/editor/github/GitHubWorkbenchActions.jsx, src/components/editor/github/GitHubWorkbenchList.jsx, src/components/editor/github/GitHubWorkbenchPanel.jsx, src/components/editor/github/githubWorkbenchPrimitives.jsx, src/components/editor/GitPanel.jsx, src/components/editor/panels/PanelChrome.jsx, src/components/editor/ProblemsPanel.jsx, src/components/editor/SearchPanel.jsx, src/components/editor/settings/KeybindingManager.jsx, src/components/editor/settings/SettingsNavigation.jsx, src/components/editor/settings/useLspSetupState.js, src/components/editor/SettingsPanel.jsx, src/components/editor/settingsShared.jsx, src/components/editor/Sidebar.jsx, src/components/editor/SpotlightSearch.jsx, src/components/editor/TabBar.jsx, src/components/editor/Terminal.jsx, src/components/editor/TitleBar.jsx, src/components/editor/WelcomeScreen.jsx, src/components/ui/toast.jsx, src/components/ui/use-toast.jsx, src/lib/useGlobalTypingAnimation.js, src/main.jsx, src/pages/editor/editorShared.jsx, src/pages/editor/editorWorkbenchChrome.jsx, src/pages/Editor.jsx |
| react-day-picker | LEGACY | Scaffold/test imports only |
| react-dom | REQUIRED | src/main.jsx |
| react-hook-form | LEGACY | Scaffold/test imports only |
| react-hot-toast | UNUSED | No literal import found; removal requires dynamic/config review |
| react-leaflet | UNUSED | No literal import found; removal requires dynamic/config review |
| react-markdown | UNUSED | No literal import found; removal requires dynamic/config review |
| react-resizable-panels | LEGACY | Scaffold/test imports only |
| react-router-dom | REQUIRED | src/App.jsx |
| recharts | LEGACY | Scaffold/test imports only |
| sonner | LEGACY | Scaffold/test imports only |
| tailwind-merge | REQUIRED | src/lib/utils.js |
| tailwindcss-animate | LEGACY | Scaffold/test imports only |
| three | UNUSED | No literal import found; removal requires dynamic/config review |
| vaul | LEGACY | Scaffold/test imports only |
| zod | UNUSED | No literal import found; removal requires dynamic/config review |
