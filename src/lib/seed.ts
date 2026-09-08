import type { Folder, StudySet } from './types'
import { blankCard } from './factory'
import { uid } from './utils'

type Pair = [string, string]

/** Stable ids so sets and folders can reference each other in the seed. */
const F_SCI = 'seed-folder-science'
const F_LANG = 'seed-folder-languages'
const F_HUM = 'seed-folder-humanities'

export function seedFolders(): Folder[] {
  const now = Date.now()
  return [
    { id: F_SCI,  name: 'Science',    color: '#2fe0b0', createdAt: now },
    { id: F_LANG, name: 'Languages',  color: '#4aa8ff', createdAt: now },
    { id: F_HUM,  name: 'Humanities', color: '#f472b6', createdAt: now },
  ]
}

function makeSet(
  title: string, subject: string, description: string, folderId: string | null,
  pairs: Pair[], langs: [string, string] = ['en-US', 'en-US'],
): StudySet {
  const now = Date.now()
  return {
    id: uid(), title, subject, description, folderId,
    cards: pairs.map(([t, d]) => blankCard(t, d)),
    createdAt: now, updatedAt: now,
    termLang: langs[0], defLang: langs[1],
  }
}

/**
 * Starter content so a first run has something real to study. These are
 * ordinary sets — rename, edit, or delete them like any other.
 */
