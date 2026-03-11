import React, { useState, useRef } from 'react';
import { FiX, FiMail, FiLock, FiUser, FiCamera, FiLogIn, FiUserPlus } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import {
    auth, signInWithGoogle, signOut,
    createOrUpdateUserProfile,
} from '../firebase/firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useApp } from '../context/AppContext';

// ── Messages d'erreur humains ────────────────────────────────────────────────
const getHumanError = (error, lang = 'fr') => {
    const code = error?.code || '';
    const msg  = error?.message || '';

    const fr = {
        'auth/invalid-credential':       "Email ou mot de passe incorrect. Vérifiez vos identifiants.",
        'auth/user-not-found':           "Aucun compte trouvé avec cet email. Créez un compte d'abord.",
        'auth/wrong-password':           "Mot de passe incorrect. Réessayez ou utilisez 'Mot de passe oublié'.",
        'auth/invalid-email':            "L'adresse email n'est pas valide. Ex : prenom@exemple.com",
        'auth/email-already-in-use':     "Cet email est déjà utilisé. Connectez-vous à la place.",
        'auth/weak-password':            "Mot de passe trop court. Minimum 6 caractères.",
        'auth/too-many-requests':        "Trop de tentatives. Attendez quelques minutes avant de réessayer.",
        'auth/network-request-failed':   "Problème de connexion internet. Vérifiez votre réseau.",
        'auth/popup-closed-by-user':     "Connexion Google annulée. Réessayez.",
        'auth/popup-blocked':            "La fenêtre Google a été bloquée. Autorisez les popups dans votre navigateur.",
        'auth/account-exists-with-different-credential': "Un compte existe déjà avec cet email mais avec un autre mode de connexion.",
        'auth/requires-recent-login':    "Session expirée. Déconnectez-vous puis reconnectez-vous.",
        'auth/user-disabled':            "Ce compte a été désactivé. Contactez le support.",
        'auth/operation-not-allowed':    "Ce mode de connexion n'est pas activé. Contactez l'administrateur.",
        'permission-denied':             "Vous n'avez pas la permission d'effectuer cette action. Reconnectez-vous.",
        'unavailable':                   "Le service est temporairement indisponible. Réessayez dans un moment.",
    };
    const en = {
        'auth/invalid-credential':       "Incorrect email or password. Please check your credentials.",
        'auth/user-not-found':           "No account found with this email. Please sign up first.",
        'auth/wrong-password':           "Wrong password. Try again or use 'Forgot password'.",
        'auth/invalid-email':            "Invalid email address. Example: name@example.com",
        'auth/email-already-in-use':     "This email is already in use. Sign in instead.",
        'auth/weak-password':            "Password too short. Minimum 6 characters.",
        'auth/too-many-requests':        "Too many attempts. Please wait a few minutes.",
        'auth/network-request-failed':   "Network error. Please check your internet connection.",
        'auth/popup-closed-by-user':     "Google sign-in cancelled. Please try again.",
        'auth/popup-blocked':            "Google popup was blocked. Allow popups in your browser.",
        'auth/account-exists-with-different-credential': "An account already exists with this email but a different sign-in method.",
        'auth/requires-recent-login':    "Session expired. Please sign out and sign in again.",
        'auth/user-disabled':            "This account has been disabled. Contact support.",
        'auth/operation-not-allowed':    "This sign-in method is not enabled.",
        'permission-denied':             "Permission denied. Please sign in again.",
        'unavailable':                   "Service temporarily unavailable. Please try again shortly.",
    };

    const dict = lang === 'fr' ? fr : en;

    // Cherche le code exact
    if (dict[code]) return dict[code];

    // Cherche un code partiel dans le message
    for (const key of Object.keys(dict)) {
        if (msg.includes(key) || code.includes(key.replace('auth/', ''))) return dict[key];
    }

    // Fallback générique
    return lang === 'fr'
        ? "Une erreur est survenue. Vérifiez votre connexion ou réessayez."
        : "An error occurred. Please check your connection and try again.";
};

// ─────────────────────────────────────────────────────────────────────────────

