import { dayOfWeek, type LocalDate } from '@sadhana/domain'

export interface Verse {
  text: string
  source: string
}

const VERSES: Verse[] = [
  {
    text: 'Always think of Me, become My devotee, worship Me and offer your homage unto Me.',
    source: 'Bhagavad-gītā 18.65',
  },
  { text: 'Of sacrifices I am the chanting of the holy names.', source: 'Bhagavad-gītā 10.25' },
  {
    text: 'One should chant the holy name of the Lord in a humble state of mind, thinking oneself lower than the straw in the street.',
    source: 'Śikṣāṣṭaka 3',
  },
  {
    text: 'He who is regulated in his habits of eating, sleeping, recreation and work can mitigate all material pains.',
    source: 'Bhagavad-gītā 6.17',
  },
  {
    text: 'To those who are constantly devoted to serving Me with love, I give the understanding by which they can come to Me.',
    source: 'Bhagavad-gītā 10.10',
  },
  {
    text: 'You have a right to perform your prescribed duty, but you are not entitled to the fruits of action.',
    source: 'Bhagavad-gītā 2.47',
  },
  {
    text: 'Glory to the śrī-kṛṣṇa-saṅkīrtana, which cleanses the heart of all the dust accumulated for years.',
    source: 'Śikṣāṣṭaka 1',
  },
]

export const verseFor = (localDate: LocalDate): Verse => VERSES[dayOfWeek(localDate)] as Verse
