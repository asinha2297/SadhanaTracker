export interface Sloka {
  sanskrit: string[]
  translation: string
  source: string
}

export const HERO_SLOKA: Sloka = {
  sanskrit: ['sarva-dharmān parityajya', 'mām ekaṁ śaraṇaṁ vraja'],
  translation:
    'Abandon all varieties of religion and just surrender unto Me. I shall deliver you from all sinful reactions. Do not fear.',
  source: 'Bhagavad-gītā 18.66',
}

/** A śloka with the picture shown for it in the landing carousel. */
export interface SlokaSlide extends Sloka {
  image: string
  alt: string
}

export const HERO_PORTRAIT = {
  src: '/landing/prabhupada-portrait.jpg',
  alt: 'Mūrti of Śrīla Prabhupāda, garlanded with marigolds and roses',
}

export const SLOKAS: SlokaSlide[] = [
  {
    sanskrit: ['ananyāś cintayanto māṁ', 'ye janāḥ paryupāsate', 'teṣāṁ nityābhiyuktānāṁ', 'yoga-kṣemaṁ vahāmy aham'],
    translation:
      'But those who always worship Me with exclusive devotion, meditating on My transcendental form — to them I carry what they lack, and I preserve what they have.',
    source: 'Bhagavad-gītā 9.22',
    image: '/landing/radha-krishna.jpg',
    alt: 'Kṛṣṇa and Rādhā gazing at each other from a balcony, a Kangra painting',
  },
  {
    sanskrit: ['maharṣīṇāṁ bhṛgur ahaṁ', 'girām asmy ekam akṣaram', 'yajñānāṁ japa-yajño ’smi', 'sthāvarāṇāṁ himālayaḥ'],
    translation:
      'Of the great sages I am Bhṛgu; of vibrations I am the transcendental oṁ. Of sacrifices I am the chanting of the holy names, and of immovable things I am the Himālayas.',
    source: 'Bhagavad-gītā 10.25',
    image: '/landing/prabhupada.jpg',
    alt: 'Śrīla Prabhupāda chanting beside Lord Jagannātha in Golden Gate Park, 1967',
  },
  {
    sanskrit: ['karmaṇy evādhikāras te', 'mā phaleṣu kadācana', 'mā karma-phala-hetur bhūr', 'mā te saṅgo ’stv akarmaṇi'],
    translation:
      'You have a right to perform your prescribed duty, but you are not entitled to the fruits of action. Never consider yourself the cause of the results of your activities, and never be attached to not doing your duty.',
    source: 'Bhagavad-gītā 2.47',
    image: '/landing/krishna-arjuna-chariot.jpg',
    alt: 'Kṛṣṇa and Arjuna on a golden chariot',
  },
  {
    sanskrit: ['yuktāhāra-vihārasya', 'yukta-ceṣṭasya karmasu', 'yukta-svapnāvabodhasya', 'yogo bhavati duḥkha-hā'],
    translation:
      'He who is regulated in his habits of eating, sleeping, recreation and work can mitigate all material pains by practicing the yoga system.',
    source: 'Bhagavad-gītā 6.17',
    image: '/landing/krishna-flute.jpg',
    alt: 'Kṛṣṇa playing His flute among the cows and gopīs, a Pahari painting',
  },
  {
    sanskrit: ['man-manā bhava mad-bhakto', 'mad-yājī māṁ namaskuru', 'mām evaiṣyasi satyaṁ te', 'pratijāne priyo ’si me'],
    translation:
      'Always think of Me, become My devotee, worship Me and offer your homage unto Me. Thus you will come to Me without fail. I promise you this because you are My very dear friend.',
    source: 'Bhagavad-gītā 18.65',
    image: '/landing/krishna-arjuna-kurukshetra.jpg',
    alt: 'Kṛṣṇa and Arjuna on the battlefield of Kurukṣetra, painted about 1820',
  },
  {
    sanskrit: ['harer nāma harer nāma', 'harer nāmaiva kevalam', 'kalau nāsty eva nāsty eva', 'nāsty eva gatir anyathā'],
    translation:
      'In this Age of Kali there is no other means, no other means, no other means for self-realization than chanting the holy name, chanting the holy name, chanting the holy name of Lord Hari.',
    source: 'Bṛhan-nāradīya Purāṇa, quoted in Śrī Caitanya-caritāmṛta Ādi 17.21',
    image: '/landing/caitanya-sankirtana.jpg',
    alt: 'Śrī Caitanya Mahāprabhu leading saṅkīrtana through the streets',
  },
  {
    sanskrit: ['nitya-siddha kṛṣṇa-prema ‘sādhya’ kabhu naya', 'śravaṇādi-śuddha-citte karaye udaya'],
    translation:
      'Pure love for Kṛṣṇa is eternally established in the hearts of the living entities. It is not something to be gained from another source. When the heart is purified by hearing and chanting, this love naturally awakens.',
    source: 'Śrī Caitanya-caritāmṛta Madhya 22.107',
    image: '/landing/yasoda-krishna.jpg',
    alt: 'Mother Yaśodā holding child Kṛṣṇa, by Raja Ravi Varma',
  },
]

