import React from 'react';
import { FiX } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { MEME_TEMPLATES } from '../utils/templates';
import { useApp } from '../context/AppContext';

export default function TemplatesPanel({ onSelectTemplate, onClose }) {

    const { theme, t } = useApp();

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}
            onClick={onClose}
        >
            <div
                style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', animation: 'slideUp 0.25s ease' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${theme.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <HiSparkles size={20} color="#a855f7" />
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: theme.text }}>
                            {t.popularTemplates}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.muted, cursor: 'pointer' }}
                    >
                        <FiX size={16} />
                    </button>
                </div>

                <div style={{ overflowY: 'auto', padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                    {MEME_TEMPLATES.map(tpl => (
                        <TemplateCard key={tpl.id} tpl={tpl} theme={theme} onSelect={() => { onSelectTemplate(tpl); onClose(); }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function TemplateCard({ tpl, theme, onSelect }) {
    const [hover, setHover] = React.useState(false);

    return (
        <div
            onClick={onSelect}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                background:   theme.inputBg,
                border:       `1px solid ${hover ? '#7c3aed' : theme.border}`,
                borderRadius: 10,
                overflow:     'hidden',
                cursor:       'pointer',
                transition:   'all 0.18s',
                boxShadow:    hover ? '0 8px 24px rgba(124,58,237,0.2)' : 'none',
                transform:    hover ? 'translateY(-2px)' : 'none',
            }}
        >
            <div style={{ overflow: 'hidden', aspectRatio: '1' }}>
                <img
                    src={tpl.url}
                    alt={tpl.name}
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hover ? 'scale(1.05)' : 'scale(1)' }}
                />
            </div>
            <div style={{ padding: '10px 12px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: theme.text }}>{tpl.name}</div>
                <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{tpl.defaultTexts?.length || 0} texte{tpl.defaultTexts?.length !== 1 ? 's' : ''}</div>
            </div>
        </div>
    );
}