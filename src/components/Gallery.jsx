import React, { useState, useEffect } from 'react';
import {
    FiDownload, FiShare2, FiTrash2, FiPlus, FiImage,
    FiX, FiEdit3, FiLock,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { subscribeToUserMemes, deleteUserMeme } from '../firebase/firebase';
import { useApp } from '../context/AppContext';

export default function Gallery({ localItems, onDeleteLocal, onGoEditor, onEditMeme, user, onNeedAuth }) {

    const { theme, t } = useApp();

    const [preview,      setPreview]      = useState(null);
    const [cloudMemes,   setCloudMemes]   = useState([]);
    const [loadingCloud, setLoadingCloud] = useState(false);
    const [tab,          setTab]          = useState('cloud');

    useEffect(() => {
        if (!user) { setCloudMemes([]); return; }

        setLoadingCloud(true);

        const unsub = subscribeToUserMemes(user.uid, (memes) => {
            setCloudMemes(memes);
            setLoadingCloud(false);
        });

        return () => unsub();
    }, [user]);

    const items  = tab === 'cloud' ? cloudMemes : localItems;
    const getImg = (item) => item.imageDataUrl || item.imageUrl || item.url;

    const getDate = (item) => {
        if (item.createdAt?.toDate) {
            return item.createdAt.toDate().toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        }
        return item.date || '';
    };

    const download = (item) => {
        const a      = document.createElement('a');
        a.href       = getImg(item);
        a.download   = `meme_${item.id || Date.now()}.png`;
        a.click();
    };

    const share = async (item) => {
        const src = getImg(item);

        if (navigator.share) {
            try {
                const res  = await fetch(src);
                const blob = await res.blob();
                const file = new File([blob], 'meme.png', { type: 'image/png' });
                await navigator.share({ files: [file], title: 'Mon mème', text: 'Créé avec MemeForge !' });
                return;
            } catch {}
        }

        window.open('https://twitter.com/intent/tweet?text=Regardez+mon+mème+%23MemeForge', '_blank');
    };

    const handleDelete = async (item) => {
        if (!window.confirm(t.confirmDelete)) return;

        if (tab === 'cloud' && user) {
            await deleteUserMeme(user.uid, item.id);
        } else {
            onDeleteLocal(item.id);
        }

        if (preview?.id === item.id) setPreview(null);
    };

    const tabBtn = (id, label) => ({
        padding:    '7px 16px',
        fontSize:   13,
        fontWeight: 700,
        border:     'none',
        cursor:     'pointer',
        fontFamily: 'Syne, sans-serif',
        transition: 'all 0.15s',
        background: tab === id ? 'rgba(124,58,237,0.3)' : 'transparent',
        color:      tab === id ? '#a855f7' : theme.muted,
    });

    const EmptyState = () => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16, padding: 40 }}>
            {!user && tab === 'cloud' ? (
                <>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiLock size={28} color="#a855f7" />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: theme.text, fontFamily: 'Syne, sans-serif' }}>{t.loginRequired}</div>
                    <div style={{ color: theme.muted, fontSize: 14, textAlign: 'center', maxWidth: 280 }}>{t.loginToAccess}</div>
                    <button onClick={onNeedAuth} style={actionBtn('#7c3aed')}>
                        <FiLock size={14} /> {t.login}
                    </button>
                </>
            ) : (
                <>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiImage size={28} color="#a855f7" />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: theme.text, fontFamily: 'Syne, sans-serif' }}>{t.emptyGallery}</div>
                    <div style={{ color: theme.muted, fontSize: 14 }}>{t.createFirst}</div>
                    <button onClick={onGoEditor} style={actionBtn('#7c3aed')}>
                        <FiPlus size={14} /> {t.createMeme}
                    </button>
                </>
            )}
        </div>
    );

    return (
        <div style={{ padding: '24px', maxWidth: 1300, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <HiSparkles size={22} color="#a855f7" />
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: theme.text }}>{t.myGallery}</span>
                    </div>
                    <div style={{ color: theme.muted, fontSize: 13 }}>
                        {items.length} {items.length !== 1 ? t.memes : t.meme}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, overflow: 'hidden' }}>
                        <button onClick={() => setTab('cloud')} style={tabBtn('cloud', t.cloud)}>{t.cloud}</button>
                        <button onClick={() => setTab('local')} style={tabBtn('local', t.local)}>{t.local}</button>
                    </div>
                    <button onClick={onGoEditor} style={actionBtn('#7c3aed')}>
                        <FiPlus size={14} /> {t.newMeme}
                    </button>
                </div>
            </div>

            {/* Chargement */}
            {loadingCloud && tab === 'cloud' && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <div style={{ width: 32, height: 32, border: `3px solid ${theme.border}`, borderTop: '3px solid #a855f7', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
            )}

            {/* Vide */}
            {!loadingCloud && items.length === 0 && <EmptyState />}

            {/* Grille */}
            {items.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {items.map((item) => (
                        <MemeCard
                            key={item.id}
                            item={item}
                            getImg={getImg}
                            getDate={getDate}
                            theme={theme}
                            t={t}
                            onPreview={() => setPreview(item)}
                            onDownload={() => download(item)}
                            onShare={() => share(item)}
                            onDelete={() => handleDelete(item)}
                            onEdit={() => onEditMeme && onEditMeme(item)}
                        />
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {preview && (
                <div
                    onClick={() => setPreview(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}
                >
                    <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: 840, width: '100%' }}>
                        <button
                            onClick={() => setPreview(null)}
                            style={{ position: 'absolute', top: -44, right: 0, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
                        >
                            <FiX size={14} /> {t.close}
                        </button>
                        <img src={getImg(preview)} alt="mème" style={{ width: '100%', borderRadius: 12, display: 'block', border: `1px solid ${theme.border}` }} />
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => { onEditMeme && onEditMeme(preview); setPreview(null); }} style={actionBtn('#7c3aed')}><FiEdit3 size={14} /> {t.edit}</button>
                            <button onClick={() => download(preview)} style={actionBtn('#3b82f6')}><FiDownload size={14} /> {t.download}</button>
                            <button onClick={() => share(preview)}    style={actionBtn('#22d3a0')}><FiShare2  size={14} /> {t.share}</button>
                            <button onClick={() => handleDelete(preview)} style={actionBtn('#f43f5e')}><FiTrash2 size={14} /> {t.delete}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MemeCard({ item, getImg, getDate, theme, t, onPreview, onDownload, onShare, onDelete, onEdit }) {
    const [hover, setHover] = useState(false);

    return (
        <div
            style={{
                background:  theme.cardBg,
                border:      `1px solid ${theme.border}`,
                borderRadius: 12,
                overflow:    'hidden',
                transition:  'all 0.2s',
                boxShadow:   hover ? '0 8px 32px rgba(124,58,237,0.2)' : `0 2px 8px rgba(0,0,0,0.1)`,
                transform:   hover ? 'translateY(-2px)' : 'none',
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', aspectRatio: '4/3' }} onClick={onPreview}>
                <img src={getImg(item)} alt="mème" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }} />
                {hover && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.15s ease' }}>
                        <div style={{ background: 'rgba(124,58,237,0.8)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FiEdit3 size={18} color="#fff" />
                        </div>
                    </div>
                )}
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: theme.subText, fontFamily: 'DM Mono, monospace', flex: 1 }}>{getDate(item)}</span>
                <IconBtn icon={<FiEdit3    size={13} />} color="#7c3aed" onClick={onEdit}     title={t.edit}     theme={theme} />
                <IconBtn icon={<FiDownload size={13} />} color="#3b82f6" onClick={onDownload} title={t.download} theme={theme} />
                <IconBtn icon={<FiShare2  size={13} />} color="#22d3a0" onClick={onShare}    title={t.share}    theme={theme} />
                <IconBtn icon={<FiTrash2  size={13} />} color="#f43f5e" onClick={onDelete}   title={t.delete}   theme={theme} />
            </div>
        </div>
    );
}

function IconBtn({ icon, color, onClick, title, theme }) {
    const [h, setH] = useState(false);

    return (
        <button
            onClick={onClick}
            title={title}
            onMouseEnter={() => setH(true)}
            onMouseLeave={() => setH(false)}
            style={{
                width:          30,
                height:         30,
                borderRadius:   6,
                background:     h ? color + '22' : 'transparent',
                border:         `1px solid ${h ? color : theme.border}`,
                color:          h ? color : theme.muted,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                cursor:         'pointer',
                transition:     'all 0.15s',
            }}
        >
            {icon}
        </button>
    );
}

const actionBtn = (bg) => ({
    display:     'flex',
    alignItems:  'center',
    gap:         7,
    background:  bg,
    border:      'none',
    borderRadius: 8,
    padding:     '9px 18px',
    color:       '#fff',
    fontSize:    13,
    fontWeight:  700,
    fontFamily:  'Syne, sans-serif',
    cursor:      'pointer',
    boxShadow:   `0 4px 12px ${bg}44`,
    transition:  'all 0.18s',
});