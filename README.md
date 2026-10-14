# Faîte, site vitrine BTP (démonstration)

Site vitrine d'une entreprise de bâtiment **fictive**, basée à Nantes : couverture, isolation, charpente, murs et façades, gros œuvre. Accroche : « Du sol au faîte. »

## Ouvrir le site

Aucune installation, aucun build.

- Double-cliquer sur `index.html`, ou
- servir le dossier : `python3 -m http.server 4173`, puis ouvrir http://localhost:4173

Les bibliothèques (GSAP, Lenis) viennent d'un CDN avec empreinte SRI, la police de Google Fonts et les photos d'Unsplash : il faut donc une connexion internet.

## Ce qu'il y a dedans

| Section | Ce qui se passe |
|---|---|
| Accueil + métiers | La maison est dessinée en axonométrie, en SVG généré par `js/axo.js` (géométrie en mètres, projection isométrique). Elle se construit couche par couche au chargement, se décompose au défilement, et chaque métier surligne sa couche pendant que les couches du dessus deviennent transparentes. La planche a son cartouche, son échelle graphique (juste, recalculée à chaque image) et ses cotes de niveau. |
| Réalisations | Comparateur avant/après (semaine 6 / livraison), filtres animés (GSAP Flip), fiche chantier en modale avec transition d'image partagée (View Transitions API). |
| Estimation | Estimateur présenté comme un vrai devis : lignes, quantités, prix unitaires, TVA à 5,5, 10 ou 20 % selon les travaux, total TTC animé. Le bouton préremplit le formulaire de contact. |
| Méthode | Planning de chantier type, façon diagramme de Gantt. |
| L'entreprise | Garanties, et carte de la zone d'intervention dessinée en SVG (Loire, Erdre, Sèvre, rayon de 50 km). |
| Questions | Accordéon natif `<details>` animé en CSS (`interpolate-size`). |
| Contact | Formulaire validé côté client ; une demande valide mène au contact du portfolio. |
| Pied de page | Le logo passe de la chasse condensée à la chasse large au défilement (police variable + `animation-timeline: view()`, sans JavaScript). |

## Liens vers le portfolio

L'entreprise est fictive : ses moyens de contact mènent au vrai contact, celui de [Lou Marche](https://freelance-lm.fr/#contact).

- Boutons « Demander un devis » (en-tête, accueil, menu mobile, fiche chantier, barre mobile), bouton « Appeler » et numéros de téléphone : lien direct vers `https://freelance-lm.fr/#contact`.
- Formulaire : la validation fonctionne normalement, puis une demande valide redirige vers ce même contact. Rien n'est transmis, et aucune saisie ne passe dans l'adresse.
- Pied de page : signature « Site de démonstration conçu et développé par Lou Marche ».
- Le lien « Demander un diagnostic de charpente » et le bouton « Recevoir un devis précis » de l'estimateur restent internes : ils montrent le préremplissage du formulaire.

L'adresse du portfolio est déclarée dans `<link rel="author">` de `index.html`. Pour la changer, remplacer `freelance-lm.fr` dans ce fichier.

La page porte `<meta name="robots" content="noindex">` : une entreprise fictive avec de faux avis ne doit pas apparaître dans les recherches « couvreur Nantes ».

## Direction artistique : « plan d'exécution »

- **Couleurs** : papier `#EEEFEB`, encre `#182657`, bleu de travail `#2D4FA0`, orange surligneur `#FF6A1A` (réservé à l'élément actif).
- **Typographie** : une seule famille, Archivo variable (axes de largeur et de graisse), utilisée en trois voix : titres très condensés, texte courant, annotations en italique technique façon plan.
- **Logo** : l'accent circonflexe du « î » est un toit orange.

## Fichiers

```
index.html        structure et contenus
css/style.css     jetons de design, mise en page, responsive
js/axo.js         moteur de dessin de la maison (axonométrie éclatée)
js/estimate.js    données de prix et logique de l'estimateur
js/main.js        défilement doux, scroll, filtres, modale, carte, formulaire
assets/favicon.svg
```

Après une modification de CSS ou de JS, incrémenter le paramètre `?v=` dans `index.html` évite que le navigateur serve l'ancienne version en cache.

## Accessibilité

Lien d'évitement, focus visible, libellés sur tous les champs, messages d'erreur reliés aux champs, `prefers-reduced-motion` respecté (pas de défilement doux ni d'animations, la maison change d'état sans transition).

## Limites

- Entreprise, chantiers, avis, prix, adresse et numéro de téléphone sont **inventés**.
- Le formulaire n'envoie rien : une demande valide redirige vers le contact du portfolio.
- Les photos sont servies par le CDN d'Unsplash (licence Unsplash).

## Mise en ligne

Site statique, sans build : n'importe quel hébergeur statique convient. Ne pas publier le dossier `.claude/` (déjà exclu par `.gitignore`).

- **Vercel**, comme le portfolio : nouveau projet importé depuis GitHub, préréglage « Other », sans commande de build. Ajouter ensuite un sous-domaine, par exemple `faite.freelance-lm.fr`.
- **Cloudflare Pages** : glisser-déposer du dossier ou connexion à GitHub. La bande passante des fichiers statiques n'est pas plafonnée.
