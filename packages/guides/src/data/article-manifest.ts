/**
 * The 50 launch articles, declared as data.
 *
 * Run `node scripts/new-article.mjs --all` to materialize every entry
 * below as an empty MDX stub under `src/content/<collection>/<slug>.mdx`.
 * Already-existing files are NOT overwritten.
 *
 * Editing rules:
 *   - **slug** is part of the URL — never change it after publication
 *     (set up a redirect instead).
 *   - **template** must match a collection name in `src/content/config.ts`.
 *   - **keywords** drive the related-articles graph; share at least one
 *     keyword with each article you want to link from.
 *   - **estWords** is the rough target — used by the workflow doc to
 *     plan a writing sprint, not enforced.
 */

export type ArticleTemplate =
  | 'layouts'      // /guides/<slug>
  | 'cuisinistes'  // /cuisinistes/<slug>
  | 'budgets'      // /budget/<slug>
  | 'styles'       // /styles/<slug>
  | 'comparatifs'  // /comparatifs/<slug>
  | 'pratiques';   // /guides/<slug>

export interface ArticleManifestEntry {
  slug: string;
  template: ArticleTemplate;
  title: string;
  description: string;
  keywords: string[];
  estWords: number;
}

export const ARTICLE_MANIFEST: ArticleManifestEntry[] = [
  // ── Layouts (8) ──────────────────────────────────────────────────────────
  { slug: 'cuisine-en-l',                template: 'layouts',  title: 'Cuisine en L : guide complet aménagement, prix, exemples', description: 'Aménagement, dimensions types, budget moyen et 5 exemples 3D. Le format le plus polyvalent pour 6 à 12 m².', keywords: ['cuisine en l', 'layout', 'amenagement', 'plan'], estWords: 2000 },
  { slug: 'cuisine-en-u',                template: 'layouts',  title: 'Cuisine en U : avantages, dimensions, 5 plans-types', description: 'Tout sur la cuisine en U : triangle d\'activité, m² minimum, fourchettes de prix et exemples 3D pour visualiser.', keywords: ['cuisine en u', 'layout', 'triangle activite'], estWords: 2000 },
  { slug: 'cuisine-parallele',           template: 'layouts',  title: 'Cuisine parallèle (galley) : à qui ça convient ?', description: 'La cuisine parallèle ou « galley » : idéale pour les couloirs étroits. Plans, contraintes et budget réaliste.', keywords: ['cuisine parallele', 'galley', 'couloir', 'layout'], estWords: 1800 },
  { slug: 'cuisine-avec-ilot',           template: 'layouts',  title: 'Cuisine avec îlot central : dimensions, prix, conseils', description: 'L\'îlot central transforme votre cuisine. Conditions de faisabilité (≥ 12 m²), prix moyen et 5 plans-types.', keywords: ['ilot central', 'cuisine ilot', 'amenagement'], estWords: 2200 },
  { slug: 'cuisine-ouverte-sur-salon',   template: 'layouts',  title: 'Cuisine ouverte sur salon : 5 plans qui marchent', description: 'Cuisine ouverte vs séjour : gestion des odeurs, du bruit, du visuel. Plans types, budget et erreurs à éviter.', keywords: ['cuisine ouverte', 'sejour', 'salon', 'amenagement'], estWords: 2000 },
  { slug: 'cuisine-fermee',              template: 'layouts',  title: 'Cuisine fermée : pourquoi c\'est encore un excellent choix', description: 'La cuisine fermée fait son retour. Avantages (odeurs, bruit, rangement), inconvénients et 5 plans optimisés.', keywords: ['cuisine fermee', 'amenagement', 'avantages'], estWords: 1800 },
  { slug: 'petite-cuisine-amenagement',  template: 'layouts',  title: 'Petite cuisine (4 à 7 m²) : 12 astuces d\'aménagement', description: '12 astuces concrètes pour aménager une petite cuisine sans sacrifier le confort. Plans types et exemples 3D.', keywords: ['petite cuisine', 'amenagement', 'optimisation'], estWords: 1900 },
  { slug: 'grande-cuisine-amenagement',  template: 'layouts',  title: 'Grande cuisine (>15 m²) : éviter les pièges du « trop d\'espace »', description: 'Une grande cuisine, mal pensée, devient un couloir. 8 règles d\'or et 5 plans-types pour 15 à 30 m².', keywords: ['grande cuisine', 'amenagement', '15m2', 'erreurs'], estWords: 2000 },

  // ── Cuisinistes (10) ─────────────────────────────────────────────────────
  { slug: 'schmidt',         template: 'cuisinistes', title: 'Schmidt cuisines : avis, prix, gammes (guide 2026)', description: 'Schmidt en 2026 : prix au mètre linéaire, gammes Loft / Strato / Arcos, délais, avis clients. Notre verdict honnête.', keywords: ['schmidt', 'cuisiniste', 'avis', 'prix'], estWords: 2200 },
  { slug: 'mobalpa',         template: 'cuisinistes', title: 'Mobalpa : tout savoir avant de signer (avis 2026)', description: 'Mobalpa décortiqué : prix moyens, qualité réelle, SAV, comparatif vs Schmidt et Cuisinella. Pour ou contre ?', keywords: ['mobalpa', 'cuisiniste', 'avis', 'prix'], estWords: 2200 },
  { slug: 'cuisinella',      template: 'cuisinistes', title: 'Cuisinella : qualité, prix, SAV — l\'analyse honnête', description: 'Cuisinella en 2026 : positionnement entrée-de-gamme, prix au ML, SAV, retours d\'expérience clients.', keywords: ['cuisinella', 'cuisiniste', 'avis'], estWords: 2000 },
  { slug: 'lapeyre',         template: 'cuisinistes', title: 'Lapeyre cuisines : encore un bon choix en 2026 ?', description: 'Lapeyre cuisines : positionnement, prix, qualité des matériaux, comparatif vs IKEA et Leroy Merlin.', keywords: ['lapeyre', 'cuisiniste', 'avis'], estWords: 2000 },
  { slug: 'ikea',            template: 'cuisinistes', title: 'Cuisine IKEA METOD : avis 2026, vrai prix tout compris', description: 'IKEA METOD passé au crible : prix réel (caissons, façades, plan, électroménager), montage, SAV, garantie 25 ans.', keywords: ['ikea', 'metod', 'cuisiniste', 'prix'], estWords: 2400 },
  { slug: 'leroy-merlin',    template: 'cuisinistes', title: 'Cuisine Leroy Merlin Delinia : prix, gammes, conception', description: 'Delinia ID, Style et la conception sur-mesure : ce qu\'il faut savoir avant de commander chez Leroy Merlin.', keywords: ['leroy merlin', 'delinia', 'cuisiniste'], estWords: 2200 },
  { slug: 'castorama',       template: 'cuisinistes', title: 'Cuisine Castorama : ce qu\'on en pense (vraiment)', description: 'Castorama cuisines : tarifs, conception 3D gratuite, qualité des caissons, comparatif vs Brico Dépôt.', keywords: ['castorama', 'cuisiniste', 'avis'], estWords: 2000 },
  { slug: 'brico-depot',     template: 'cuisinistes', title: 'Cuisine Brico Dépôt : le bon plan vraiment ?', description: 'Brico Dépôt cuisine : positionnement low-cost, qualité réelle, caissons et façades. Pour qui c\'est fait.', keywords: ['brico depot', 'cuisiniste', 'low cost'], estWords: 1800 },
  { slug: 'but',             template: 'cuisinistes', title: 'Cuisine BUT : à éviter ou bonne affaire ?', description: 'BUT cuisines analysées : positionnement, prix moyens, qualité réelle. Notre verdict basé sur 50 retours clients.', keywords: ['but', 'cuisiniste', 'avis'], estWords: 1700 },
  { slug: 'conforama',       template: 'cuisinistes', title: 'Cuisine Conforama : avis, prix, alternatives', description: 'Conforama cuisines passées en revue : entrée de gamme, conception, livraison, SAV. Faut-il y aller ?', keywords: ['conforama', 'cuisiniste', 'avis'], estWords: 1700 },

  // ── Budgets (8) ──────────────────────────────────────────────────────────
  { slug: 'cuisine-3000-euros',  template: 'budgets', title: 'Cuisine à 3 000 € : c\'est encore possible en 2026 ?', description: 'Une cuisine équipée à 3 000 € : ce que vous obtenez, où il faut couper, et 3 configurations qui passent.', keywords: ['budget', '3000 euros', 'low cost'], estWords: 1800 },
  { slug: 'cuisine-5000-euros',  template: 'budgets', title: 'Cuisine 5 000 € : le bon compromis pour 80 % des projets', description: 'Le budget « peace of mind » : ce que 5 000 € permettent en caissons, plan, électroménager et pose.', keywords: ['budget', '5000 euros', 'compromis'], estWords: 1900 },
  { slug: 'cuisine-7500-euros',  template: 'budgets', title: 'Cuisine 7 500 € : monter en gamme intelligemment', description: 'À 7 500 €, vous accédez aux façades premium, à l\'induction et à un plan quartz. Détail des arbitrages.', keywords: ['budget', '7500 euros', 'milieu de gamme'], estWords: 1900 },
  { slug: 'cuisine-10000-euros', template: 'budgets', title: 'Cuisine 10 000 € : ce que vous pouvez vraiment avoir', description: 'Budget 10 000 € : électroménager grande marque, plan dekton ou quartz, façades laquées. Bilan complet.', keywords: ['budget', '10000 euros', 'haut de gamme accessible'], estWords: 2000 },
  { slug: 'cuisine-15000-euros', template: 'budgets', title: 'Cuisine 15 000 € : haut de gamme accessible', description: 'À 15 000 €, on signe chez Schmidt ou Mobalpa entrée. Détail de ce qu\'inclut ce budget en 2026.', keywords: ['budget', '15000 euros', 'haut de gamme'], estWords: 2000 },
  { slug: 'cuisine-20000-euros', template: 'budgets', title: 'Cuisine 20 000 € : entrée du sur-mesure', description: 'Le ticket d\'entrée pour du vrai sur-mesure : agencement complexe, électroménager pro, finitions premium.', keywords: ['budget', '20000 euros', 'sur mesure'], estWords: 2000 },
  { slug: 'cuisine-30000-euros', template: 'budgets', title: 'Cuisine 30 000 € : ce que vous payez (et pour quoi)', description: 'Budget 30 000 € : marbre, électroménager Miele, sur-mesure complet. Qu\'est-ce qui justifie le prix ?', keywords: ['budget', '30000 euros', 'premium'], estWords: 1900 },
  { slug: 'cuisine-50000-euros', template: 'budgets', title: 'Cuisine 50 000 € et plus : le luxe a-t-il un sens ?', description: 'À 50 000 €+, on entre dans le luxe : Boffi, Bulthaup, Poliform. Décryptage de ce que ça achète vraiment.', keywords: ['budget', '50000 euros', 'luxe'], estWords: 2100 },

  // ── Styles (10) ──────────────────────────────────────────────────────────
  { slug: 'cuisine-scandinave',     template: 'styles', title: 'Cuisine scandinave : codes, matériaux, exemples', description: 'Le style scandinave en cuisine : bois clair, blanc, lignes épurées, fonctionnalité. Codes et erreurs.', keywords: ['scandinave', 'style', 'bois clair'], estWords: 1900 },
  { slug: 'cuisine-industrielle',   template: 'styles', title: 'Cuisine industrielle : guide complet (matériaux, prix)', description: 'Style industriel en cuisine : métal noir, briques, béton. Matériaux, fournisseurs et 5 inspirations 3D.', keywords: ['industrielle', 'style', 'metal', 'beton'], estWords: 2000 },
  { slug: 'cuisine-moderne',        template: 'styles', title: 'Cuisine moderne 2026 : tendances et erreurs à éviter', description: 'Ce qui est « moderne » en cuisine en 2026 : poignées invisibles, façades laquées, électroménager intégré.', keywords: ['moderne', 'style', 'tendance'], estWords: 1900 },
  { slug: 'cuisine-contemporaine',  template: 'styles', title: 'Cuisine contemporaine : la définition exacte', description: 'Différence entre moderne et contemporaine, codes du style contemporain, matériaux et inspirations.', keywords: ['contemporaine', 'style', 'moderne'], estWords: 1700 },
  { slug: 'cuisine-campagne',       template: 'styles', title: 'Cuisine de campagne : le retour gagnant', description: 'Style campagne / farmhouse : bois patiné, évier en grès, étagères ouvertes. Ce qui marche et ce qui pue.', keywords: ['campagne', 'farmhouse', 'rustique'], estWords: 1800 },
  { slug: 'cuisine-provencale',     template: 'styles', title: 'Cuisine provençale : entre tradition et modernité', description: 'Codes de la cuisine provençale : pierre, terre cuite, bleu lavande. Comment éviter le « trop daté ».', keywords: ['provencale', 'sud', 'tradition'], estWords: 1700 },
  { slug: 'cuisine-minimaliste',    template: 'styles', title: 'Cuisine minimaliste : moins de meubles, plus de design', description: 'Le minimalisme en cuisine : poignées invisibles, monochrome, rangement caché. Inspirations Nordiska Kök.', keywords: ['minimaliste', 'style', 'epure'], estWords: 1800 },
  { slug: 'cuisine-boheme',         template: 'styles', title: 'Cuisine bohème : couleurs, motifs, accumulations', description: 'Le style bohème en cuisine : carreaux de ciment, plantes, ouvertures, couleurs. Mode d\'emploi.', keywords: ['boheme', 'style', 'couleurs'], estWords: 1700 },
  { slug: 'cuisine-art-deco',       template: 'styles', title: 'Cuisine Art Déco : retour des années folles', description: 'L\'Art Déco en cuisine : laitons, marbres, motifs géométriques. 5 réalisations contemporaines décryptées.', keywords: ['art deco', 'style', 'laiton', 'marbre'], estWords: 1800 },
  { slug: 'cuisine-japonaise',      template: 'styles', title: 'Cuisine japonaise (wabi-sabi) : sobriété et matières', description: 'Influence japonaise / wabi-sabi en cuisine : bois brut, lignes basses, matières imparfaites.', keywords: ['japonaise', 'wabi-sabi', 'style'], estWords: 1700 },

  // ── Comparatifs (8) ──────────────────────────────────────────────────────
  { slug: 'ikea-vs-leroy-merlin',                 template: 'comparatifs', title: 'IKEA vs Leroy Merlin : qui gagne pour votre cuisine ?', description: 'IKEA METOD vs Leroy Merlin Delinia : prix, qualité, conception, SAV. Verdict par profil utilisateur.', keywords: ['ikea', 'leroy merlin', 'comparatif'], estWords: 2200 },
  { slug: 'schmidt-vs-mobalpa',                   template: 'comparatifs', title: 'Schmidt vs Mobalpa : duel des cuisinistes français', description: 'Schmidt vs Mobalpa : prix au mètre linéaire, gammes, qualité, délais. Notre verdict en 2026.', keywords: ['schmidt', 'mobalpa', 'comparatif'], estWords: 2100 },
  { slug: 'cuisine-sur-mesure-vs-kit',            template: 'comparatifs', title: 'Cuisine sur-mesure vs en kit : 5 critères de décision', description: 'Sur-mesure vs kit : différences réelles, surcoût, valeur ajoutée. Tableau de décision par contrainte.', keywords: ['sur mesure', 'kit', 'comparatif'], estWords: 2000 },
  { slug: 'cuisiniste-vs-en-ligne',               template: 'comparatifs', title: 'Cuisiniste vs achat en ligne : qui choisir en 2026 ?', description: 'Cuisiniste physique vs achat 100 % en ligne (KitchenXpert, Cuisine Plus) : prix, accompagnement, SAV.', keywords: ['cuisiniste', 'en ligne', 'comparatif'], estWords: 2000 },
  { slug: 'electromenager-bosch-vs-siemens',      template: 'comparatifs', title: 'Bosch vs Siemens : électroménager cuisine 2026', description: 'Bosch et Siemens (même groupe BSH) : différences réelles, prix, gammes. Pour qui chaque marque est pensée.', keywords: ['bosch', 'siemens', 'electromenager', 'comparatif'], estWords: 2000 },
  { slug: 'plan-travail-quartz-vs-granit',        template: 'comparatifs', title: 'Plan de travail quartz vs granit : comparatif 2026', description: 'Quartz vs granit : prix, durabilité, entretien, esthétique. Tableau de décision et erreurs à éviter.', keywords: ['quartz', 'granit', 'plan travail', 'comparatif'], estWords: 2000 },
  { slug: 'induction-vs-vitroceramique',          template: 'comparatifs', title: 'Induction vs vitrocéramique : laquelle choisir ?', description: 'Plaque induction vs vitrocéramique : conso énergétique, prix, vitesse, sécurité. Verdict par usage.', keywords: ['induction', 'vitroceramique', 'plaque', 'comparatif'], estWords: 1900 },
  { slug: 'cuisine-blanche-vs-noire',             template: 'comparatifs', title: 'Cuisine blanche vs noire : laquelle vieillit le mieux ?', description: 'Cuisine blanche vs noire : entretien, valeur de revente, lumière. Notre verdict après 5 ans de recul.', keywords: ['blanche', 'noire', 'couleur', 'comparatif'], estWords: 1800 },

  // ── Pratiques (6) ────────────────────────────────────────────────────────
  { slug: 'comment-mesurer-sa-cuisine',     template: 'pratiques', title: 'Comment mesurer sa cuisine : checklist complète', description: 'Mesurer sa cuisine sans erreur : outils, ordre des mesures, pièges. Plan annoté à imprimer (PDF).', keywords: ['mesurer', 'metrer', 'plan'], estWords: 1700 },
  { slug: 'triangle-activite-cuisine',      template: 'pratiques', title: 'Le triangle d\'activité : règle d\'or de l\'ergonomie', description: 'Triangle évier-feu-frigo : la règle qui détermine la fonctionnalité. Mesures, exceptions, schémas.', keywords: ['triangle activite', 'ergonomie', 'evier'], estWords: 1600 },
  { slug: 'normes-electriques-cuisine',     template: 'pratiques', title: 'Normes électriques cuisine NF C 15-100 (2026)', description: 'NF C 15-100 cuisine : nombre de prises, hauteurs, distances eau, IP des luminaires. Schémas conformes.', keywords: ['normes', 'electricite', 'NF C 15-100'], estWords: 1800 },
  { slug: 'credit-impot-cuisine',           template: 'pratiques', title: 'Crédit d\'impôt cuisine : ce qui est éligible en 2026', description: 'Quels travaux cuisine ouvrent droit au crédit d\'impôt en 2026 (CITE, MaPrimeRénov, TVA réduite).', keywords: ['credit impot', 'fiscalite', 'TVA'], estWords: 1700 },
  { slug: 'tva-renovation-cuisine',         template: 'pratiques', title: 'TVA cuisine : 5,5 %, 10 % ou 20 % ?', description: 'Quel taux de TVA pour votre cuisine en 2026 ? Conditions, justificatifs, erreurs courantes des artisans.', keywords: ['TVA', 'fiscalite', 'renovation'], estWords: 1500 },
  { slug: 'garanties-cuisinistes',          template: 'pratiques', title: 'Garanties cuisinistes : ce qu\'on vous cache', description: 'Garanties légales vs commerciales, durée réelle, exclusions. Comment forcer un cuisiniste à honorer.', keywords: ['garantie', 'SAV', 'cuisiniste'], estWords: 1700 },
];

// Quick sanity helper used by the generator script.
export function manifestSummary(): { total: number; byTemplate: Record<string, number> } {
  const byTemplate: Record<string, number> = {};
  for (const a of ARTICLE_MANIFEST) {
    byTemplate[a.template] = (byTemplate[a.template] || 0) + 1;
  }
  return { total: ARTICLE_MANIFEST.length, byTemplate };
}