export interface Practice {
  sanskrit: string
  title: string
  image: string
  alt: string
  body: string
  teaching: string
  source: string
}

export const PRACTICES: Practice[] = [
  {
    sanskrit: 'japa-yajña',
    title: 'Japa',
    image: '/landing/mala.jpg',
    alt: 'A wooden japa mālā',
    body: 'Count your rounds with a stepper made for the thumb, against the sixteen the congregation recommends or the number you have vowed.',
    teaching: 'Of sacrifices I am the chanting of the holy names.',
    source: 'Bhagavad-gītā 10.25',
  },
  {
    sanskrit: 'svādhyāya',
    title: 'Reading',
    image: '/landing/diya.jpg',
    alt: 'A clay lamp burning in the dark',
    body: "Log each book and chapter in seconds, with Śrīla Prabhupāda's books a tap away.",
    teaching:
      'Just try to learn the truth by approaching a spiritual master. Inquire from him submissively and render service unto him.',
    source: 'Bhagavad-gītā 4.34',
  },
  {
    sanskrit: 'śravaṇam',
    title: 'Hearing',
    image: '/landing/courtyard.jpg',
    alt: 'The marble courtyard of Kṛṣṇa-Balarāma Mandir in Vṛndāvana',
    body: 'Classes, lectures and kīrtana, with the speaker and source remembered for you.',
    teaching:
      'Śrī Kṛṣṇa, who is in everyone’s heart and the benefactor of the truthful devotee, cleanses desire for material enjoyment from the heart of the devotee who has developed the urge to hear His messages.',
    source: 'Śrīmad-Bhāgavatam 1.2.17',
  },
]

export const STEPS = [
  {
    title: 'Record in under two minutes',
    body: 'Open the app, tap your rounds, add what you read and heard. A day with nothing to report is saved honestly as a zero day, never confused with a day you forgot.',
  },
  {
    title: 'See your week against your vow',
    body: 'Rings and a seven-day calendar measure you against the target that was active on that day. Past weeks are never rewritten when targets change.',
  },
  {
    title: 'Share participation, never reflections',
    body: 'Your coordinator sees who recorded and how the group is doing as a whole. What you write for yourself stays yours.',
  },
]

export const QUOTES = [
  {
    text: 'Kṛṣṇa consciousness is not an artificial imposition on the mind. This consciousness is the original energy of the living entity.',
    source: 'Bhagavad-gītā As It Is, Preface',
  },
  {
    text: 'Religion without philosophy is sentiment, or sometimes fanaticism, while philosophy without religion is mental speculation.',
    source: 'Bhagavad-gītā As It Is 3.3, purport',
  },
  {
    text: 'Books are the basis, purity is the force, preaching is the essence, utility is the principle.',
    source: 'Śrīla Prabhupāda',
  },
  { text: 'Chant Hare Kṛṣṇa and be happy.', source: 'Śrīla Prabhupāda' },
]

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
