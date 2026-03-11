import React, { useState, useRef, useEffect } from 'react';
import {
    FiZap, FiX, FiSend, FiRefreshCw, FiCheck, FiMessageSquare,
    FiEye, FiEdit3, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { useApp } from '../context/AppContext';

// ─── Clé API Gemini — lue depuis .env.local (REACT_APP_GEMINI_API_KEY) ───────
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ─── Appel Gemini ────────────────────────────────────────────────────────────
async function callGemini(prompt) {
    const res = await fetch(GEMINI_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
        }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── Parser N zones de texte depuis la réponse IA ───────────────────────────
// Retourne un tableau de suggestions, chaque suggestion étant un tableau de strings
function parseSuggestions(raw, n = 2) {
    const suggestions = [];

    // Sépare les variantes sur les lignes "Variante X" / "Variant X" / "---" / lignes numériques
    const blocks = raw.split(/\n(?=variante\s*\d|variant\s*\d|---|\d+[.)]\s)/i)
        .map(b => b.trim())
        .filter(Boolean);

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        const texts = [];

        for (const line of lines) {
            // Ignore les headers "Variante 1", numéros isolés, etc.
            if (/^(variante|variant)\s*\d+\s*:?\s*$/i.test(line)) continue;
            if (/^\d+[.)]\s*$/.test(line)) continue;

            // Extrait le contenu après le label (Zone 1:, Haut:, Top:, T1:, 1., etc.)
            const clean = line
                .replace(/^(zone\s*\d+|haut|bas|top|bottom|t\d+|texte\s*\d+|text\s*\d+|\d+[.)–-])\s*[:–-]?\s*/i, '')
                .replace(/^\*+|\*+$/g, '')   // enlève les ** markdown
                .trim();

            if (clean.length > 1) texts.push(clean);
        }

        // Filtre et limite au nombre de zones attendu
        const filtered = texts.filter(t => t.length > 1).slice(0, n);
        if (filtered.length > 0) suggestions.push(filtered);
    }

    // Fallback : si pas de structure détectée, coupe le texte brut ligne par ligne
    if (!suggestions.length) {
        const lines = raw
            .split('\n')
            .map(l => l.replace(/^[\d.)•\-*\s]+/, '').replace(/^\*+|\*+$/g, '').trim())
            .filter(l => l.length > 1);

        for (let i = 0; i < lines.length; i += n) {
            const chunk = lines.slice(i, i + n);
            if (chunk.length > 0) suggestions.push(chunk);
        }
    }

    return suggestions.slice(0, 4); // max 4 suggestions
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────
export default function AIPanel({
    textItems,
    selectedId,
    imageSrc,
    canvasEl,
    textCount = 2,
    onApplySuggestion,
    onUpdateText,
}) {
    const { theme, lang } = useApp();

    const [isOpen,       setIsOpen]       = useState(false);
    const [activeTab,    setActiveTab]    = useState('generate'); // 'generate' | 'analyze' | 'chat'
    const [prompt,       setPrompt]       = useState('');
    const [chatInput,    setChatInput]    = useState('');
    const [loading,      setLoading]      = useState(false);
    const [suggestions,  setSuggestions]  = useState([]);
    const [chatHistory,  setChatHistory]  = useState([]);
    const [userApiKey,   setUserApiKey]   = useState('');
    const [appliedIdx,   setAppliedIdx]   = useState(null);

    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // La clé est dispo si elle vient du .env OU si l'utilisateur l'a saisie manuellement
    const effectiveKey  = GEMINI_API_KEY || userApiKey;
    const hasKey        = Boolean(effectiveKey);
    const geminiUrl     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveKey}`;

    const callAI = async (promptText) => {
        const res = await fetch(geminiUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
            }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    };

    // ── Onglet 1 : Générer des textes depuis une description ──────────────────
    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setSuggestions([]);
        setAppliedIdx(null);

        const n = textCount || textItems.length || 2;

        // Génère les labels de zones dynamiquement selon n
        const zonesLabel = n === 1
            ? (lang === 'fr' ? 'Zone 1 : [texte unique]' : 'Zone 1: [single text]')
            : Array.from({ length: n }, (_, i) =>
                lang === 'fr' ? `Zone ${i + 1} : [texte]` : `Zone ${i + 1}: [text]`
              ).join('\n');

        const systemPrompt = lang === 'fr'
            ? `Tu es un expert en mèmes internet. L'utilisateur veut créer un mème avec ${n} zone(s) de texte sur ce thème : "${prompt}".