export default function AuthModal({ user, onClose, onAuthChange }) {

    const { theme, t, lang } = useApp();

    const [tab,           setTab]           = useState('login');
    const [email,         setEmail]         = useState('');
    const [password,      setPassword]      = useState('');
    const [displayName,   setDisplayName]   = useState(user?.displayName || '');
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState('');
    const [avatarHover,   setAvatarHover]   = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(user?.photoURL || null);

    const avatarInputRef = useRef(null);

    const handleGoogle = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await signInWithGoogle();
            await createOrUpdateUserProfile(result.user);
            onAuthChange(result.user);
            onClose();
        } catch (e) {
            setError(getHumanError(e, lang));
        }
        setLoading(false);
    };

    const handleEmailAuth = async () => {
        // Validations client-side avant d'appeler Firebase
        if (!email.trim()) {
            setError(lang === 'fr' ? "Veuillez entrer votre adresse email." : "Please enter your email address.");
            return;
        }
        if (!password) {
            setError(lang === 'fr' ? "Veuillez entrer votre mot de passe." : "Please enter your password.");
            return;
        }
        if (tab === 'register' && !displayName.trim()) {
            setError(lang === 'fr' ? "Veuillez choisir un pseudo." : "Please choose a username.");
            return;
        }
        if (tab === 'register' && password.length < 6) {
            setError(lang === 'fr' ? "Le mot de passe doit faire au moins 6 caractères." : "Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        setError('');
        try {
            let result;
            if (tab === 'login') {
                result = await signInWithEmailAndPassword(auth, email, password);
            } else {
                result = await createUserWithEmailAndPassword(auth, email, password);
                if (displayName) await updateProfile(result.user, { displayName });
                await createOrUpdateUserProfile(result.user);
            }
            onAuthChange(result.user);
            onClose();
        } catch (e) {
            setError(getHumanError(e, lang));
        }
        setLoading(false);
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setAvatarPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setLoading(true);
        setError('');
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                setError(lang === 'fr' ? "Session expirée, veuillez vous reconnecter." : "Session expired, please sign in again.");
                setLoading(false);
                return;
            }
            if (displayName !== currentUser.displayName) {
                await updateProfile(currentUser, { displayName });
            }
            await updateDoc(doc(db, 'users', currentUser.uid), {
                name:     displayName || currentUser.displayName || '',
                photoURL: avatarPreview || currentUser.photoURL || '',
            });
            onAuthChange({ ...currentUser, displayName, photoURL: avatarPreview || currentUser.photoURL });
            onClose();
        } catch (e) {
            setError(getHumanError(e, lang));
        }
        setLoading(false);
    };

    const handleSignOut = async () => {
        await signOut();
        onAuthChange(null);
        onClose();
    };

    // ── Styles ──────────────────────────────────────────────────────────────
    const overlay = {
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        animation: 'fadeIn 0.2s ease',
    };
    const modal = {
        background: theme.surface, border: `1px solid ${theme.border}`,
        borderRadius: 16, width: '100%', maxWidth: 440, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.2)',
        animation: 'slideUp 0.25s ease',
    };
    const inputStyle = {
        width: '100%', padding: '10px 14px 10px 38px', borderRadius: 8,
        background: theme.inputBg, border: `1px solid ${theme.border}`,
        color: theme.text, fontSize: 14, outline: 'none', fontFamily: 'Syne, sans-serif',
    };
    const submitBtn = {
        width: '100%', padding: '12px', borderRadius: 10,
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
        cursor: 'pointer', marginTop: 4, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 8, fontFamily: 'Syne, sans-serif',
    };

    // ── Mode Profil ─────────────────────────────────────────────────────────
    if (user) {
        return (
            <div style={overlay} onClick={onClose}>
                <div style={modal} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: theme.text, fontFamily: 'Syne, sans-serif' }}>
                            {t.myProfile}
                        </span>
                        <button style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.muted, cursor: 'pointer' }} onClick={onClose}>
                            <FiX size={16} />
                        </button>
                    </div>
                    <div style={{ padding: '24px' }}>
                        {/* Avatar */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
                            <div
                                style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #7c3aed', background: theme.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
                                onMouseEnter={() => setAvatarHover(true)}
                                onMouseLeave={() => setAvatarHover(false)}
                                onClick={() => avatarInputRef.current.click()}
                            >
                                {avatarPreview ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiUser size={32} color={theme.muted} />}
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', opacity: avatarHover ? 1 : 0, transition: 'opacity 0.2s' }}>
                                    <FiCamera size={20} color="#fff" />
                                </div>
                            </div>
                            <span style={{ fontSize: 12, color: theme.muted, marginTop: 8 }}>{t.clickToChange}</span>
                            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                        </div>

                        {error && <ErrorBox msg={error} />}

                        <FieldBlock label={t.displayName} theme={theme}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <FiUser size={15} style={{ position: 'absolute', left: 12, color: theme.muted, pointerEvents: 'none' }} />
                                <input style={inputStyle} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t.pseudoPlaceholder} />
                            </div>
                        </FieldBlock>

                        <FieldBlock label={t.email} theme={theme}>
                            <input style={{ ...inputStyle, paddingLeft: 14, opacity: 0.6 }} value={user.email} disabled />
                        </FieldBlock>

                        <button style={submitBtn} onClick={handleSaveProfile} disabled={loading}>
                            {loading ? <Spinner /> : <><FiUser size={15} /> {t.saveProfile}</>}
                        </button>
                        <button onClick={handleSignOut} style={{ ...submitBtn, background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', marginTop: 10 }}>
                            {t.signOut}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Mode Connexion / Inscription ────────────────────────────────────────
    return (
        <div style={overlay} onClick={onClose}>
            <div style={modal} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: theme.text, fontFamily: 'Syne, sans-serif' }}>
                        {tab === 'login' ? t.connexion : t.inscription}
                    </span>
                    <button style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.muted, cursor: 'pointer' }} onClick={onClose}>
                        <FiX size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', margin: '20px 24px 0', borderBottom: `1px solid ${theme.border}` }}>
                    {[
                        { id: 'login',    label: t.signIn,  Icon: FiLogIn    },
                        { id: 'register', label: t.signUp,  Icon: FiUserPlus },
                    ].map(({ id, label, Icon }) => (
                        <button key={id} onClick={() => { setTab(id); setError(''); }}
                            style={{
                                flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700,
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: tab === id ? '#a855f7' : theme.muted,
                                borderBottom: tab === id ? '2px solid #a855f7' : '2px solid transparent',
                                marginBottom: -1, transition: 'all 0.15s', fontFamily: 'Syne, sans-serif',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}
                        >
                            <Icon size={13} /> {label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: '24px' }}>
                    {/* Google */}
                    <button onClick={handleGoogle} disabled={loading}
                        style={{
                            width: '100%', padding: '12px 16px', borderRadius: 10,
                            background: theme.panel, border: `1px solid ${theme.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            color: theme.text, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            marginBottom: 16, transition: 'all 0.18s', fontFamily: 'Syne, sans-serif',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                    >
                        <FcGoogle size={20} /> {t.continueGoogle}
                    </button>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px', color: theme.muted, fontSize: 12 }}>
                        <div style={{ flex: 1, height: 1, background: theme.border }} />
                        <span>{t.or}</span>
                        <div style={{ flex: 1, height: 1, background: theme.border }} />
                    </div>

                    {error && <ErrorBox msg={error} />}

                    {tab === 'register' && (
                        <FieldBlock label={t.pseudo} theme={theme}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <FiUser size={15} style={{ position: 'absolute', left: 12, color: theme.muted, pointerEvents: 'none' }} />
                                <input style={inputStyle} placeholder={t.pseudoPlaceholder} value={displayName} onChange={e => setDisplayName(e.target.value)} />
                            </div>
                        </FieldBlock>
                    )}

                    <FieldBlock label={t.email} theme={theme}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <FiMail size={15} style={{ position: 'absolute', left: 12, color: theme.muted, pointerEvents: 'none' }} />
                            <input style={inputStyle} type="email" placeholder={t.emailPlaceholder} value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                            />
                        </div>
                    </FieldBlock>

                    <FieldBlock label={t.password} theme={theme}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <FiLock size={15} style={{ position: 'absolute', left: 12, color: theme.muted, pointerEvents: 'none' }} />
                            <input style={inputStyle} type="password" placeholder={t.passwordPlaceholder} value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                            />
                        </div>
                    </FieldBlock>

                    <button style={submitBtn} onClick={handleEmailAuth} disabled={loading}>
                        {loading
                            ? <Spinner />
                            : tab === 'login'
                                ? <><FiLogIn size={15} /> {t.signIn}</>
                                : <><FiUserPlus size={15} /> {t.signUp}</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function ErrorBox({ msg }) {
    return (
        <div style={{
            background: 'rgba(244,63,94,0.1)',
            border:     '1px solid rgba(244,63,94,0.35)',
            borderLeft: '3px solid #f43f5e',
            borderRadius: 8,
            padding:    '10px 14px',
            fontSize:   13,
            color:      '#fb7185',
            marginBottom: 14,
            lineHeight: 1.5,
            display:    'flex',
            alignItems: 'flex-start',
            gap:        8,
        }}>
            <span style={{ fontSize: 16, marginTop: -1 }}>⚠️</span>
            <span>{msg}</span>
        </div>
    );
}

function FieldBlock({ label, children, theme }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: theme?.muted || '#6b7280', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
                {label}
            </label>
            {children}
        </div>
    );
}

function Spinner() {
    return (
        <div style={{
            width: 16, height: 16,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: '2px solid #fff',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
        }} />
    );
}