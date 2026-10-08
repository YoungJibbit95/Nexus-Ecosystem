export { createProductNavigation, type ProductNavigationRequest } from '../../../packages/nexus-core/src/planning/productNavigation'
import { getProductNavigation } from '../../../packages/nexus-core/src/planning/productNavigation'
export const productNavigation = getProductNavigation('main')
