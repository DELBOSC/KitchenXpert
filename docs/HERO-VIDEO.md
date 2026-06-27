# KitchenXpert — Production de la vidéo hero

Tout ce qu'il faut faire pour passer du **placeholder SVG actuel** à la **vraie
démo 30 secondes** qui tournera dans le hero de `kitchenxpert.com`.

Temps total estimé : **2 h** (capture + encodage + upload).

---

## Storyboard — 6 plans en 30 secondes

| #   | Durée     | Action                                                       | Texte overlay                                  |
| --- | --------- | ------------------------------------------------------------ | ---------------------------------------------- |
| 1   | 0:00–0:04 | Photo cuisine vide / triste, Ken Burns 1.0→1.05              | « Votre cuisine actuelle »                     |
| 2   | 0:04–0:09 | Drag de 4 caissons depuis la palette + lignes bleues de snap | (aucun)                                        |
| 3   | 0:09–0:14 | Switch dropdown IKEA → Schmidt, dimensions s'adaptent        | « 1 design = 5 fournisseurs »                  |
| 4   | 0:14–0:19 | Bascule 3D → 2D plan coté → élévation                        | (aucun)                                        |
| 5   | 0:19–0:24 | Activation path-tracer, accumulation samples 1→64            | « Rendu photoréaliste live »                   |
| 6   | 0:24–0:30 | Panel devis slide-in, compteur 0 → 4 280 € en 2s             | « Devis instantané · 5 fournisseurs comparés » |

Loop seamless du plan 6 → plan 1 via fade 200 ms.

---

## Étape 1 — Préparer le designer (15 min)

Avant la capture, il faut que la scène soit **photogénique** et identique d'une
prise à l'autre.

