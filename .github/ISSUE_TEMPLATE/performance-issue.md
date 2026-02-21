---
name: ⚡ Performance Issue
about: Signaler un problème de performance (lenteur, consommation mémoire, etc.)
title: '[PERF] '
labels: ['performance', 'needs-investigation']
assignees: ''
---

## ⚡ Problème de Performance

<!-- Description claire et concise du problème de performance -->

## 📍 Localisation

### Module Affecté
- [ ] 3D Engine / Rendering
- [ ] Catalog / Base de données
- [ ] Backend API
- [ ] Frontend UI
- [ ] Build / Bundle
- [ ] Requêtes réseau
- [ ] Autre: _____

### Opération Concernée
<!-- Quelle action/opération est lente ? -->

## 📊 Métriques Actuelles

### Performance Observée
- **Temps de chargement actuel:** ___ secondes
- **Utilisation CPU:** ___ %
- **Utilisation Mémoire:** ___ MB
- **Requêtes réseau:** ___ requêtes
- **Taille du bundle (si frontend):** ___ MB

### Performance Attendue
- **Temps de chargement souhaité:** ___ secondes
- **Utilisation CPU acceptable:** ___ %
- **Utilisation Mémoire acceptable:** ___ MB

## 🔍 Analyse

### Profiling / Mesures
<!-- Fournir des screenshots de profiling, flamegraphs, network waterfall, etc. -->

**Chrome DevTools Performance:**
<!-- Screenshot du profiler -->

**Network Waterfall:**
<!-- Screenshot de l'onglet Network -->

**Memory Snapshot:**
<!-- Si problème de mémoire -->

### Données de Test
- **Nombre d'objets 3D (si applicable):**
- **Taille du dataset:**
- **Nombre d'utilisateurs simultanés (si backend):**

## 🖥️ Environnement

- **OS:** [Windows, macOS, Linux]
- **Navigateur:** [Chrome 120, Firefox 121, Safari 17]
- **Appareil:** [Desktop, Mobile, Tablette]
- **Processeur:** [ex: Intel i7, Apple M2]
- **RAM:** [ex: 8GB, 16GB]
- **GPU:** [ex: NVIDIA RTX 3060]
- **Connexion:** [Fibre, 4G, 3G, etc.]

## 📝 Étapes pour Reproduire

1. Ouvrir...
2. Charger...
3. Observer la lenteur

## 🎯 Impact

### Criticité
- [ ] 🔥 Bloquant - L'app est inutilisable
- [ ] ⚠️ Majeur - Impact significatif sur UX
- [ ] 📝 Modéré - Gêne occasionnelle
- [ ] 💡 Mineur - Optimisation souhaitable

### Fréquence
- [ ] Systématique (100%)
- [ ] Très fréquent (> 75%)
- [ ] Occasionnel (25-75%)
- [ ] Rare (< 25%)

## 💡 Pistes d'Optimisation

<!-- Si vous avez des idées sur la cause ou la solution -->

### Cause Suspectée
<!-- Ex: Trop de re-renders, requêtes N+1, bundle trop gros, etc. -->

### Solutions Envisagées
<!-- Ex: Lazy loading, memoization, indexation DB, code splitting, etc. -->

## 🔗 Ressources

<!-- Liens vers profiling data, logs, ou autres ressources -->

---

### Checklist avant soumission

- [ ] J'ai fourni des métriques précises
- [ ] J'ai inclus des screenshots de profiling
- [ ] J'ai testé sur la dernière version
- [ ] J'ai vérifié qu'une issue similaire n'existe pas
