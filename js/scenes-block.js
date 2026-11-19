/* ==========================================================================
   scenes-block.js —— 残差 / LayerNorm / FFN / 完整前向传播 / 训练 vs 推理
   ========================================================================== */
(function () {
  'use strict';
  const TUT = window.TUT, M = TUT.M, C = TUT.C, D = TUT.D;

  /* ======================================================================
     场景：残差连接 —— 给梯度修一条高速公路
     有残差时：每层 Jacobian = 1 + ∂F/∂x，梯度总量不是恒定 100%，而是"几乎不衰减"
     无残差时：每层乘一个 <1 的因子，深度一多就指数衰减
     ====================================================================== */
  TUT.register('residual', function (scene) {
    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const hasRes = scene.params.residual > 0.5;
      const depth = 8;
      // 每层子层的平均 Jacobian 幅值：0.62（模拟"每层都缩水"）
      const LAYER_GAIN = 0.62;

      D.text(ctx, hasRes ? '有残差：主干旁多了一条恒等通路' : '没有残差：梯度只能一层层挤过去',
        w / 2, 24, { size: 13, color: hasRes ? C.green : C.red, weight: 700 });

      const stackX = w * 0.3;
      const topY = 64, botY = h - 64;
      const layerH = (botY - topY) / depth;

      for (let i = 0; i < depth; i++) {
        const ly = topY + i * layerH;
        D.round(ctx, stackX - 40, ly + 2, 80, layerH - 5, 5, {
          fill: 'rgba(74,108,247,0.14)', stroke: 'rgba(74,108,247,0.4)', width: 1,
        });
      }
      D.text(ctx, '第 1 层', stackX - 58, topY + layerH / 2, { size: 9.5, color: C.faint, align: 'right' });
      D.text(ctx, '第 ' + depth + ' 层', stackX - 58, botY - layerH / 2, { size: 9.5, color: C.faint, align: 'right' });

      const sideX = stackX + 68;
      if (hasRes) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(stackX + 42, topY + layerH / 2);
        ctx.bezierCurveTo(sideX + 14, topY + layerH, sideX + 14, botY - layerH, stackX + 42, botY - layerH / 2);
        ctx.strokeStyle = C.green;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = C.green;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
        D.text(ctx, '恒等映射 x', sideX + 34, (topY + botY) / 2 - 8, { size: 10.5, color: C.green, align: 'left' });
        D.text(ctx, '原样传下去', sideX + 34, (topY + botY) / 2 + 9, { size: 9.5, color: C.faint, align: 'left' });
      }

      // 梯度反传：从底部（深）走向顶部（浅）
      const tPhase = M.phase(t, 3.2);
      const prog = hasRes ? M.easeInOut(tPhase) : tPhase;
      const gravY = M.lerp(botY - layerH / 2, topY + layerH / 2, prog);
      // 已经走过多少层
      const layersPassed = (botY - layerH / 2 - gravY) / layerH;

      // 无残差：每层 ×0.62；有残差：每层 ×(1 + ∂F/∂x)，取 1.0~1.15 之间的固定序列
      let decay;
      if (hasRes) {
        decay = 1;
        for (let i = 1; i <= Math.floor(layersPassed); i++) {
          decay *= 1.04 + 0.06 * Math.abs(Math.sin(i * 1.7));  // 1.04 ~ 1.10
        }
      } else {
        decay = Math.pow(LAYER_GAIN, layersPassed);
      }
      const radius = 2.4 + M.clamp(decay, 0, 1.6) * 7;
      const alpha = 0.22 + M.clamp(decay, 0.08, 1) * 0.78;

      if (hasRes) {
        const bx = M.lerp(stackX, sideX + 22, Math.sin(prog * Math.PI) * 0.9);
        D.dot(ctx, bx, gravY, radius, C.green, 18);
      } else {
        D.dot(ctx, stackX, gravY, radius, C.red, 10);
      }
      D.text(ctx, '梯度强度 ' + (decay * 100).toFixed(0) + '%', w * 0.74, 104, {
        size: 12, color: hasRes ? C.green : C.red, weight: 600,
      });

      // 强度柱状图
      const chartX = w * 0.66, chartY = 148, chartW = w * 0.3, chartH = h - 268;
      D.round(ctx, chartX - 14, chartY - 32, chartW + 32, chartH + 76, 10, {
        fill: 'rgba(14,22,38,0.6)', stroke: C.line, width: 1,
      });
      D.text(ctx, '梯度传回各层时的强度', chartX + chartW / 2, chartY - 14, { size: 11, color: C.dim });
      const barW = chartW / depth;
      for (let i = 0; i < depth; i++) {
        // i=0 是最浅层（靠近输入），i=depth-1 是最深层（靠近输出）
        const lvlFromDeep = depth - 1 - i;
        let strength;
        if (hasRes) {
          strength = 1;
          for (let k = 1; k <= lvlFromDeep; k++) strength *= 1.04 + 0.06 * Math.abs(Math.sin(k * 1.7));
          strength = Math.min(strength, 1.6);
        } else {
          strength = Math.pow(LAYER_GAIN, lvlFromDeep);
        }
        const bh = M.clamp(strength / (hasRes ? 1.6 : 1), 0, 1) * chartH;
        const bx = chartX + i * barW;
        D.round(ctx, bx + 2, chartY + chartH - bh, barW - 5, bh, 3, {
          fill: hasRes ? 'rgba(46,230,168,0.65)' : 'rgba(255,93,108,0.65)',
        });
        D.text(ctx, String(i + 1), bx + barW / 2, chartY + chartH + 12, { size: 8.5, color: C.faint });
      }
      D.text(ctx, '层编号（1 = 最靠近输入）', chartX + chartW / 2, chartY + chartH + 30, {
        size: 9, color: C.faint,
      });

      D.text(ctx, hasRes
        ? '有了旁路，每层 Jacobian 变成 1 + ∂F/∂x，梯度基本不衰减'
        : '无残差时每层乘 0.62，8 层后只剩 ' + (Math.pow(LAYER_GAIN, depth) * 100).toFixed(1) + '%', w / 2, h - 16, {
        size: 12, color: hasRes ? C.green : C.red, weight: 600,
      });

      scene.setReadout(
        '<span><span class="k">公式 =</span> <span class="v">输出 = x + Sublayer(x)</span></span>' +
        '<span><span class="k">反向传播时 =</span> ∂(x+F)/∂x = 1 + ∂F/∂x，那个 1 就是高速通道</span>' +
        '<span><span class="k">本图假设 =</span> 无残差时每层梯度只剩 62%；有残差时每层变为 1.04~1.10 倍</span>' +
        '<span><span class="k">解决 =</span> 深层网络的梯度消失（ResNet 同款思想）</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：LayerNorm —— 把每个词的向量标准化
     ====================================================================== */
  TUT.register('layernorm', function (scene) {
    const raw = [3.4, -1.2, 0.8, 5.1, -2.6, 1.4, -0.4, 2.2];

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const eps = 1e-5;
      const n = raw.length;
      const mean = raw.reduce((a, b) => a + b, 0) / n;
      const variance = raw.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
      const std = Math.sqrt(variance);
      const gamma = 1.0, beta = 0.0;
      const normed = raw.map((v) => ((v - mean) / Math.sqrt(variance + eps)) * gamma + beta);

      const ph = M.phase(t, 8);
      const blend = M.easeInOut(M.clamp((ph - 0.3) / 0.34, 0, 1));

      const left = 74, right = w - 66;
      const slotW = (right - left) / n;
      const plotTop = 82;
      const plotBottom = h - 82;
      const baseY = plotTop + (plotBottom - plotTop) * 0.56;
      const maxPos = Math.max.apply(null, raw);
      const maxNeg = Math.max.apply(null, raw.map((v) => -v));
      const scale = Math.min(
        (baseY - plotTop) / (maxPos * 1.18),
        (plotBottom - baseY) / (maxNeg * 1.35)
      );

      // 参考线
      D.line(ctx, left - 12, baseY, right + 12, baseY, { color: C.faint, width: 1.2 });
      [1, -1].forEach((k) => {
        const yy = baseY - k * scale;
        D.line(ctx, left - 12, yy, right + 12, yy, {
          color: 'rgba(46,230,168,0.3)', width: 1, dash: [5, 5],
        });
        D.text(ctx, (k > 0 ? '+1' : '−1'), left - 20, yy, {
          size: 9.5, color: 'rgba(46,230,168,0.65)', align: 'right',
        });
      });
      D.text(ctx, '0', left - 20, baseY, { size: 9.5, color: C.faint, align: 'right' });

      // 原始均值线
      const meanY = baseY - mean * scale;
      D.line(ctx, left - 12, meanY, right + 12, meanY, {
        color: 'rgba(255,209,102,0.55)', width: 1.4, dash: [6, 4], alpha: 1 - blend,
      });
      D.text(ctx, '原始均值 μ = ' + M.fmt(mean, 2), left + 4, meanY - 12, {
        size: 10.5, color: C.yellow, alpha: 1 - blend, align: 'left',
      });

      for (let i = 0; i < n; i++) {
        const cx = left + slotW * (i + 0.5);
        const vRaw = raw[i];
        const vNow = M.lerp(vRaw, normed[i], blend);

        // 原始位置幽灵柱（归一化后显示"减掉了多少"）
        if (blend > 0.02) {
          D.round(ctx, cx - 13, Math.min(baseY, baseY - vRaw * scale), 26, Math.abs(vRaw * scale), 3, {
            fill: 'none', stroke: 'rgba(76,201,240,0.3)', width: 1, alpha: (1 - blend) + 0.22,
          });
        }
        const hh = Math.abs(vNow * scale);
        const col = vNow >= 0 ? (blend > 0.6 ? C.green : C.cyan) : (blend > 0.6 ? C.pink : C.violet);
        D.round(ctx, cx - 13, vNow >= 0 ? baseY - hh : baseY, 26, hh, 3, {
          fill: col, alpha: 0.66, glow: blend > 0.5 ? 8 : 0,
        });
        D.text(ctx, M.fmt(vNow, 2), cx, vNow >= 0 ? baseY - hh - 12 : baseY + hh + 12, {
          size: 10, color: col, weight: 600,
        });
        D.text(ctx, 'x' + (i + 1), cx, plotBottom + 16, { size: 9.5, color: C.faint });
      }

      D.text(ctx, blend < 0.5 ? '① 原始向量：均值 ' + M.fmt(mean, 2) + '，标准差 ' + M.fmt(std, 2)
        : '② 归一化后：均值 = 0，标准差 = 1', w / 2, 28, {
        size: 14, color: blend < 0.5 ? C.cyan : C.green, weight: 700,
      });
      D.text(ctx, '每个 token 的向量各自在自己内部归一化，不跨 token、不跨样本', w / 2, 50, {
        size: 10.8, color: C.dim,
      });

      D.round(ctx, 24, h - 50, w - 48, 32, 8, {
        fill: 'rgba(160,107,255,0.08)', stroke: 'rgba(160,107,255,0.25)', width: 1,
      });
      D.text(ctx, 'LayerNorm(x) = γ · (x − μ) / √(σ² + ε) + β', w / 2, h - 34, {
        size: 12.5, color: '#dcc9ff', weight: 600,
      });

      const normedMean = normed.reduce((a, b) => a + b, 0) / n;
      const normedStd = Math.sqrt(normed.reduce((a, b) => a + (b - normedMean) ** 2, 0) / n);

      scene.setReadout(
        '<span><span class="k">μ =</span> <span class="v">' + M.fmt(mean, 4) + '</span></span>' +
        '<span><span class="k">σ =</span> ' + M.fmt(std, 4) + '</span>' +
        '<span><span class="k">归一化后均值 =</span> <span class="c3">' + M.fmt(normedMean, 6) + '</span></span>' +
        '<span><span class="k">归一化后标准差 =</span> <span class="c3">' + M.fmt(normedStd, 6) + '</span></span>' +
        '<span><span class="k">与 BatchNorm 区别 =</span> 不依赖 batch，单个 token 内部就算得出来</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：FFN —— 先升维（4 倍）再降维，逐个 token 独立处理
     ====================================================================== */
  TUT.register('ffn', function (scene) {
    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const dModel = 4;
      const dFF = dModel * 4;   // 严格 4 倍，和文字一致

      const cy = h * 0.5;
      const layers = [
        { x: w * 0.13, n: dModel, label: '输入 x', sub: 'd_model = ' + dModel, col: C.cyan },
        { x: w * 0.38, n: dFF, label: 'W₁ 升维', sub: '4×d_model = ' + dFF, col: C.violet },
        { x: w * 0.63, n: dFF, label: 'ReLU', sub: '负数归零', col: C.yellow },
        { x: w * 0.87, n: dModel, label: 'W₂ 降维', sub: '回到 ' + dModel, col: C.green },
      ];

      const activePh = M.phase(t, 5);
      const flowX = M.lerp(w * 0.13, w * 0.87, M.easeInOut(M.clamp((activePh - 0.1) / 0.8, 0, 1)));

      layers.forEach((L, li) => {
        const isNear = Math.abs(flowX - L.x) < w * 0.11;
        const gap = Math.min(14, (h - 170) / L.n);
        const totalH = gap * L.n;
        const startY = cy - totalH / 2 + gap / 2;

        for (let k = 0; k < L.n; k++) {
          const ny = startY + k * gap;
          // ReLU 层：约 1/3 的神经元输出为 0（暗掉）
          const isOn = li === 2 ? (k % 3 !== 1) : true;
          const pulse = isNear ? 0.5 + 0.5 * Math.sin(t * 8 + k) : 0;
          const al = isOn ? 0.3 + pulse * 0.6 : 0.1;
          D.circle(ctx, L.x, ny, Math.min(6, gap * 0.32), {
            fill: isOn ? L.col : 'rgba(255,255,255,0.06)',
            alpha: al, glow: isNear && isOn ? 10 : 0,
          });
        }

        D.text(ctx, L.label, L.x, cy + totalH / 2 + 24, { size: 11, color: L.col, weight: 600 });
        D.text(ctx, L.sub, L.x, cy + totalH / 2 + 41, { size: 9.5, color: C.faint });

        // 层间连线
        if (li < layers.length - 1) {
          const nextL = layers[li + 1];
          const gapNext = Math.min(14, (h - 170) / nextL.n);
          const midX = (L.x + nextL.x) / 2;
          ctx.save();
          ctx.strokeStyle = L.col;
          ctx.globalAlpha = 0.1;
          ctx.lineWidth = 1;
          for (let a = 0; a < L.n; a += 2) {
            const ay = startY + a * gap;
            for (let b = 0; b < nextL.n; b += Math.max(2, Math.floor(nextL.n / 6))) {
              const byy = cy - (gapNext * nextL.n) / 2 + gapNext / 2 + b * gapNext;
              ctx.beginPath();
              ctx.moveTo(L.x + 6, ay);
              ctx.bezierCurveTo(midX, ay, midX, byy, nextL.x - 6, byy);
              ctx.stroke();
            }
          }
          ctx.restore();
        }
      });

      D.dot(ctx, flowX, cy, 6, '#fff', 18);

      D.text(ctx, '关键：FFN 对每个 token 的向量独立处理，token 之间不交流', w / 2, 26, {
        size: 12.5, color: C.dim,
      });
      D.text(ctx, '→ 所以"跨 token 的信息混合"必须由注意力层负责', w / 2, 48, {
        size: 11.5, color: C.orange,
      });

      // 参数占比（按 d=768、d_ff=3072 实算）
      const dReal = 768, dffReal = 4 * dReal;
      const attnParams = 4 * dReal * dReal;       // W_Q/K/V/O
      const ffnParams = 2 * dReal * dffReal;      // W1 + W2
      const ratio = ffnParams / (attnParams + ffnParams);
      const bx = 24, bw = w - 48, bby = h - 36;
      D.round(ctx, bx, bby, bw, 14, 7, { fill: 'rgba(255,255,255,0.05)' });
      D.round(ctx, bx, bby, bw * ratio, 14, 7, { fill: 'rgba(160,107,255,0.65)' });
      D.round(ctx, bx + bw * ratio, bby, bw * (1 - ratio), 14, 7, { fill: 'rgba(76,201,240,0.5)' });
      D.text(ctx, 'FFN ' + (ratio * 100).toFixed(0) + '%', bx + bw * ratio / 2, bby + 7, {
        size: 9.5, color: '#fff', weight: 600,
      });
      D.text(ctx, '注意力 ' + ((1 - ratio) * 100).toFixed(0) + '%',
        bx + bw * ratio + bw * (1 - ratio) / 2, bby + 7, { size: 9.5, color: '#04121a', weight: 600 });

      scene.setReadout(
        '<span><span class="k">公式 =</span> <span class="v">FFN(x) = W₂ · ReLU(W₁x + b₁) + b₂</span></span>' +
        '<span><span class="k">维度变化 =</span> ' + dModel + ' → <span class="c2">' + dFF + '</span>（严格 4 倍）→ ' + dModel + '</span>' +
        '<span><span class="k">真实参数账（d=768）=</span> 注意力 4d² ≈ ' + (attnParams / 1e6).toFixed(1) + 'M，FFN 8d² ≈ ' +
        (ffnParams / 1e6).toFixed(1) + 'M → FFN 占 ' + (ratio * 100).toFixed(0) + '%</span>' +
        '<span><span class="k">作用 =</span> 非线性特征变换，常被理解为"记忆库"</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：完整前向传播
     参数估算按真实公式：每层 ≈ 12·d²（注意力 4d² + FFN 8d²），加上 embedding V·d
     ====================================================================== */
  TUT.register('full-forward', function (scene) {
    const stages = [
      { name: 'Tokenize', sub: '文字 → 词 ID', col: C.dim },
      { name: 'Embedding', sub: 'ID → 向量', col: C.cyan },
      { name: '+ 位置编码', sub: '注入顺序信息', col: C.blue },
      { name: 'LayerNorm', sub: '最后归一化', col: C.yellow },
      { name: 'LM Head', sub: '向量 → 词表打分', col: C.orange },
      { name: 'Softmax', sub: '打分 → 概率', col: C.green },
    ];

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const nBlocks = Math.round(scene.params.blocks);
      const cy = h * 0.46;

      const items = [];
      items.push(stages[0], stages[1], stages[2]);
      items.push({ name: 'Block 1..' + nBlocks, sub: '×' + nBlocks, col: C.violet, isStack: true, count: nBlocks });
      items.push(stages[3], stages[4], stages[5]);

      const totalW = w - 60;
      const gapW = 16;
      const weights = items.map((it) => (it.isStack ? 1.0 + Math.min(it.count, 12) * 0.16 : 1));
      const sumW = weights.reduce((a, b) => a + b, 0);
      const availW = totalW - gapW * (items.length - 1);
      let cursor = 30;

      const boxes = items.map((it, i) => {
        const bw = (weights[i] / sumW) * availW;
        const box = { it, x: cursor, w: bw, y: cy - 34, h: 68 };
        cursor += bw + gapW;
        return box;
      });

      const prog = M.phase(t, 9);
      const travelX = M.lerp(18, w - 18, prog);

      boxes.forEach((bx, i) => {
        const { it, x, w: bw, y, h: bh } = bx;
        const passed = travelX > x + bw;
        const active = travelX >= x && travelX <= x + bw;
        const glow = active ? 16 : passed ? 6 : 0;

        if (it.isStack) {
          const stackN = Math.min(4, it.count);
          for (let s = stackN - 1; s >= 0; s--) {
            D.round(ctx, x + s * 4, y - s * 4, bw - s * 8, bh, 9, {
              fill: 'rgba(160,107,255,' + (0.06 + s * 0.02) + ')',
              stroke: 'rgba(160,107,255,0.3)', width: 1,
            });
          }
        }

        D.round(ctx, x, y, bw, bh, 9, {
          fill: active ? 'rgba(255,255,255,0.09)' : passed ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.022)',
          stroke: it.col, width: active ? 2 : 1.2,
          alpha: active ? 1 : passed ? 0.75 : 0.45, glow,
        });

        D.text(ctx, it.name, x + bw / 2, y + 24, {
          size: Math.min(12.5, bw / 7), color: it.col, weight: 700,
          alpha: active ? 1 : passed ? 0.85 : 0.5,
        });
        D.text(ctx, it.sub, x + bw / 2, y + 46, {
          size: Math.min(9.5, bw / 10), color: C.faint, alpha: active ? 1 : 0.55,
        });

        if (i < boxes.length - 1) {
          const nx = boxes[i + 1].x;
          D.arrow(ctx, x + bw + 1, cy, nx - 2, cy, {
            color: C.faint, width: 1.2, head: 6, alpha: passed ? 0.6 : 0.25,
          });
        }
      });

      D.dot(ctx, travelX, cy, 7, '#fff', 20);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(travelX, cy, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      D.text(ctx, '一句话进去 → 下一个词的概率出来', w / 2, 26, {
        size: 13.5, color: C.text, weight: 700,
      });

      // 参数估算：d=768, V=50000
      const dModel = 768, V = 50000;
      const perBlock = 12 * dModel * dModel;
      const totalParams = nBlocks * perBlock + V * dModel;
      const paramsM = totalParams / 1e6;

      D.text(ctx, '按 d=768、词表 5 万实算：每层约 ' + (perBlock / 1e6).toFixed(2) + 'M 参数 → ' +
        nBlocks + ' 层总计约 ' + paramsM.toFixed(0) + 'M（' + (paramsM / 100).toFixed(2) + ' 亿）',
        w / 2, h - 20, { size: 11, color: C.dim });

      let curStage = boxes[0];
      boxes.forEach((b) => { if (travelX > b.x) curStage = b; });

      scene.setReadout(
        '<span><span class="k">层数 N =</span> <span class="v">' + nBlocks + '</span></span>' +
        '<span><span class="k">当前步骤 =</span> <span class="c2">' + curStage.it.name + '</span></span>' +
        '<span><span class="k">每层做 =</span> LN → 注意力 → 残差 → LN → FFN → 残差</span>' +
        '<span><span class="k">每层参数 ≈ 12d² =</span> ' + (perBlock / 1e6).toFixed(2) + 'M（d=768）</span>' +
        '<span><span class="k">总计 ≈</span> ' + paramsM.toFixed(0) + 'M（含 embedding ' + (V * dModel / 1e6).toFixed(0) + 'M）</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：训练 vs 推理 —— 一次前向与一条生成链
     ====================================================================== */
  TUT.register('train-infer', function (scene) {
    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const mode = scene.params.mode || 'train';
      const isTrain = mode === 'train';

      D.text(ctx, isTrain ? '训练：整句话一次并行喂进去，算 loss 再反传' : '推理：逐词生成，每次只多吐一个词',
        w / 2, 26, { size: 13.5, color: isTrain ? C.cyan : C.green, weight: 700 });

      if (isTrain) {
        const toks = ['小猫', '追', '老鼠', '。'];
        const labels = ['追', '老鼠', '。', '<eos>'];
        const left = 60, right = w - 60;
        const slotW = (right - left) / toks.length;
        const y1 = h * 0.34, y2 = h * 0.56, y3 = h * 0.78;

        toks.forEach((tk, i) => {
          const cx = left + slotW * (i + 0.5);
          D.round(ctx, cx - 30, y2 - 17, 60, 34, 7, {
            fill: 'rgba(76,201,240,0.14)', stroke: C.cyan, width: 1.4,
          });
          D.text(ctx, tk, cx, y2, { size: 12, color: C.text });
          D.arrow(ctx, cx, y2 - 19, cx, y1 + 20, { color: C.cyan, width: 1.4, head: 7, alpha: 0.7 });
          D.arrow(ctx, cx, y2 + 19, cx, y3 - 20, { color: C.green, width: 1.4, head: 7, alpha: 0.7 });

          D.round(ctx, cx - 30, y3 - 17, 60, 34, 7, {
            fill: 'rgba(46,230,168,0.13)', stroke: C.green, width: 1.3,
          });
          D.text(ctx, labels[i], cx, y3, { size: 11, color: C.green });
          D.text(ctx, '✓', cx + 38, y3, { size: 13, color: C.green });
        });
        D.text(ctx, '输入（一次并行，4 个位置同时算）', w / 2, y2 - 42, { size: 10.5, color: C.cyan });
        D.text(ctx, '每个位置都预测"下一个词"', w / 2, y3 + 42, { size: 10.5, color: C.green });

        D.round(ctx, w * 0.28, y1 - 32, w * 0.44, 48, 9, {
          fill: 'rgba(255,209,102,0.1)', stroke: 'rgba(255,209,102,0.4)', width: 1,
        });
        D.text(ctx, 'loss = 4 个位置交叉熵的平均', w / 2, y1 - 14, { size: 11.5, color: C.yellow, weight: 600 });
        D.text(ctx, '（只算被掩码允许的那部分）', w / 2, y1 + 4, { size: 9.5, color: C.faint });

        D.text(ctx, '因果掩码保证每个位置只看左边 → 一次前向得到 4 个训练信号', w / 2, h - 16, {
          size: 11, color: C.dim,
        });
      } else {
        const seq = ['小猫', '追', '老鼠', '。', '<eos>'];
        const step = Math.floor(M.phase(t, 10) * seq.length);
        const yTop = h * 0.22;
        const rowH = (h - yTop - 54) / seq.length;
        const left = w * 0.3;

        seq.forEach((tk, i) => {
          const cy = yTop + rowH * (i + 0.5);
          const known = i <= step;
          const isNew = i === step;

          const seqStr = seq.slice(0, i).join(' ') || '（空）';
          D.text(ctx, seqStr, left - 16, cy, {
            size: 10.5, color: C.faint, align: 'right',
          });
          D.arrow(ctx, left, cy, left + 34, cy, {
            color: known ? C.green : C.faint, width: 1.2, head: 6, alpha: known ? 0.8 : 0.3,
          });
          D.round(ctx, left + 40, cy - 14, 64, 28, 6, {
            fill: known ? (isNew ? 'rgba(255,159,67,0.22)' : 'rgba(46,230,168,0.16)') : 'rgba(255,255,255,0.03)',
            stroke: known ? (isNew ? C.orange : C.green) : 'rgba(255,255,255,0.1)',
            width: isNew ? 2 : 1, glow: isNew ? 12 : 0,
          });
          D.text(ctx, known ? tk : '…', left + 72, cy, {
            size: 11.5, color: known ? C.text : C.faint, weight: known ? 600 : 400,
          });

          if (i > 0 && known) {
            D.text(ctx, 'K/V 已在缓存中，不重算', left + 118, cy, { size: 9, color: C.faint, align: 'left' });
          } else if (i === 0 && known) {
            D.text(ctx, '新算 K/V 并存入缓存', left + 118, cy, { size: 9, color: C.orange, align: 'left' });
          }
        });

        D.text(ctx, '每生成一个词都要再跑一次前向，但前面的 K/V 可以复用（KV Cache）', w / 2, h - 16, {
          size: 11, color: C.dim,
        });
      }

      scene.setReadout(
        '<span><span class="k">训练 =</span> <span class="c1">并行</span>，一次前向拿到整句所有位置的监督信号</span>' +
        '<span><span class="k">推理 =</span> <span class="c3">串行</span>，一次只前进一个 token</span>' +
        '<span><span class="k">加速关键 =</span> KV Cache（把已算过的 K、V 存下来）</span>' +
        '<span><span class="k">所以 =</span> 训练能塞满 GPU，推理却受显存带宽限制</span>'
      );
    }
    return { frame };
  });
})();
