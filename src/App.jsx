import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FiUpload, FiGrid, FiDownload, FiSave, FiShare2, FiImage, FiRefreshCw } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import Header from './components/Header';
import MemeCanvas from './components/MemeCanvas';
import TextControls from './components/TextControls';
import Gallery from './components/Gallery';
import TemplatesPanel from './components/TemplatesPanel';
import AuthModal from './components/AuthModal';
import AIPanel from './components/AIPanel';
import { newTextItem, MEME_TEMPLATES } from './utils/templates';
import { auth, onAuthStateChanged, db } from './firebase/firebase';
import {
    addDoc, updateDoc, collection, doc,
    serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { useApp } from './context/AppContext';

export default function App() {

    const { theme, t, lang } = useApp();

    const [activeTab,    setActiveTab]    = useState('editor');
    const [imageSrc,     setImageSrc]     = useState(null);
    const [imgElement,   setImgElement]   = useState(null);
    const [textItems,    setTextItems]    = useState([
        { ...newTextItem(0), text: 'TEXTE DU HAUT', y: 8  },
        { ...newTextItem(1), text: 'TEXTE DU BAS',  y: 90 },
    ]);
    const [selectedId,   setSelectedId]   = useState(null);
    const [localGallery, setLocalGallery] = useState([]);
    const [canvasEl,     setCanvasEl]     = useState(null);
    const [isDragOver,   setIsDragOver]   = useState(false);
    const [toastMsg,     setToastMsg]     = useState(null);
    const [user,         setUser]         = useState(null);
    const [profileData,  setProfileData]  = useState(null);
    const [showAuthModal,setShowAuthModal]= useState(false);
    const [saving,       setSaving]       = useState(false);

    // ── editingMemeId stocké dans un REF pour éviter les closures stales ──
    // On utilise aussi un state juste pour forcer le re-render du badge/bouton
    const editingMemeIdRef            = useRef(null);
    const [editingMemeId, _setEditing]= useState(null);
    const setEditingMemeId = (id) => {
        editingMemeIdRef.current = id;
        _setEditing(id);
    };

    const fileInputRef    = useRef(null);
    const imgRef          = useRef(null);
    const textItemsRef    = useRef(textItems);  // miroir ref pour accès dans callbacks async
    useEffect(() => { textItemsRef.current = textItems; }, [textItems]);

    // ── Auth ────────────────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (!u) setProfileData(null);
        });
        return () => unsub();
    }, []);

    // ── Profil Firestore temps réel ─────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) setProfileData(snap.data());
        });
        return () => unsub();
    }, [user]);

    // ── Toast ────────────────────────────────────────────────────────────────
    const showToast = (msg, type = 'success') => {
        setToastMsg({ msg, type });
        setTimeout(() => setToastMsg(null), 2800);
    };

    // ── Chargement image ─────────────────────────────────────────────────────
    // Chargement DIRECT → affichage instantané.
    // Le proxy CORS n'est utilisé qu'au moment de sauvegarder (voir getCompressedDataUrl).
    const loadImageFromSrc = useCallback((src, onLoad) => {
        const img       = new Image();
        img.crossOrigin = 'anonymous';   // tente CORS d'abord
        img.onload      = () => {
            imgRef.current = img;
            setImgElement(img);
            if (onLoad) onLoad(img);
        };
        img.onerror = () => {
            // crossOrigin refusé par le serveur → charge sans (image s'affiche
            // mais canvas sera tainted ; on gèrera ça à la sauvegarde)
            const fallback       = new Image();
            fallback.onload      = () => {
                imgRef.current = fallback;
                setImgElement(fallback);
                if (onLoad) onLoad(fallback);
            };
            fallback.onerror = () => showToast(t.imgError, 'error');
            fallback.src     = src;
        };
        img.src = src;
    }, [t]);

    // ── Proxy CORS (utilisé UNIQUEMENT à la sauvegarde) ───────────────────────
    const loadImageViaCorsProxy = (src) => new Promise((resolve, reject) => {
        const proxied = src.startsWith('data:') || src.startsWith('blob:')
            ? src
            : `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`;
        const img       = new Image();
        img.crossOrigin = 'anonymous';
        img.onload      = () => resolve(img);
        img.onerror     = () => reject(new Error('proxy failed'));
        img.src         = proxied;
    });

    // ── Compresse le canvas en JPEG <800 KB pour respecter la limite Firestore ─
    // Si le canvas est tainted (image cross-origin sans CORS), on recharge via proxy.
    const getCompressedDataUrl = async (canvas) => {
        const MAX_BYTES = 800_000;

        // Essaie directement d'abord
        try {
            const direct = canvas.toDataURL('image/jpeg', 0.82);
            if (direct.length < MAX_BYTES) return direct;
            for (const q of [0.65, 0.50, 0.35, 0.20]) {
                const d = canvas.toDataURL('image/jpeg', q);
                if (d.length < MAX_BYTES) return d;
            }
            return canvas.toDataURL('image/jpeg', 0.20);
        } catch (e) {
            // SecurityError → canvas tainted → on recharge via proxy puis on redessine
            if (e.name !== 'SecurityError') throw e;
        }

        // Recharge l'image de fond via proxy CORS
        if (!imageSrc || imageSrc.startsWith('data:')) throw new Error('tainted_no_src');

        const proxiedImg = await loadImageViaCorsProxy(imageSrc);

        // Redessine sur un canvas offscreen propre
        const { drawMeme } = await import('./utils/canvas');
        const off    = document.createElement('canvas');
        off.width    = canvas.width;
        off.height   = canvas.height;
        // drawMeme a besoin des textItems — on les lit depuis le ref pour être sûr
        drawMeme(off, proxiedImg, textItemsRef.current, null);

        for (const q of [0.82, 0.65, 0.50, 0.35, 0.20]) {
            const d = off.toDataURL('image/jpeg', q);
            if (d.length < MAX_BYTES) return d;
        }
        return off.toDataURL('image/jpeg', 0.20);
    };

    // ── Import fichier ────────────────────────────────────────────────────────
    const handleFileUpload = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            showToast(t.invalidFile, 'error');
            return;
        }
        // Nouvelle image = on quitte le mode édition
        setEditingMemeId(null);

        const reader  = new FileReader();
        reader.onload = (e) => {
            setImageSrc(e.target.result);
            loadImageFromSrc(e.target.result, (img) => {
                if (canvasEl) canvasEl.height = Math.round(canvasEl.width / (img.width / img.height));
            });
        };
        reader.readAsDataURL(file);
    };

    // ── Template ──────────────────────────────────────────────────────────────
    const handleSelectTemplate = (tpl) => {
        setEditingMemeId(null);
        // Stocker l'URL originale dans imageSrc (pour ré-édition)
        setImageSrc(tpl.url);
        // Charger via proxy CORS pour débloquer canvas.toDataURL()
        loadImageFromSrc(tpl.url, (img) => {
            if (canvasEl) canvasEl.height = Math.round(canvasEl.width / (img.width / img.height));
        });
        if (tpl.defaultTexts?.length > 0) {
            setTextItems(tpl.defaultTexts.map((item, i) => ({
                ...newTextItem(i),
                id:       Date.now() + i,
                text:     item.text,
                x:        item.x,
                y:        item.y,
                fontSize: item.fontSize || 44,
            })));
            setSelectedId(null);
        }
        showToast(t.templateLoaded(tpl.name));
    };

    // ── Drag & Drop ────────────────────────────────────────────────────────────
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileUpload(file);
        } else {
            const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
            if (url?.startsWith('http')) {
                setEditingMemeId(null);
                setImageSrc(url);
                loadImageFromSrc(url);
            }
        }
    };

    // ── ÉDITER un mème existant depuis la galerie ─────────────────────────────
    const handleEditMeme = (item) => {
        // Priorité : imageSrc = fond d'origine. Si absent (ancien mème), on charge
        // imageDataUrl mais on efface les textItems pour éviter la double-superposition.
        const hasSeparateBg = Boolean(item.imageSrc);
        const src = item.imageSrc || item.imageDataUrl || null;

        if (src) {
            setImageSrc(src);
            loadImageFromSrc(src, (img) => {
                if (canvasEl) canvasEl.height = Math.round(canvasEl.width / (img.width / img.height));
            });
        }

        if (hasSeparateBg && item.textItems) {
            // On a le fond + les textes séparément → on peut tout reconstruire
            try {
                const parsed = typeof item.textItems === 'string'
                    ? JSON.parse(item.textItems)
                    : item.textItems;
                setTextItems(parsed);
            } catch {
                setTextItems([]);
            }
        } else {
            // Pas de fond séparé : l'image = mème final, on repart avec textes vides
            setTextItems([
                { ...newTextItem(0), text: 'TEXTE DU HAUT', y: 8  },
                { ...newTextItem(1), text: 'TEXTE DU BAS',  y: 90 },
            ]);
        }
        setSelectedId(null);

        // ← Stockage dans le REF (lecture garantie fraîche dans saveToGallery)
        setEditingMemeId(item.id);
        setActiveTab('editor');
        showToast(t.memeLoaded || "Mème chargé dans l'éditeur !");
    };

    // ── Textes ────────────────────────────────────────────────────────────────
    const addText    = () => {
        const item = { ...newTextItem(textItems.length), id: Date.now(), text: 'NOUVEAU TEXTE' };
        setTextItems(prev => [...prev, item]);
        setSelectedId(item.id);
    };
    const removeText = (id) => {
        setTextItems(prev => prev.filter(i => i.id !== id));
        if (selectedId === id) setSelectedId(null);
    };
    const updateText = (id, key, value) =>
        setTextItems(prev => prev.map(i => i.id === id ? { ...i, [key]: value } : i));

    // ── Applique une suggestion IA sur toutes les zones de texte ─────────────
    // `texts` est un tableau de strings dans l'ordre des zones du template
    const applyAISuggestion = (texts) => {
        if (!Array.isArray(texts) || !texts.length) return;
        setTextItems(prev => {
            const updated = prev.map((item, i) =>
                texts[i] !== undefined && texts[i] !== ''
                    ? { ...item, text: texts[i] }
                    : item
            );
            // Si l'IA a donné plus de textes que de zones, on en ajoute
            if (texts.length > prev.length) {
                for (let i = prev.length; i < texts.length; i++) {
                    if (texts[i]) {
                        updated.push({
                            ...newTextItem(i),
                            id:   Date.now() + i,
                            text: texts[i],
                            y:    Math.round((i / (texts.length - 1)) * 80 + 10),
                        });
                    }
                }
            }
            return updated;
        });
    };

    // ── Télécharger ──────────────────────────────────────────────────────────
    const downloadMeme = () => {
        if (!canvasEl) return;
        // PNG pour le téléchargement (qualité maximale)
        const a    = document.createElement('a');
        a.href     = canvasEl.toDataURL('image/png');
        a.download = `meme_${Date.now()}.png`;
        a.click();
        showToast(t.downloaded);
    };

    // ── SAUVEGARDER / METTRE À JOUR ───────────────────────────────────────────
    const saveToGallery = async () => {
        if (!canvasEl) return;
        if (!user) { setShowAuthModal(true); showToast(t.loginToSave, 'error'); return; }

        setSaving(true);

        // Désélectionner pour ne pas capturer le cadre violet
        const prevSelected = selectedId;
        setSelectedId(null);
        await new Promise(res => setTimeout(res, 60));

        try {
            // Compression JPEG pour rester sous 800 KB (limite Firestore ~1 MB)
            // getCompressedDataUrl gère automatiquement le proxy si le canvas est tainted
            const imageDataUrl = await getCompressedDataUrl(canvasEl);

            // Vérification finale de taille (sécurité)
            if (imageDataUrl.length > 950_000) {
                showToast(
                    lang === 'fr'
                        ? "Image trop grande même après compression. Utilisez une image moins haute résolution."
                        : "Image too large even after compression. Please use a lower resolution image.",
                    'error'
                );
                setSelectedId(prevSelected);
                setSaving(false);
                return;
            }

            // ← On lit le REF, jamais la closure stale
            const currentEditId = editingMemeIdRef.current;

            if (currentEditId) {
                // ── Mode édition : mise à jour du doc existant ──
                // On utilise setDoc avec merge:true pour préserver createdAt existant
                // ET ajouter createdAt si le doc est vieux et ne l'a pas encore
                const { setDoc, doc: fDoc } = await import('firebase/firestore');
                await setDoc(
                    fDoc(db, 'users', user.uid, 'memes', currentEditId),
                    {
                        imageDataUrl,
                        imageSrc:  imageSrc || null,
                        textItems: JSON.stringify(textItems),
                        updatedAt: serverTimestamp(),
                    },
                    { merge: true }  // préserve les champs existants (dont createdAt)
                );
                showToast(t.updatedCloud || 'Mème mis à jour ! ✏️');
            } else {
                // ── Nouveau mème ──
                await addDoc(collection(db, 'users', user.uid, 'memes'), {
                    imageDataUrl,
                    imageSrc:  imageSrc || null,
                    textItems: JSON.stringify(textItems),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                showToast(t.savedCloud);
            }
        } catch (e) {
            console.error('saveToGallery error:', e);
            // Message d'erreur humain selon le code
            if (e?.code === 'permission-denied') {
                showToast(lang === 'fr' ? "Permission refusée. Reconnectez-vous." : "Permission denied. Please sign in again.", 'error');
            } else if (e?.code === 'unavailable') {
                showToast(lang === 'fr' ? "Pas de connexion. Vérifiez votre réseau." : "No connection. Check your network.", 'error');
            } else {
                showToast(t.saveError, 'error');
            }
        }

        setSelectedId(prevSelected);
        setSaving(false);
    };

    // ── Partager ──────────────────────────────────────────────────────────────
    const shareMeme = async () => {
        if (!canvasEl) return;
        if (navigator.share) {
            try {
                const blob = await new Promise(res => canvasEl.toBlob(res, 'image/png'));
                const file = new File([blob], 'meme.png', { type: 'image/png' });
                await navigator.share({ files: [file], title: 'Mon mème', text: '😂 Créé avec MemeForge !' });
                return;
            } catch {}
        }
        window.open('https://twitter.com/intent/tweet?text=Regardez+mon+mème+%23MemeForge', '_blank');
    };

    // ── Reset ─────────────────────────────────────────────────────────────────
    const resetCanvas = () => {
        setImageSrc(null);
        setImgElement(null);
        imgRef.current = null;
        setTextItems([
            { ...newTextItem(0), text: 'TEXTE DU HAUT', y: 8  },
            { ...newTextItem(1), text: 'TEXTE DU BAS',  y: 90 },
        ]);
        setSelectedId(null);
        setEditingMemeId(null);
        if (canvasEl) canvasEl.height = 600;
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: theme.bg }}>

            <Header
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                galleryCount={localGallery.length}
                user={user}
                profileData={profileData}
                onAuthChange={setUser}
            />

            {/* Toast */}
            {toastMsg && (
                <div className={`toast toast-${toastMsg.type}`}>{toastMsg.msg}</div>
            )}

            {/* Modal auth */}
            {showAuthModal && (
                <AuthModal
                    user={null}
                    onClose={() => setShowAuthModal(false)}
                    onAuthChange={(u) => { setUser(u); setShowAuthModal(false); }}
                />
            )}

            <main style={{ flex: 1, padding: '0 0 40px' }}>

                {/* ── GALERIE ── */}
                {activeTab === 'gallery' && (
                    <Gallery
                        localItems={localGallery}
                        onDeleteLocal={id => setLocalGallery(prev => prev.filter(x => x.id !== id))}
                        onGoEditor={() => setActiveTab('editor')}
                        onEditMeme={handleEditMeme}
                        user={user}
                        onNeedAuth={() => setShowAuthModal(true)}
                    />
                )}

                {/* ── TEMPLATES ── */}
                {activeTab === 'templates' && (
                    <div style={{ maxWidth: 1300, margin: '0 auto', padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                            <HiSparkles size={22} color="#a855f7" />
                            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: theme.text }}>
                                {t.popularTemplates}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                            {MEME_TEMPLATES.map(tpl => (
                                <TemplateThumb
                                    key={tpl.id}
                                    tpl={tpl}
                                    theme={theme}
                                    onSelect={() => { handleSelectTemplate(tpl); setActiveTab('editor'); }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── ÉDITEUR ── */}
                {activeTab === 'editor' && (
                    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

                        <div>
                            {/* Barre du haut */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: theme.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FiGrid size={16} color="#a855f7" />
                                    {t.editorTitle}
                                    {editingMemeId && (
                                        <span style={{
                                            fontSize: 11, fontWeight: 700,
                                            background: 'rgba(251,191,36,0.15)',
                                            border: '1px solid rgba(251,191,36,0.4)',
                                            color: '#fbbf24', borderRadius: 99,
                                            padding: '2px 10px', letterSpacing: '0.04em',
                                        }}>
                                            ✏️ {t.editMode || 'Mode édition'}
                                        </span>
                                    )}
                                </div>
                                <div style={{ flex: 1 }} />
                                <TopBtn icon={<FiUpload    size={13} />} label={t.import} color="#3b82f6" theme={theme} onClick={() => fileInputRef.current.click()} />
                                <TopBtn icon={<FiRefreshCw size={13} />} label={t.reset}  color="#f43f5e" theme={theme} onClick={resetCanvas} />
                            </div>

                            {/* Zone canvas */}
                            <div
                                style={{
                                    background:   theme.cardBg,
                                    border:       `1px solid ${isDragOver ? '#7c3aed' : theme.border}`,
                                    borderRadius: 12,
                                    overflow:     'hidden',
                                    position:     'relative',
                                    boxShadow:    isDragOver ? '0 0 0 2px rgba(124,58,237,0.3)' : '0 4px 24px rgba(0,0,0,0.15)',
                                    transition:   'all 0.2s',
                                }}
                                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleDrop}
                            >
                                {!imageSrc && (
                                    <div
                                        onClick={() => fileInputRef.current.click()}
                                        style={{
                                            position: 'absolute', inset: 0, zIndex: 5,
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', gap: 14, background: theme.cardBg,
                                        }}
                                    >
                                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FiUpload size={28} color="#a855f7" />
                                        </div>
                                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: theme.text }}>{t.dropImage}</div>
                                        <div style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>
                                            {t.dropSub}<br />
                                            <span style={{ color: '#7c3aed' }}>{t.dropClick}</span>
                                        </div>
                                    </div>
                                )}
                                <MemeCanvas
                                    image={imageSrc}
                                    imgElement={imgElement}
                                    textItems={textItems}
                                    selectedId={selectedId}
                                    onSelectText={setSelectedId}
                                    onUpdateText={updateText}
                                    onCanvasReady={setCanvasEl}
                                    onDeleteText={removeText}
                                    onAddText={addText}
                                />
                            </div>

                            {/* Boutons d'action */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                                <ActionBtn icon={<FiDownload size={14} />} label={t.download}  color="#3b82f6" onClick={downloadMeme} />
                                <ActionBtn
                                    icon={<FiSave size={14} />}
                                    label={saving ? t.saving : (editingMemeId ? (t.update || 'Mettre à jour') : t.save)}
                                    color="#7c3aed"
                                    onClick={saveToGallery}
                                    disabled={saving}
                                />
                                <ActionBtn icon={<FiShare2  size={14} />} label={t.share}      color="#22d3a0" onClick={shareMeme} />
                                <ActionBtn icon={<FiImage   size={14} />} label={t.seeGallery} color="#f059da" onClick={() => setActiveTab('gallery')} />
                                {/* Bouton IA — s'ouvre dans le panneau dessous */}
                                <div style={{ marginLeft: 'auto' }}>
                                    <AIPanel
                                        textItems={textItems}
                                        selectedId={selectedId}
                                        imageSrc={imageSrc}
                                        canvasEl={canvasEl}
                                        textCount={textItems.length}
                                        onApplySuggestion={applyAISuggestion}
                                        onUpdateText={updateText}
                                    />
                                </div>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); }}
                            />
                        </div>

                        {/* Panneau textes */}
                        <div style={{
                            background:   theme.surface,
                            border:       `1px solid ${theme.border}`,
                            borderRadius: 12,
                            minHeight:    500,
                            maxHeight:    'calc(100vh - 120px)',
                            overflowY:    'auto',
                            position:     'sticky',
                            top:          80,
                            boxShadow:    '0 4px 24px rgba(0,0,0,0.1)',
                        }}>
                            <TextControls
                                textItems={textItems}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                                onAdd={addText}
                                onRemove={removeText}
                                onUpdate={updateText}
                            />
                        </div>
                    </div>
                )}
            </main>

            <footer style={{
                background:  theme.surface,
                borderTop:   `1px solid ${theme.border}`,
                padding:     '14px 24px',
                textAlign:   'center',
                fontSize:    12,
                color:       theme.muted,
                fontFamily:  'DM Mono, monospace',
            }}>
                MemeForge · {t.footer}
            </footer>
        </div>
    );
}

