/* ==========================================================================
   scenes-math2.js —— softmax / 词向量 / 位置编码 / 神经元
   ========================================================================== */
(function () {
  'use strict';
  const TUT = window.TUT, M = TUT.M, C = TUT.C, D = TUT.D;

  /* ======================================================================
     场景：softmax —— 把任意分数压成概率（温度视角）
     ====================================================================== */
  TUT.register('softmax', function (scene) {
    const words = ['猫', '狗', '汽车', '苹果', '飞机'];
    const base = [3.2, 2.6, 2.2, 1.6, 0.4];

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const temp = scene.params.temp;
      const shift = scene.params.shift;
      const logits = base.map((v, i) => v + (i === 0 ? shift : 0));
      const probs = M.softmax(logits, temp);

      const left = 56, right = w - 30;
      const top = 66, bottom = h - 96;
      const n = words.length;
      const slotW = (right - left) / n;
      const barW = Math.min(58, slotW * 0.5);

      D.text(ctx, 'logits（模型给的原始分数）→ softmax → 概率分布', w / 2, 22, {
        size: 12.5, color: C.dim, weight: 600,
      });

      // 基线 = 概率 0
      D.line(ctx, left - 8, bottom, right, bottom, { color: C.faint, width: 1.2 });

      // 概率参考线
      [0.5, 1.0].forEach((lv) => {
        const yy = bottom - lv * (bottom - top);
        if (yy < top - 6) return;
        D.line(ctx, left - 8, yy, right, yy, { color: 'rgba(255,255,255,.07)', width: 1, dash: [4, 5] });
        D.text(ctx, (lv * 100) + '%', left - 14, yy, { size: 9.5, color: C.faint, align: 'right' });
      });

      for (let i = 0; i < n; i++) {
        const cx = left + slotW * (i + 0.5);
        const p = probs[i];
        const barH = p * (bottom - top);
        const col = p > 0.4 ? C.green : p > 0.15 ? C.cyan : C.blue;
        const grad = ctx.createLinearGradient(0, bottom - barH, 0, bottom);
        grad.addColorStop(0, col);
        grad.addColorStop(1, 'rgba(74,108,247,0.12)');
        D.round(ctx, cx - barW / 2, bottom - barH, barW, barH, 7, {
          fill: grad, glow: p > 0.4 ? 16 : 0, glowColor: col,
        });
        D.round(ctx, cx - barW / 2, bottom - barH, barW, barH, 7, { stroke: col, width: 1.3, alpha: 0.9 });

        D.text(ctx, (p * 100).toFixed(1) + '%', cx, bottom - barH - 14, {
          size: 12.5, color: col, weight: 700,
        });
        D.text(ctx, words[i], cx, bottom + 20, { size: 13, color: C.text, weight: 600 });
        // logit 数字放在词下面，而不是画成另一套柱子混在同一坐标系
        D.text(ctx, 'logit ' + M.fmt(logits[i], 2), cx, bottom + 40, { size: 10.5, color: C.faint });
      }

      // 熵
      let entropy = 0;
      for (let i = 0; i < n; i++) if (probs[i] > 1e-9) entropy -= probs[i] * Math.log(probs[i]);
      const maxEnt = Math.log(n);
      const ratio = entropy / maxEnt;
      D.text(ctx, '锐度：' + (ratio < 0.5 ? '很尖锐（几乎确定）' : ratio < 0.85 ? '中等' : '接近均匀（很犹豫）'),
        16, 22, { size: 11, color: C.yellow, align: 'left' });

      // 一句话解释
      D.text(ctx, temp < 0.6 ? 'T < 1：先把 logits 放大再 softmax → 差距被拉大，分布更尖'
        : temp > 1.5 ? 'T > 1：先把 logits 缩小再 softmax → 差距被抹平，分布更平'
          : 'T = 1：直接用原始 logits，训练时的标准设置',
        w / 2, h - 20, { size: 12, color: C.dim });

      scene.setReadout(
        '<span><span class="k">温度 T =</span> <span class="v">' + M.fmt(temp, 2) + '</span></span>' +
        '<span><span class="k">公式 =</span> softmax(zᵢ/T) = e^(zᵢ/T) / Σ e^(zⱼ/T)</span>' +
        '<span><span class="k">最大概率 =</span> <span class="c3">' + (Math.max.apply(null, probs) * 100).toFixed(1) + '%</span></span>' +
        '<span><span class="k">熵 / 最大熵 =</span> ' + M.fmt(ratio, 3) + '</span>' +
        '<span><span class="k">概率和 =</span> ' + M.fmt(probs.reduce((a, b) => a + b, 0), 6) + '（永远等于 1）</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：softmax 三步拆解 —— exp → 求和 → 相除
     这个是给小白看"到底怎么算"的，温度那个场景是讲"调它有什么用"
     ====================================================================== */
  TUT.register('softmax-steps', function (scene) {
    const logits = [2.0, 1.0, 0.5, -0.5];

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const exps = logits.map((v) => Math.exp(v));
      const sum = exps.reduce((a, b) => a + b, 0);
      const probs = exps.map((v) => v / sum);

      // 三步的进度：每步 1/3 时间
      const ph = M.phase(t, 9);
      const step = Math.min(2, Math.floor(ph * 3));
      const n = logits.length;
      const colW = Math.min(112, (w - 80) / n);
      const startX = w / 2 - (colW * n) / 2;

      const rows = [
        { label: '① 原始 logits', vals: logits, col: C.cyan, fmt: (v) => M.fmt(v, 2) },
        { label: '② 取 exp（变成正数）', vals: exps, col: C.yellow, fmt: (v) => M.fmt(v, 2) },
        { label: '③ 除以总和', vals: probs, col: C.green, fmt: (v) => (v * 100).toFixed(1) + '%' },
      ];

      const rowY = [72, h * 0.5, h - 86];

      rows.forEach((r, ri) => {
        const visible = ri <= step;
        const alpha = visible ? 1 : 0.18;
        D.text(ctx, r.label, 18, rowY[ri] - 32, { size: 11.5, color: r.col, align: 'left', weight: 600, alpha });

        for (let i = 0; i < n; i++) {
          const cx = startX + colW * (i + 0.5);
          // 格子高度映射
          const maxV = Math.max.apply(null, r.vals.map(Math.abs));
          const bh = Math.max(16, (Math.abs(r.vals[i]) / (maxV || 1)) * 42);
          D.round(ctx, cx - colW * 0.36, rowY[ri] - bh / 2, colW * 0.72, bh, 5, {
            fill: 'rgba(255,255,255,0.05)',
            stroke: r.col, width: 1.2, alpha: alpha * 0.8,
          });
          D.text(ctx, r.fmt(r.vals[i]), cx, rowY[ri], {
            size: 12, color: r.col, weight: 600, alpha,
          });
        }

        // 箭头
        if (ri < 2) {
          const ay = (rowY[ri] + rowY[ri + 1]) / 2;
          D.arrow(ctx, w / 2, ay - 12, w / 2, ay + 12, {
            color: ri < step ? C.violet : C.faint, width: 1.6, head: 8,
            alpha: ri < step ? 0.9 : 0.3,
          });
          const hint = ri === 0 ? 'eˣ（保持大小顺序，但全变正）' : '÷ ' + M.fmt(sum, 3) + '（让总和 = 1）';
          D.text(ctx, hint, w / 2 + 16, ay, {
            size: 10.5, color: ri < step ? C.violet : C.faint, align: 'left',
            alpha: ri < step ? 1 : 0.4,
          });
        }
      });

      // 关键数字
      D.text(ctx, '总和 = ' + M.fmt(sum, 4) + '（这就是分母）', w - 16, 20, {
        size: 11.5, color: C.yellow, align: 'right',
      });

      D.text(ctx, 'exp 只做两件事：负数变正数、大的拉得更大；除以总和才让它变成"分配比例"',
        w / 2, h - 20, { size: 12, color: C.dim });

      scene.setReadout(
        '<span><span class="k">logits =</span> [' + logits.map((v) => M.fmt(v, 1)).join(', ') + ']</span>' +
        '<span><span class="k">exp 后 =</span> [' + exps.map((v) => M.fmt(v, 2)).join(', ') + ']</span>' +
        '<span><span class="k">总和 =</span> <span class="c5">' + M.fmt(sum, 3) + '</span></span>' +
        '<span><span class="k">概率 =</span> <span class="c3">[' + probs.map((v) => (v * 100).toFixed(1) + '%').join(', ') + ']</span></span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：从 word id 到向量 —— 查表（one-hot × 矩阵 = 取一行）
     ====================================================================== */
  TUT.register('one-hot-embed', function (scene) {
    const vocab = ['猫', '狗', '追', '老鼠'];
    const focus = Math.round(scene.params.token || 0);

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const idx = M.clamp(focus, 0, vocab.length - 1);
      const rows = vocab.length;
      const dims = 6;

      // 左：词表 + one-hot
      const lx = 26;
      // 把四行铺满可用高度，避免下方大片留白
      const rowH = Math.min(56, (h - 96) / rows);
      const topY = 62;
      D.text(ctx, '① 词表：每个词一个编号（ID）', lx, 30, { size: 11.5, color: C.cyan, align: 'left', weight: 600 });

      vocab.forEach((tk, i) => {
        const cy = topY + rowH * (i + 0.5);
        const isFocus = i === idx;
        D.round(ctx, lx, cy - rowH * 0.34, 52, rowH * 0.68, 6, {
          fill: isFocus ? 'rgba(76,201,240,0.22)' : 'rgba(255,255,255,0.035)',
          stroke: isFocus ? C.cyan : 'rgba(255,255,255,0.1)', width: isFocus ? 1.8 : 1,
          glow: isFocus ? 10 : 0,
        });
        D.text(ctx, tk, lx + 26, cy, { size: 12, color: isFocus ? '#fff' : C.dim, weight: isFocus ? 700 : 400 });
        D.text(ctx, 'ID ' + i, lx + 62, cy, {
          size: 10.5, color: isFocus ? C.cyan : C.faint, align: 'left',
        });
        // one-hot
        const ohX = lx + 112;
        for (let c = 0; c < rows; c++) {
          const on = c === i;
          D.round(ctx, ohX + c * 17, cy - 8, 15, 16, 3, {
            fill: on ? 'rgba(255,209,102,0.85)' : 'rgba(255,255,255,0.045)',
            alpha: isFocus ? 1 : 0.35,
          });
          if (on) {
            D.text(ctx, '1', ohX + c * 17 + 7.5, cy, { size: 9.5, color: '#1a1405', weight: 700, alpha: isFocus ? 1 : 0.35 });
          }
        }
      });
      D.text(ctx, 'one-hot', lx + 112, topY - 8, { size: 9.5, color: C.yellow, align: 'left' });

      // 中：乘号
      D.text(ctx, '×', lx + 200, topY + rowH * (idx + 0.5), { size: 16, color: C.faint });

      // 中右：embedding 矩阵（每行一个词的向量）
      const mx = lx + 226;
      const mw = Math.min(220, w - mx - 200);
      const cellW = mw / dims;
      D.text(ctx, '② embedding 矩阵 [词表大小 × d]', mx, 30, {
        size: 11.5, color: C.violet, align: 'left', weight: 600,
      });
      for (let r = 0; r < rows; r++) {
        const cy = topY + rowH * (r + 0.5);
        const isFocus = r === idx;
        for (let c = 0; c < dims; c++) {
          const vv = 0.3 + 0.6 * Math.abs(Math.sin(r * 2.1 + c * 1.7));
          D.round(ctx, mx + c * cellW + 1, cy - rowH * 0.3, cellW - 2, rowH * 0.6, 3, {
            fill: 'rgba(160,107,255,' + (vv * (isFocus ? 0.85 : 0.22)) + ')',
            stroke: isFocus ? 'rgba(160,107,255,0.7)' : 'transparent', width: 1,
          });
        }
      }

      // 右：结果向量
      const rx = mx + mw + 40;
      D.text(ctx, '③ 取出对应的那一行', rx, 30, {
        size: 11.5, color: C.green, align: 'left', weight: 600,
      });
      const cy0 = topY + rowH * (idx + 0.5);
      const vec = [];
      for (let c = 0; c < dims; c++) {
        const vv = 0.3 + 0.6 * Math.abs(Math.sin(idx * 2.1 + c * 1.7));
        vec.push(vv);
        D.round(ctx, rx + c * cellW + 1, cy0 - rowH * 0.3, cellW - 2, rowH * 0.6, 3, {
          fill: 'rgba(46,230,168,' + vv * 0.85 + ')',
          stroke: 'rgba(46,230,168,0.7)', width: 1,
        });
      }
      // 高亮箭头从矩阵聚焦行到结果
      D.arrow(ctx, mx + mw + 6, cy0, rx - 8, cy0, { color: C.green, width: 2, head: 9, glow: 10 });
      D.text(ctx, '「' + vocab[idx] + '」的向量', rx + (cellW * dims) / 2, cy0 - rowH * 0.55, {
        size: 11, color: C.green, weight: 600,
      });

      D.text(ctx, '关键：one-hot × 矩阵 = 只把矩阵的第 i 行挑出来。所以"查表"和"矩阵乘法"是同一件事',
        w / 2, h - 18, { size: 12, color: C.dim, weight: 600 });

      scene.setReadout(
        '<span><span class="k">当前词 =</span> <span class="c4">' + vocab[idx] + '</span>（ID ' + idx + '）</span>' +
        '<span><span class="k">one-hot 长度 =</span> 词表大小 ' + rows + '</span>' +
        '<span><span class="k">取出向量 =</span> <span class="c3">[' + vec.map((v) => M.fmt(v, 2)).join(', ') + ']</span></span>' +
        '<span><span class="k">真实规模 =</span> 词表 3~15 万 × 维度 768~4096，这里缩到 4×6</span>'
      );
    }
    return {
      frame,
      onResize() { /* 布局每帧按 w/h 重算，无需缓存 */ },
    };
  });

  /* ======================================================================
     场景：词向量 —— 把语义放进坐标里
     ====================================================================== */
  TUT.register('embedding', function (scene) {
    const pts = [
      { w: '猫', x: -1.5, y: -0.9, g: 'animal' },
      { w: '狗', x: -1.1, y: -0.55, g: 'animal' },
      { w: '老虎', x: -1.85, y: -0.2, g: 'animal' },
      { w: '鱼', x: -0.85, y: -1.25, g: 'animal' },
      { w: '汽车', x: 1.55, y: 0.95, g: 'machine' },
      { w: '卡车', x: 1.85, y: 1.35, g: 'machine' },
      { w: '飞机', x: 1.35, y: 1.75, g: 'machine' },
      { w: '自行车', x: 1.0, y: 0.25, g: 'machine' },
      { w: '苹果', x: -0.2, y: -1.6, g: 'food' },
      { w: '香蕉', x: 0.1, y: -1.45, g: 'food' },
      { w: '跑', x: -0.4, y: 0.35, g: 'verb' },
      { w: '飞', x: 0.75, y: 1.1, g: 'verb' },
    ];
    const groupColor = { animal: C.green, machine: C.cyan, food: C.yellow, verb: C.violet };

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const cx = w * 0.5, cy = h * 0.54;
      const sx = w / 5.4, sy = h / 4.8;
      const PX = (x) => cx + x * sx;
      const PY = (y) => cy - y * sy;

      for (let i = -2; i <= 2; i++) {
        D.line(ctx, PX(i), 30, PX(i), h - 26, { color: C.grid });
        D.line(ctx, 16, PY(i), w - 16, PY(i), { color: C.grid });
      }

      const focus = pts[Math.floor(M.phase(t, 9) * pts.length) % pts.length];
      const dists = pts.map((p) => ({ p, d: Math.hypot(p.x - focus.x, p.y - focus.y) }));
      dists.sort((a, b) => a.d - b.d);
      const nearSet = new Set(dists.slice(0, 4).map((o) => o.p.w));

      dists.slice(1, 4).forEach((o, i) => {
        D.line(ctx, PX(focus.x), PY(focus.y), PX(o.p.x), PY(o.p.y), {
          color: C.pink, width: 1.8 - i * 0.4, alpha: 0.6 - i * 0.14, dash: [5, 4],
        });
      });

      pts.forEach((p) => {
        const isFocus = p === focus;
        const isNear = nearSet.has(p.w);
        const col = groupColor[p.g];
        const pulse = isFocus ? 1 + 0.22 * Math.sin(t * 5) : 1;
        if (isFocus) {
          D.circle(ctx, PX(p.x), PY(p.y), 20 * pulse, {
            stroke: C.pink, width: 1.4, alpha: 0.55, glow: 14,
          });
        }
        D.dot(ctx, PX(p.x), PY(p.y), (isFocus ? 8 : isNear ? 5.5 : 3.5) * pulse, col, isFocus ? 20 : isNear ? 10 : 0);
        D.text(ctx, p.w, PX(p.x) + 12, PY(p.y) - 11, {
          size: isFocus ? 14 : 12,
          color: isFocus ? '#fff' : isNear ? C.text : C.dim,
          align: 'left',
          weight: isFocus ? 700 : 500,
        });
      });

      const legend = [['动物', C.green], ['机械', C.cyan], ['食物', C.yellow], ['动作', C.violet]];
      legend.forEach((lg, i) => {
        const lx = 18, ly = 34 + i * 20;
        D.dot(ctx, lx, ly, 4, lg[1]);
        D.text(ctx, lg[0], lx + 11, ly, { size: 11, color: C.dim, align: 'left' });
      });

      D.text(ctx, '「' + focus.w + '」的最近邻：' + dists.slice(1, 4).map((o) => o.p.w).join('、'),
        w - 16, 24, { size: 11.5, color: C.pink, align: 'right', weight: 600 });
      D.text(ctx, '两个维度都是模型自己学的，人类无法直接命名（这里为了画图才赋予"动物/机械"的解释）',
        18, h - 12, { size: 10, color: C.faint, align: 'left' });

      scene.setReadout(
        '<span><span class="k">当前查询词 =</span> <span class="c4">' + focus.w + '</span></span>' +
        '<span><span class="k">最近邻 =</span> ' + dists.slice(1, 4).map((o) => o.p.w + '(' + M.fmt(o.d, 2) + ')').join('、') + '</span>' +
        '<span><span class="k">真实模型维度 =</span> 768 / 1024 / 4096（这里压到 2 维才能画出来）</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：位置编码 —— 不同频率的正弦波拼成"位置指纹"
     真实公式：PE(pos, 2i) = sin(pos / 10000^(2i/d))
     d = 8 时，各维度的角频率 1/10000^(2i/d)：
       i=0: 1         → 波长 2π      ≈ 6.28
       i=1: 1/10      → 波长 20π     ≈ 62.8
       i=2: 1/100     → 波长 200π    ≈ 628
       i=3: 1/1000    → 波长 2000π   ≈ 6283
     ====================================================================== */
  TUT.register('positional', function (scene) {
    const dModel = 8;
    const pairs = 4;
    // 按公式实算每对维度的角频率与波长
    const freqs = [];
    for (let i = 0; i < pairs; i++) {
      const w0 = 1 / Math.pow(10000, (2 * i) / dModel);
      freqs.push({ w: w0, period: (2 * Math.PI) / w0, dim: 2 * i });
    }

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const maxPos = 40;
      const left = 76, right = w - 20;
      const top = 86, bottom = h - 74;

      D.line(ctx, left, bottom, right, bottom, { color: C.faint, width: 1.2 });
      D.line(ctx, left, top, left, bottom, { color: C.faint, width: 1.2 });
      for (let p = 0; p <= maxPos; p += 5) {
        const px = M.lerp(left, right, p / maxPos);
        D.line(ctx, px, bottom, px, bottom + 4, { color: C.faint });
        D.text(ctx, String(p), px, bottom + 14, { size: 10, color: C.faint });
      }
      D.text(ctx, '位置 pos', right, bottom + 30, { size: 10.5, color: C.dim, align: 'right' });

      const colors = [C.cyan, C.green, C.yellow, C.violet];
      const amp = (bottom - top) / 2 / pairs;

      for (let d = 0; d < pairs; d++) {
        const f = freqs[d];
        const midY = top + amp * (d * 2 + 1);
        D.line(ctx, left, midY, right, midY, { color: C.grid });
        ctx.save();
        ctx.beginPath();
        for (let px = left; px <= right; px += 2) {
          const pos = ((px - left) / (right - left)) * maxPos;
          const val = Math.sin(f.w * pos);
          const py = midY - val * amp * 0.85;
          if (px === left) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = colors[d];
        ctx.lineWidth = 1.8;
        ctx.shadowColor = colors[d];
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        ctx.restore();
        // 标签：维度号 + 该维度的实际波长
        D.text(ctx, 'dim ' + f.dim, left - 10, midY - 6, {
          size: 10.5, color: colors[d], align: 'right', weight: 600,
        });
        D.text(ctx, '波长≈' + (f.period < 10 ? f.period.toFixed(1) : f.period.toFixed(0)),
          left - 10, midY + 8, { size: 8.5, color: colors[d], align: 'right', alpha: 0.65 });
      }

      // 当前扫描位置
      const posNow = M.phase(t, 10) * maxPos;
      const pxNow = M.lerp(left, right, posNow / maxPos);
      D.line(ctx, pxNow, top - 8, pxNow, bottom, { color: C.pink, width: 1.6, glow: 10, dash: [4, 4] });
      // pos 数值放到底部刻度区，避免和顶部指纹说明打架
      D.text(ctx, 'pos = ' + posNow.toFixed(1), pxNow, bottom + 30, {
        size: 11.5, color: C.pink, weight: 700,
      });

      // 指纹条：sin/cos 交替（放在最顶部，独立一行）
      const fpX = left, fpY = 30;
      const fpW = Math.min(220, w * 0.34), cellW = fpW / dModel;
      D.text(ctx, '该位置的编码向量（共 ' + dModel + ' 维）', fpX, fpY - 12, {
        size: 10.5, color: C.faint, align: 'left',
      });
      for (let i = 0; i < dModel; i++) {
        const pair = i >> 1;
        const isSin = i % 2 === 0;
        const v = isSin ? Math.sin(freqs[pair].w * posNow) : Math.cos(freqs[pair].w * posNow);
        const inten = (v + 1) / 2;
        const cc = isSin ? '76,201,240' : '160,107,255';
        D.round(ctx, fpX + i * cellW, fpY, cellW - 2, 13, 3, {
          fill: 'rgba(' + cc + ',' + (0.1 + inten * 0.85) + ')',
        });
      }
      D.text(ctx, '蓝 = sin（偶数维），紫 = cos（奇数维）', fpX + fpW + 16, fpY + 6, {
        size: 9.5, color: C.faint, align: 'left',
      });

      D.text(ctx, '第 i 对的角频率 = 1 / 10000^(2i/d)：i 越大频率越低 → 波长越长 → 变化越慢',
        w / 2, h - 12, { size: 11.5, color: C.dim });

      scene.setReadout(
        '<span><span class="k">公式 =</span> PE(pos,2i) = sin(pos / 10000^(2i/d))，PE(pos,2i+1) = cos(…)</span>' +
        '<span><span class="k">当前 d_model =</span> ' + dModel + '（为看清波形只画 4 对）</span>' +
        '<span><span class="k">低维（i 小）=</span> <span class="c1">高频</span>，波长 ' + freqs[0].period.toFixed(1) + ' → 分辨相邻位置</span>' +
        '<span><span class="k">高维（i 大）=</span> <span class="c2">低频</span>，波长 ' + freqs[3].period.toFixed(0) + ' → 分辨远近位置</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：一个神经元 = 加权和 + 激活
     ====================================================================== */
  TUT.register('neuron', function (scene) {
    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const wx = scene.params.w;
      const x0 = 1.0, x1 = -0.6, bias = 0.2;
      const z = wx * x0 + 0.8 * x1 + bias;
      const relu = Math.max(0, z);
      const sig = 1 / (1 + Math.exp(-z));

      const inX = w * 0.13;
      const inputs = [
        { v: x0, lag: 0.0, wgt: wx },
        { v: x1, lag: 0.35, wgt: 0.8 },
        { v: 1.0, lag: 0.7, isBias: true, wgt: bias },
      ];
      const ys = [h * 0.3, h * 0.52, h * 0.74];

      inputs.forEach((inp, i) => {
        D.circle(ctx, inX, ys[i], 17, {
          fill: 'rgba(76,201,240,0.09)', stroke: inp.isBias ? C.faint : C.cyan, width: 1.6,
        });
        D.text(ctx, inp.isBias ? '1' : M.fmt(inp.v, 1), inX, ys[i], {
          size: 12, color: inp.isBias ? C.dim : C.cyan, weight: 600,
        });
      });
      D.text(ctx, '输入 x', inX, h * 0.13, { size: 11.5, color: C.dim });

      const sumX = w * 0.56, sumY = h * 0.52;
      inputs.forEach((inp) => {
        const wgt = inp.wgt;
        const hl = 0.35 + 0.65 * M.pulse(t * 1.2, inp.lag, 1.6);
        const lw = 0.8 + Math.abs(wgt) * 3.2;
        D.line(ctx, inX + 20, ys[inputs.indexOf(inp)], sumX - 34, sumY, {
          color: wgt >= 0 ? C.cyan : C.red, width: lw, alpha: 0.22 + hl * 0.5,
        });
        const ph = M.phase(t * 0.7 + inp.lag, 1);
        const fxp = M.lerp(inX + 20, sumX - 34, ph);
        const fyp = M.lerp(ys[inputs.indexOf(inp)], sumY, ph);
        D.dot(ctx, fxp, fyp, 2.6, wgt >= 0 ? C.cyan : C.red, 7);
        D.text(ctx, 'w=' + M.fmt(wgt, 2),
          M.lerp(inX + 20, sumX - 34, 0.5), M.lerp(ys[inputs.indexOf(inp)], sumY, 0.5) - 9, {
            size: 10.5, color: wgt >= 0 ? C.cyan : C.red, alpha: 0.85,
          });
      });

      D.circle(ctx, sumX, sumY, 27, { fill: C.panel2, stroke: C.yellow, width: 2, glow: 14 });
      D.text(ctx, 'Σ', sumX, sumY - 2, { size: 21, color: C.yellow, weight: 700 });
      D.text(ctx, 'z = ' + M.fmt(z, 2), sumX, sumY + 40, { size: 12.5, color: C.yellow, weight: 600 });

      // 右侧激活函数图
      const gx0 = w * 0.72, gx1 = w * 0.985;
      const gy0 = h * 0.18, gy1 = h * 0.82;
      D.round(ctx, gx0, gy0, gx1 - gx0, gy1 - gy0, 10, {
        fill: 'rgba(14,22,38,0.7)', stroke: C.line, width: 1,
      });
      const zmin = -3, zmax = 3;
      const vmin = 0, vmax = 3;   // 输出轴：0..3，与 z 轴同尺度
      const PX = (zz) => M.lerp(gx0 + 14, gx1 - 14, M.norm(zz, zmin, zmax));
      const PY = (vv) => M.lerp(gy1 - 22, gy0 + 22, M.norm(vv, vmin, vmax));
      D.line(ctx, gx0 + 14, PY(0), gx1 - 14, PY(0), { color: C.grid });

      // ReLU 曲线（从 zmin 到 zmax，y 轴到 vmax 就停）
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(PX(zmin), PY(0));
      ctx.lineTo(PX(0), PY(0));
      ctx.lineTo(PX(Math.min(zmax, vmax)), PY(Math.min(zmax, vmax)));
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 2;
      ctx.shadowColor = C.green;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
      D.text(ctx, 'ReLU：负数砍成 0，正数原样放行', (gx0 + gx1) / 2, gy0 - 9, { size: 10.5, color: C.green });

      // 坐标轴标签
      D.text(ctx, 'z', gx1 - 10, PY(0) - 10, { size: 9.5, color: C.faint });
      D.text(ctx, 'a', gx0 + 8, gy0 + 12, { size: 9.5, color: C.faint });

      // 位置标记（z 被 clamp 后才画，避免跑出框外）
      const zc = M.clamp(z, zmin, vmax);
      const markX = PX(zc);
      const markY = PY(M.clamp(relu, vmin, vmax));
      D.line(ctx, markX, PY(0), markX, markY, { color: C.pink, width: 1.2, dash: [3, 3] });
      D.dot(ctx, markX, markY, 6, C.pink, 14);
      D.dot(ctx, PX(M.clamp(z, zmin, zmax)), PY(0), 3, C.yellow);

      D.text(ctx, '输出 a = ReLU(z) = ' + M.fmt(relu, 2), (gx0 + gx1) / 2, gy1 + 8, {
        size: 12, color: C.green, weight: 700,
      });

      D.arrow(ctx, sumX + 30, sumY, gx0 - 6, sumY, { color: C.faint, width: 1.6, alpha: 0.7 });
      D.text(ctx, '激活', (sumX + gx0) / 2, sumY - 10, { size: 10.5, color: C.faint });

      D.text(ctx, 'Transformer 的 FFN 层里，每个神经元干的就是这件事：加权求和 → 过激活',
        w / 2, h - 8, { size: 11, color: C.dim });

      scene.setReadout(
        '<span><span class="k">z = w₁x₁ + w₂x₂ + b =</span> <span class="v">' + M.fmt(z, 3) + '</span></span>' +
        '<span><span class="k">ReLU(z) =</span> <span class="c3">' + M.fmt(relu, 3) + '</span></span>' +
        '<span><span class="k">Sigmoid(z) =</span> <span class="c1">' + M.fmt(sig, 3) + '</span></span>' +
        '<span><span class="k">为什么需要非线性 =</span> 纯加权和多层叠起来仍等价于一层</span>'
      );
    }
    return { frame };
  });
})();