Génère exactement 3 variantes. Chaque variante doit avoir exactement ${n} texte(s), courts et percutants.

Format OBLIGATOIRE (respecte exactement, ${n} ligne(s) de texte par variante) :
Variante 1
${zonesLabel}

Variante 2
${zonesLabel}

Variante 3
${zonesLabel}

Sois drôle, en français. Pas d'explication, juste les variantes.`
            : `You are an internet meme expert. The user wants to create a meme with ${n} text zone(s) about: "${prompt}".
Generate exactly 3 variants. Each variant must have exactly ${n} short, punchy text(s).

REQUIRED format (exactly ${n} text line(s) per variant):
Variant 1
${zonesLabel}

Variant 2
${zonesLabel}

Variant 3
${zonesLabel}

Be funny. No explanations, just the variants.`;

        try {
            const raw    = await callAI(systemPrompt);
            const parsed = parseSuggestions(raw, n);
            setSuggestions(parsed.length ? parsed : [[raw]]);
        } catch (e) {
            setSuggestions([[lang === 'fr' ? `Erreur : ${e.message}` : `Error: ${e.message}`]]);
        }
        setLoading(false);
    };

    // ── Onglet 2 : Analyser l'image et suggérer des textes ───────────────────
    const handleAnalyze = async () => {
        if (!imageSrc && !canvasEl) return;
        setLoading(true);
        setSuggestions([]);
        setAppliedIdx(null);

        const n = textCount || textItems.length || 2;
        const zonesLabel = Array.from({ length: n }, (_, i) =>
            lang === 'fr' ? `Zone ${i + 1} : [texte]` : `Zone ${i + 1}: [text]`
        ).join('\n');

        let imageBase64 = null;
        if (canvasEl) {
            try {
                const dataUrl = canvasEl.toDataURL('image/jpeg', 0.7);
                imageBase64   = dataUrl.split(',')[1];
            } catch {}
        }

        try {
            let raw;

            if (imageBase64) {
                const res = await fetch(geminiUrl, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
                                {
                                    text: lang === 'fr'
                                        ? `Regarde cette image de mème. Identifie le template si tu le reconnais, puis génère 3 variantes avec exactement ${n} texte(s) par variante.

Format OBLIGATOIRE :
Variante 1
${zonesLabel}

Variante 2
${zonesLabel}

Variante 3
${zonesLabel}

Sois drôle, en français. Pas d'explication.`
                                        : `Look at this meme image. Identify the template if you recognize it, then generate 3 variants with exactly ${n} text(s) per variant.

Required format:
Variant 1
${zonesLabel}

Variant 2
${zonesLabel}

Variant 3
${zonesLabel}

Be funny. No explanations.`,
                                },
                            ],
                        }],
                        generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
                    }),
                });
                if (!res.ok) { const e = await res.json(); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
                const data = await res.json();
                raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else {
                raw = lang === 'fr'
                    ? 'Impossible de lire l\'image. Chargez un template d\'abord.'
                    : 'Cannot read the image. Please load a template first.';
            }

            const parsed = parseSuggestions(raw, n);
            setSuggestions(parsed.length ? parsed : [[raw]]);
        } catch (e) {
            setSuggestions([[lang === 'fr' ? `Erreur : ${e.message}` : `Error: ${e.message}`]]);
        }
        setLoading(false);
    };

    // ── Onglet 3 : Chat contextuel ────────────────────────────────────────────
    const handleChat = async () => {
        if (!chatInput.trim()) return;

        const userMsg = chatInput.trim();
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        const selectedItem = textItems.find(t => t.id === selectedId);
        const currentTexts = textItems.map((t, i) => `T${i + 1}: "${t.text}"`).join('\n');

        const context = lang === 'fr'
            ? `Tu es un assistant pour créer des mèmes. Voici le contexte actuel :
Textes sur le mème :
${currentTexts}
${selectedItem ? `Texte sélectionné : "${selectedItem.text}"` : 'Aucun texte sélectionné.'}

L'utilisateur te demande : "${userMsg}"

Réponds de façon concise. Si on te demande de modifier un texte, donne le nouveau texte entre guillemets.
Si tu proposes des textes haut/bas, utilise le format :
Haut : [texte]
Bas : [texte]`
            : `You are an assistant for creating memes. Current context:
Meme texts:
${currentTexts}
${selectedItem ? `Selected text: "${selectedItem.text}"` : 'No text selected.'}

User asks: "${userMsg}"

Reply concisely. If asked to modify a text, give the new text in quotes.
If you suggest top/bottom texts, use:
Top: [text]
Bottom: [text]`;

        try {
            const reply = await callAI(context);

            setChatHistory(prev => [...prev, { role: 'ai', text: reply }]);

            // Si la réponse contient des textes structurés, extraire les suggestions
            const parsed = parseSuggestions(reply, textCount || textItems.length || 2);
            if (parsed.length && parsed[0].length > 0) {
                setSuggestions(parsed);
            }
        } catch (e) {
            setChatHistory(prev => [...prev, {
                role:  'ai',
                text:  lang === 'fr' ? `Erreur : ${e.message}` : `Error: ${e.message}`,
                error: true,
            }]);
        }
        setLoading(false);
    };

    // ── Appliquer une suggestion sur le canvas ────────────────────────────────
    const applySuggestion = (texts, idx) => {
        setAppliedIdx(idx);
        onApplySuggestion(texts); // tableau de strings
        setTimeout(() => setAppliedIdx(null), 1500);
    };

    // ── Appliquer un texte de chat sur le texte sélectionné ──────────────────
    const applyFromChat = (text) => {
        const clean = text.replace(/^[""]|[""]$/g, '').trim();
        if (selectedId) {
            onUpdateText(selectedId, 'text', clean);
        } else if (textItems.length > 0) {
            onUpdateText(textItems[0].id, 'text', clean);
        }
    };

    // ── Styles ────────────────────────────────────────────────────────────────
    const accent = '#a855f7';
    const accentDark = '#7c3aed';

    const tabStyle = (active) => ({
        flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 700,
        background:   active ? 'rgba(124,58,237,0.2)' : 'transparent',
        border:       'none',
        borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
        color:        active ? accent : theme.muted,
        cursor:       'pointer', fontFamily: 'Syne, sans-serif',
        transition:   'all 0.15s',
        display:      'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    });

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    display:      'flex', alignItems: 'center', gap: 8,
                    background:   `linear-gradient(135deg, ${accentDark}, #f059da)`,
                    border:       'none', borderRadius: 10, padding: '10px 18px',
                    color:        '#fff', fontSize: 13, fontWeight: 700,
                    fontFamily:   'Syne, sans-serif', cursor: 'pointer',
                    boxShadow:    '0 4px 16px rgba(124,58,237,0.45)',
                    transition:   'all 0.18s',
                    position:     'relative',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,58,237,0.65)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.45)'}
            >
                <HiSparkles size={15} />
                {lang === 'fr' ? 'Assistant IA' : 'AI Assistant'}
                <span style={{
                    position: 'absolute', top: -6, right: -6,
                    background: '#f059da', color: '#fff', borderRadius: 99,
                    fontSize: 9, fontWeight: 800, padding: '1px 5px',
                    border: '1.5px solid ' + theme.bg,
                }}>
                    ✨
                </span>
            </button>
        );
    }

    return (
        <div style={{
            background:   theme.surface,
            border:       `1px solid ${theme.border}`,
            borderRadius: 14,
            overflow:     'hidden',
            boxShadow:    `0 8px 32px rgba(124,58,237,0.2), 0 0 0 1px rgba(124,58,237,0.15)`,
            width:        '100%',
            marginTop:    12,
        }}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div style={{
                display:      'flex', alignItems: 'center', justifyContent: 'space-between',
                padding:      '12px 16px',
                background:   `linear-gradient(135deg, rgba(124,58,237,0.15), rgba(240,89,218,0.08))`,
                borderBottom: `1px solid ${theme.border}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'linear-gradient(135deg, #7c3aed, #f059da)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 12px rgba(124,58,237,0.5)',
                    }}>
                        <HiSparkles size={14} color="#fff" />
                    </div>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: theme.text }}>
                        {lang === 'fr' ? 'Assistant IA' : 'AI Assistant'}
                    </span>
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                        background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                        color: accent, fontFamily: 'DM Mono, monospace',
                    }}>
                        Gemini
                    </span>
                </div>
                <button onClick={() => setIsOpen(false)} style={{
                    background: 'transparent', border: 'none', color: theme.muted,
                    cursor: 'pointer', padding: 4, display: 'flex',
                }}>
                    <FiX size={16} />
                </button>
            </div>

            {/* ── Clé API manquante — affiché uniquement si ni .env ni saisie manuelle ── */}
            {!hasKey && (
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>
                    <div style={{
                        background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
                        borderLeft: '3px solid #fbbf24', borderRadius: 8, padding: '10px 12px',
                        marginBottom: 10,
                    }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>
                            ⚙️ {lang === 'fr' ? 'Clé API Gemini requise' : 'Gemini API key required'}
                        </div>
                        <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5 }}>
                            {lang === 'fr'
                                ? 'Obtiens une clé gratuite sur aistudio.google.com'
                                : 'Get a free key at aistudio.google.com'}
                        </div>
                    </div>
                    <input
                        type="password"
                        placeholder={lang === 'fr' ? 'Colle ta clé API ici...' : 'Paste your API key here...'}
                        value={userApiKey}
                        onChange={e => setUserApiKey(e.target.value)}
                        style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8,
                            background: theme.inputBg, border: `1px solid ${theme.border}`,
                            color: theme.text, fontSize: 12, outline: 'none',
                            fontFamily: 'DM Mono, monospace',
                        }}
                    />
                </div>
            )}

            {/* ── Onglets ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}` }}>
                <button style={tabStyle(activeTab === 'generate')} onClick={() => setActiveTab('generate')}>
                    <FiZap size={12} /> {lang === 'fr' ? 'Générer' : 'Generate'}
                </button>
                <button style={tabStyle(activeTab === 'analyze')} onClick={() => setActiveTab('analyze')}>
                    <FiEye size={12} /> {lang === 'fr' ? 'Analyser' : 'Analyze'}
                </button>
                <button style={tabStyle(activeTab === 'chat')} onClick={() => setActiveTab('chat')}>
                    <FiMessageSquare size={12} /> Chat
                </button>
            </div>

            {/* ── Contenu des onglets ─────────────────────────────────────── */}
            <div style={{ padding: '14px 16px' }}>

                {/* ══ GÉNÉRER ══════════════════════════════════════════════ */}
                {activeTab === 'generate' && (
                    <div>
                        <p style={{ fontSize: 12, color: theme.muted, marginBottom: 10, lineHeight: 1.5 }}>
                            {lang === 'fr'
                                ? '💡 Décris ton idée de mème et l\'IA génère 3 variantes de textes prêtes à appliquer.'
                                : '💡 Describe your meme idea and AI generates 3 text variants ready to apply.'}
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <input
                                type="text"
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                                placeholder={lang === 'fr'
                                    ? 'Ex: les devs qui pushent en prod vendredi...'
                                    : 'Ex: developers pushing to prod on Friday...'}
                                style={{
                                    flex: 1, padding: '9px 12px', borderRadius: 8,
                                    background: theme.inputBg, border: `1px solid ${theme.border}`,
                                    color: theme.text, fontSize: 13, outline: 'none',
                                    fontFamily: 'Syne, sans-serif',
                                }}
                            />
                            <button
                                onClick={handleGenerate}
                                disabled={loading || !prompt.trim() || !hasKey}
                                style={{
                                    background: loading ? theme.panel : `linear-gradient(135deg, ${accentDark}, ${accent})`,
                                    border: 'none', borderRadius: 8, padding: '0 14px',
                                    color: '#fff', cursor: loading ? 'wait' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    fontSize: 13, fontWeight: 700, opacity: !hasKey ? 0.5 : 1,
                                }}
                            >
                                {loading ? <Spinner /> : <FiZap size={14} />}
                            </button>
                        </div>

                        <SuggestionList
                            suggestions={suggestions}
                            loading={loading}
                            appliedIdx={appliedIdx}
                            onApply={applySuggestion}
                            onRegenerate={handleGenerate}
                            theme={theme}
                            lang={lang}
                        />
                    </div>
                )}

                {/* ══ ANALYSER ══════════════════════════════════════════════ */}
                {activeTab === 'analyze' && (
                    <div>
                        <p style={{ fontSize: 12, color: theme.muted, marginBottom: 12, lineHeight: 1.5 }}>
                            {lang === 'fr'
                                ? '🔍 L\'IA analyse ton image, reconnaît le template et suggère des textes adaptés.'
                                : '🔍 AI analyzes your image, recognizes the template, and suggests fitting texts.'}
                        </p>

                        {!imageSrc ? (
                            <div style={{
                                textAlign: 'center', padding: '20px 10px',
                                color: theme.muted, fontSize: 12, lineHeight: 1.6,
                                background: theme.panel, borderRadius: 8,
                                border: `1px dashed ${theme.border}`,
                            }}>
                                {lang === 'fr'
                                    ? '⚠️ Charge d\'abord une image ou un template dans l\'éditeur.'
                                    : '⚠️ Load an image or template in the editor first.'}
                            </div>
                        ) : (
                            <button
                                onClick={handleAnalyze}
                                disabled={loading || !hasKey}
                                style={{
                                    width: '100%', padding: '11px', borderRadius: 10,
                                    background: loading
                                        ? theme.panel
                                        : `linear-gradient(135deg, ${accentDark}, #f059da)`,
                                    border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                                    cursor: loading ? 'wait' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    fontFamily: 'Syne, sans-serif', marginBottom: 12,
                                    opacity: !hasKey ? 0.5 : 1,
                                    boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                                }}
                            >
                                {loading ? <><Spinner /> {lang === 'fr' ? 'Analyse...' : 'Analyzing...'}</> : <><FiEye size={14} /> {lang === 'fr' ? 'Analyser l\'image' : 'Analyze image'}</>}
                            </button>
                        )}

                        <SuggestionList
                            suggestions={suggestions}
                            loading={loading && activeTab === 'analyze'}
                            appliedIdx={appliedIdx}
                            onApply={applySuggestion}
                            onRegenerate={handleAnalyze}
                            theme={theme}
                            lang={lang}
                        />
                    </div>
                )}

                {/* ══ CHAT ══════════════════════════════════════════════════ */}
                {activeTab === 'chat' && (
                    <div>
                        {/* Historique */}
                        <div style={{
                            minHeight: 160, maxHeight: 260, overflowY: 'auto',
                            marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8,
                        }}>
                            {chatHistory.length === 0 && (
                                <div style={{
                                    textAlign: 'center', padding: '20px 10px',
                                    color: theme.muted, fontSize: 12, lineHeight: 1.8,
                                }}>
                                    {lang === 'fr' ? (
                                        <>
                                            💬 Exemples de questions :<br />
                                            <em>"Rends ce texte plus drôle"</em><br />
                                            <em>"Traduis en anglais"</em><br />
                                            <em>"5 idées sur les examens"</em><br />
                                            <em>"Texte plus court et percutant"</em>
                                        </>
                                    ) : (
                                        <>
                                            💬 Example questions:<br />
                                            <em>"Make this text funnier"</em><br />
                                            <em>"Translate to French"</em><br />
                                            <em>"5 ideas about deadlines"</em><br />
                                            <em>"Shorter and punchier text"</em>
                                        </>
                                    )}
                                </div>
                            )}
                            {chatHistory.map((msg, i) => (
                                <ChatBubble
                                    key={i}
                                    msg={msg}
                                    theme={theme}
                                    lang={lang}
                                    onApplyText={applyFromChat}
                                    selectedId={selectedId}
                                />
                            ))}
                            {loading && (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 12px' }}>
                                    <div style={{
                                        width: 28, height: 28, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #7c3aed, #f059da)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <HiSparkles size={13} color="#fff" />
                                    </div>
                                    <div style={{
                                        background: theme.panel, borderRadius: '0 10px 10px 10px',
                                        padding: '8px 12px', display: 'flex', gap: 4, alignItems: 'center',
                                    }}>
                                        {[0,1,2].map(d => (
                                            <div key={d} style={{
                                                width: 6, height: 6, borderRadius: '50%',
                                                background: accent,
                                                animation: `bounce 1s ${d * 0.2}s infinite`,
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Suggestions issues du chat */}
                        {suggestions.length > 0 && activeTab === 'chat' && (
                            <SuggestionList
                                suggestions={suggestions}
                                loading={false}
                                appliedIdx={appliedIdx}
                                onApply={applySuggestion}
                                theme={theme}
                                lang={lang}
                                compact
                            />
                        )}

                        {/* Input */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !loading && handleChat()}
                                placeholder={lang === 'fr' ? 'Pose une question...' : 'Ask a question...'}
                                style={{
                                    flex: 1, padding: '9px 12px', borderRadius: 8,
                                    background: theme.inputBg, border: `1px solid ${theme.border}`,
                                    color: theme.text, fontSize: 13, outline: 'none',
                                    fontFamily: 'Syne, sans-serif',
                                }}
                            />
                            <button
                                onClick={handleChat}
                                disabled={loading || !chatInput.trim() || !hasKey}
                                style={{
                                    background: `linear-gradient(135deg, ${accentDark}, ${accent})`,
                                    border: 'none', borderRadius: 8, padding: '0 14px',
                                    color: '#fff', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center',
                                    opacity: !hasKey ? 0.5 : 1,
                                }}
                            >
                                {loading ? <Spinner /> : <FiSend size={14} />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────────────────────

function SuggestionList({ suggestions, loading, appliedIdx, onApply, onRegenerate, theme, lang, compact }) {
    if (loading && !suggestions.length) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{
                        height: compact ? 44 : 64,
                        borderRadius: 8,
                        background: `linear-gradient(90deg, ${theme.panel} 25%, ${theme.border} 50%, ${theme.panel} 75%)`,
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.4s infinite',
                    }} />
                ))}
            </div>
        );
    }

    if (!suggestions.length) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {!compact && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {lang === 'fr' ? `${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''}` : `${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''}`}
                    </span>
                    {onRegenerate && (
                        <button onClick={onRegenerate} style={{
                            background: 'transparent', border: `1px solid ${theme.border}`,
                            borderRadius: 6, padding: '3px 8px', color: theme.muted,
                            fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                            <FiRefreshCw size={10} /> {lang === 'fr' ? 'Regénérer' : 'Regenerate'}
                        </button>
                    )}
                </div>
            )}

            {suggestions.map((texts, i) => (
                <SuggestionCard
                    key={i}
                    texts={texts}
                    idx={i}
                    applied={appliedIdx === i}
                    onApply={() => onApply(texts, i)}
                    theme={theme}
                    lang={lang}
                    compact={compact}
                />
            ))}
        </div>
    );
}

function SuggestionCard({ texts, idx, applied, onApply, theme, lang, compact }) {
    const [hover, setHover] = useState(false);
    // texts est un tableau de strings ['texte zone 1', 'texte zone 2', ...]
    const zones = Array.isArray(texts) ? texts : [texts];

    const zoneIcons = ['↑', '↓', '↗', '↘', '→', '←'];

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                background:   hover ? 'rgba(124,58,237,0.08)' : theme.panel,
                border:       `1px solid ${applied ? '#22d3a0' : hover ? 'rgba(124,58,237,0.4)' : theme.border}`,
                borderRadius: 8,
                padding:      compact ? '8px 10px' : '10px 12px',
                transition:   'all 0.15s',
                cursor:       'default',
            }}
        >
            {!compact && (
                <div style={{ fontSize: 10, fontWeight: 700, color: '#a855f7', fontFamily: 'DM Mono', marginBottom: 6, opacity: 0.7 }}>
                    {lang === 'fr' ? `Variante ${idx + 1}` : `Variant ${idx + 1}`}
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                {zones.map((txt, zi) => txt ? (
                    <div key={zi}>
                        <span style={{ fontSize: 10, color: theme.muted, fontWeight: 600, fontFamily: 'DM Mono' }}>
                            {zoneIcons[zi] || `${zi + 1}.`}{' '}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: zi === 0 ? 700 : 600, color: theme.text, opacity: zi === 0 ? 1 : 0.85 }}>
                            {txt}
                        </span>
                    </div>
                ) : null)}
                <button
                    onClick={onApply}
                    style={{
                        background:   applied ? 'rgba(34,211,160,0.15)' : 'rgba(124,58,237,0.15)',
                        border:       `1px solid ${applied ? '#22d3a0' : 'rgba(124,58,237,0.3)'}`,
                        borderRadius: 6,
                        padding:      '5px 12px',
                        color:        applied ? '#22d3a0' : '#a855f7',
                        fontSize:     12, fontWeight: 700, cursor: 'pointer',
                        display:      'flex', alignItems: 'center', gap: 5,
                        fontFamily:   'Syne, sans-serif',
                        alignSelf:    'flex-end',
                        transition:   'all 0.15s',
                        marginTop:    6,
                    }}
                >
                    {applied
                        ? <><FiCheck size={11} /> {lang === 'fr' ? 'Appliqué !' : 'Applied!'}</>
                        : lang === 'fr' ? 'Appliquer' : 'Apply'
                    }
                </button>
            </div>
        </div>
    );
}

function ChatBubble({ msg, theme, lang, onApplyText, selectedId }) {
    const isUser = msg.role === 'user';

    // Détecte les textes entre guillemets dans la réponse IA
    const quotedTexts = !isUser
        ? [...(msg.text.matchAll(/"([^"]{3,60})"/g))].map(m => m[1])
        : [];

    return (
        <div style={{
            display: 'flex', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start', padding: '2px 4px',
        }}>
            <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: isUser
                    ? theme.border
                    : 'linear-gradient(135deg, #7c3aed, #f059da)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
            }}>
                {isUser ? '👤' : <HiSparkles size={12} color="#fff" />}
            </div>
            <div style={{ maxWidth: '82%' }}>
                <div style={{
                    background:   isUser ? 'rgba(124,58,237,0.15)' : theme.panel,
                    border:       `1px solid ${isUser ? 'rgba(124,58,237,0.3)' : theme.border}`,
                    borderRadius: isUser ? '10px 2px 10px 10px' : '2px 10px 10px 10px',
                    padding:      '8px 12px',
                    fontSize:     12,
                    color:        msg.error ? '#f43f5e' : theme.text,
                    lineHeight:   1.5,
                    whiteSpace:   'pre-wrap',
                }}>
                    {msg.text}
                </div>
                {/* Boutons d'application pour les textes détectés */}
                {quotedTexts.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {quotedTexts.map((txt, i) => (
                            <button key={i} onClick={() => onApplyText(txt)} style={{
                                background: 'rgba(34,211,160,0.1)', border: '1px solid rgba(34,211,160,0.3)',
                                borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600,
                                color: '#22d3a0', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                <FiEdit3 size={9} />
                                {lang === 'fr' ? 'Utiliser' : 'Use'}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div style={{
            width: 14, height: 14,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: '2px solid #fff',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
        }} />
    );
}