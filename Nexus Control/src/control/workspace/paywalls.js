import { PAYWALL_APP_IDS } from '../constants.js'
import { csvFromList, parseCsvUnique } from '../helpers.js'

const getTierViews = (policies, tier, appId) => {
  const list = policies?.paywalls?.tiers?.[tier]?.viewsByApp?.[appId]
  return Array.isArray(list) ? list : []
}

export const createPaywallActions = ({ el }) => {
  const renderPaywallEditor = (policies) => {
    const paywalls = policies?.paywalls || {}
    const users = paywalls.users || {}

    el.paywallEnabled.value = paywalls.enabled === true ? 'true' : 'false'
    el.paywallDefaultTier.value = paywalls.defaultTier === 'paid' ? 'paid' : 'free'

    el.paywallFreeMain.value = csvFromList(getTierViews(policies, 'free', 'main'))
    el.paywallPaidMain.value = csvFromList(getTierViews(policies, 'paid', 'main'))
    el.paywallFreeMobile.value = csvFromList(getTierViews(policies, 'free', 'mobile'))
    el.paywallPaidMobile.value = csvFromList(getTierViews(policies, 'paid', 'mobile'))
    el.paywallFreeCode.value = csvFromList(getTierViews(policies, 'free', 'code'))
    el.paywallPaidCode.value = csvFromList(getTierViews(policies, 'paid', 'code'))
    el.paywallFreeCodeMobile.value = csvFromList(getTierViews(policies, 'free', 'code-mobile'))
    el.paywallPaidCodeMobile.value = csvFromList(getTierViews(policies, 'paid', 'code-mobile'))

    const freeUsers = []
    const paidUsers = []

    for (const [username, entry] of Object.entries(users)) {
      if (entry?.tier === 'paid') {
        paidUsers.push(username)
      } else {
        freeUsers.push(username)
      }
    }

    el.paywallUsersFree.value = freeUsers.join(',')
    el.paywallUsersPaid.value = paidUsers.join(',')
  }

  const buildPaywallPayloadFromUi = () => {
    const paywalls = {
      enabled: el.paywallEnabled.value === 'true',
      defaultTier: el.paywallDefaultTier.value === 'paid' ? 'paid' : 'free',
      tiers: {
        free: {
          label: 'Free Tier',
          viewsByApp: {
            main: parseCsvUnique(el.paywallFreeMain.value),
            mobile: parseCsvUnique(el.paywallFreeMobile.value),
            code: parseCsvUnique(el.paywallFreeCode.value),
            'code-mobile': parseCsvUnique(el.paywallFreeCodeMobile.value),
          },
        },
        paid: {
          label: 'Paid Tier',
          viewsByApp: {
            main: parseCsvUnique(el.paywallPaidMain.value),
            mobile: parseCsvUnique(el.paywallPaidMobile.value),
            code: parseCsvUnique(el.paywallPaidCode.value),
            'code-mobile': parseCsvUnique(el.paywallPaidCodeMobile.value),
          },
        },
      },
      users: {},
    }

    for (const username of parseCsvUnique(el.paywallUsersFree.value)) {
      paywalls.users[username] = {
        tier: 'free',
        note: 'Control Panel free template',
      }
    }

    for (const username of parseCsvUnique(el.paywallUsersPaid.value)) {
      paywalls.users[username] = {
        tier: 'paid',
        note: 'Control Panel paid template',
      }
    }

    if (Object.keys(paywalls.users).length === 0) {
      paywalls.users.free_demo = { tier: 'free', note: 'Demo Free User' }
      paywalls.users.paid_demo = { tier: 'paid', note: 'Demo Paid User' }
    }

    for (const appId of PAYWALL_APP_IDS) {
      if (paywalls.tiers.paid.viewsByApp[appId].length === 0) {
        paywalls.tiers.paid.viewsByApp[appId] = [...paywalls.tiers.free.viewsByApp[appId]]
      }
    }

    return paywalls
  }

  return {
    renderPaywallEditor,
    buildPaywallPayloadFromUi,
  }
}
