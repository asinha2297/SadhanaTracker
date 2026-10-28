export const HERO_PORTRAIT_SRC = '/landing/prabhupada-portrait.jpg'

/** Pictures for the landing ślokas and practice cards, in the order of the dictionary's entries (see i18n/en.ts). */
export const SLOKA_IMAGES = [
  '/landing/radha-krishna.jpg',
  '/landing/prabhupada.jpg',
  '/landing/krishna-arjuna-chariot.jpg',
  '/landing/krishna-flute.jpg',
  '/landing/krishna-arjuna-kurukshetra.jpg',
  '/landing/caitanya-sankirtana.jpg',
  '/landing/yasoda-krishna.jpg',
]

export const PRACTICE_IMAGES = ['/landing/mala.jpg', '/landing/diya.jpg', '/landing/courtyard.jpg']

export interface Credit {
  subject: string
  artist: string
  license: string
  licenseUrl: string
  page: string
}

const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
const BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0/'
const BY_SA_3 = 'https://creativecommons.org/licenses/by-sa/3.0/'
const BY_2 = 'https://creativecommons.org/licenses/by/2.0/'

/** Attribution as the licences require it, so it stays in the artists' own language. */
export const CREDITS: Credit[] = [
  {
    subject: 'Mūrti of Śrīla Prabhupāda',
    artist: 'Dedda71',
    license: 'CC BY-SA 3.0',
    licenseUrl: BY_SA_3,
    page: 'https://commons.wikimedia.org/wiki/File:Prabhupada_statue_(detail).jpg',
  },
  {
    subject: 'Japa mālā',
    artist: 'Celiafp43',
    license: 'CC BY-SA 4.0',
    licenseUrl: BY_SA_4,
    page: 'https://commons.wikimedia.org/wiki/File:Collar_japa_mala.jpg',
  },
  {
    subject: 'Oil lamp',
    artist: 'Arne Hückelheim',
    license: 'CC BY-SA 3.0',
    licenseUrl: BY_SA_3,
    page: 'https://commons.wikimedia.org/wiki/File:DiwaliOilLampCrop.JPG',
  },
  {
    subject: 'Kṛṣṇa-Balarāma Mandir',
    artist: 'Goutam1962',
    license: 'CC BY-SA 4.0',
    licenseUrl: BY_SA_4,
    page: 'https://commons.wikimedia.org/wiki/File:Sri_Krishna_Balaram_Mandir_Vrindavan_27.jpg',
  },
  {
    subject: 'ISKCON Māyāpur',
    artist: 'Joydeep',
    license: 'CC BY-SA 3.0',
    licenseUrl: BY_SA_3,
    page: 'https://commons.wikimedia.org/wiki/File:Sri_Krishna_Temple,_ISKCON,_Mayapur.jpg',
  },
  {
    subject: 'Peacock feather',
    artist: 'sjoe (Kochi, Kerala)',
    license: 'CC BY 2.0',
    licenseUrl: BY_2,
    page: 'https://commons.wikimedia.org/wiki/File:Eye_drop_-_Flickr_-_sjoe.jpg',
  },
  {
    subject: 'Kṛṣṇa and Rādhā, Kangra school (Tokyo National Museum)',
    artist: 'photograph by Wmpearl',
    license: 'CC0',
    licenseUrl: CC0,
    page: 'https://commons.wikimedia.org/wiki/File:Krishna_and_Radha,_Kangra_school,_watercolor_and_gold,_Tokyo_National_Museum.JPG',
  },
  {
    subject: 'Śrīla Prabhupāda in Golden Gate Park, 1967',
    artist: 'Mukunda Goswami',
    license: 'CC BY-SA 3.0',
    licenseUrl: BY_SA_3,
    page: 'https://commons.wikimedia.org/wiki/File:Bhaktivedanta_Swami_with_Jagannath_in_Golden_Gate_Park,_February_1967.jpg',
  },
  {
    subject: 'Kṛṣṇa and Arjuna on the chariot (British Museum)',
    artist: 'unknown artist',
    license: 'public domain',
    licenseUrl: '',
    page: 'https://commons.wikimedia.org/wiki/File:Krishna_Arjuna_Gita.jpg',
  },
  {
    subject: 'Kṛṣṇa with flute, Pahari school (Freer Gallery of Art)',
    artist: 'unknown artist',
    license: 'CC0',
    licenseUrl: CC0,
    page: 'https://commons.wikimedia.org/wiki/File:Krishna_with_flute.jpg',
  },
  {
    subject: 'Kṛṣṇa and Arjuna at Kurukṣetra (San Diego Museum of Art)',
    artist: 'unknown artist, about 1820',
    license: 'public domain',
    licenseUrl: '',
    page: 'https://commons.wikimedia.org/wiki/File:Dialogue_between_Krishna_and_Arjuna_on_the_battlefield_of_Kurukshetra_(6124590103).jpg',
  },
  {
    subject: 'Śrī Caitanya’s nagara-kīrtana (British Library)',
    artist: 'Calcutta Art Studio',
    license: 'public domain',
    licenseUrl: '',
    page: 'https://commons.wikimedia.org/wiki/File:Chaitanya_sankirtan.jpg',
  },
  {
    subject: 'Yaśodā and Kṛṣṇa',
    artist: 'Raja Ravi Varma',
    license: 'public domain',
    licenseUrl: '',
    page: 'https://commons.wikimedia.org/wiki/File:Yashoda_with_Krishna,_Raja_Ravi_Varma.jpg',
  },
  {
    subject: 'Dawn on the Gaṅgā',
    artist: 'Forhomejio',
    license: 'CC BY-SA 4.0',
    licenseUrl: BY_SA_4,
    page: 'https://commons.wikimedia.org/wiki/File:River_Ganga_-Varanasi_-Uttar_Pradesh_-DSC_0002.jpg',
  },
]
