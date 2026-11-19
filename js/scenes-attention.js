/* ==========================================================================
   scenes-attention.js —— 转置与形状 / QKV / 分数矩阵 / 加权求和 / 缩放 / 多头 / 因果掩码
   ========================================================================== */
(function () {
  'use strict';
  const TUT = window.TUT, M = TUT.M, C = TUT.C, D = TUT.D;

  /* ======================================================================
     场景：矩阵乘法与转置 —— 形状账本 + QKᵀ 到底在算什么
     X: [n, d]   W: [d, d']  →  XW: [n, d']
     Q: [n, dk]  Kᵀ: [dk, n] →  QKᵀ: [n, n]
     ====================================================================== */
  TUT.register('transpose-shape', function (scene) {
    const n = 3, dk = 4;

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      // 逐格点亮，演示"结果的第 i 行第 j 列 = Q 第 i 行 与 K 第 j 行 的点积"
      const total = n * n;
      const prog = M.phase(t, 8) * total;
      const cur = Math.min(total - 1, Math.floor(prog));
      const ci = Math.floor(cur / n), cj = cur % n;

      const cell = Math.min(40, (h - 210) / Math.max(n, dk), (w - 360) / (n + dk + n));
      const cy = h * 0.5;

      // ---- 左：Q [n, dk] ----
      const qx = 30;
      const qTop = cy - (n * cell) / 2;
      D.text(ctx, 'Q  [n, dk] = [' + n + ', ' + dk + ']', qx + (dk * cell) / 2, qTop - 22, {
        size: 11, color: C.cyan, weight: 600,
      });
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < dk; j++) {
          const on = i === ci;
          D.round(ctx, qx + j * cell + 1, qTop + i * cell + 1, cell - 2, cell - 2, 3, {
            fill: on ? 'rgba(76,201,240,0.42)' : 'rgba(76,201,240,0.1)',
            stroke: on ? 'rgba(76,201,240,0.8)' : 'transparent', width: 1,
          });
        }
        // 行标记
        D.text(ctx, 'q' + i, qx - 10, qTop + i * cell + cell / 2, {
          size: 9.5, color: i === ci ? C.cyan : C.faint, align: 'right',
        });
      }

      // ---- 中：Kᵀ [dk, n] ----
      const kx = qx + dk * cell + 66;
      const kTop = cy - (dk * cell) / 2;
      D.text(ctx, 'Kᵀ  [dk, n] = [' + dk + ', ' + n + ']', kx + (n * cell) / 2, kTop - 22, {
        size: 11, color: C.pink, weight: 600,
      });
      for (let r = 0; r < dk; r++) {
        for (let j = 0; j < n; j++) {
          const on = j === cj;
          D.round(ctx, kx + j * cell + 1, kTop + r * cell + 1, cell - 2, cell - 2, 3, {
            fill: on ? 'rgba(255,77,141,0.42)' : 'rgba(255,77,141,0.1)',
            stroke: on ? 'rgba(255,77,141,0.8)' : 'transparent', width: 1,
          });
        }
      }
      // 转置提示：K 的第 j 行变成了 Kᵀ 的第 j 列
      D.text(ctx, '↑ 转置：K 的第 j 行 → Kᵀ 的第 j 列', kx + (n * cell) / 2, kTop + dk * cell + 16, {
        size: 9.5, color: 'rgba(255,77,141,0.7)',
      });

      // 乘号
      D.text(ctx, '×', (qx + dk * cell + kx) / 2, cy, { size: 16, color: C.faint });

      // ---- 右：结果 [n, n] ----
      const rx = kx + n * cell + 66;
      const rTop = cy - (n * cell) / 2;
      D.text(ctx, 'Q·Kᵀ  [n, n] = [' + n + ', ' + n + ']', rx + (n * cell) / 2, rTop - 22, {
        size: 11, color: C.yellow, weight: 600,
      });
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const isCur = i === ci && j === cj;
          const done = i * n + j <= cur;
          // 用一个确定的"分数"值，模拟不同行对不同列的注意力强度
          const val = (Math.sin(i * 2.1 + j * 1.3) * 0.5 + 0.5) * 3.5 + 0.5;
          D.round(ctx, rx + j * cell + 1, rTop + i * cell + 1, cell - 2, cell - 2, 3, {
            fill: done ? 'rgba(255,209,102,' + (isCur ? 0.75 : 0.16 + val / 12) + ')' : 'rgba(255,255,255,0.03)',
            stroke: isCur ? C.yellow : 'transparent', width: isCur ? 1.8 : 1,
          });
          if (done) {
            D.text(ctx, M.fmt(val, 1), rx + j * cell + cell / 2, rTop + i * cell + cell / 2, {
              size: Math.min(10, cell * 0.34), color: isCur ? '#1a1405' : '#ffe9b8', weight: 600,
            });
          }
        }
        D.text(ctx, 'q' + i, rx - 10, rTop + i * cell + cell / 2, {
          size: 9.5, color: i === ci ? C.cyan : C.faint, align: 'right',
        });
      }
      for (let j = 0; j < n; j++) {
        D.text(ctx, 'k' + j, rx + j * cell + cell / 2, rTop + n * cell + 12, {
          size: 9.5, color: j === cj ? C.pink : C.faint,
        });
      }

      // 形状账本
      const by = h - 62;
      D.round(ctx, 16, by, w - 32, 44, 8, {
        fill: 'rgba(160,107,255,0.07)', stroke: 'rgba(160,107,255,0.28)', width: 1,
      });
      D.text(ctx, '乘法规则：内维必须相等　[n, dk] × [dk, n] → [n, n]　（' + dk + ' 和 ' + dk + ' 对上，被"消掉"）',
        w / 2, by + 14, { size: 11.5, color: '#dcc9ff' });
      D.text(ctx, '结果第 ' + (ci + 1) + ' 行第 ' + (cj + 1) + ' 列 = q' + ci + ' · k' + cj + '（一次点积）',
        w / 2, by + 32, { size: 11.5, color: C.yellow, weight: 600 });

      scene.setReadout(
        '<span><span class="k">Q = X·W_Q：</span> [' + n + ', ' + dk + ']</span>' +
        '<span><span class="k">Kᵀ 形状：</span> [' + dk + ', ' + n + ']</span>' +
        '<span><span class="k">Q·Kᵀ 形状：</span> <span class="v">[' + n + ', ' + n + ']</span></span>' +
        '<span><span class="k">为什么要转置 =</span> 让 K 的每一行变成一列，才能和 Q 的每一行做点积</span>' +
        '<span><span class="k">结果含义 =</span> n 个词两两之间的相关性，共 n² 个数</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：Q / K / V 是怎么来的
     X: [n, 3]  W_Q/W_K/W_V: [3, 3]  →  Q/K/V: [n, 3]（形状一致，可以直接乘）
     ====================================================================== */
  TUT.register('qkv', function (scene) {
    const TOKENS = ['小猫', '追', '那只', '老鼠'];

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const colX = w * 0.17;
      const colW = w * 0.5;
      const colR = w * 0.83;

      const rows = TOKENS.length;
      const rowH = (h - 110) / rows;
      const topY = 74;

      const dim = 3;   // X 每个词 3 维，W 是 3×3，输出也是 3 维

      D.text(ctx, '① 输入的词向量 X', colX, 30, { size: 12.5, color: C.cyan, weight: 600 });
      D.text(ctx, '② 乘上可学习的权重矩阵', colW, 30, { size: 12.5, color: C.yellow, weight: 600 });
      D.text(ctx, '③ 得到三套不同的表示', colR, 30, { size: 12.5, color: C.green, weight: 600 });

      const focusRow = Math.floor(M.phase(t, 7) * rows) % rows;

      const wNames = ['W_Q', 'W_K', 'W_V'];
      const wRgb = ['76,201,240', '255,77,141', '46,230,168'];
      const wCols = [C.cyan, C.pink, C.green];
      const outNames = ['Q', 'K', 'V'];
      const wSize = 30;
      const wPos = [colW - 76, colW, colW + 76];

      wPos.forEach((wx, k) => {
        D.text(ctx, wNames[k], wx, 50, { size: 10, color: wCols[k], weight: 600 });
        D.text(ctx, '3×3', wx, 63, { size: 8.5, color: C.faint });
      });

      for (let i = 0; i < rows; i++) {
        const cy = topY + rowH * (i + 0.5);
        const isFocus = i === focusRow;
        const dimA = isFocus ? 1 : 0.56;

        if (isFocus) {
          D.round(ctx, 12, cy - rowH / 2 + 4, w - 24, rowH - 8, 8, {
            fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(255,255,255,0.08)', width: 1,
          });
        }

        D.text(ctx, TOKENS[i], 26, cy, {
          size: 12, color: isFocus ? C.text : C.dim, align: 'left', weight: isFocus ? 700 : 400, alpha: dimA,
        });

        // X 的向量：dim 个格子
        const xw = dim * 17, xStart = colX - xw / 2;
        for (let c = 0; c < dim; c++) {
          const v = 0.35 + 0.5 * Math.abs(Math.sin(i * 2.3 + c * 1.7));
          D.round(ctx, xStart + c * (xw / dim) + 1, cy - 10, xw / dim - 2, 20, 3, {
            fill: 'rgba(76,201,240,' + (v * 0.62 * dimA) + ')',
            alpha: dimA,
          });
        }
        D.text(ctx, '1×' + dim, colX, cy + 18, { size: 8, color: C.faint, alpha: dimA });

        // 三个 W 矩阵（都是 3×3）
        for (let k = 0; k < 3; k++) {
          const wx = wPos[k];
          for (let r = 0; r < 3; r++) {
            for (let cc = 0; cc < 3; cc++) {
              const vv = 0.3 + 0.55 * Math.abs(Math.sin(r * 3.1 + cc * 2.2 + k * 1.9));
              D.round(ctx, wx - wSize / 2 + cc * (wSize / 3), cy - wSize / 2 + r * (wSize / 3),
                wSize / 3 - 1.5, wSize / 3 - 1.5, 2, {
                  fill: 'rgba(' + wRgb[k] + ',' + (vv * 0.62 * dimA) + ')',
                  alpha: dimA,
                });
            }
          }
        }

        // 乘号
        const mulX = (xStart + xw + wPos[0] - wSize / 2) / 2;
        D.text(ctx, '×', mulX, cy, { size: 13, color: C.faint, alpha: dimA });

        // 等号
        const lastWright = wPos[2] + wSize / 2;
        const firstOutLeft = colR - 76 - dim * 14;
        D.text(ctx, '=', (lastWright + firstOutLeft) / 2, cy, { size: 13, color: C.faint, alpha: dimA });

        // Q / K / V 输出（每个也是 3 维）
        for (let k = 0; k < 3; k++) {
          const ox = colR + (k - 1) * 76;
          const barW = dim * 15, barH = 14;
          for (let c = 0; c < dim; c++) {
            const vv = 0.35 + 0.5 * Math.abs(Math.sin(i * 1.8 + c * 2.5 + k * 1.3));
            D.round(ctx, ox - barW / 2 + c * (barW / dim), cy - barH / 2, barW / dim - 1.5, barH, 2, {
              fill: 'rgba(' + wRgb[k] + ',' + (vv * 0.72 * dimA) + ')',
              alpha: dimA,
            });
          }
          D.text(ctx, outNames[k], ox, cy + barH / 2 + 11, {
            size: 10, color: wCols[k], alpha: dimA, weight: 600,
          });
        }
      }

      const by = h - 16;
      const notes = [
        { t: 'Q（Query）= 我在找什么', c: C.cyan },
        { t: 'K（Key）= 我有什么标签', c: C.pink },
        { t: 'V（Value）= 我实际携带的内容', c: C.green },
      ];
      notes.forEach((nt, i) => {
        D.text(ctx, nt.t, w * (0.2 + i * 0.3), by, { size: 11, color: nt.c, weight: 600 });
      });

      scene.setReadout(
        '<span><span class="k">形状账本 =</span> X[4,3] × W[3,3] → Q/K/V[4,3]</span>' +
        '<span><span class="k">Q = X·W_Q</span>　<span class="k">K = X·W_K</span>　<span class="k">V = X·W_V</span></span>' +
        '<span><span class="k">三个 W 是分开的 =</span> 各自学一套，不共享参数</span>' +
        '<span><span class="k">为什么要分开 =</span> 用来匹配的特征 和 用来传递的内容 本来就该不同</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：注意力分数矩阵 Q·Kᵀ
     分数表设计原则：让「它」那一行的最大值落在「老鼠」，与第 12 章加权求和一致
     ====================================================================== */
  TUT.register('scores', function (scene) {
    const n = 6;
    const toks = ['小猫', '追', '那只', '老鼠', '它', '饿'];
    //  行 = Query（主动看的词），列 = Key（被看的词）
    //  小猫 追   那只 老鼠  它   饿
    const baseScores = [
      [2.6, 3.8, 1.0, 1.6, 0.7, 0.2],  // 小猫
      [3.6, 2.2, 0.9, 3.9, 0.5, 0.3],  // 追
      [1.1, 1.0, 2.4, 3.7, 0.8, 0.1],  // 那只
      [1.8, 3.6, 3.4, 2.8, 1.0, 0.4],  // 老鼠
      [1.2, 0.6, 1.4, 4.2, 0.9, 1.1],  // 它   ← 峰值在「老鼠」，和第 12 章一致
      [0.9, 0.4, 0.3, 1.1, 1.3, 2.7],  // 饿
    ];

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const applyMask = scene.params.mask > 0.5;
      const showProb = scene.params.prob > 0.5;

      const rowProg = M.phase(t, 12) * n;
      const curRow = Math.floor(rowProg);
      const rowFrac = rowProg - curRow;

      const roomForPanel = w >= 720;
      const sideReserve = roomForPanel ? 300 : 110;
      const size = Math.max(120, Math.min(h - 150, w - sideReserve));
      const cell = size / n;
      const gx = 96;
      const gy = 74;
      const labelSize = cell < 40 ? 9.5 : 11;
      const valueSize = Math.min(13, cell * 0.36);

      for (let j = 0; j < n; j++) {
        D.text(ctx, toks[j], gx + cell * (j + 0.5), gy - 14, { size: labelSize, color: C.pink, alpha: 0.9 });
      }
      D.text(ctx, '列 = Key（被看的词）', gx + size / 2, gy - 34, { size: 10.5, color: C.pink });

      for (let i = 0; i < n; i++) {
        D.text(ctx, toks[i], gx - 12, gy + cell * (i + 0.5), {
          size: labelSize, color: C.cyan, align: 'right', alpha: 0.9,
        });
      }
      ctx.save();
      ctx.translate(gx - 58, gy + size / 2);
      ctx.rotate(-Math.PI / 2);
      D.text(ctx, '行 = Query（主动看的词）', 0, 0, { size: 10.5, color: C.cyan });
      ctx.restore();

      for (let i = 0; i < n; i++) {
        const row = baseScores[i].slice();
        if (applyMask) for (let j = i + 1; j < n; j++) row[j] = -1e9;
        const probs = M.softmax(row, 1);

        const isCur = i === curRow;
        for (let j = 0; j < n; j++) {
          const cx = gx + cell * j;
          const cy = gy + cell * i;
          const masked = applyMask && j > i;
          const v = masked ? 0 : baseScores[i][j];
          const p = masked ? 0 : probs[j];

          let alpha = 0;
          if (showProb) alpha = Math.pow(p, 0.55) * 0.92;
          else alpha = M.clamp(v / 4.4, 0, 1) * 0.8;

          const appear = i < curRow ? 1 : isCur ? M.easeOut(rowFrac * 2.2) : 0;
          if (showProb) alpha *= appear;

          if (masked) {
            D.round(ctx, cx + 1.5, cy + 1.5, cell - 3, cell - 3, 4, {
              fill: 'rgba(255,93,108,0.055)', stroke: 'rgba(255,93,108,0.16)', width: 1,
            });
            ctx.save();
            ctx.strokeStyle = 'rgba(255,93,108,0.3)';
            ctx.lineWidth = 1.2;
            const m = cell * 0.28;
            ctx.beginPath();
            ctx.moveTo(cx + m, cy + m); ctx.lineTo(cx + cell - m, cy + cell - m);
            ctx.moveTo(cx + cell - m, cy + m); ctx.lineTo(cx + m, cy + cell - m);
            ctx.stroke();
            ctx.restore();
            continue;
          }

          if (showProb) {
            D.round(ctx, cx + 1.5, cy + 1.5, cell - 3, cell - 3, 4, {
              fill: 'rgba(255,77,141,' + alpha + ')',
            });
            D.text(ctx, (p * 100).toFixed(0) + '%', cx + cell / 2, cy + cell / 2, {
              size: valueSize,
              color: alpha > 0.5 ? '#1a0410' : alpha > 0.1 ? '#ffd6e4' : 'rgba(255,214,228,0.42)',
              weight: 600,
            });
          } else {
            D.round(ctx, cx + 1.5, cy + 1.5, cell - 3, cell - 3, 4, {
              fill: 'rgba(76,201,240,' + alpha + ')',
            });
            D.text(ctx, M.fmt(v, 1), cx + cell / 2, cy + cell / 2, {
              size: valueSize,
              color: alpha > 0.52 ? '#04121a' : alpha > 0.1 ? '#bfefff' : 'rgba(191,239,255,0.4)',
              weight: 600,
            });
          }
        }

        if (isCur) {
          D.round(ctx, gx, gy + cell * i, size, cell, 5, {
            stroke: C.yellow, width: 2, glow: 14, alpha: 0.9,
          });
        }
      }

      // 右侧面板
      const px = gx + size + 30;
      const pw = w - px - 16;
      if (pw > 150) {
        const i = Math.min(curRow, n - 1);
        const row = baseScores[i].slice();
        if (applyMask) for (let j = i + 1; j < n; j++) row[j] = -1e9;
        const probs = M.softmax(row, 1);
        let topJ = 0;
        for (let j = 1; j < n; j++) if (probs[j] > probs[topJ]) topJ = j;

        D.round(ctx, px - 12, gy - 12, Math.min(pw + 24, 250), 152, 9, {
          fill: 'rgba(14,22,38,0.72)', stroke: C.line, width: 1,
        });
        D.text(ctx, '第 ' + (i + 1) + ' 行：谁在看', px, gy + 8, { size: 10, color: C.faint, align: 'left' });
        D.text(ctx, '「' + toks[i] + '」在看谁？', px, gy + 32, { size: 13.5, color: C.cyan, align: 'left', weight: 700 });
        D.text(ctx, '最强关注 →', px, gy + 58, { size: 10.5, color: C.dim, align: 'left' });
        D.text(ctx, toks[topJ] + '  ' + (probs[topJ] * 100).toFixed(1) + '%', px, gy + 80, {
          size: 15, color: C.pink, align: 'left', weight: 700,
        });
        D.text(ctx, '这一行权重和 = ' + (probs.reduce((a, b) => a + b, 0) * 100).toFixed(0) + '%',
          px, gy + 106, { size: 10, color: C.faint, align: 'left' });
        D.text(ctx, 'softmax 是按行做的，不是按列', px, gy + 128, {
          size: 9.5, color: 'rgba(76,201,240,0.6)', align: 'left',
        });
      }

      D.text(ctx, applyMask
        ? '加了因果掩码：每个词只能看自己和左边的词（不能偷看未来）'
        : '每一行做一次 softmax，一行概率和 = 100%', w / 2, h - 14, {
        size: 12, color: applyMask ? C.orange : C.dim,
      });

      scene.setReadout(
        '<span><span class="k">矩阵形状 =</span> n × n（n = 序列长度，这里是 ' + n + '）</span>' +
        '<span><span class="k">含义 =</span> 第 i 行第 j 列 = 第 i 个词对第 j 个词的关注度</span>' +
        '<span><span class="k">当前显示 =</span> <span class="v">' + (showProb ? 'softmax 后的概率' : '原始打分 Q·Kᵀ / √d') + '</span></span>' +
        '<span><span class="k">因果掩码 =</span> ' + (applyMask ? '<span class="c5">开</span>' : '关') + '</span>' +
        '<span><span class="k">试试 =</span> 看第 5 行「它」的峰值，落在「老鼠」上</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：注意力的完整一步 —— 加权求和 V
     ====================================================================== */
  TUT.register('attention-mix', function (scene) {
    const toks = ['小猫', '追', '那只', '老鼠', '它', '饿'];
    const n = toks.length;
    // 与分数矩阵第 5 行（「它」）softmax 后的比例保持一致
    const weights = [0.02, 0.01, 0.03, 0.90, 0.02, 0.02];

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const dims = 4;
      const Vs = toks.map((_, i) =>
        Array.from({ length: dims }, (v, d) => Math.sin(i * 1.9 + d * 2.4) * 0.8)
      );

      const out = Array.from({ length: dims }, (_, d) =>
        Vs.reduce((s, v, i) => s + v[d] * weights[i], 0)
      );

      const left = 30, right = w - 30;
      const topY = 84;
      const rowH = (h - 168) / n;

      D.text(ctx, '当前 Query = 「它」', w * 0.5, 24, { size: 13, color: C.cyan, weight: 700 });
      D.text(ctx, '把「它」对每个词的权重（左）× 各词的 V 向量（中），加权求和（右）',
        w * 0.5, 46, { size: 11, color: C.dim });

      const barX = left + 4;
      const barW = Math.min(110, w * 0.14);
      const vecX = barX + barW + 62;
      const outX = right - 96;

      toks.forEach((tok, i) => {
        const cy = topY + rowH * (i + 0.5);
        const wt = weights[i];
        const isTop = wt > 0.4;

        D.text(ctx, tok, barX + 14, cy, {
          size: 11.5, color: isTop ? C.text : C.dim, align: 'right', weight: isTop ? 700 : 400,
        });

        // 权重条
        const bw = Math.max(2, wt * barW);
        D.round(ctx, barX + 24, cy - 6, barW, 12, 3, { fill: 'rgba(255,255,255,0.04)' });
        D.round(ctx, barX + 24, cy - 6, bw, 12, 3, {
          fill: isTop ? C.pink : 'rgba(255,77,141,0.5)',
          glow: isTop ? 12 : 0,
        });
        D.text(ctx, (wt * 100).toFixed(0) + '%', barX + 24 + barW + 12, cy, {
          size: 10.5, color: isTop ? C.pink : C.faint, align: 'left',
        });

        // V 向量
        const cellW = 20, cellH = 13;
        Vs[i].forEach((v, d) => {
          const inten = (v + 1) / 2;
          D.round(ctx, vecX + d * cellW, cy - cellH / 2, cellW - 2, cellH, 2, {
            fill: 'rgba(46,230,168,' + (0.08 + inten * 0.5 * (0.25 + wt * 1.5)) + ')',
          });
        });

        // 流动点
        const ph = M.phase(t * 0.55 + i * 0.14, 1);
        const fx = M.lerp(vecX + dims * cellW + 14, outX - 42, ph);
        D.dot(ctx, fx, cy, 2 + wt * 5, isTop ? C.pink : 'rgba(255,77,141,0.45)', isTop ? 12 : 0);
      });

      // 输出列（垂直居中于右侧）
      const outCy = topY + rowH * (n / 2);
      D.text(ctx, '输出向量', outX, outCy - dims * 13, { size: 11, color: C.yellow, weight: 600 });
      D.text(ctx, '= Σ wᵢ·Vᵢ', outX, outCy - dims * 13 + 15, { size: 9.5, color: C.faint });
      out.forEach((v, d) => {
        const cy = outCy - (dims * 24) / 2 + d * 24 + 24;
        const inten = (v + 1.2) / 2.4;
        D.round(ctx, outX - 44, cy - 9, 88, 18, 4, {
          fill: 'rgba(255,209,102,' + (0.14 + inten * 0.5) + ')',
          stroke: 'rgba(255,209,102,0.35)', width: 1,
        });
        D.text(ctx, M.fmt(v, 2), outX, cy, { size: 10.5, color: '#1a1405', weight: 600 });
      });

      // 关键解释
      D.round(ctx, left, h - 58, w - 2 * left, 42, 9, {
        fill: 'rgba(160,107,255,0.08)', stroke: 'rgba(160,107,255,0.28)', width: 1,
      });
      D.text(ctx, '90% 的权重给了「老鼠」→「它」的新向量 ≈「老鼠」的 V → 指代消解在数值上就这样完成了',
        w / 2, h - 37, { size: 12, color: '#d9c9ff', weight: 600 });

      scene.setReadout(
        '<span><span class="k">公式 =</span> <span class="v">Attention(Q,K,V) = softmax(QKᵀ/√d)·V</span></span>' +
        '<span><span class="k">权重和 =</span> ' + M.fmt(weights.reduce((a, b) => a + b, 0), 3) + '（必须 = 1）</span>' +
        '<span><span class="k">输出维度 =</span> ' + dims + '（等于 V 的维度，与序列长度 n=' + n + ' 无关）</span>' +
        '<span><span class="k">输出含义 =</span> 该词的"上下文感知"新表示</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：缩放点积 —— 为什么除 √d
     关键改进：横轴用真实数值，σ 变化直接体现为曲线宽度变化
     ====================================================================== */
  TUT.register('scaling', function (scene) {
    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const d = Math.round(scene.params.dim);
      // 假设 Q、K 的每个分量独立、均值 0、方差 1
      // 则点积 = Σ qᵢkᵢ，方差 = d，标准差 = √d
      const stdBefore = Math.sqrt(d);
      const stdAfter = stdBefore / Math.sqrt(d);   // 恒等于 1，这是缩放的目的

      /* ----------------------------------------------------------------
         画法要点（这是本场景做对的关键）：
         1) 横轴 = 真实得分值，两个分布共用同一把尺，固定 ±X_MAX；
         2) 纵轴 = 真实概率密度，按"保面积"归一化（峰值高度 ∝ 1/σ）；
         于是 σ 变大的唯一视觉表现就是【又矮又宽】——这正是我们要教的。
         如果让横轴随 σ 一起缩放，两条曲线看起来永远一样宽，
         那就等于什么都没画（旧版就犯了这个错）。
         ---------------------------------------------------------------- */
      const X_MAX = 6;
      const plotTop = 104;
      const plotBottom = h - 116;
      const plotLeft = 62;
      const plotRight = w - 34;
      const baseY = plotBottom;

      // 纵轴上限：取"σ=1 的峰值"作为参考满高
      const refPeak = 1 / (1 * Math.sqrt(2 * Math.PI));
      const yMax = refPeak * 1.08;

      const px = (v) => M.lerp(plotLeft, plotRight, M.norm(v, -X_MAX, X_MAX));
      // 真实密度 → 像素高度（保面积：密度高则高）
      const py = (dens) => baseY - M.clamp(dens / yMax, 0, 1) * (baseY - plotTop);

      /** 在共享坐标系里画一个高斯的填充+曲线 */
      function drawGauss(std, colRgb, dashArr) {
        const dens = (v) => Math.exp(-(v * v) / (2 * std * std)) / (std * Math.sqrt(2 * Math.PI));
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(px(-X_MAX), baseY);
        for (let i = 0; i <= 240; i++) {
          const v = M.lerp(-X_MAX, X_MAX, i / 240);
          ctx.lineTo(px(v), py(dens(v)));
        }
        ctx.lineTo(px(X_MAX), baseY);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, plotTop, 0, baseY);
        g.addColorStop(0, 'rgba(' + colRgb + ',0.30)');
        g.addColorStop(1, 'rgba(' + colRgb + ',0.02)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgb(' + colRgb + ')';
        ctx.lineWidth = 2.2;
        if (dashArr) ctx.setLineDash(dashArr);
        ctx.shadowColor = 'rgb(' + colRgb + ')';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      }

      // 底：不缩放（宽而矮）；上：缩放后（窄而高）
      drawGauss(stdBefore, '255,93,108');
      drawGauss(stdAfter, '46,230,168');

      // 坐标轴
      D.line(ctx, plotLeft, baseY, plotRight, baseY, { color: C.faint, width: 1.2 });
      D.line(ctx, px(0), plotTop - 6, px(0), baseY, { color: 'rgba(255,255,255,.10)', width: 1, dash: [4, 5] });
      for (let v = -6; v <= 6; v += 2) {
        D.line(ctx, px(v), baseY, px(v), baseY + 4, { color: C.faint });
        if (v !== 0) D.text(ctx, String(v), px(v), baseY + 15, { size: 9, color: C.faint });
      }
      D.text(ctx, '得分值 = Q·Kᵀ / 缩放因子（同一把尺）', px(0), baseY + 32, {
        size: 10, color: C.dim,
      });

      // 图例
      const lx = plotLeft + 6, ly = 26;
      D.line(ctx, lx, ly, lx + 22, ly, { color: 'rgb(255,93,108)', width: 2.4 });
      D.text(ctx, '不缩放：σ = ' + M.fmt(stdBefore, 1), lx + 30, ly, {
        size: 11, color: 'rgb(255,93,108)', align: 'left', weight: 600,
      });
      D.line(ctx, lx, ly + 22, lx + 22, ly + 22, { color: 'rgb(46,230,168)', width: 2.4 });
      D.text(ctx, '除以 √' + d + '：σ = ' + M.fmt(stdAfter, 1), lx + 30, ly + 22, {
        size: 11, color: 'rgb(46,230,168)', align: 'left', weight: 600,
      });

      D.text(ctx, '同一条曲线，σ 越大 → 越矮越宽', plotRight, 26, {
        size: 12, color: C.text, align: 'right', weight: 700,
      });
      D.text(ctx, '面积恒为 1，所以"摊开"必然"变矮"', plotRight, 48, {
        size: 10.5, color: C.dim, align: 'right',
      });

      // 一个具体例子：softmax 饱和
      const logitsWide = [-3 * stdBefore, 0, 3 * stdBefore];
      const pWide = M.softmax(logitsWide, 1);
      const logitsNarrow = [-3 * stdAfter, 0, 3 * stdAfter];
      const pNarrow = M.softmax(logitsNarrow, 1);

      const by = h - 62;
      D.round(ctx, 16, by, w - 32, 46, 8, {
        fill: 'rgba(76,201,240,0.07)', stroke: 'rgba(76,201,240,0.24)', width: 1,
      });
      D.text(ctx, '同样三个 logit 相差 3σ：不缩放 → [' +
        pWide.map((p) => (p * 100).toFixed(1) + '%').join(', ') + ']（已 one-hot）',
        w / 2, by + 15, { size: 11, color: '#cfe6ff' });
      D.text(ctx, '缩放后 → [' + pNarrow.map((p) => (p * 100).toFixed(1) + '%').join(', ') +
        ']　d = ' + d + '：σ = √d = ' + M.fmt(stdBefore, 2) + '，除以 √d 后恰好回到 1',
        w / 2, by + 33, { size: 10.5, color: C.dim });

      scene.setReadout(
        '<span><span class="k">d_k =</span> <span class="v">' + d + '</span></span>' +
        '<span><span class="k">√d =</span> ' + M.fmt(Math.sqrt(d), 2) + '</span>' +
        '<span><span class="k">缩放前 σ =</span> <span class="c5">' + M.fmt(stdBefore, 2) + '</span></span>' +
        '<span><span class="k">缩放后 σ =</span> <span class="c3">' + M.fmt(stdAfter, 2) + '</span></span>' +
        '<span><span class="k">不缩放的后果 =</span> softmax 饱和 → 梯度≈0 → 训不动</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：多头注意力 —— 并行看不同的关系
     ====================================================================== */
  TUT.register('multihead', function (scene) {
    const nH = 4;
    const dModel = 8;
    const dHead = dModel / nH;
    const headInfo = [
      { name: '头 1：指代关系', color: C.pink, pair: [4, 3], desc: '「它」→「老鼠」' },
      { name: '头 2：动宾关系', color: C.cyan, pair: [1, 3], desc: '「追」→「老鼠」' },
      { name: '头 3：修饰关系', color: C.yellow, pair: [2, 3], desc: '「那只」→「老鼠」' },
      { name: '头 4：相邻位置', color: C.green, pair: [0, 1], desc: '相邻词互相看' },
    ];
    const toks = ['小猫', '追', '那只', '老鼠', '它'];

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const focusHead = Math.floor(M.phase(t, 9) * nH) % nH;

      D.text(ctx, '同一份输入 X（' + dModel + ' 维）', w / 2, 22, { size: 12, color: C.dim, weight: 600 });
      const inY = 44;
      const inW = Math.min(40, w / (toks.length + 3));
      const inStartX = w / 2 - (inW * toks.length) / 2;
      toks.forEach((tk, i) => {
        D.round(ctx, inStartX + i * inW + 2, inY, inW - 4, 22, 5, {
          fill: 'rgba(76,201,240,0.12)', stroke: 'rgba(76,201,240,0.4)', width: 1,
        });
        D.text(ctx, tk, inStartX + i * inW + inW / 2, inY + 11, { size: 9.5, color: C.text });
      });

      const headTop = inY + 42;
      const headH = h - headTop - 92;
      const headW = (w - 60) / nH;

      for (let k = 0; k < nH; k++) {
        const info = headInfo[k];
        const hx = 30 + k * headW;
        const isFocus = k === focusHead;

        D.line(ctx, w / 2, inY + 24, hx + headW / 2, headTop - 6, {
          color: info.color, width: 1, alpha: isFocus ? 0.35 : 0.12,
        });

        D.round(ctx, hx + 4, headTop, headW - 8, headH, 10, {
          fill: isFocus ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.014)',
          stroke: info.color, width: isFocus ? 1.8 : 1,
          alpha: isFocus ? 1 : 0.4, glow: isFocus ? 12 : 0,
        });

        D.text(ctx, info.name, hx + headW / 2, headTop + 15, {
          size: 10.5, color: info.color, weight: 600, alpha: isFocus ? 1 : 0.6,
        });
        D.text(ctx, '取 ' + dHead + ' 维', hx + headW / 2, headTop + 30, {
          size: 8.5, color: C.faint, alpha: isFocus ? 0.9 : 0.5,
        });

        const mN = toks.length;
        const mRowH = (headH - 58) / mN;
        const mCx = hx + headW / 2;
        const mW = Math.min(50, headW - 26);

        for (let i = 0; i < mN; i++) {
          const cy = headTop + 44 + mRowH * (i + 0.5);
          const [qa, kb] = info.pair;
          const isQ = i === qa, isK = i === kb;
          const al = isFocus ? (isQ || isK ? 1 : 0.32) : 0.28;
          D.round(ctx, mCx - mW / 2, cy - mRowH * 0.3, mW, mRowH * 0.6, 4, {
            fill: isQ ? 'rgba(76,201,240,0.3)' : isK ? 'rgba(255,77,141,0.3)' : 'rgba(255,255,255,0.045)',
            stroke: isQ ? C.cyan : isK ? C.pink : 'rgba(255,255,255,0.09)',
            width: 1, alpha: al,
          });
          D.text(ctx, toks[i], mCx, cy, { size: 9, color: C.text, alpha: al });
        }

        if (isFocus) {
          const [qa, kb] = info.pair;
          const y1 = headTop + 44 + mRowH * (qa + 0.5);
          const y2 = headTop + 44 + mRowH * (kb + 0.5);
          const sideX = mCx + mW / 2 + 8;
          const ph = M.phase(t * 1.1, 1);
          ctx.save();
          ctx.strokeStyle = info.color;
          ctx.lineWidth = 1.6;
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(ph * Math.PI * 2);
          ctx.beginPath();
          ctx.moveTo(sideX, y1);
          ctx.quadraticCurveTo(sideX + 14, (y1 + y2) / 2, sideX, y2);
          ctx.stroke();
          ctx.restore();
          D.dot(ctx, sideX + 11, (y1 + y2) / 2, 2.5, info.color, 8);
        }

        D.text(ctx, info.desc, hx + headW / 2, headTop + headH - 12, {
          size: 9, color: isFocus ? info.color : C.faint, alpha: isFocus ? 1 : 0.55,
        });
      }

      // 底部：拼接 + W_O
      const catY = h - 60;
      D.text(ctx, 'Concat：把 ' + nH + ' 个头（各 ' + dHead + ' 维）首尾拼起来 → 又回到 ' + dModel + ' 维',
        w / 2, catY, { size: 11, color: C.dim });
      const barY = catY + 16;
      const segW = Math.min(70, (w - 160) / nH);
      for (let k = 0; k < nH; k++) {
        const bx = w / 2 - (segW * nH) / 2 + k * segW;
        D.round(ctx, bx + 1, barY, segW - 2, 10, 2, {
          fill: headInfo[k].color, alpha: 0.32 + (k === focusHead ? 0.45 : 0),
        });
        D.text(ctx, dHead + '维', bx + segW / 2, barY + 18, { size: 8, color: C.faint });
      }
      D.arrow(ctx, w / 2 + (segW * nH) / 2 + 6, barY + 5, w / 2 + (segW * nH) / 2 + 34, barY + 5, {
        color: C.violet, width: 1.6, head: 8,
      });
      D.text(ctx, '×W_O', w / 2 + (segW * nH) / 2 + 52, barY + 5, { size: 9.5, color: C.violet });

      scene.setReadout(
        '<span><span class="k">d_model =</span> ' + dModel + '，头数 h = ' + nH + '，每头维度 d/h = ' + dHead + '</span>' +
        '<span><span class="k">总维度：</span> Concat 后仍是 ' + dModel + ' 维 → 并非 ' + (dModel * nH) + ' 维</span>' +
        '<span><span class="k">当前高亮 =</span> <span class="c4">' + headInfo[focusHead].name + '</span></span>' +
        '<span><span class="k">核心价值 =</span> 多个头各自学一种关系模式，最后由 W_O 融合</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景：因果掩码 —— 逐个生成下一个词
     ====================================================================== */
  TUT.register('causal-mask', function (scene) {
    const toks = ['小猫', '追', '那只', '老鼠'];
    const n = toks.length;

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const step = Math.floor(M.phase(t, 10) * (n + 1));

      const tkY = 44;
      const tkW = Math.min(66, (w - 80) / n);
      const startX = w / 2 - (tkW * n) / 2;
      toks.forEach((tk, i) => {
        const known = i < step;
        const isNext = i === step;
        D.round(ctx, startX + i * tkW + 3, tkY, tkW - 6, 30, 7, {
          fill: known ? 'rgba(46,230,168,0.14)' : 'rgba(255,255,255,0.03)',
          stroke: known ? C.green : isNext ? C.orange : 'rgba(255,255,255,0.1)',
          width: isNext ? 2 : 1,
          glow: isNext ? 12 : 0,
        });
        D.text(ctx, known ? tk : (isNext ? '?' : '·'), startX + i * tkW + tkW / 2, tkY + 15, {
          size: 12, color: known ? C.text : isNext ? C.orange : C.faint, weight: known ? 600 : 400,
        });
      });
      D.text(ctx, '第 ' + Math.min(step + 1, n) + ' 步：生成「' + (toks[step] || '结束') + '」时，只能看到左边 ' + step + ' 个词',
        w / 2, 22, { size: 12, color: C.dim, weight: 600 });

      const size = Math.min(w * 0.46, h - 200);
      const cell = size / n;
      const gx = w * 0.15;
      const gy = 104;

      D.text(ctx, '注意力矩阵（行 = 当前词，列 = 被看的词）', gx + size / 2, gy - 16, {
        size: 10.5, color: C.faint,
      });

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const cx = gx + j * cell, cy = gy + i * cell;
          const allowed = j <= i;
          const isActiveRow = i === step || i === step - 1;

          if (allowed) {
            const rowValid = i + 1;
            const p = 1 / rowValid;
            const dim = isActiveRow ? 1 : 0.42;
            D.round(ctx, cx + 2, cy + 2, cell - 4, cell - 4, 5, {
              fill: 'rgba(46,230,168,' + (0.16 + p * 0.5) * dim + ')',
              stroke: 'rgba(46,230,168,' + (isActiveRow ? 0.4 : 0.15) + ')', width: 1,
            });
            D.text(ctx, (p * 100).toFixed(0) + '%', cx + cell / 2, cy + cell / 2, {
              size: Math.min(11, cell * 0.3), color: '#d7fff1', alpha: dim, weight: 600,
            });
          } else {
            D.round(ctx, cx + 2, cy + 2, cell - 4, cell - 4, 5, {
              fill: 'rgba(255,93,108,0.055)', stroke: 'rgba(255,93,108,0.16)', width: 1,
            });
            ctx.save();
            ctx.strokeStyle = 'rgba(255,93,108,0.32)';
            ctx.lineWidth = 1.3;
            const m = cell * 0.3;
            ctx.beginPath();
            ctx.moveTo(cx + m, cy + m); ctx.lineTo(cx + cell - m, cy + cell - m);
            ctx.moveTo(cx + cell - m, cy + m); ctx.lineTo(cx + m, cy + cell - m);
            ctx.stroke();
            ctx.restore();
          }
        }
        D.text(ctx, toks[i], gx - 10, gy + cell * (i + 0.5), { size: 10, color: C.cyan, align: 'right' });
        D.text(ctx, toks[i], gx + cell * (i + 0.5), gy + size + 14, { size: 10, color: C.pink });
      }

      // 右侧解释
      const ex = gx + size + 28;
      const ew = w - ex - 16;
      if (ew > 130) {
        D.text(ctx, '为什么必须遮住？', ex, gy + 14, { size: 12, color: C.orange, align: 'left', weight: 700 });
        const lines = [
          '训练时整句话都在手上，',
          '如果不遮，模型能直接',
          '看见答案（未来词），',
          '就学不到"预测"的能力。',
          '',
          '推理时是逐词生成的，',
          '本来也看不到未来，',
          '所以训练要和推理一致。',
        ];
        lines.forEach((ln, i) => {
          D.text(ctx, ln, ex, gy + 40 + i * 20, { size: 10.8, color: C.dim, align: 'left' });
        });
        D.text(ctx, '（图里的百分比是"假设注意力均匀分布"时的示意）', ex, gy + 40 + lines.length * 20 + 10, {
          size: 9, color: C.faint, align: 'left',
        });
      }

      scene.setReadout(
        '<span><span class="k">掩码规则 =</span> 只允许 j ≤ i（含自己）</span>' +
        '<span><span class="k">被遮处 =</span> 置为 −∞，softmax 后权重恰好为 0</span>' +
        '<span><span class="k">当前步 =</span> <span class="v">' + step + '</span></span>' +
        '<span><span class="k">这就是 GPT 类模型的做法 =</span> <span class="c3">Decoder-only 的因果注意力</span></span>'
      );
    }
    return { frame };
  });
})();
