import React, { useRef, useEffect, useCallback, useState } from 'react';
import { drawMeme, getTextAtPos, clientToCanvasPercent } from '../utils/canvas';
import { useApp } from '../context/AppContext';

export default function MemeCanvas({
    image, imgElement, textItems, selectedId,
    onSelectText, onUpdateText, onCanvasReady,
    onDeleteText, onAddText,
}) {
    const { theme } = useApp();

    const canvasRef    = useRef(null);
    const containerRef = useRef(null);
    const dragRef      = useRef(null);
    const didDragRef   = useRef(false);   // distingue click vs drag

    // ── Inline editing state ──────────────────────────────────────────────────
    const [inlineEdit, setInlineEdit] = useState(null);  // { id, x, y, w, h }
    const inputRef = useRef(null);

    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (canvasRef.current) onCanvasReady(canvasRef.current);
    }, [onCanvasReady]);

    const redraw = useCallback(() => {
        drawMeme(canvasRef.current, imgElement, textItems, selectedId);
    }, [imgElement, textItems, selectedId]);

    useEffect(() => { redraw(); }, [redraw]);

    // Focus le canvas au montage pour capter les touches clavier
    useEffect(() => {
        if (canvasRef.current && !inlineEdit) canvasRef.current.focus();
    }, [selectedId, inlineEdit]);

    // ── Coordonnées event ─────────────────────────────────────────────────────
    const getEventPos = (e) => {
        const touch = e.touches?.[0] || e.changedTouches?.[0];
        return { clientX: touch ? touch.clientX : e.clientX, clientY: touch ? touch.clientY : e.clientY };
    };

    // ── Calcule la bounding box d'un item pour positionner l'input inline ────
    const getBoundingBox = (item) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width  / canvas.width;
        const scaleY = rect.height / canvas.height;

        const text     = item.uppercase ? item.text.toUpperCase() : item.text;
        const fontSize = Math.round((item.fontSize / 100) * Math.min(canvas.width, canvas.height) * 0.5);
        ctx.font       = `bold ${fontSize}px ${item.fontFamily}`;
        ctx.textAlign  = item.align;

        const metrics  = ctx.measureText(text);
        const w        = metrics.width;
        const h        = fontSize;
        const px       = (item.x / 100) * canvas.width;
        const py       = (item.y / 100) * canvas.height;
        const ox       = item.align === 'center' ? -w / 2 : item.align === 'right' ? -w : 0;

        return {
            left:   rect.left + (px + ox - 12) * scaleX,
            top:    rect.top  + (py - h / 2 - 8) * scaleY,
            width:  Math.max(180, (w + 24) * scaleX),
            height: (h + 16) * scaleY,
            fontSize: fontSize * scaleY,
        };
    };

    // ── Ouvre l'éditeur inline (double-clic ou simple clic sur déjà sélectionné) ──
    const openInlineEdit = (itemId) => {
        const item = textItems.find(t => t.id === itemId);
        if (!item) return;
        const box = getBoundingBox(item);
        if (!box) return;
        setInlineEdit({ id: itemId, ...box });
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            }
        }, 30);
    };

    const closeInlineEdit = () => {
        setInlineEdit(null);
        setTimeout(() => canvasRef.current?.focus(), 50);
    };

    // ── Pointer Down ─────────────────────────────────────────────────────────
    const handlePointerDown = (e) => {
        e.preventDefault();
        if (inlineEdit) { closeInlineEdit(); return; }

        const canvas = canvasRef.current;
        const rect   = canvas.getBoundingClientRect();
        const { clientX, clientY } = getEventPos(e);
        const hitId = getTextAtPos(canvas, textItems, clientX, clientY, rect);

        didDragRef.current = false;

        if (hitId) {
            onSelectText(hitId);
            const item = textItems.find(t => t.id === hitId);
            const pos  = clientToCanvasPercent(canvas, clientX, clientY, rect);
            dragRef.current = { id: hitId, offsetX: pos.x - item.x, offsetY: pos.y - item.y };
        } else {
            onSelectText(null);
            dragRef.current = null;
        }
    };

    // ── Double clic → ouvre l'éditeur inline ─────────────────────────────────
    const handleDoubleClick = (e) => {
        const canvas = canvasRef.current;
        const rect   = canvas.getBoundingClientRect();
        const hitId  = getTextAtPos(canvas, textItems, e.clientX, e.clientY, rect);
        if (hitId) openInlineEdit(hitId);
    };

    // ── Pointer Move ─────────────────────────────────────────────────────────
    const handlePointerMove = (e) => {
        if (!dragRef.current) return;
        e.preventDefault();
        didDragRef.current = true;

        const canvas = canvasRef.current;
        const rect   = canvas.getBoundingClientRect();
        const { clientX, clientY } = getEventPos(e);
        const pos = clientToCanvasPercent(canvas, clientX, clientY, rect);

        onUpdateText(dragRef.current.id, 'x', Math.max(2, Math.min(98, pos.x - dragRef.current.offsetX)));
        onUpdateText(dragRef.current.id, 'y', Math.max(2, Math.min(98, pos.y - dragRef.current.offsetY)));
    };

    // ── Pointer Up — simple clic = sélection seule, PAS d'ouverture inline ───
    const handlePointerUp = (e) => {
        didDragRef.current = false;
        dragRef.current = null;
    };

    // ── Clavier ───────────────────────────────────────────────────────────────
    const handleKeyDown = (e) => {
        if (inlineEdit) return;  // l'input gère ses propres touches

        if (!selectedId) return;

        switch (e.key) {
            // Supprimer le texte sélectionné
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                if (onDeleteText) onDeleteText(selectedId);
                break;

            // Déplacer le texte avec les flèches (1% par pression, 5% avec Shift)
            case 'ArrowLeft':
                e.preventDefault();
                onUpdateText(selectedId, 'x', Math.max(2, (textItems.find(t => t.id === selectedId)?.x || 50) - (e.shiftKey ? 5 : 1)));
                break;
            case 'ArrowRight':
                e.preventDefault();
                onUpdateText(selectedId, 'x', Math.min(98, (textItems.find(t => t.id === selectedId)?.x || 50) + (e.shiftKey ? 5 : 1)));
                break;
            case 'ArrowUp':
                e.preventDefault();
                onUpdateText(selectedId, 'y', Math.max(2, (textItems.find(t => t.id === selectedId)?.y || 50) - (e.shiftKey ? 5 : 1)));
                break;
            case 'ArrowDown':
                e.preventDefault();
                onUpdateText(selectedId, 'y', Math.min(98, (textItems.find(t => t.id === selectedId)?.y || 50) + (e.shiftKey ? 5 : 1)));
                break;

            // Désélectionner
            case 'Escape':
                onSelectText(null);
                break;

            // Ouvrir l'éditeur inline en appuyant sur Entrée ou en tapant directement
            case 'Enter':
            case 'F2':
                e.preventDefault();
                openInlineEdit(selectedId);
                break;

            default:
                // Si l'utilisateur tape un caractère normal → ouvrir l'inline editor
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    openInlineEdit(selectedId);
                }
                break;
        }
    };

    // ── Curseur dynamique ────────────────────────────────────────────────────
    const handleMouseMove = (e) => {
        handlePointerMove(e);
        if (!canvasRef.current) return;
        const rect  = canvasRef.current.getBoundingClientRect();
        const hitId = getTextAtPos(canvasRef.current, textItems, e.clientX, e.clientY, rect);
        canvasRef.current.style.cursor = hitId ? (dragRef.current ? 'grabbing' : 'grab') : 'default';
    };

    const selectedItem = textItems.find(t => t.id === selectedId);

    return (
        <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
            <canvas
                ref={canvasRef}
                width={900}
                height={600}
                tabIndex={0}
                style={{
                    width: '100%', display: 'block', borderRadius: 8,
                    cursor: 'default', touchAction: 'none', userSelect: 'none',
                    outline: 'none',
                }}
                onMouseDown={handlePointerDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                onKeyDown={handleKeyDown}
            />

            {/* ── Input inline flottant ────────────────────────────────────── */}
            {inlineEdit && selectedItem && (
                <input
                    ref={inputRef}
                    type="text"
                    value={selectedItem.text}
                    onChange={e => onUpdateText(inlineEdit.id, 'text', e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                            e.preventDefault();
                            closeInlineEdit();
                        }
                    }}
                    onBlur={closeInlineEdit}
                    style={{
                        position:     'fixed',
                        left:         inlineEdit.left,
                        top:          inlineEdit.top,
                        width:        inlineEdit.width,
                        minHeight:    inlineEdit.height,
                        fontSize:     Math.max(12, Math.min(24, inlineEdit.fontSize)),
                        fontFamily:   selectedItem.fontFamily,
                        fontWeight:   'bold',
                        textAlign:    selectedItem.align,
                        textTransform: selectedItem.uppercase ? 'uppercase' : 'none',
                        color:        selectedItem.color,
                        background:   'rgba(10,10,15,0.92)',
                        border:       '2px solid #a855f7',
                        borderRadius: 6,
                        padding:      '4px 8px',
                        outline:      'none',
                        boxShadow:    '0 0 0 4px rgba(168,85,247,0.25), 0 8px 24px rgba(0,0,0,0.6)',
                        zIndex:       999,
                        caretColor:   '#a855f7',
                        letterSpacing: '0.02em',
                    }}
                />
            )}

            {/* ── Tooltip raccourcis clavier ──────────────────────────────── */}
            {selectedId && !inlineEdit && (
                <div style={{
                    position:  'absolute',
                    bottom:    8,
                    left:      '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(6px)',
                    border:    '1px solid rgba(168,85,247,0.3)',
                    borderRadius: 99,
                    padding:   '4px 14px',
                    fontSize:  11,
                    color:     'rgba(255,255,255,0.65)',
                    fontFamily:'DM Mono, monospace',
                    whiteSpace:'nowrap',
                    pointerEvents: 'none',
                }}>
                    Double-clic / Entrée → éditer &nbsp;·&nbsp; ↑↓←→ déplacer &nbsp;·&nbsp; Suppr → effacer &nbsp;·&nbsp; Esc → désélectionner
                </div>
            )}
        </div>
    );
}