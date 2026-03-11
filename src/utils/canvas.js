export function drawMeme(canvas, img, textItems, selectedId = null) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (img) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
        const size = 20;
        for (let x = 0; x < canvas.width; x += size) {
            for (let y = 0; y < canvas.height; y += size) {
                ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? '#1a1a26' : '#13131a';
                ctx.fillRect(x, y, size, size);
            }
        }
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#4b5563';
        ctx.font = 'bold 20px Syne, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Ajoutez une image', canvas.width / 2, canvas.height / 2);
    }
    textItems.forEach((item) => {
        const px = (item.x / 100) * canvas.width;
        const py = (item.y / 100) * canvas.height;
        const text = item.uppercase ? item.text.toUpperCase() : item.text;
        const fontSize = Math.round((item.fontSize / 100) * Math.min(canvas.width, canvas.height) * 0.5);
        ctx.save();
        ctx.font = `bold ${fontSize}px ${item.fontFamily}`;
        ctx.textAlign = item.align;
        ctx.textBaseline = 'middle';
        if (item.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3; }
        const strokeW = Math.max(1, Math.round((item.strokeWidth / 10) * fontSize * 0.15));
        ctx.lineWidth = strokeW * 2;
        ctx.strokeStyle = item.strokeColor;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(text, px, py);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = item.color;
        ctx.fillText(text, px, py);
        if (item.id === selectedId) {
            const metrics = ctx.measureText(text);
            const w = metrics.width;
            const h = fontSize;
            const ox = item.align === 'center' ? -w / 2 : item.align === 'right' ? -w : 0;
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 3]);
            ctx.shadowBlur = 0;
            ctx.strokeRect(px + ox - 10, py - h / 2 - 8, w + 20, h + 16);
            ctx.fillStyle = '#a855f7';
            ctx.setLineDash([]);
            [
                [px + ox - 10, py - h / 2 - 8],
                [px + ox + w + 10, py - h / 2 - 8],
                [px + ox - 10, py + h / 2 + 8],
                [px + ox + w + 10, py + h / 2 + 8]
            ].forEach(([cx, cy]) => { ctx.fillRect(cx - 5, cy - 5, 10, 10); });
        }
        ctx.restore();
    });
}

export function getTextAtPos(canvas, textItems, clientX, clientY, rect) {
    const ctx = canvas.getContext('2d');
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (clientX - rect.left) * scaleX;
    const cy = (clientY - rect.top) * scaleY;
    for (let i = textItems.length - 1; i >= 0; i--) {
        const item = textItems[i];
        const px = (item.x / 100) * canvas.width;
        const py = (item.y / 100) * canvas.height;
        const text = item.uppercase ? item.text.toUpperCase() : item.text;
        const fontSize = Math.round((item.fontSize / 100) * Math.min(canvas.width, canvas.height) * 0.5);
        ctx.font = `bold ${fontSize}px ${item.fontFamily}`;
        ctx.textAlign = item.align;
        const metrics = ctx.measureText(text);
        const w = metrics.width;
        const h = fontSize;
        const ox = item.align === 'center' ? -w / 2 : item.align === 'right' ? -w : 0;
        if (cx >= px + ox - 12 && cx <= px + ox + w + 12 && cy >= py - h / 2 - 10 && cy <= py + h / 2 + 10) return item.id;
    }
    return null;
}

export function clientToCanvasPercent(canvas, clientX, clientY, rect) {
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: ((clientX - rect.left) * scaleX / canvas.width) * 100,
        y: ((clientY - rect.top) * scaleY / canvas.height) * 100,
    };
}