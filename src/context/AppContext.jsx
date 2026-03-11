import React, { createContext, useContext, useState, useEffect } from 'react';

// ── Traductions ──────────────────────────────────────────────────────────────

const translations = {
    fr: {
        // Header
        editor:      'Éditeur',
        templates:   'Templates',
        gallery:     'Galerie',
        login:       'Se connecter',
        profile:     'Profil',

        // Editor
        editorTitle: 'Éditeur',
        import:      'Importer',
        reset:       'Reset',
        download:    'Télécharger',
        save:        'Sauvegarder',
        saving:      'Sauvegarde...',
        share:       'Partager',
        seeGallery:  'Voir la galerie',
        dropImage:   'Importer une image',
        dropSub:     'Glissez une image ici',
        dropClick:   'ou cliquez pour parcourir',
        loginToSave: 'Connectez-vous pour sauvegarder !',
        savedCloud:  'Sauvegardé dans le cloud ! ☁️',
        saveError:   'Erreur lors de la sauvegarde',
        downloaded:  'Mème téléchargé !',
        invalidFile: 'Veuillez choisir une image valide',
        imgError:    "Impossible de charger l'image",
        templateLoaded: (name) => `Template "${name}" chargé !`,

        // Gallery
        myGallery:   'Ma Galerie',
        meme:        'mème',
        memes:       'mèmes',
        cloud:       '☁️ Cloud',
        local:       '💾 Local',
        newMeme:     'Nouveau mème',
        emptyGallery:'Galerie vide',
        createFirst: 'Crée ton premier mème !',
        createMeme:  'Créer un mème',
        loginRequired: 'Connexion requise',
        loginToAccess: 'Connectez-vous pour accéder à vos mèmes sauvegardés dans le cloud.',
        confirmDelete: 'Supprimer ce mème ?',
        edit:          'Modifier',
        update:        'Mettre à jour',
        editMode:      'Mode édition',
        memeLoaded:    "Mème chargé dans l'éditeur !",
        updatedCloud:  'Mème mis à jour ! ✏️',
        close:         'Fermer',

        // Auth
        connexion:   'Connexion',
        inscription: 'Créer un compte',
        signIn:      'Se connecter',
        signUp:      "S'inscrire",
        continueGoogle: 'Continuer avec Google',
        or:          'ou',
        email:       'Email',
        password:    'Mot de passe',
        pseudo:      'Pseudo',
        emailPlaceholder: 'email@exemple.com',
        passwordPlaceholder: '••••••••',
        pseudoPlaceholder: 'Votre pseudo',

        // Profile
        myProfile:   'Mon profil',
        clickToChange: 'Cliquez pour changer',
        displayName: "Nom d'affichage",
        saveProfile: 'Sauvegarder',
        signOut:     'Se déconnecter',
        sessionExpired: 'Session expirée, veuillez vous reconnecter.',

        // TextControls
        texts:       'Textes',
        add:         'Ajouter',
        delete:      'Supprimer',
        content:     'Contenu',
        uppercase:   'Majuscules',
        shadow:      'Ombre',
        style:       'Style',
        font:        'Police',
        size:        'Taille',
        textColor:   'Couleur texte',
        strokeColor: 'Couleur contour',
        strokeWidth: 'Épaisseur contour',
        alignment:   'Alignement',
        yourText:    'Votre texte ici...',

        // Templates
        popularTemplates: 'Templates populaires',

        // Edit flow
        edit:         'Modifier',
        editMode:     'Mode édition',
        memeLoaded:   "Mème chargé dans l'éditeur !",
        updatedCloud: 'Mème mis à jour ! ✏️',
        update:       'Mettre à jour',

        // Footer
        footer: 'Projet SUPINFO · Made with ✦',
    },

    en: {
        // Header
        editor:      'Editor',
        templates:   'Templates',
        gallery:     'Gallery',
        login:       'Sign in',
        profile:     'Profile',

        // Editor
        editorTitle: 'Editor',
        import:      'Import',
        reset:       'Reset',
        download:    'Download',
        save:        'Save',
        saving:      'Saving...',
        share:       'Share',
        seeGallery:  'See gallery',
        dropImage:   'Import an image',
        dropSub:     'Drag an image here',
        dropClick:   'or click to browse',
        loginToSave: 'Sign in to save!',
        savedCloud:  'Saved to the cloud! ☁️',
        saveError:   'Error while saving',
        downloaded:  'Meme downloaded!',
        invalidFile: 'Please choose a valid image',
        imgError:    'Unable to load image',
        templateLoaded: (name) => `Template "${name}" loaded!`,

        // Gallery
        myGallery:   'My Gallery',
        meme:        'meme',
        memes:       'memes',
        cloud:       '☁️ Cloud',
        local:       '💾 Local',
        newMeme:     'New meme',
        emptyGallery:'Empty gallery',
        createFirst: 'Create your first meme!',
        createMeme:  'Create a meme',
        loginRequired: 'Login required',
        loginToAccess: 'Sign in to access your memes saved in the cloud.',
        confirmDelete: 'Delete this meme?',
        edit:          'Edit',
        update:        'Update',
        editMode:      'Edit mode',
        memeLoaded:    'Meme loaded in editor!',
        updatedCloud:  'Meme updated! ✏️',
        close:         'Close',

        // Auth
        connexion:   'Sign in',
        inscription: 'Create account',
        signIn:      'Sign in',
        signUp:      'Sign up',
        continueGoogle: 'Continue with Google',
        or:          'or',
        email:       'Email',
        password:    'Password',
        pseudo:      'Username',
        emailPlaceholder: 'email@example.com',
        passwordPlaceholder: '••••••••',
        pseudoPlaceholder: 'Your username',

        // Profile
        myProfile:   'My profile',
        clickToChange: 'Click to change',
        displayName: 'Display name',
        saveProfile: 'Save',
        signOut:     'Sign out',
        sessionExpired: 'Session expired, please sign in again.',

        // TextControls
        texts:       'Texts',
        add:         'Add',
        delete:      'Delete',
        content:     'Content',
        uppercase:   'Uppercase',
        shadow:      'Shadow',
        style:       'Style',
        font:        'Font',
        size:        'Size',
        textColor:   'Text color',
        strokeColor: 'Stroke color',
        strokeWidth: 'Stroke width',
        alignment:   'Alignment',
        yourText:    'Your text here...',

        // Templates
        popularTemplates: 'Popular templates',

        // Edit flow
        edit:         'Edit',
        editMode:     'Edit mode',
        memeLoaded:   'Meme loaded in editor!',
        updatedCloud: 'Meme updated! ✏️',
        update:       'Update',

        // Footer
        footer: 'SUPINFO Project · Made with ✦',
    },
};

