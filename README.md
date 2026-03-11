# 🎭 MemeForge

> Générateur de mèmes intelligent propulsé par l'IA — Application React full-stack avec Firebase & Gemini AI

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Firebase](https://img.shields.io/badge/Firebase-10-FFCA28?style=flat-square&logo=firebase)
![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## 📋 Table des matières

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Stack technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration Firebase](#-configuration-firebase)
- [Configuration Gemini AI](#-configuration-gemini-ai)
- [Lancer l'application](#-lancer-lapplication)
- [Structure du projet](#-structure-du-projet)
- [Raccourcis clavier](#-raccourcis-clavier)
- [Contribuer](#-contribuer)

---

## 🌟 Aperçu

MemeForge est une application web de création de mèmes qui combine un éditeur visuel intuitif avec un assistant IA (Google Gemini) pour générer automatiquement des textes percutants. Les mèmes sont sauvegardés dans le cloud via Firebase Firestore et accessibles depuis n'importe quel appareil.

---

## ✨ Fonctionnalités

- 🖼️ **22 templates de mèmes** populaires (Drake, Distracted BF, Expanding Brain, Gru's Plan...)
- 📁 **Upload d'image personnalisée** depuis votre appareil
- ✏️ **Éditeur de texte avancé** — police, taille, couleur, contour, ombre, alignement
- 🖱️ **Glisser-déposer** les textes sur le canvas + raccourcis clavier
- 🤖 **Assistant IA Gemini** avec 3 modes : Générer, Analyser, Chat
- 💾 **Galerie cloud** synchronisée en temps réel (Firebase Firestore)
- 🔐 **Authentification** Google et Email/Mot de passe
- 🌙 **Mode sombre / clair** (persisté)
- 🇫🇷 🇬🇧 **Bilingue** Français / Anglais (persisté)
- 📥 **Téléchargement PNG** du mème créé

---

## 🛠️ Stack technique

| Technologie | Usage |
|---|---|
| React 18 (CRA) | Framework frontend |
| Firebase Auth | Authentification utilisateurs |
| Firebase Firestore | Base de données cloud temps réel |
| Google Gemini 1.5 Flash | Assistant IA — génération de textes |
| react-icons | Icônes |
| HTML Canvas API | Rendu et export des mèmes |

---

## 📦 Prérequis

Avant de commencer, assure-toi d'avoir installé :

- **Node.js** v16 ou supérieur → [nodejs.org](https://nodejs.org)
- **npm** v8+ (inclus avec Node.js)
- Un compte **Firebase** (gratuit) → [firebase.google.com](https://firebase.google.com)
- Une clé **Gemini AI** (gratuite) → [aistudio.google.com](https://aistudio.google.com)

Vérifier ta version de Node :
```bash
node --version   # doit afficher v16.x.x ou supérieur
npm --version
```

---

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/TON_USERNAME/meme-forge.git
cd meme-forge
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Créer le fichier de configuration

Copie le fichier d'exemple et renomme-le :

```bash
cp .env .env.local
```

> ⚠️ **Important** : N'édite jamais `.env` directement. Toujours travailler dans `.env.local` — ce fichier est dans `.gitignore` et ne sera jamais publié sur GitHub.

---

## 🔥 Configuration Firebase

### Étape 1 — Créer un projet Firebase

1. Va sur [firebase.google.com](https://firebase.google.com) et connecte-toi
2. Clique sur **"Ajouter un projet"**
3. Donne un nom à ton projet (ex: `meme-forge`)
4. Désactive Google Analytics si tu veux (optionnel)
5. Clique sur **"Créer le projet"**

### Étape 2 — Enregistrer une application Web

1. Dans la console Firebase, clique sur l'icône **`</>`** (Web)
2. Donne un surnom à l'app (ex: `memeforge-web`)
3. Clique sur **"Enregistrer l'application"**
4. Firebase affiche un bloc `firebaseConfig` — **copie ces valeurs**

### Étape 3 — Activer l'authentification

1. Dans le menu gauche → **Authentication** → **Commencer**
2. Onglet **"Sign-in method"**
3. Active **Google** (clique dessus → activer → sauvegarder)
4. Active **Email/Mot de passe** (clique dessus → activer → sauvegarder)

### Étape 4 — Créer la base de données Firestore

1. Dans le menu gauche → **Firestore Database** → **Créer une base de données**
2. Choisis **"Commencer en mode production"** → Suivant
3. Sélectionne un emplacement proche (ex: `europe-west3`) → Activer

### Étape 5 — Configurer les règles Firestore

1. Dans Firestore → onglet **"Règles"**
2. Remplace tout le contenu par :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Clique sur **"Publier"**

### Étape 6 — Remplir le `.env.local`

Ouvre ton fichier `.env.local` et colle les valeurs Firebase :

```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=mon-projet.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=mon-projet
REACT_APP_FIREBASE_STORAGE_BUCKET=mon-projet.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

---

## 🤖 Configuration Gemini AI

### Étape 1 — Obtenir une clé API (gratuite)

1. Va sur [aistudio.google.com](https://aistudio.google.com)
2. Connecte-toi avec ton compte Google
3. Clique sur **"Get API key"** (menu gauche)
4. Clique sur **"Create API key"**
5. Copie la clé générée

### Étape 2 — Ajouter la clé dans `.env.local`

```env
REACT_APP_GEMINI_API_KEY=AIzaSy...
```

---

## ▶️ Lancer l'application

```bash
npm start
```

L'application s'ouvre automatiquement sur [http://localhost:3000](http://localhost:3000)

> ⚠️ **Redémarre le serveur** après chaque modification du `.env.local` :
> ```bash
> # Ctrl+C pour arrêter, puis :
> npm start
> ```

### Build de production

```bash
npm run build
```

Les fichiers optimisés sont générés dans le dossier `build/`.

---

## 📁 Structure du projet

```
meme-forge/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── AIPanel.jsx          # Assistant IA Gemini (3 onglets)
│   │   ├── AuthModal.jsx        # Connexion / inscription
│   │   ├── Gallery.jsx          # Galerie cloud de mèmes
│   │   ├── Header.jsx           # Barre de navigation
│   │   ├── MemeCanvas.jsx       # Canvas d'édition interactif
│   │   ├── TemplatesPanel.jsx   # Panneau des 22 templates
│   │   └── TextControls.jsx     # Contrôles de style du texte
│   ├── context/
│   │   └── AppContext.jsx       # Thème, langue, état global
│   ├── firebase/
│   │   └── firebase.js          # Config Firebase + helpers
│   ├── utils/
│   │   ├── canvas.js            # Rendu canvas et export
│   │   └── templates.js         # Données des 22 templates
│   ├── App.jsx                  # Composant racine
│   ├── index.css                # Styles globaux
│   └── index.js                 # Point d'entrée React
├── .env                         # Template des variables (à copier)
├── .env.local                   # 🔒 Tes clés secrètes (jamais committé)
├── .gitignore
└── package.json
```

---

## ⌨️ Raccourcis clavier

Sur le canvas, quand un texte est sélectionné :

| Touche | Action |
|---|---|
| `Double-clic` | Ouvrir l'éditeur inline |
| `Entrée` / `F2` | Ouvrir l'éditeur inline |
| `↑` `↓` `←` `→` | Déplacer le texte (1%) |
| `Shift` + flèches | Déplacer rapidement (5%) |
| `Suppr` / `Backspace` | Supprimer le texte |
| `Échap` | Désélectionner |

---

## 🤝 Contribuer

Les contributions sont les bienvenues !

1. Fork le projet
2. Crée une branche : `git checkout -b feature/ma-fonctionnalite`
3. Commit tes changements : `git commit -m 'feat: ajout de ma fonctionnalité'`
4. Push : `git push origin feature/ma-fonctionnalite`
5. Ouvre une **Pull Request**

---

<div align="center">
  Fait dans le cadre du projet SUPINFO B.Eng.3 / M.Eng.1 par Habiba Dairou
</div>