// ── Composants utilitaires ────────────────────────────────────────────────────

function TopBtn({ icon, label, color, theme, onClick }) {
    const [h, setH] = React.useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setH(true)}
            onMouseLeave={() => setH(false)}
            style={{
                display:      'flex', alignItems: 'center', gap: 6,
                background:   h ? color + '22' : 'transparent',
                border:       `1px solid ${h ? color : theme.border}`,
                borderRadius: 8, padding: '7px 14px',
                color:        h ? color : theme.muted,
                fontSize:     13, fontWeight: 600,
                cursor:       'pointer', fontFamily: 'Syne, sans-serif', transition: 'all 0.15s',
            }}
        >
            {icon}{label}
        </button>
    );
}

function ActionBtn({ icon, label, color, onClick, disabled }) {
    const [h, setH] = React.useState(false);
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setH(true)}
            onMouseLeave={() => setH(false)}
            style={{
                display:      'flex', alignItems: 'center', gap: 7,
                background:   h ? color : color + 'dd',
                border:       'none', borderRadius: 8, padding: '10px 18px',
                color:        '#fff', fontSize: 13, fontWeight: 700,
                cursor:       disabled ? 'not-allowed' : 'pointer',
                fontFamily:   'Syne, sans-serif', opacity: disabled ? 0.7 : 1,
                boxShadow:    h ? `0 6px 20px ${color}55` : `0 2px 8px ${color}33`,
                transition:   'all 0.18s',
            }}
        >
            {icon}{label}
        </button>
    );
}

function TemplateThumb({ tpl, theme, onSelect }) {
    const [h, setH] = React.useState(false);
    return (
        <div
            onClick={onSelect}
            onMouseEnter={() => setH(true)}
            onMouseLeave={() => setH(false)}
            style={{
                background:   theme.cardBg,
                border:       `1px solid ${h ? '#7c3aed' : theme.border}`,
                borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                transition:   'all 0.18s',
                boxShadow:    h ? '0 8px 24px rgba(124,58,237,0.2)' : 'none',
                transform:    h ? 'translateY(-2px)' : 'none',
            }}
        >
            <img
                src={tpl.url} alt={tpl.name} crossOrigin="anonymous"
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ padding: '10px 12px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: theme.text }}>
                {tpl.name}
            </div>
        </div>
    );
}