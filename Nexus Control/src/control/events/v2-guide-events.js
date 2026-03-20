import { parseErrorMessage } from '../helpers.js'

export const bindV2AndGuideEvents = ({ el, core, workspace }) => {
  const { setStatus } = core
  const {
    loadGuide,
    loadV2Capabilities,
    loadV2Runtime,
    promoteV2Release,
    saveV2FeatureCatalog,
    saveV2LayoutSchema,
    validateV2LayoutSchema,
  } = workspace

  el.v2LoadRuntimeBtn.addEventListener('click', async () => {
    try {
      await loadV2Runtime()
      setStatus('v2 Runtime geladen.', 'success')
    } catch (error) {
      setStatus(`v2 Runtime konnte nicht geladen werden: ${parseErrorMessage(error)}`, 'error')
    }
  })

  el.v2LoadCapabilitiesBtn.addEventListener('click', async () => {
    try {
      await loadV2Capabilities()
      setStatus('v2 Capabilities geladen.', 'success')
    } catch (error) {
      setStatus(`v2 Capabilities konnten nicht geladen werden: ${parseErrorMessage(error)}`, 'error')
    }
  })

  el.v2ValidateLayoutBtn.addEventListener('click', async () => {
    try {
      await validateV2LayoutSchema()
      setStatus('v2 Layout Schema ist gueltig.', 'success')
    } catch (error) {
      setStatus(`v2 Layout Validation fehlgeschlagen: ${parseErrorMessage(error)}`, 'error')
    }
  })

  el.v2SaveCatalogBtn.addEventListener('click', async () => {
    try {
      await saveV2FeatureCatalog()
      setStatus('v2 Feature Catalog (staging) gespeichert.', 'success')
    } catch (error) {
      setStatus(`v2 Feature Catalog konnte nicht gespeichert werden: ${parseErrorMessage(error)}`, 'error')
    }
  })

  el.v2SaveLayoutBtn.addEventListener('click', async () => {
    try {
      await saveV2LayoutSchema()
      setStatus('v2 Layout Schema (staging) gespeichert.', 'success')
    } catch (error) {
      setStatus(`v2 Layout Schema konnte nicht gespeichert werden: ${parseErrorMessage(error)}`, 'error')
    }
  })

  el.v2PromoteForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    try {
      await promoteV2Release()
      await loadV2Runtime()
      setStatus('v2 Release Promotion abgeschlossen.', 'success')
    } catch (error) {
      setStatus(`v2 Promotion fehlgeschlagen: ${parseErrorMessage(error)}`, 'error')
    }
  })

  el.loadGuideBtn.addEventListener('click', async (event) => {
    event.preventDefault()
    try {
      await loadGuide(el.guideSelect.value)
      setStatus('Guide geladen.', 'success')
    } catch (error) {
      setStatus(`Guide konnte nicht geladen werden: ${parseErrorMessage(error)}`, 'error')
    }
  })
}