export function seedSets(): StudySet[] {
  return [
    makeSet(
      'Biology — The Cell', 'Biology',
      'Organelles and their functions. Classic unit-test material.',
      F_SCI,
      [
        ['Mitochondrion', 'Produces ATP through cellular respiration; the powerhouse of the cell'],
        ['Ribosome', 'Site of protein synthesis; translates mRNA into polypeptide chains'],
        ['Nucleus', 'Contains the cell’s DNA and directs all cellular activity'],
        ['Endoplasmic reticulum', 'Network of membranes that transports materials; rough ER makes proteins, smooth ER makes lipids'],
        ['Golgi apparatus', 'Modifies, sorts, and packages proteins for secretion or delivery'],
        ['Lysosome', 'Contains digestive enzymes that break down waste and worn-out organelles'],
        ['Chloroplast', 'Site of photosynthesis in plant cells; contains chlorophyll'],
        ['Cell membrane', 'Selectively permeable barrier that controls what enters and exits the cell'],
        ['Cell wall', 'Rigid outer layer in plants, fungi, and bacteria that provides structure'],
        ['Cytoplasm', 'Jelly-like fluid filling the cell where organelles are suspended'],
        ['Vacuole', 'Storage sac for water, nutrients, and waste; very large in plant cells'],
        ['Cytoskeleton', 'Protein filaments that give the cell shape and enable movement'],
        ['Nucleolus', 'Region inside the nucleus where ribosomes are assembled'],
        ['Vesicle', 'Small membrane sac that transports substances within the cell'],
      ],
    ),

    makeSet(
      'Chemistry — Bonding & Periodic Trends', 'Chemistry',
      'The concepts that show up on every general chemistry exam.',
      F_SCI,
      [
        ['Ionic bond', 'Bond formed when electrons transfer from a metal to a nonmetal, creating oppositely charged ions'],
        ['Covalent bond', 'Bond formed when two atoms share one or more pairs of electrons'],
        ['Metallic bond', 'Attraction between metal cations and a delocalized sea of shared electrons'],
        ['Electronegativity', 'How strongly an atom attracts shared electrons in a bond; increases up and to the right'],
        ['Atomic radius', 'Size of an atom; increases down a group and decreases across a period'],
        ['Ionization energy', 'Energy needed to remove an electron; increases up and to the right'],
        ['Polar covalent bond', 'Covalent bond where electrons are shared unequally due to an electronegativity difference'],
        ['Valence electrons', 'Electrons in the outermost shell that determine bonding behavior'],
        ['Octet rule', 'Atoms tend to gain, lose, or share electrons to reach eight valence electrons'],
        ['Hydrogen bond', 'Attraction between a hydrogen bonded to N, O, or F and a lone pair on a nearby atom'],
        ['Isotope', 'Atoms of the same element with different numbers of neutrons'],
        ['Mole', 'Amount of substance containing 6.022 × 10²³ particles'],
        ['Electron shielding', 'Inner electrons reducing the nucleus’s pull on outer electrons'],
        ['Lewis structure', 'Diagram showing valence electrons and bonds between atoms in a molecule'],
      ],
    ),

    makeSet(
      'Psychology — Research Methods', 'Psychology',
      'The vocabulary AP Psych and intro courses test hardest.',
      F_SCI,
      [
        ['Independent variable', 'The variable the experimenter manipulates'],
        ['Dependent variable', 'The variable that is measured to see if it changed'],
        ['Confounding variable', 'An outside factor that varies with the independent variable and clouds the results'],
        ['Random assignment', 'Placing participants into groups by chance so groups start out equivalent'],
        ['Random sampling', 'Selecting participants so every member of the population has an equal chance'],
        ['Double-blind procedure', 'Neither participants nor researchers know who received the treatment'],
        ['Placebo effect', 'Improvement caused by expectation alone rather than the treatment'],
        ['Correlation', 'A relationship between two variables that does not establish cause'],
        ['Operational definition', 'A precise statement of how a variable is measured in a study'],
        ['Replication', 'Repeating a study to see whether the original findings hold'],
        ['Experimental group', 'Participants who receive the treatment being tested'],
        ['Control group', 'Participants who do not receive the treatment, used for comparison'],
      ],
    ),

    makeSet(
      'Spanish 1 — Everyday Verbs', 'Spanish',
      'The verbs you actually use in conversation. Tap the speaker to hear them.',
      F_LANG,
      [
        ['hablar', 'to speak / to talk'],
        ['comer', 'to eat'],
        ['vivir', 'to live'],
        ['tener', 'to have'],
        ['hacer', 'to do / to make'],
        ['poder', 'to be able to / can'],
        ['querer', 'to want / to love'],
        ['saber', 'to know (a fact)'],
        ['conocer', 'to know (a person or place)'],
        ['venir', 'to come'],
        ['salir', 'to leave / to go out'],
        ['poner', 'to put / to place'],
        ['traer', 'to bring'],
        ['pedir', 'to ask for / to order'],
        ['seguir', 'to follow / to continue'],
        ['empezar', 'to begin / to start'],
      ],
      ['es-ES', 'en-US'],
    ),

    makeSet(
      'SAT Vocabulary — Core 20', 'English',
      'High-frequency words that show up again and again on the reading section.',
      F_HUM,
      [
        ['Ubiquitous', 'Present everywhere at once; seeming to appear in all places'],
        ['Ephemeral', 'Lasting for a very short time; fleeting'],
        ['Pragmatic', 'Dealing with things sensibly and realistically rather than theoretically'],
        ['Ambivalent', 'Having mixed or contradictory feelings about something'],
        ['Meticulous', 'Showing great attention to detail; very careful and precise'],
        ['Candid', 'Truthful and straightforward; frank'],
        ['Prudent', 'Acting with or showing care and thought for the future'],
        ['Superfluous', 'Unnecessary, especially through being more than enough'],
        ['Tenacious', 'Holding firmly to something; persistent and determined'],
        ['Innocuous', 'Not harmful or offensive'],
        ['Arduous', 'Involving strenuous effort; difficult and tiring'],
        ['Lucid', 'Expressed clearly and easy to understand'],
        ['Obsolete', 'No longer produced or used; out of date'],
        ['Placate', 'To make someone less angry or hostile; to appease'],
        ['Reticent', 'Not revealing thoughts or feelings readily; reserved'],
        ['Substantiate', 'To provide evidence to support or prove the truth of'],
        ['Trivial', 'Of little value or importance'],
        ['Venerate', 'To regard with great respect; to revere'],
        ['Zealous', 'Showing great energy or enthusiasm for a cause'],
        ['Nuance', 'A subtle difference in meaning, expression, or sound'],
      ],
    ),

    makeSet(
      'US History — Founding Documents', 'History',
      'Documents, clauses, and cases that anchor the first unit.',
      F_HUM,
      [
        ['Declaration of Independence (1776)', 'Announced the colonies’ separation from Britain and argued government derives its power from the consent of the governed'],
        ['Articles of Confederation', 'First US government; a weak central government with no power to tax or regulate trade'],
        ['Constitution (1787)', 'Established the federal government with three branches and a system of checks and balances'],
        ['Bill of Rights', 'The first ten amendments, guaranteeing individual liberties such as speech, religion, and due process'],
        ['Federalism', 'Division of power between the national government and the states'],
        ['Separation of powers', 'Splitting government authority among legislative, executive, and judicial branches'],
        ['Checks and balances', 'Each branch holds powers that limit the other two'],
        ['Great Compromise', 'Created a bicameral legislature: population-based House and equal-representation Senate'],
        ['Federalist Papers', 'Essays by Hamilton, Madison, and Jay arguing for ratification of the Constitution'],
        ['Marbury v. Madison (1803)', 'Established judicial review, letting the Supreme Court strike down unconstitutional laws'],
        ['Elastic clause', 'Grants Congress power to make all laws "necessary and proper" to carry out its duties'],
        ['Supremacy clause', 'Makes federal law take precedence over conflicting state law'],
      ],
    ),
  ]
}
