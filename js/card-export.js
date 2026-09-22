// card-export.js — 决策卡真实文件下载
// 优先导出 PNG（Canvas 本地绘制，不依赖外部 CDN）；环境异常时回退 SVG。
// 中文使用系统字体（PingFang SC / 微软雅黑 / Noto Sans SC）。

const FONT_STACK = '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';

function font(size, weight = 400) {
  return `${weight} ${size}px ${FONT_STACK}`;
}

export function downloadDecisionCard(data, filenameBase) {
  return new Promise((resolve) => {
    renderPng(data)
      .then((ok) => {
        if (ok) { resolve('png'); return; }
        downloadSvg(data, filenameBase);
        resolve('svg');
      })
      .catch(() => {
        try {
          downloadSvg(data, filenameBase);
          resolve('svg');
        } catch (e) {
          resolve(null);
        }
      });
  });

  function renderPng(d) {
    const W = 720, PAD = 54, BW = W - PAD * 2;
    const measure = document.createElement('canvas').getContext('2d');
    if (!measure) return Promise.resolve(false);

    const wrap = (text, f, maxW) => {
      measure.font = f;
      const out = [];
      for (const seg of String(text).split('\n')) {
        let line = '';
        for (const ch of seg) {
          if (measure.measureText(line + ch).width > maxW) {
            out.push(line);
            line = ch;
          } else {
            line += ch;
          }
        }
        out.push(line);
      }
      return out;
    };

    // —— 构建内容块 ——
    const blocks = [];
    blocks.push({ type: 'header' });
    const addPara = (label, text) => blocks.push({ type: 'para', label, lines: wrap(text, font(13.5), BW) });
    const addList = (label, items, marker) => {
      if (!items || !items.length) return;
      blocks.push({
        type: 'list', label, marker,
        items: items.map((t) => wrap(t, font(13.5), BW - 26)),
      });
    };

    addPara('我的目标', d.goal);
    blocks.push({ type: 'choice', name: d.choice, sub: d.choiceSub });
    if (d.unmetHard && d.unmetHard.length) {
      addList('未满足的硬约束（已由你主动选择）', d.unmetHard.map((c) => `${c.meetStatus === 'no' ? '[不满足]' : '[存在风险]'} ${c.text}：${c.meetText}`), 'risk');
    }
    if (d.exploratory) {
      addPara('证据状态注记', '⚠ 证据不足（探索性状态）——材料数量不足，以上结论仅供参考，建议补充材料后重新评估。');
    }
    addList('为什么选择', d.reasons, 'num');
    addList('做出的取舍', d.tradeoffs, 'dash');
    addList('已应用的调整', d.applied, 'accent');
    addList('关键风险', d.risks, 'risk');
    addList('待确认事项', d.toConfirms, 'q');
    blocks.push({ type: 'para', label: '证据状态', lines: [d.evidence] });
    blocks.push({ type: 'footer' });

    // —— 测量总高 ——
    const LH = 23, GAP = 18, LABEL_H = 26;
    let H = PAD + 108; // header 区
    for (const b of blocks) {
      if (b.type === 'header' || b.type === 'footer') continue;
      if (b.type === 'para') H += LABEL_H + b.lines.length * LH + GAP;
      if (b.type === 'choice') H += LABEL_H + 30 + GAP;
      if (b.type === 'list') H += LABEL_H + b.items.reduce((s, l) => s + l.length * LH, 0) + GAP;
    }
    H += 74; // footer 区
    H = Math.ceil(H);

    // —— 绘制 ——
    const S = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * S;
    canvas.height = H * S;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(false);
    ctx.scale(S, S);

    const C = { ink: '#2A2620', ink2: '#55503F', ink3: '#8A8172', accent: '#C2452B', green: '#4A6B5A', orange: '#C0762E', line: '#E7DFD0', bg: '#FFFDF9', alt: '#F2ECDF' };
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    // header
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    roundRect(PAD, PAD, 58, 38, 7);
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.font = font(19, 700);
    ctx.textBaseline = 'middle';
    ctx.fillText('有据', PAD + 10, PAD + 20);
    ctx.fillStyle = C.ink;
    ctx.font = font(21, 600);
    ctx.fillText(d.title, PAD + 76, PAD + 14);
    ctx.fillStyle = C.ink3;
    ctx.font = font(11.5);
    ctx.fillText(d.subtitle, PAD + 76, PAD + 36);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, PAD + 58);
    ctx.lineTo(W - PAD, PAD + 58);
    ctx.stroke();

    let y = PAD + 84;
    const label = (t) => {
      ctx.fillStyle = C.ink3;
      ctx.font = font(11.5, 600);
      ctx.fillText(t, PAD, y);
      y += LABEL_H - 4;
    };

    for (const b of blocks) {
      if (b.type === 'para') {
        label(b.label);
        ctx.fillStyle = C.ink;
        ctx.font = font(13.5);
        for (const l of b.lines) { ctx.fillText(l, PAD, y); y += LH; }
        y += GAP;
      } else if (b.type === 'choice') {
        label('最终选择');
        ctx.fillStyle = C.ink;
        ctx.font = font(16, 600);
        ctx.fillText(b.name, PAD, y);
        y += 26;
        ctx.fillStyle = C.ink3;
        ctx.font = font(12);
        ctx.fillText(b.sub, PAD, y);
        y += 18 + GAP;
      } else if (b.type === 'list') {
        label(b.label);
        ctx.font = font(13.5);
        let i = 0;
        for (const lines of b.items) {
          const x = PAD + 22;
          ctx.fillStyle =
            b.marker === 'accent' ? C.accent :
            b.marker === 'risk' ? C.orange :
            b.marker === 'q' ? C.ink3 :
            C.ink2;
          const mk =
            b.marker === 'num' ? `${i + 1}.` :
            b.marker === 'dash' ? '—' :
            b.marker === 'accent' ? '▲' :
            b.marker === 'risk' ? '!' : '?';
          ctx.fillText(mk, PAD, y);
          ctx.fillStyle = b.marker === 'accent' ? C.accent : C.ink;
          lines.forEach((l, j) => { ctx.fillText(l, x, y + j * LH); });
          y += lines.length * LH;
          i++;
        }
        y += GAP;
      }
    }

    // footer
    ctx.strokeStyle = C.line;
    ctx.beginPath();
    ctx.moveTo(PAD, H - 64);
    ctx.lineTo(W - PAD, H - 64);
    ctx.stroke();
    ctx.fillStyle = C.ink3;
    ctx.font = font(11);
    ctx.fillText(d.disclaimer, PAD, H - 44);
    ctx.fillText(`生成于 ${d.dateStr} · 有据 Grounded Choice`, PAD, H - 26);

    return new Promise((res) => {
      canvas.toBlob((blob) => {
        if (!blob) { res(false); return; }
        triggerDownload(blob, `${filenameBase}.png`);
        res(true);
      }, 'image/png');
    });
  }

  function downloadSvg(d, base) {
    const lines = [];
    let y = 40;
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    lines.push(`<text x="54" y="${y}" font-size="20" font-weight="700" fill="#C2452B" font-family="${FONT_STACK}">有据</text>`);
    lines.push(`<text x="130" y="${y}" font-size="20" font-weight="600" fill="#2A2620" font-family="${FONT_STACK}">${esc(d.title)}</text>`);
    y += 40;
    const para = (label, text) => {
      lines.push(`<text x="54" y="${y}" font-size="12" font-weight="600" fill="#8A8172" font-family="${FONT_STACK}">${esc(label)}</text>`);
      y += 22;
      lines.push(`<text x="54" y="${y}" font-size="13" fill="#2A2620" font-family="${FONT_STACK}">${esc(text)}</text>`);
      y += 34;
    };
    para('我的目标', d.goal);
    para('最终选择', `${d.choice}（${d.choiceSub}）`);
    if (d.unmetHard && d.unmetHard.length) {
      para('未满足的硬约束（已由你主动选择）', d.unmetHard.map((c) => `${c.meetStatus === 'no' ? '[不满足]' : '[存在风险]'} ${c.text}`).join('；'));
    }
    if (d.exploratory) {
      para('证据状态注记', '⚠ 证据不足（探索性状态）——仅供参考');
    }
    d.reasons.forEach((t, i) => para(`理由 ${i + 1}`, t));
    if (d.applied && d.applied.length) para('已应用的调整', d.applied.join('；'));
    para('关键风险', d.risks.join('；'));
    para('待确认事项', d.toConfirms.join('；'));
    para('证据状态', d.evidence);
    lines.push(`<text x="54" y="${y + 10}" font-size="11" fill="#8A8172" font-family="${FONT_STACK}">${esc(d.disclaimer)} · 生成于 ${esc(d.dateStr)}</text>`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${y + 40}"><rect width="100%" height="100%" fill="#FFFDF9"/>${lines.join('')}</svg>`;
    triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), `${base}.svg`);
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