// ── Thèmes ───────────────────────────────────────────────────────────────────

export const themes = {
    dark: {
        bg:        '#0a0a0f',
        surface:   '#13131a',
        panel:     '#1a1a26',
        border:    '#2a2a3d',
        text:      '#e2e8f0',
        muted:     '#6b7280',
        inputBg:   '#0a0a0f',
        cardBg:    '#13131a',
        headerBg:  'rgba(10,10,15,0.9)',
        subText:   '#4b5563',
    },
    light: {
        bg:        '#f4f4f8',
        surface:   '#ffffff',
        panel:     '#f0f0f6',
        border:    '#dde0ec',
        text:      '#111827',
        muted:     '#6b7280',
        inputBg:   '#f8f8fc',
        cardBg:    '#ffffff',
        headerBg:  'rgba(255,255,255,0.9)',
        subText:   '#6b7280',
    },
};

// ── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [isDark, setIsDark]   = useState(() => localStorage.getItem('theme') !== 'light');
    const [lang,   setLang]     = useState(() => localStorage.getItem('lang') || 'fr');

    const toggleTheme = () => {
        setIsDark(prev => {
            const next = !prev;
            localStorage.setItem('theme', next ? 'dark' : 'light');
            return next;
        });
    };

    const toggleLang = () => {
        setLang(prev => {
            const next = prev === 'fr' ? 'en' : 'fr';
            localStorage.setItem('lang', next);
            return next;
        });
    };

    const theme = isDark ? themes.dark : themes.light;
    const t     = translations[lang];

    // Applique la couleur de fond sur <body>
    useEffect(() => {
        document.body.style.background = theme.bg;
    }, [theme.bg]);

    return (
        <AppContext.Provider value={{ isDark, toggleTheme, lang, toggleLang, theme, t }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    return useContext(AppContext);
}