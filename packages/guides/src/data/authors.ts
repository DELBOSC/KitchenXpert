/**
 * Author registry — referenced by every article via `frontmatter.author`.
 *
 * Keeping the data here (vs in MDX frontmatter) means:
 *   - one place to update bios / titles / avatars
 *   - JSON-LD `author` is generated automatically with the right schema
 *   - the registry is small enough that adding an "invited expert"
 *     entry is a 4-line PR.
 */

export const AUTHORS = {
  laurent: {
    displayName: 'Laurent Delbosc',
    title: 'Fondateur, KitchenXpert',
    initials: 'LD',
    bio: 'Architecte d\'intérieur reconverti en SaaS. 15 ans à concevoir des cuisines avant de les coder.',
    url: 'https://kitchenxpert.com/team/laurent',
  },
  redaction: {
    displayName: 'Rédaction KitchenXpert',
    title: 'Équipe éditoriale',
    initials: 'KX',
    bio: "L'équipe éditoriale de KitchenXpert : architectes, cuisinistes et journalistes spécialisés en aménagement d'intérieur.",
    url: 'https://kitchenxpert.com/team',
  },
  invited: {
    displayName: 'Contributeur invité',
    title: 'Expert externe',
    initials: 'IN',
    bio: 'Expert sectoriel invité ; voir l\'encadré en pied d\'article pour la bio détaillée.',
    url: 'https://kitchenxpert.com/team/invited',
  },
} as const;

export type AuthorKey = keyof typeof AUTHORS;
