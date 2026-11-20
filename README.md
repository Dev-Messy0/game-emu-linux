# GML

GML (Game Emu Linux) est une application de bureau Linux qui organise des exécutables Windows dans une bibliothèque et peut les lancer avec Wine. L’interface réunit l’accueil, les jeux récents, les favoris, la détection des manettes et les réglages.

## État de cette préversion

- Ajouter un jeu en sélectionnant son fichier `.exe`.
- Enregistrer la bibliothèque localement dans le profil utilisateur.
- Rechercher, sélectionner et mettre des jeux en favoris.
- Vérifier Wine et lancer le jeu choisi dans un processus séparé. GML se ferme après le démarrage pour ne pas rester actif pendant la partie.
- Afficher les manettes que Linux expose à l’application via l’API Gamepad du navigateur. La configuration des boutons et des profils de manette n’est pas encore implémentée.

GML n’est pas un émulateur et ne transforme pas un jeu en application Linux native. La compatibilité dépend de Wine, du jeu, de son lanceur, de ses dépendances, de ses protections et du matériel. Il ne télécharge pas les jeux et ne contourne pas les protections ou connexions demandées par leurs éditeurs.

## Développement local

Prérequis : Node.js 22 ou plus récent, npm, un environnement graphique Linux et Wine si tu veux lancer un jeu.

```bash
npm ci
npm start
```

## Construire le paquet `.deb`

Sur Linux x86_64 :

```bash
npm ci
npm run dist:deb
```

Le paquet apparaît dans `dist/`. Il peut être installé sur Kali ou une autre distribution Debian avec :

```bash
sudo apt install ./dist/gml-linux_0.1.1_amd64.deb
```

Le paquet inclut l’exécutable GML et Electron, et déclare Wine comme dépendance Debian. Les prérequis propres à chaque jeu (par exemple certains composants Visual C++ ou DirectX) ne sont pas universels et ne sont pas intégrés dans le paquet. Si un jeu en réclame, ajoute-les dans le préfixe Wine de ce jeu avec l’outil approprié.

### Installation graphique avec GDebi

Après avoir téléchargé le fichier `.deb` depuis la section **Releases** du dépôt GitHub, installe GDebi si nécessaire, puis ouvre le paquet avec GDebi et clique sur **Installer le paquet** :

```bash
sudo apt update
sudo apt install gdebi
```

Tu peux aussi double-cliquer sur le `.deb` et choisir l’installateur de paquets de ta distribution. Si le gestionnaire graphique ne résout pas les dépendances, utilise la commande `apt install ./nom-du-paquet.deb` ci-dessus.

Après l’installation, lance **GML** depuis le menu des applications. Dans l’application, choisis **Ajouter un jeu**, sélectionne son fichier `.exe`, puis clique sur **Jouer**. Le jeu est lancé avec Wine et GML se ferme après le démarrage.

## GitHub Actions

Le workflow `.github/workflows/build-linux.yml` construit le `.deb` sur GitHub Actions lorsqu’on le lance manuellement et quand on pousse un tag `v*`. Le lancement manuel publie le paquet comme artefact du workflow ; un tag crée aussi une release GitHub avec le `.deb` attaché.

Un tag `v*` déclenche le build et publie automatiquement le `.deb` dans une Release GitHub. La Release contient aussi les notes générées par GitHub :

```bash
git tag v0.1.1
git push origin v0.1.1
```
