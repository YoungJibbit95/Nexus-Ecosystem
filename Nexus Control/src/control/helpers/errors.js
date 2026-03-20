export const parseErrorMessage = (error) => {
  if (!error) return 'Unbekannter Fehler'
  if (error?.nexusCode) {
    if (error?.nexusHint) {
      return `${error.nexusMessage || error.nexusCode} ${error.nexusHint}`
    }
    return error.nexusMessage || error.nexusCode
  }

  const message = String(error.message || error)

  if (message.includes('SIGNING_KEY_NOT_CONFIGURED')) {
    return `${message}. Hinterlege im Control UI ein Mutation Signing Secret und setze am Server NEXUS_MUTATION_SIGNING_SECRETS.`
  }
  if (message.includes('SIGNING_SECRET_MISSING')) {
    return 'Mutation Signing Secret fehlt. Bitte im API-Bereich setzen und speichern.'
  }
  if (message.includes('INVALID_MUTATION_SIGNATURE')) {
    return `${message}. Signatur stimmt nicht mit dem Server-Secret ueberein.`
  }
  if (message.includes('SIGNATURE_REPLAY_DETECTED')) {
    return `${message}. Request wurde als Replay erkannt, bitte erneut senden.`
  }
  if (message.includes('CONTROL_PANEL_OWNER_ONLY')) {
    return 'Dieses Control Panel ist auf Owner-Accounts beschraenkt.'
  }
  if (message.includes('LOGIN_RATE_LIMITED')) {
    return 'Zu viele Login-Versuche. Bitte warte kurz und versuche es erneut.'
  }
  if (message.includes('API_BOOTSTRAP_FAILED')) {
    return 'API Handshake fehlgeschlagen. Bitte API URL, Reachability und trustedOrigins pruefen.'
  }

  return message
}
