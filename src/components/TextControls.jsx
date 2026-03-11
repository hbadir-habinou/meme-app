import React, { useRef, useEffect } from 'react';
import {
    FiPlus, FiTrash2, FiAlignLeft, FiAlignCenter, FiAlignRight,
    FiType, FiSliders, FiBold,
} from 'react-icons/fi';
import { MdOutlineTextFields, MdOutlineFormatSize } from 'react-icons/md';
import { FONT_OPTIONS, COLOR_PRESETS } from '../utils/templates';
import { useApp } from '../context/AppContext';

export default function TextControls({ textItems, selectedId, onSelect, onAdd, onRemove, onUpdate }) {

    const { theme, t } = useApp();
    const selected     = textItems.find(t => t.id === selectedId);

    const sectionTitle = {
        fontSize:      11,
        fontWeight:    700,
        color:         theme.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom:  12,
        display:       'flex',
        alignItems:    'center',
        gap:           6,
    };

    const label = {
        fontSize:      11,
        fontWeight:    600,
        color:         theme.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        display:       'block',
        marginBottom:  6,
    };

    const inputStyle = {
        width:      '100%',
        padding:    '9px 12px',
        borderRadius: 8,
        background: theme.inputBg,
        border:     `1px solid ${theme.border}`,
        color:      theme.text,
        fontSize:   13,
        outline:    'none',
        marginBottom: 10,
        fontFamily: 'Syne, sans-serif',
    };

    const selectStyle = {
        ...inputStyle,
        cursor:      'pointer',
        marginBottom: 12,
    };

    const toggleBtn = (active) => ({
        padding:      '6px 12px',
        borderRadius: 6,
        background:   active ? 'rgba(124,58,237,0.2)' : 'transparent',
        border:       `1px solid ${active ? '#7c3aed' : theme.border}`,
        color:        active ? '#a855f7' : theme.muted,
        fontSize:     12,
        fontWeight:   600,
        cursor:       'pointer',
        transition:   'all 0.15s',
        fontFamily:   'Syne, sans-serif',
        display:      'flex',
        alignItems:   'center',
        gap:          5,
    });

    const textInputRef = useRef(null);

    // Auto-focus le champ texte quand on sélectionne un texte
    useEffect(() => {
        if (selected && textInputRef.current) {
            textInputRef.current.focus();
            textInputRef.current.select();
        }
    }, [selected?.id]);

    const colorDot = (col, active) => ({
        width:       22,
        height:      22,
        borderRadius: '50%',
        background:  col,
        border:      active ? '2.5px solid #a855f7' : `2px solid ${theme.border}`,
        cursor:      'pointer',
        transition:  'all 0.15s',
        boxShadow:   active ? '0 0 8px rgba(168,85,247,0.5)' : 'none',
        transform:   active ? 'scale(1.15)' : 'scale(1)',
    });

    return (
        <div style={{ overflowY: 'auto', height: '100%', background: theme.surface }}>

            {/* Section textes */}
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.border}` }}>
                <div style={sectionTitle}><MdOutlineTextFields size={13} /> {t.texts}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {textItems.map((item, i) => (
                        <button key={item.id} onClick={() => onSelect(item.id)} style={toggleBtn(selectedId === item.id)}>
                            T{i + 1}
                        </button>
                    ))}
                    <button
                        onClick={onAdd}
                        style={{ ...toggleBtn(false), background: 'rgba(34,211,160,0.1)', border: '1px solid rgba(34,211,160,0.3)', color: '#22d3a0' }}
                    >
                        <FiPlus size={12} /> {t.add}
                    </button>
                </div>
                {selected && (
                    <button
                        onClick={() => onRemove(selected.id)}
                        style={{ ...toggleBtn(false), background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' }}
                    >
                        <FiTrash2 size={12} /> {t.delete}
                    </button>
                )}
            </div>

            {selected && (
                <>
                    {/* Section contenu */}
                    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.border}` }}>
                        <div style={sectionTitle}><FiType size={12} /> {t.content}</div>
                        <input
                            ref={textInputRef}
                            type="text"
                            value={selected.text}
                            onChange={e => onUpdate(selected.id, 'text', e.target.value)}
                            onKeyDown={e => {
                                // Suppr dans le champ texte vide = supprime le texte
                                if ((e.key === 'Delete' || e.key === 'Backspace') && !selected.text) {
                                    e.preventDefault();
                                    onRemove(selected.id);
                                }
                            }}
                            style={{ ...inputStyle, borderColor: '#7c3aed', boxShadow: '0 0 0 2px rgba(124,58,237,0.15)' }}
                            placeholder={t.yourText}
                            autoComplete="off"
                        />
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => onUpdate(selected.id, 'uppercase', !selected.uppercase)} style={toggleBtn(selected.uppercase)}>
                                <FiBold size={12} /> {t.uppercase}
                            </button>
                            <button onClick={() => onUpdate(selected.id, 'shadow', !selected.shadow)} style={toggleBtn(selected.shadow)}>
                                {t.shadow}
                            </button>
                        </div>
                    </div>

                    {/* Section style */}
                    <div style={{ padding: '14px 16px' }}>
                        <div style={sectionTitle}><FiSliders size={12} /> {t.style}</div>

                        <label style={label}>{t.font}</label>
                        <select
                            value={selected.fontFamily}
                            onChange={e => onUpdate(selected.id, 'fontFamily', e.target.value)}
                            style={selectStyle}
                        >
                            {FONT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        {/* Taille */}
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <label style={{ ...label, marginBottom: 0 }}>
                                    <MdOutlineFormatSize size={12} style={{ verticalAlign: -2 }} /> {t.size}
                                </label>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', fontFamily: 'DM Mono, monospace' }}>
                                    {selected.fontSize}
                                </span>
                            </div>
                            <input
                                type="range" min={10} max={100}
                                value={selected.fontSize}
                                onChange={e => onUpdate(selected.id, 'fontSize', +e.target.value)}
                                style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                            />
                        </div>

                        <label style={label}>{t.textColor}</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            {COLOR_PRESETS.map(col => (
                                <div key={col} style={colorDot(col, selected.color === col)} onClick={() => onUpdate(selected.id, 'color', col)} />
                            ))}
                        </div>

                        <label style={label}>{t.strokeColor}</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            {COLOR_PRESETS.map(col => (
                                <div key={col} style={colorDot(col, selected.strokeColor === col)} onClick={() => onUpdate(selected.id, 'strokeColor', col)} />
                            ))}
                        </div>

                        {/* Épaisseur contour */}
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <label style={{ ...label, marginBottom: 0 }}>{t.strokeWidth}</label>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', fontFamily: 'DM Mono, monospace' }}>
                                    {selected.strokeWidth}
                                </span>
                            </div>
                            <input
                                type="range" min={0} max={10}
                                value={selected.strokeWidth}
                                onChange={e => onUpdate(selected.id, 'strokeWidth', +e.target.value)}
                                style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                            />
                        </div>

                        <label style={label}>{t.alignment}</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[
                                { val: 'left',   Icon: FiAlignLeft   },
                                { val: 'center', Icon: FiAlignCenter },
                                { val: 'right',  Icon: FiAlignRight  },
                            ].map(({ val, Icon }) => (
                                <button key={val} onClick={() => onUpdate(selected.id, 'align', val)} style={toggleBtn(selected.align === val)}>
                                    <Icon size={13} />
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}