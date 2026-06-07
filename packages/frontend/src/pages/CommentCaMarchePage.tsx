import { ArrowRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { HeroVideo } from '../components/Hero/HeroVideo';
import { TrustBar } from '../components/Hero/TrustBar';
import { SeoHead } from '../components/seo/SeoHead';

/**
 * /comment-ca-marche — page longue qui explicite chaque fonctionnalité
 * du designer. Sert deux objectifs :
 *
 *   1. SEO : 10 sections H2 ciblées sur des intentions de recherche
 *      ("snap intelligent cuisine", "rendu photoréaliste cuisine", etc.)
 *   2. Conversion : chaque section a un CTA contextuel vers
 *      /designer/sandbox avec un utm_campaign différent — on saura
 *      QUELLE feature convertit.
 *
 * Les 10 captures annotées sont en placeholder SVG ; à remplacer par
 * de vraies captures du designer (cf docs/HERO-VIDEO.md § Captures).
 */

interface FeatureSectionProps {
  index: number;
  id: string;
  title: string;
  utmTag: string;
  paragraph1: string;
  paragraph2: string;
  capture: React.ReactNode;
  /** Image à droite (true) ou gauche (false) — alterne pour le rythme. */
  imageRight?: boolean;
}

function FeatureSection({
  index, id, title, utmTag, paragraph1, paragraph2, capture, imageRight = true,
}: FeatureSectionProps): React.ReactElement {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="border-t border-white/5 py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className={`grid items-center gap-12 lg:grid-cols-2 ${imageRight ? '' : 'lg:[direction:rtl]'}`}>
          <div className="lg:[direction:ltr]">
            <div className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/55">
              <span className="font-mono tabular-nums">{String(index).padStart(2, '0')}</span>
              <span aria-hidden>·</span>
              <span>Fonctionnalité</span>
            </div>
            <h2
              id={`${id}-title`}
              className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl"
            >
              {title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/70">{paragraph1}</p>
            <p className="mt-3 text-base leading-relaxed text-white/55">{paragraph2}</p>

            <Link
              to={`/designer/sandbox?utm_source=how&utm_medium=section&utm_campaign=${utmTag}`}
              className="group mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-white/30 hover:bg-white/10"
            >
              Tester {title.toLowerCase()}
              <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="lg:[direction:ltr]">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-black/80 shadow-[0_30px_60px_rgba(99,102,241,0.12)]">
              {capture}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Capture placeholders — remplacer par de vraies captures PNG/WebP.
// ---------------------------------------------------------------------------
const PlaceholderCapture = ({ label }: { label: string }): React.ReactElement => (
  <div className="flex aspect-[16/10] items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-3 h-2 w-12 rounded-full bg-white/10" />
      <div className="text-xs font-medium uppercase tracking-widest text-white/55">{label}</div>
      <div className="mt-1 text-[10px] text-white/25">Capture à fournir — voir docs/HERO-VIDEO.md</div>
    </div>
  </div>
);

const FEATURES: Array<Omit<FeatureSectionProps, 'index' | 'imageRight'>> = [
  {
    id: 'snap',
    title: 'Snap intelligent',
    utmTag: 'snap',
    paragraph1: "Les caissons s'alignent automatiquement aux murs et entre eux : pas de millimètre perdu, pas d'écart de 3 mm gênant à l'œil. Les guides bleus apparaissent dès qu'un alignement est détecté, et disparaissent une fois l'objet posé.",
    paragraph2: "Le snap fonctionne sur les axes X/Y/Z, sur les centres et sur les arêtes. Vous pouvez le désactiver temporairement en maintenant ⌥ (Mac) ou Alt (PC).",
    capture: <PlaceholderCapture label="Snap & alignement" />,
  },
  {
    id: 'brand-profiles',
    title: 'Brand profiles : 5 fournisseurs en un clic',
    utmTag: 'brand_profiles',
    paragraph1: "Concevez une fois, comparez chez IKEA, Schmidt, Mobalpa, Leroy Merlin et Bosch. Le moteur réajuste les dimensions standard de chaque marque (60 cm chez IKEA, 63 cm chez certains Schmidt) sans casser votre layout.",
    paragraph2: "Le devis se recalcule en parallèle dans le panneau de droite — vous voyez l'écart de prix avant même d'avoir cliqué.",
    capture: <PlaceholderCapture label="Switch IKEA → Schmidt" />,
  },
  {
    id: 'pathtracer',
    title: 'Path-tracer photoréaliste',
    utmTag: 'pathtracer',
    paragraph1: "Cliquez « Rendu HD » et le path-tracer accumule l'éclairage en temps réel. En 4 secondes, vous obtenez un rendu de niveau magazine : reflets sur l'inox, ombres douces sous les meubles hauts, profondeur de champ sur le plan de travail.",
    paragraph2: "Le moteur tourne sur GPU côté navigateur (WebGPU/WebGL2). Sur compte payant, vous accédez à 4K + 64 samples par pixel.",
    capture: <PlaceholderCapture label="Rendu path-tracé" />,
  },
  {
    id: 'ar-vr',
    title: 'Réalité augmentée + VR',
    utmTag: 'ar_vr',
    paragraph1: "Sur smartphone (iOS 16+ / Android 12+), un bouton AR superpose votre projet à la vraie pièce via la caméra. Vous validez les volumes en condition réelle, sans calculer mentalement.",
    paragraph2: "Pour les casques (Quest 3, Vision Pro), le mode VR vous fait marcher dans la cuisine à l'échelle 1:1. Démontre l'effet « waouh » en showroom.",
    capture: <PlaceholderCapture label="Mode AR — caméra arrière" />,
  },
  {
    id: 'plan-2d',
    title: 'Plan 2D et élévations',
    utmTag: 'plan_2d',
    paragraph1: "Le bouton « Vue 2D » bascule en plan technique annoté avec toutes les cotes, prêt à imprimer pour l'artisan. Le bouton « Élévation » donne la vue de face de chaque mur, avec hauteurs et cotes ouvertures.",
    paragraph2: "Export DXF/PDF inclus. Compatible avec AutoCAD et SketchUp pour les artisans qui retravaillent vos plans.",
    capture: <PlaceholderCapture label="Plan 2D coté" />,
  },
  {
    id: 'walkthrough',
    title: 'Walkthrough caméra',
    utmTag: 'walkthrough',
    paragraph1: "Un mode « première personne » avec contrôles WASD + souris vous fait marcher dans la cuisine. Idéal pour valider l'ergonomie : est-ce qu'on peut ouvrir le four sans buter dans l'îlot ?",
    paragraph2: "Enregistrez la vidéo du parcours en un clic — parfait pour partager le projet avec votre conjoint, votre architecte ou un cuisiniste à distance.",
    capture: <PlaceholderCapture label="Walkthrough first-person" />,
  },
  {
    id: 'catalog-live',
    title: 'Catalogue IKEA live',
    utmTag: 'catalog',
    paragraph1: "Plus de 6 000 références IKEA METOD synchronisées toutes les 24 heures avec le catalogue officiel : prix, disponibilité, dimensions et photos. Les références supprimées d'IKEA disparaissent du designer.",
    paragraph2: "Filtrez par couleur, hauteur, type de façade — la recherche reste fluide même avec 60 caissons dans la scène.",
    capture: <PlaceholderCapture label="Catalogue IKEA filtré" />,
  },
  {
    id: 'devis-temps-reel',
    title: 'Devis temps réel',
    utmTag: 'devis',
    paragraph1: "Chaque meuble ajouté met à jour instantanément le devis dans le panneau droit. Trois lignes : prix HT, TVA, TTC. Une ligne pour la pose si vous l'incluez. Trois colonnes : IKEA, Leroy Merlin, Schmidt — pour voir l'écart en direct.",
    paragraph2: "Export PDF en un clic, signature électronique en option (compte payant).",
    capture: <PlaceholderCapture label="Comparateur 3 fournisseurs" />,
  },
  {
    id: 'marketplace',
    title: 'Marketplace installateurs certifiés',
    utmTag: 'installers',
    paragraph1: "Une fois le projet validé, vous pouvez le pousser à un réseau d'installateurs certifiés KitchenXpert (artisans agréés Qualibat / RGE). Devis pose sous 48 h, comparaison côte à côte.",
    paragraph2: "Les installateurs voient votre projet en lecture seule (modèle 3D + plan 2D + BOM) — ils n'ont pas accès à votre catalogue ni à vos données personnelles.",
    capture: <PlaceholderCapture label="Devis pose 3 artisans" />,
  },
  {
    id: 'export-bim',
    title: 'Export BIM (.ifc) pour les pros',
    utmTag: 'bim',
    paragraph1: "Exportez votre projet au format IFC 4.3 — le standard ouvert du BIM. Compatible avec Revit, ArchiCAD, Vectorworks et tous les logiciels du marché.",
    paragraph2: "Réservé au plan Studio. Idéal pour les architectes d'intérieur qui intègrent KitchenXpert dans une chaîne de production existante.",
    capture: <PlaceholderCapture label="Export IFC dans Revit" />,
  },
];

export default function CommentCaMarchePage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SeoHead
        title="Comment ça marche"
        description="Découvrez les 10 fonctionnalités clés de KitchenXpert : snap intelligent, brand profiles, path-tracer, AR/VR, plan 2D, walkthrough, catalogue live, devis temps réel, marketplace, export BIM."
        canonical="https://kitchenxpert.com/comment-ca-marche"
      />

      <header className="mx-auto max-w-6xl px-6 pt-24 pb-12 text-center">
        <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-4xl font-semibold leading-tight tracking-tight text-transparent sm:text-5xl md:text-6xl">
          De votre photo de cuisine
          <br />
          au devis fournisseur signé.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
          30 secondes pour comprendre. 10 fonctionnalités pour décider.
          Aucun compte requis.
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        <HeroVideo aspectRatio="16 / 9" />
      </div>

      <div className="mt-12">
        <TrustBar />
      </div>

      {FEATURES.map((feature, i) => (
        <FeatureSection
          key={feature.id}
          {...feature}
          index={i + 1}
          imageRight={i % 2 === 0}
        />
      ))}

      <section className="border-t border-white/5 py-20 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Prêt à dessiner ?</h2>
          <p className="mt-4 text-white/60">Sans compte, sans CB. Votre projet reste en local jusqu'à ce que vous décidiez de l'enregistrer.</p>
          <Link
            to="/designer/sandbox?utm_source=how&utm_medium=cta&utm_campaign=footer"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
          >
            Ouvrir le designer
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
