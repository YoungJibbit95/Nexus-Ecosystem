const message = [
  '[security] Zugriff verweigert.',
  'Security-Admin-Operationen sind im öffentlichen Nexus-Ecosystem deaktiviert.',
  'Nutze dafür ausschließlich das private NexusAPI Operations-Setup.',
].join('\n')

console.error(message)
process.exit(1)