- [ ] Ouvre `localhost:3005/designer/sandbox` en **mode incognito** (pas de
      barre d'extensions, pas de bookmarks)
- [ ] Charge le template `u-shape-medium`
- [ ] Mets le navigateur en **plein écran** (F11)
- [ ] **Cache la palette** au démarrage (la révéler en plan 2 = le « waouh »)
- [ ] Vérifie qu'**aucun cookie banner** n'est affiché (mets
      `localStorage["kx.cookie-consent.v1"]` à
      `{"analytics":false,"marketing":false}` à la console)
- [ ] Désactive les notifications système (Mac : DND ; Windows : Focus assist)

---

## Étape 2 — OBS Studio config (10 min)

Télécharger : https://obsproject.com/

### Settings → Video

- **Base resolution** : 1920×1080
- **Output resolution** : 1920×1080
- **FPS** : 60

### Settings → Output (Advanced)

- **Encoder** : x264 (CPU) ou Apple VT H.264 (Mac M-series, plus rapide)
- **Rate control** : CRF
- **CRF** : 18 (qualité visuelle quasi sans perte)
- **Keyframe interval** : 2s
- **Profile** : high

### Settings → Audio

- **Désactive toutes les sources audio** (la vidéo finale est muette)

### Source à capturer

- **Window Capture** sur la fenêtre Chrome
- Ajuste le crop pour ne garder QUE la zone canvas+toolbar (exclu URL bar)

---

## Étape 3 — Capture du master (30 min)

1. Lance OBS, démarre l'enregistrement (ne pas activer "stream")
2. Bascule sur Chrome
3. Joue les 6 plans **dans l'ordre, sans coupure**
   - Si tu rates : continue, on coupe au montage
4. Attends 1 seconde de buffer à la fin (helper pour la boucle)
5. Stoppe OBS

Tu obtiens `~/Movies/2026-XX-XX_hh-mm-ss.mkv` (ou .mp4).

### Optionnel : version mobile

Pour la qualité optimale en portrait :

- Recapture en plein écran sur un Pixel 7 / iPhone via screen recorder OS
- Ou capture une **fenêtre Chrome 1080×1920** sur ton PC en mode responsive
  devtools

Si tu sautes cette étape, le script `encode-hero-video.sh` croppe le desktop
master en 9:16 centré — fonctionnel mais pas optimal.

---

## Étape 4 — Montage (30 min)

L'option la plus simple : **OBS suffit pour la capture brute** ; le montage se
fait avec `ffmpeg` directement dans le script d'encodage. Si tu veux retoucher
(couper plans ratés, ajouter texte overlay, normaliser luminosité) :

| Outil               | Pour                         | Coût                  |
| ------------------- | ---------------------------- | --------------------- |
| **DaVinci Resolve** | Édition pro, gradient, texte | Gratuit (versionFree) |
| **CapCut Desktop**  | Montage rapide, presets      | Gratuit               |
| **iMovie**          | Mac uniquement, simpliste    | Gratuit               |

Export final : **MP4 H.264 1920×1080 30 fps, sans audio, max 30 s.** C'est
l'input pour le script d'encodage.

---

## Étape 5 — Encodage en 6 variantes (5 min)

```bash
bash scripts/encode-hero-video.sh ~/Movies/master-desktop.mp4
# OU avec un master mobile dédié :
bash scripts/encode-hero-video.sh ~/Movies/master-desktop.mp4 ~/Movies/master-mobile.mp4
```

Le script génère sous `packages/frontend/public/hero/` :

| Fichier                 | Format | Bitrate    | Usage                     |
| ----------------------- | ------ | ---------- | ------------------------- |
| `hero-desktop.webm`     | VP9    | 2 200 kbps | Chrome/FF desktop         |
| `hero-desktop.mp4`      | H.264  | 2 500 kbps | Safari desktop, iOS       |
| `hero-desktop-low.webm` | VP9    | 700 kbps   | Bandwidth < 2 Mbps        |
| `hero-desktop-low.mp4`  | H.264  | 800 kbps   | idem, Safari              |
| `hero-mobile.webm`      | VP9    | 700 kbps   | Mobile portrait Chrome/FF |
| `hero-mobile.mp4`       | H.264  | 800 kbps   | Mobile portrait Safari    |
| `hero-poster.jpg`       | JPEG   | ~50 KB     | Première frame, LCP       |
| `hero-poster@2x.jpg`    | JPEG   | ~120 KB    | Retina                    |

### Si ffmpeg manque

```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg

# Windows
winget install ffmpeg
```

---

## Étape 6 — Upload sur le CDN

Recommandé : **Scaleway Object Storage** (déjà dans `.env.production`) fronté
par Bunny CDN ou Cloudflare.

```bash
# Configuration AWS CLI (compatible S3)
aws configure --profile scw
# Endpoint : https://s3.fr-par.scw.cloud
# Region   : fr-par

# Upload avec headers de cache immutable (1 an, hash dans le nom)
aws s3 sync packages/frontend/public/hero/ \
  s3://kitchenxpert-prod-uploads/hero/ \
  --acl public-read \
  --cache-control "public, max-age=31536000, immutable" \
  --endpoint-url https://s3.fr-par.scw.cloud \
  --profile scw
```

### Mettre à jour le base URL côté code

Dans `.env.production` :

```
VITE_HERO_CDN_BASE=https://kitchenxpert-prod-uploads.s3.fr-par.scw.cloud/hero
```

Le composant `HeroVideo.tsx` lit `VITE_HERO_CDN_BASE`. À défaut, il sert depuis
`/hero/*` (assets locaux dans `public/`).

---

## Étape 7 — A/B test des 3 variantes hero

Le composant `HomePage` route automatiquement entre 3 variantes (`HeroA`,
`HeroB`, `HeroC`) via `useABVariant('hero', ['A','B','C'])`.

| Variante | Description                                      |
| -------- | ------------------------------------------------ |
| **A**    | Vidéo sous le headline (proche de l'existant)    |
| **B**    | Vidéo full-bleed avec headline overlay           |
| **C**    | Split 2 colonnes : headline gauche, vidéo droite |

### Suivi des résultats — directement dans Plausible

Pas besoin de dashboard custom. Dans Plausible :

1. Onglet **Custom events**
2. Filtre `event_name = ab_assignment`
3. Group by `props.variant`
4. Compare avec `event_name = sandbox_signup_intent` filtré sur la même
   propriété `variant`

→ Conversion brute par variante. Le verdict en 14 jours sur 3 000 sessions.

### Calcul de signification statistique

Avec 1 000 sessions par variante, un écart de **+20 %** sur le taux de
conversion est statistiquement significatif (p < 0,05). Garde la variante
gagnante en hardcodant `useABVariant('hero', ['A'])`.

---

## Checklist Laurent

### Avant la capture

- [ ] Designer en mode démo (`/designer/sandbox`) chargé avec `u-shape-medium`
- [ ] Navigateur en plein écran, mode incognito
- [ ] Cookie banner masqué via console
- [ ] OBS configuré 1920×1080 @ 60 fps CRF 18

### Capture

- [ ] 6 plans tournés dans l'ordre, sans coupure
- [ ] 1 seconde de buffer en fin (helper pour la boucle)
- [ ] Master inspecté dans QuickTime/VLC

### (Optionnel) Mobile

- [ ] Recapture portrait via screen recorder iPhone/Android

### Encodage

- [ ] `bash scripts/encode-hero-video.sh master.mp4`
- [ ] 8 fichiers présents dans `packages/frontend/public/hero/`
- [ ] Chaque MP4 lu dans QuickTime sans glitch

### Upload

- [ ] Bucket S3 créé sur Scaleway
- [ ] `aws s3 sync` avec cache-control immutable
- [ ] `VITE_HERO_CDN_BASE` ajouté à `.env.production`
- [ ] Vérifier la perf : Lighthouse score reste ≥ 95

### Lancement A/B

- [ ] Vérifier dans le navigateur que les 3 variantes s'affichent (vider
      localStorage entre les tests : `localStorage.clear()`)
- [ ] Plausible reçoit `ab_assignment` avec `props.variant` ∈ {A,B,C}
- [ ] Laisser tourner 14 jours
- [ ] Décision finale : hardcoder le gagnant dans HomePage.tsx

---

## En attendant que la vidéo soit prête

Le composant `HeroVideo` rend automatiquement le **poster SVG**
(`packages/frontend/public/hero/hero-poster.svg`) tant que les MP4/WebM
n'existent pas. La page reste fonctionnelle, juste sans animation.

Tu peux donc **merger ce code aujourd'hui** et capturer/encoder la vidéo plus
tard.
