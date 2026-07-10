## Summary

-

## Security Checklist

- [ ] Keine Secrets, Tokens, private Device-IDs oder lokalen/private Pfade committed
- [ ] Keine `trustedOrigins: ["*"]` eingefuehrt
- [ ] Server-side account/cloud enforcement nicht durch client-only Checks ersetzt
- [ ] Device-Verification fuer `admin`/`developer` bleibt aktiv
- [ ] Sensitive API-/Electron-Aenderungen wurden bewusst reviewed
- [ ] `.github` Policies/Workflows nicht versehentlich geschwaecht
- [ ] `npm run verify:ecosystem` lokal erfolgreich

## Testing

- [ ] Manuell getestet
- [ ] Verify-Script ausgefuehrt
