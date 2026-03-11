import React, { useState } from 'react';
import { FiEdit3, FiGrid, FiImage, FiUser, FiLogIn, FiSun, FiMoon } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import AuthModal from './AuthModal';
import { useApp } from '../context/AppContext';

export default function Header({ activeTab, setActiveTab, galleryCount, user, profileData, onAuthChange }) {

    const { isDark, toggleTheme, lang, toggleLang, theme, t } = useApp();
    const [showAuth, setShowAuth] = useState(false);

    const tabs = [
        { id: 'editor',    label: t.editor,    Icon: FiEdit3 },
        { id: 'templates', label: t.templates,  Icon: FiGrid },
        { id: 'gallery',   label: t.gallery,    Icon: FiImage, badge: galleryCount },
    ];

    const avatarSrc   = profileData?.photoURL || user?.photoURL || null;
    const displayName = profileData?.name || user?.displayName || t.profile;

    return (
        <>
            <header style={{
                background:     theme.headerBg,
                backdropFilter: 'blur(16px)',
                borderBottom:   `1px solid ${theme.border}`,
                padding:        '0 24px',
                position:       'sticky',
                top:            0,
                zIndex:         100,
            }}>
                <div style={{
                    maxWidth:   1300,
                    margin:     '0 auto',
                    height:     62,
                    display:    'flex',
                    alignItems: 'center',
                    gap:        24,
                }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div style={{
                            width:          34,
                            height:         34,
                            background:     'linear-gradient(135deg, #7c3aed, #f059da)',
                            borderRadius:   8,
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            boxShadow:      '0 0 16px rgba(124,58,237,0.5)',
                        }}>
                            <HiSparkles size={18} color="#fff" />
                        </div>
                        <span style={{
                            fontFamily:          'Syne, sans-serif',
                            fontSize:            20,
                            fontWeight:          800,
                            background:          'linear-gradient(90deg, #a855f7, #f059da)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor:  'transparent',
                            letterSpacing:        '-0.02em',
                        }}>
                            MemeForge
                        </span>
                    </div>

                    {/* Nav */}
                    <nav style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                        {tabs.map(({ id, label, Icon, badge }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                style={{
                                    display:      'flex',
                                    alignItems:   'center',
                                    gap:          7,
                                    background:   activeTab === id ? 'rgba(124,58,237,0.2)' : 'transparent',
                                    color:        activeTab === id ? '#a855f7' : theme.muted,
                                    border:       activeTab === id ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
                                    borderRadius: 8,
                                    padding:      '7px 14px',
                                    fontFamily:   'Syne, sans-serif',
                                    fontWeight:   700,
                                    fontSize:     13,
                                    cursor:       'pointer',
                                    transition:   'all 0.15s',
                                }}
                                onMouseEnter={e => { if (activeTab !== id) e.currentTarget.style.color = theme.text; }}
                                onMouseLeave={e => { if (activeTab !== id) e.currentTarget.style.color = theme.muted; }}
                            >
                                <Icon size={14} />
                                {label}
                                {badge > 0 && (
                                    <span style={{
                                        background:   'linear-gradient(135deg,#7c3aed,#f059da)',
                                        color:        '#fff',
                                        borderRadius: 99,
                                        fontSize:     10,
                                        fontWeight:   800,
                                        padding:      '1px 6px',
                                        marginLeft:   2,
                                    }}>
                                        {badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Controles droite */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                        {/* Toggle langue */}
                        <button
                            onClick={toggleLang}
                            title={lang === 'fr' ? 'Switch to English' : 'Passer en Français'}
                            style={{
                                background:    theme.surface,
                                border:        `1px solid ${theme.border}`,
                                borderRadius:  8,
                                padding:       '6px 10px',
                                color:         theme.text,
                                fontSize:      12,
                                fontWeight:    700,
                                fontFamily:    'DM Mono, monospace',
                                cursor:        'pointer',
                                transition:    'all 0.18s',
                                letterSpacing: '0.05em',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#a855f7'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                        >
                            {lang === 'fr' ? 'EN' : 'FR'}
                        </button>

                        {/* Toggle theme */}
                        <button
                            onClick={toggleTheme}
                            title={isDark ? 'Mode clair' : 'Mode sombre'}
                            style={{
                                background:     theme.surface,
                                border:         `1px solid ${theme.border}`,
                                borderRadius:   8,
                                width:          34,
                                height:         34,
                                display:        'flex',
                                alignItems:     'center',
                                justifyContent: 'center',
                                color:          theme.text,
                                cursor:         'pointer',
                                transition:     'all 0.18s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#a855f7'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                        >
                            {isDark ? <FiSun size={15} /> : <FiMoon size={15} />}
                        </button>

                        {/* Bouton auth */}
                        {user ? (
                            <button
                                onClick={() => setShowAuth(true)}
                                style={{
                                    display:      'flex',
                                    alignItems:   'center',
                                    gap:          8,
                                    background:   'rgba(124,58,237,0.15)',
                                    border:       '1px solid rgba(124,58,237,0.3)',
                                    borderRadius: 99,
                                    padding:      '5px 12px 5px 5px',
                                    cursor:       'pointer',
                                    color:        theme.text,
                                    fontSize:     13,
                                    fontWeight:   600,
                                    fontFamily:   'Syne, sans-serif',
                                    transition:   'all 0.18s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.25)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,58,237,0.15)'}
                            >
                                {avatarSrc
                                    ? <img src={avatarSrc} alt="avatar" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                                    : (
                                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#f059da)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FiUser size={13} color="#fff" />
                                        </div>
                                    )
                                }
                                {displayName.split(' ')[0]}
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowAuth(true)}
                                style={{
                                    display:      'flex',
                                    alignItems:   'center',
                                    gap:          8,
                                    background:   'linear-gradient(135deg,#7c3aed,#a855f7)',
                                    border:       'none',
                                    borderRadius: 8,
                                    padding:      '8px 16px',
                                    color:        '#fff',
                                    fontSize:     13,
                                    fontWeight:   700,
                                    fontFamily:   'Syne, sans-serif',
                                    cursor:       'pointer',
                                    boxShadow:    '0 4px 12px rgba(124,58,237,0.35)',
                                    transition:   'all 0.18s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.55)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.35)'}
                            >
                                <FiLogIn size={14} />
                                {t.login}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {showAuth && (
                <AuthModal
                    user={user}
                    onClose={() => setShowAuth(false)}
                    onAuthChange={onAuthChange}
                />
            )}
        </>
    );
}