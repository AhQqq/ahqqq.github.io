import rawStartingArts from '../data/starting_arts.json'
import type { ArtOption, StartingArts } from '../../shared/artSelection'

const catalogues = import.meta.glob<ArtOption[]>('../data/arts/*_arts.json', { eager: true, import: 'default' })
export const ARTS = Object.values(catalogues).flat()
export const STARTING_ARTS = rawStartingArts as StartingArts
