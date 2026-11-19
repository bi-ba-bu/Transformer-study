/* ==========================================================================
   scenes-basic.js —— 导数 / 链式法则 / 梯度下降 / 交叉熵 / 向量 / 点积 / 矩阵
   ========================================================================== */
(function () {
  'use strict';
  const TUT = window.TUT, M = TUT.M, C = TUT.C, D = TUT.D, View = TUT.View;

  /* ======================================================================
     场景 1：导数 = 切线的斜率（割线无限逼近）
     f(x) = 0.25x³ - x      f'(x) = 0.75x² - 1
     ====================================================================== */
  const f1 = (x) => 0.25 * x * x * x - x;
  const d1 = (x) => 0.75 * x * x - 1;

  TUT.register('derivative', function (scene) {
    let v = new View(scene.w, scene.h, { x0: -3, x1: 3, y0: -3.4, y1: 3.4, pad: 34 });

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');
      v.axes(ctx, { stepX: 1, stepY: 1 });

      const a = scene.params.a;
      // Δx 走 大→小→大 的三角波：两端速度为 0，避免周期末尾突然跳回大值
      const ph = M.phase(t, 5.6);
      const dxShrink = ph < 0.5 ? 1 - M.easeInOut(ph * 2) : M.easeInOut((ph - 0.5) * 2);
      const dx = 1.15 * dxShrink + 0.02;
      const fa = f1(a), fb = f1(a + dx);
      const slope = (fb - fa) / dx;
      const exact = d1(a);

      // 曲线
      D.curve(ctx, f1, v, { color: C.cyan, width: 2.4, glow: 10 });

      const px1 = v.px(a), py1 = v.py(fa);
      const px2 = v.px(a + dx), py2 = v.py(fb);
      // 割线延长到画布边缘
      const kx0 = v.x0, kx1 = v.x1;
      D.line(ctx, v.px(kx0), v.py(fa + slope * (kx0 - a)), v.px(kx1), v.py(fa + slope * (kx1 - a)), {
        color: C.yellow, width: 1.8, alpha: 0.85, dash: [7, 5],
      });
      D.dot(ctx, px2, py2, 4.5, C.yellow, 9);
      D.dot(ctx, px1, py1, 6, C.pink, 14);

      // 切线（绿）
      D.line(ctx, v.px(kx0), v.py(fa + exact * (kx0 - a)), v.px(kx1), v.py(fa + exact * (kx1 - a)), {
        color: C.green, width: 1.6, alpha: 0.75,
      });

      // Δx / Δy 的直角三角
      D.line(ctx, px1, py1, px2, py1, { color: C.faint, width: 1, dash: [3, 3] });
      D.line(ctx, px2, py1, px2, py2, { color: C.faint, width: 1, dash: [3, 3] });
      D.text(ctx, 'Δx', (px1 + px2) / 2, py1 + 12, { size: 11, color: C.dim });
      D.text(ctx, 'Δy', px2 + 16, (py1 + py2) / 2, { size: 11, color: C.dim });

      // 标注
      D.text(ctx, 'f(x) = 0.25x³ − x', w - 16, 20, { size: 12, color: C.cyan, align: 'right' });
      D.text(ctx, 'f′(x) = 0.75x² − 1', w - 16, 38, { size: 12, color: C.green, align: 'right' });
      D.text(ctx, '割线斜率 Δy/Δx', px2 + 8, py2 - 12, { size: 11, color: C.yellow, align: 'left' });
      D.text(ctx, '切点 x = ' + M.fmt(a, 2), px1, py1 + 22, { size: 11.5, color: C.pink });

      // 结论提示
      const near = Math.abs(slope - exact) < 0.06;
      D.text(ctx, near ? 'Δx 足够小了：割线已经贴上切线' : 'Δx 还太大，割线和切线有明显差距', w / 2, h - 12, {
        size: 12.5, color: near ? C.green : C.dim, weight: 600,
      });

      scene.setReadout(
        '<span><span class="k">Δx =</span> <span class="v">' + M.fmt(dx, 3) + '</span></span>' +
        '<span><span class="k">Δy =</span> ' + M.fmt(fb - fa, 3) + '</span>' +
        '<span><span class="k">割线斜率 Δy/Δx =</span> <span class="c5">' + M.fmt(slope, 3) + '</span></span>' +
        '<span><span class="k">切线斜率 f′(x) =</span> <span class="c3">' + M.fmt(exact, 3) + '</span></span>' +
        '<span><span class="k">误差 =</span> ' + M.fmt(Math.abs(slope - exact), 3) + '</span>'
      );
    }
    return {
      frame,
      onResize(w, h) { v.w = w; v.h = h; },
    };
  });

  /* ======================================================================
     场景 2：链式法则 = 局部变化率逐级往上乘
     u = g(x) = 2x + 1      y = f(u) = u²
     ====================================================================== */
  TUT.register('chain-rule', function (scene) {
    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      const x = scene.params.x;
      const u = 2 * x + 1;
      const y = u * u;
      const dydx = 2 * u * 2;

      // 数值校验：用极小步长做差分，验证解析导数
      const hstep = 1e-4;
      const numDeriv = ((2 * (x + hstep) + 1) ** 2 - y) / hstep;

      const cy = h * 0.42;
      const nx = [w * 0.18, w * 0.5, w * 0.82];
      const labels = ['x  输入', 'u = 2x + 1', 'y = u²'];
      const values = [M.fmt(x, 2), M.fmt(u, 2), M.fmt(y, 2)];
      const colors = [C.cyan, C.violet, C.green];

      // 连线和流动光点
      for (let i = 0; i < 2; i++) {
        const x1 = nx[i] + 42, x2 = nx[i + 1] - 42;
        D.arrow(ctx, x1, cy, x2, cy, { color: C.faint, width: 1.6, alpha: 0.7 });
        for (let k = 0; k < 3; k++) {
          const ph = M.phase(t * 0.85 + k / 3, 1);
          const px = M.lerp(x1, x2, ph);
          D.dot(ctx, px, cy, 3.2 * Math.sin(ph * Math.PI) + 0.8, C.cyan, 8);
        }
        const localLabels = ['g′(x) = 2', 'f′(u) = 2u = ' + M.fmt(2 * u, 1)];
        const hl = M.pulse(t, 0.5 + i * 1.1, 1.0);
        D.round(ctx, (x1 + x2) / 2 - 52, cy - 46, 104, 30, 8, {
          fill: 'rgba(255,209,102,' + (0.1 + hl * 0.16) + ')',
          stroke: 'rgba(255,209,102,' + (0.35 + hl * 0.6) + ')',
          width: 1.2,
        });
        D.text(ctx, localLabels[i], (x1 + x2) / 2, cy - 31, { size: 11.5, color: C.yellow, weight: 600 });
      }

      // 节点
      for (let i = 0; i < 3; i++) {
        const glowPulse = 0.5 + 0.5 * Math.sin(t * 2 - i * 0.9);
        D.round(ctx, nx[i] - 40, cy - 30, 80, 60, 12, {
          fill: 'rgba(20,31,51,0.95)',
          stroke: colors[i],
          width: 2,
          glow: 12 + glowPulse * 10,
        });
        D.text(ctx, labels[i], nx[i], cy - 10, { size: 11, color: C.dim });
        D.text(ctx, values[i], nx[i], cy + 13, { size: 19, color: colors[i], weight: 700 });
      }

      // 底部乘积链
      const by = h - 56;
      const boxW = 112, gap = 16;
      const totalW = boxW * 3 + gap * 2 + 60;
      let bx = (w - totalW) / 2;
      const terms = [
        { txt: 'f′(u) = ' + M.fmt(2 * u, 1), col: C.green },
        { txt: '×', col: C.dim, small: true },
        { txt: 'g′(x) = 2', col: C.violet },
        { txt: '=', col: C.dim, small: true },
        { txt: M.fmt(dydx, 1), col: C.yellow },
      ];
      terms.forEach((tm) => {
        if (tm.small) {
          D.text(ctx, tm.txt, bx + 14, by, { size: 17, color: tm.col });
          bx += 32;
        } else {
          D.round(ctx, bx, by - 17, boxW, 34, 9, {
            fill: 'rgba(255,255,255,0.035)',
            stroke: tm.col, width: 1.2, alpha: 0.95,
          });
          D.text(ctx, tm.txt, bx + boxW / 2, by, { size: 13, color: tm.col, weight: 600 });
          bx += boxW + gap;
        }
      });

      D.text(ctx, 'dy/dx（整条链的总变化率）', w / 2, by + 34, { size: 11.5, color: C.faint });

      scene.setReadout(
        '<span><span class="k">x =</span> <span class="c1">' + M.fmt(x, 2) + '</span> 拖滑块改 x</span>' +
        '<span><span class="k">u =</span> <span class="c2">' + M.fmt(u, 2) + '</span></span>' +
        '<span><span class="k">y =</span> <span class="c3">' + M.fmt(y, 2) + '</span></span>' +
        '<span><span class="k">解析 dy/dx = f′(u)·g′(x) =</span> <span class="v">' + M.fmt(dydx, 2) + '</span></span>' +
        '<span><span class="k">数值校验（差分，步长 1e-4）=</span> ' + M.fmt(numDeriv, 2) + '</span>'
      );
    }
    return { frame };
  });

  /* ======================================================================
     场景 3：梯度下降 = 在损失地形上下山
     f(x,y) = 0.5x² + 2y² + 0.7xy
     Hessian = [[1,0.7],[0.7,4]]，最大特征值 4.155
     → 学习率超过 2/4.155 ≈ 0.48 必然发散
     ====================================================================== */
  TUT.register('gradient-descent', function (scene) {
    let v = new View(scene.w, scene.h, { x0: -3.2, x1: 3.2, y0: -2.2, y1: 2.2, pad: 30 });
    const f = (x, y) => 0.5 * x * x + 2 * y * y + 0.7 * x * y;
    const gx = (x, y) => x + 0.7 * y;
    const gy = (x, y) => 4 * y + 0.7 * x;
    const LR_CRIT = 2 / 4.155;

    let traj = [];
    let diverged = false;
    let builtLr = null;
    let terrain = null, terrainKey = '';

    /** 把 loss 地形烘焙到离屏 canvas，避免每帧重算几万次 f() */
    function buildTerrain(w, h) {
      const key = w + 'x' + h;
      if (terrainKey === key && terrain) return terrain;
      const dpr = scene.dpr || 1;
      const oc = document.createElement('canvas');
      oc.width = Math.round(w * dpr);
      oc.height = Math.round(h * dpr);
      const octx = oc.getContext('2d');
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const step = 4;
      for (let px = 0; px < w; px += step) {
        for (let py = 0; py < h; py += step) {
          const xx = v.ix(px + step / 2);
          const yy = v.iy(py + step / 2);
          const t = M.clamp(f(xx, yy) / 13, 0, 1);
          const tt = Math.pow(t, 0.75);
          const r = Math.round(M.lerp(10, 118, tt));
          const g = Math.round(M.lerp(16, 44, tt));
          const b = Math.round(M.lerp(34, 128, tt));
          octx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
          octx.fillRect(px, py, step, step);
        }
      }
      terrain = oc;
      terrainKey = key;
      return oc;
    }

    function buildTraj() {
      const lr = scene.params.lr;
      if (builtLr === lr && traj.length) return;
      builtLr = lr;
      traj = [];
      diverged = false;
      let x = -2.6, y = 1.6;
      for (let i = 0; i < 120; i++) {
        traj.push({ x, y, f: f(x, y) });
        if (Math.abs(gx(x, y)) < 1e-4 && Math.abs(gy(x, y)) < 1e-4) break;
        x -= lr * gx(x, y);
        y -= lr * gy(x, y);
        if (Math.abs(x) > 9 || Math.abs(y) > 9) { diverged = true; break; }
      }
    }

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');
      buildTraj();

      ctx.drawImage(buildTerrain(w, h), 0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = 0.55;
      v.axes(ctx, { stepX: 1, stepY: 1 });
      ctx.restore();

      // 轨迹
      const idxF = M.clamp(t * 7, 0, traj.length - 1);
      const idx = Math.floor(idxF);
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= Math.min(idx, traj.length - 1); i++) {
        const p = traj[i];
        if (i === 0) ctx.moveTo(v.px(p.x), v.py(p.y));
        else ctx.lineTo(v.px(p.x), v.py(p.y));
      }
      ctx.strokeStyle = C.orange;
      ctx.lineWidth = 2;
      ctx.shadowColor = C.orange;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i <= Math.min(idx, traj.length - 1); i++) {
        const p = traj[i];
        D.dot(ctx, v.px(p.x), v.py(p.y), i === idx ? 4 : 2, i === idx ? '#fff' : 'rgba(255,159,67,.5)', i === idx ? 12 : 0);
      }

      const cur = traj[Math.min(idx, traj.length - 1)];
      const bx = v.px(cur.x), by = v.py(cur.y);
      const gxs = gx(cur.x, cur.y), gys = gy(cur.x, cur.y);
      D.circle(ctx, bx, by, 9, { fill: '#fff', stroke: C.orange, width: 2.5, glow: 16 });
      D.circle(ctx, bx, by, 3.5, { fill: C.orange });

      // 负梯度箭头（下山方向）
      // 注意：屏幕 y 轴向下，数学 y 增大 = 屏幕 y 减小
      // 下山方向 d = (−gx, −gy)，映射到屏幕就是 (−gx, +gy)
      const gn = Math.hypot(gxs, gys) || 1;
      const alen = 36;
      const ex = bx - (gxs / gn) * alen;
      const ey = by + (gys / gn) * alen;
      D.arrow(ctx, bx, by, ex, ey, { color: C.red, width: 2, head: 9, glow: 8 });
      D.text(ctx, '−∇f（下山方向）', ex + 8, ey + 14, { size: 11, color: C.red, align: 'left' });

      // 标注
      D.text(ctx, 'f(x,y) = 0.5x² + 2y² + 0.7xy', 16, 20, { size: 12, color: C.cyan, align: 'left' });
      D.text(ctx, '等高线越密 = 坡越陡', 16, 38, { size: 11, color: C.faint, align: 'left' });

      const atEnd = idx >= traj.length - 1;
      const converged = atEnd && !diverged;
      let footNote, footCol;
      if (diverged) { footNote = '发散：学习率超过 2/λmax ≈ ' + M.fmt(LR_CRIT, 2) + '，越走越远'; footCol = C.red; }
      else if (converged) { footNote = '收敛：梯度≈0，停在山谷底'; footCol = C.green; }
      else { footNote = '每一步：往梯度相反方向挪一点'; footCol = C.dim; }
      D.text(ctx, footNote, w - 16, h - 14, {
        size: 12, color: footCol, align: 'right', weight: 600,
      });

      scene.setReadout(
        '<span><span class="k">学习率 =</span> <span class="v">' + M.fmt(scene.params.lr, 3) + '</span></span>' +
        '<span><span class="k">发散阈值 2/λmax =</span> ' + M.fmt(LR_CRIT, 3) + '</span>' +
        '<span><span class="k">步数 =</span> ' + idx + '</span>' +
        '<span><span class="k">当前点 =</span> (' + M.fmt(cur.x, 2) + ', ' + M.fmt(cur.y, 2) + ')</span>' +
        '<span><span class="k">loss =</span> <span class="c5">' + M.fmt(cur.f, 3) + '</span></span>' +
        '<span><span class="k">|∇f| =</span> ' + M.fmt(Math.hypot(gxs, gys), 3) + '</span>'
      );
    }
    return {
      frame,
      onResize(w, h) { v.w = w; v.h = h; terrainKey = ''; },
      onParam(name) { if (name === 'lr') { builtLr = null; scene.t = 0; } },
    };
  });

  /* ======================================================================
     场景 4：交叉熵 —— "预测得越错，罚得越重"
     loss = −ln(p)     p = 模型给「正确答案」的概率
     dL/dp = −1/p      p 越小，梯度越大 → 错得越狠，修正越猛
     ====================================================================== */
  TUT.register('cross-entropy', function (scene) {
    let v = new View(scene.w, scene.h, { x0: 0, x1: 1, y0: 0, y1: 5, pad: 42 });

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');
      v.axes(ctx, { stepX: 0.2, stepY: 1 });

      const p = scene.params.p;
      const loss = -Math.log(p);
      const grad = -1 / p;

      // 曲线：只画 p ≥ 0.02 的部分，避免无穷大跑出画面
      D.curve(ctx, (x) => (x < 0.02 ? NaN : -Math.log(x)), {
        x0: 0.02, x1: 1, px: (x) => v.px(x), py: (y) => v.py(y),
      }, { color: C.pink, width: 2.4, glow: 10, steps: 400 });

      // 当前点
      const cx = v.px(p), cyy = v.py(Math.min(loss, v.y1));
      D.line(ctx, cx, v.py(0), cx, cyy, { color: 'rgba(255,255,255,.18)', width: 1, dash: [3, 3] });
      D.line(ctx, v.px(0), cyy, cx, cyy, { color: 'rgba(255,255,255,.18)', width: 1, dash: [3, 3] });
      D.dot(ctx, cx, cyy, 6, C.yellow, 16);
      D.text(ctx, 'loss = ' + M.fmt(loss, 3), cx + 12, cyy - 14, {
        size: 12.5, color: C.yellow, weight: 700, align: 'left',
      });

      // 轴线标签
      D.text(ctx, '模型给正确答案的概率 p', v.px(0.5), h - 12, { size: 11.5, color: C.dim });
      ctx.save();
      ctx.translate(16, v.py(2.5));
      ctx.rotate(-Math.PI / 2);
      D.text(ctx, 'loss = −ln p', 0, 0, { size: 11.5, color: C.pink });
      ctx.restore();

      // 三个参考点
      [[0.9, '很自信且对了'], [0.5, '拿不准'], [0.1, '非常错']].forEach((ref) => {
        const [pp, txt] = ref;
        const l = -Math.log(pp);
        if (l > v.y1) return;
        D.dot(ctx, v.px(pp), v.py(l), 3.5, 'rgba(76,201,240,.8)');
        D.text(ctx, txt + '  ' + M.fmt(l, 2), v.px(pp) + 8, v.py(l) + 12, {
          size: 10, color: 'rgba(76,201,240,.75)', align: 'left',
        });
      });

      // 结论
      const harsh = loss > 2;
      D.text(ctx, harsh ? '预测得非常错 → loss 很大 → 梯度也很猛（修正力度大）'
        : loss < 0.3 ? '预测接近正确 → loss 很小 → 梯度很小（几乎不用改了）'
          : '预测半对半错 → loss 适中', w / 2, h - 34, {
        size: 12.5, color: harsh ? C.red : loss < 0.3 ? C.green : C.dim, weight: 600,
      });

      scene.setReadout(
        '<span><span class="k">p（正确词的概率）=</span> <span class="v">' + M.fmt(p, 3) + '</span></span>' +
        '<span><span class="k">loss = −ln p =</span> <span class="c5">' + M.fmt(loss, 3) + '</span></span>' +
        '<span><span class="k">dL/dp = −1/p =</span> <span class="c4">' + M.fmt(grad, 2) + '</span></span>' +
        '<span><span class="k">读法：</span>p=0.5 时 loss=0.69；p=0.1 时 loss=2.30，罚得重得多</span>'
      );
    }
    return {
      frame,
      onResize(w, h) { v.w = w; v.h = h; },
    };
  });

  /* ======================================================================
     场景 5：向量 = 一串数，也是一个箭头
     |a| = √(a₁² + a₂² + …)     单位向量 = a / |a|
     ====================================================================== */
  TUT.register('vector-basics', function (scene) {
    /* 同样必须 x、y 等比例：
       否则下面那个"单位圆"会被画成椭圆，|a| 的几何直观整个失真。 */
    let v = new View(scene.w, scene.h, { x0: -4, x1: 4, y0: -3.2, y1: 3.2, pad: 30 });

    /** 按画布实际尺寸重算坐标范围，保证 1 单位 x = 1 单位 y */
    function fitView() {
      const pad = 30;
      const half = 3.7;                         // 数学半径，覆盖 ax∈[-3.5,3.5]
      const size = Math.min(v.w - 2 * pad, v.h - 2 * pad);
      const ppu = size / (2 * half);
      const xSpan = (v.w - 2 * pad) / ppu;
      const ySpan = (v.h - 2 * pad) / ppu;
      v.x0 = -xSpan / 2; v.x1 = xSpan / 2;
      v.y0 = -ySpan / 2; v.y1 = ySpan / 2;
    }
    fitView();

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');
      v.axes(ctx, { stepX: 1, stepY: 1 });

      const ax = scene.params.ax, ay = scene.params.ay;
      const len = Math.hypot(ax, ay) || 1e-6;

      const ox = v.px(0), oy = v.py(0);
      const px = v.px(ax), py = v.py(ay);

      // 分量虚线
      D.line(ctx, ox, oy, px, oy, { color: 'rgba(76,201,240,.35)', width: 1.6, dash: [5, 4] });
      D.line(ctx, px, oy, px, py, { color: 'rgba(76,201,240,.35)', width: 1.6, dash: [5, 4] });
      D.text(ctx, 'a₁ = ' + M.fmt(ax, 2), (ox + px) / 2, oy + 14, { size: 11, color: C.cyan });
      D.text(ctx, 'a₂ = ' + M.fmt(ay, 2), px + 10, (oy + py) / 2, { size: 11, color: C.cyan, align: 'left' });

      // 向量本体
      D.arrow(ctx, ox, oy, px, py, { color: C.yellow, width: 3.4, head: 13, glow: 16 });

      // 单位圆（半径 1）
      D.circle(ctx, ox, oy, Math.abs(v.px(1) - ox), {
        stroke: 'rgba(255,255,255,.12)', width: 1, dash: [3, 4],
      });
      D.text(ctx, '半径 1（单位长度）', ox + Math.abs(v.px(1) - ox) * 0.72, oy - Math.abs(v.px(1) - ox) * 0.72, {
        size: 9.5, color: 'rgba(255,255,255,.28)', align: 'left',
      });

      // 长度标注在向量中点外侧
      const midx = (ox + px) / 2, midy = (oy + py) / 2;
      const nx = -(py - oy) / (Math.hypot(px - ox, py - oy) || 1);
      const ny = (px - ox) / (Math.hypot(px - ox, py - oy) || 1);
      D.text(ctx, '|a| = ' + M.fmt(len, 2), midx + nx * 18, midy + ny * 18, {
        size: 12, color: C.yellow, weight: 700,
      });

      // 右上信息板
      const pw = 236, py0 = 16;
      D.round(ctx, w - pw - 16, py0, pw, 108, 10, {
        fill: 'rgba(14,22,38,0.92)', stroke: C.line, width: 1,
      });
      D.text(ctx, 'a = [' + M.fmt(ax, 1) + ', ' + M.fmt(ay, 1) + ']', w - pw - 2, py0 + 22, {
        size: 13, color: C.text, align: 'left', weight: 600,
      });
      D.text(ctx, '|a| = √(a₁² + a₂²)', w - pw - 2, py0 + 46, { size: 11.5, color: C.dim, align: 'left' });
      D.text(ctx, '= √(' + M.fmt(ax * ax, 2) + ' + ' + M.fmt(ay * ay, 2) + ') = ' + M.fmt(len, 3),
        w - pw - 2, py0 + 66, { size: 12, color: C.yellow, align: 'left' });
      D.text(ctx, '单位向量 a/|a| = (' + M.fmt(ax / len, 2) + ', ' + M.fmt(ay / len, 2) + ')',
        w - pw - 2, py0 + 90, { size: 11, color: C.violet, align: 'left' });

      D.text(ctx, '一个向量同时携带两件事：方向（箭头指向）和长度（箭头多长）',
        w / 2, h - 12, { size: 12.5, color: C.dim, weight: 600 });

      scene.setReadout(
        '<span><span class="k">a =</span> <span class="v">[' + M.fmt(ax, 2) + ', ' + M.fmt(ay, 2) + ']</span></span>' +
        '<span><span class="k">长度 |a| =</span> <span class="c3">' + M.fmt(len, 4) + '</span></span>' +
        '<span><span class="k">单位向量 =</span> <span class="c2">(' + M.fmt(ax / len, 3) + ', ' + M.fmt(ay / len, 3) + ')</span></span>' +
        '<span><span class="k">真实模型里维度 =</span> 768 / 1024 / 4096，这里压到 2 维才画得下</span>'
      );
    }
    return {
      frame,
      onResize(w, h) { v.w = w; v.h = h; fitView(); },
    };
  });

  /* ======================================================================
     场景 6：点积 = 相似度（Q 和 K 的相遇）
     a·b = |a||b|cosθ  → 两个单位向量时，点积恰好等于 cosθ
     ====================================================================== */
  TUT.register('dot-product', function (scene) {
    /* 这个场景必须让 x、y 等比例！
       否则数学上垂直的投影虚线，画到屏幕上就是斜的——看起来像"投歪了"。
       画布是宽扁的（约 930×400），如果 x、y 都写死 ±1.8，那么 x 每单位
       240 像素、y 每单位只有 78 像素，比例 3:1，直角会被拉成钝角。 */
    let v = new View(scene.w, scene.h, { x0: -1.86, x1: 1.86, y0: -1.86, y1: 1.86, pad: 34 });

    /** 按画布实际尺寸重算坐标范围，保证 1 单位 x = 1 单位 y */
    function fitView() {
      const pad = 26;
      const half = 1.92;                        // 数学半径，略大于 K 的最大长度 1.8
      const size = Math.min(v.w - 2 * pad, v.h - 2 * pad);
      const ppu = size / (2 * half);             // 每单位占多少像素（x、y 共用）
      const xSpan = (v.w - 2 * pad) / ppu;
      const ySpan = (v.h - 2 * pad) / ppu;
      v.x0 = -xSpan / 2; v.x1 = xSpan / 2;
      v.y0 = -ySpan / 2; v.y1 = ySpan / 2;
    }
    fitView();

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');

      // 网格：等比之后画布横向会比较宽，没有网格会显得又空又飘，
      // 加了网格才能一眼看出"这个格子是 0.5 个单位"
      const step = 0.5;
      ctx.save();
      for (let gx = Math.ceil(v.x0 / step) * step; gx <= v.x1; gx += step) {
        if (Math.abs(gx) < 1e-9) continue;
        D.line(ctx, v.px(gx), v.py(v.y0), v.px(gx), v.py(v.y1), { color: 'rgba(34,48,75,.55)', width: 1 });
      }
      for (let gy = Math.ceil(v.y0 / step) * step; gy <= v.y1; gy += step) {
        if (Math.abs(gy) < 1e-9) continue;
        D.line(ctx, v.px(v.x0), v.py(gy), v.px(v.x1), v.py(gy), { color: 'rgba(34,48,75,.55)', width: 1 });
      }
      ctx.restore();

      const ox = v.px(0), oy = v.py(0);
      D.line(ctx, v.px(v.x0), oy, v.px(v.x1), oy, { color: C.faint, width: 1.3 });
      D.line(ctx, ox, v.py(v.y0), ox, v.py(v.y1), { color: C.faint, width: 1.3 });

      const angA = -30 * Math.PI / 180;
      const angB = M.lerp(-160, 50, scene.params.ang) * Math.PI / 180;
      const lenA = 1.0;                       // Q 固定单位长度
      const lenB = scene.params.lenK;         // K 的长度可调
      const ax = Math.cos(angA) * lenA, ay = Math.sin(angA) * lenA;
      const bx = Math.cos(angB) * lenB, by = Math.sin(angB) * lenB;

      const dot = ax * bx + ay * by;
      const cosT = dot / (lenA * lenB);
      const theta = Math.acos(M.clamp(cosT, -1, 1)) * 180 / Math.PI;
      const projLen = dot / lenA;             // K 在 Q 上的投影长度（带符号）
      const nearlySame = theta < 8 || theta > 172;

      // 夹角扇形
      // canvas 的 y 轴向下，所以数学角度 θ 要画成屏幕角度 −θ；
      // 取 min/max 保证画出的是两者之间的"短弧"（θ ≤ 180°）
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.arc(ox, oy, 42, Math.min(-angA, -angB), Math.max(-angA, -angB));
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,209,102,0.1)';
      ctx.fill();
      ctx.restore();
      const midAng = (angA + angB) / 2;
      D.text(ctx, 'θ=' + M.fmt(theta, 0) + '°', ox + Math.cos(midAng) * 74, oy - Math.sin(midAng) * 74, {
        size: 12, color: C.yellow, weight: 600,
      });

      // 两个向量（先画，让下面的投影条叠在 Q 之上）
      D.arrow(ctx, ox, oy, v.px(ax), v.py(ay), { color: C.cyan, width: 3.2, head: 12, glow: 14 });
      D.arrow(ctx, ox, oy, v.px(bx), v.py(by), { color: C.pink, width: 3.2, head: 12, glow: 14 });

      // 投影：K 落在 Q 方向上的长度
      // 注意绘制顺序：投影条正好躺在 Q 上，必须画在 Q 箭头之后才可见，
      // 否则会被青色箭头整段盖住（学生看到的只有 Q，看不见"投影到底多长"）
      const ux = ax / lenA, uy = ay / lenA;
      const px = v.px(ux * projLen);
      const py = v.py(uy * projLen);
      D.line(ctx, ox, oy, px, py, { color: C.violet, width: 9, alpha: 0.55 });
      D.line(ctx, ox, oy, px, py, { color: 'rgba(180,140,255,.95)', width: 1.6, alpha: 0.9 });
      D.dot(ctx, px, py, 4, C.violet, 10);
      if (!nearlySame) {
        D.line(ctx, v.px(bx), v.py(by), px, py, { color: C.violet, width: 1.4, dash: [5, 4], alpha: 0.9 });
      }

      // 直角标记：告诉眼睛"这条虚线确实垂直于 Q"
      // 屏幕坐标里 y 轴向下，所以数学方向 (ux, uy) 的屏幕方向是 (ux, −uy)
      if (!nearlySame && Math.abs(projLen) > 0.1) {
        const bpx = v.px(bx), bpy = v.py(by);
        const dx = bpx - px, dy = bpy - py;
        const dl = Math.hypot(dx, dy) || 1;
        const nx2 = dx / dl, ny2 = dy / dl;          // 垂线方向（指向 K）
        // 沿"从投影点指回原点"的方向：投影为负时这个方向会自动翻转，
        // 保证直角小方块始终画在 Q 轴和垂线之间
        const bk = Math.hypot(ox - px, oy - py) || 1;
        const sx2 = (ox - px) / bk, sy2 = (oy - py) / bk;
        const R = 13;
        const c1x = px + sx2 * R, c1y = py + sy2 * R;
        const c2x = c1x + nx2 * R, c2y = c1y + ny2 * R;
        const c3x = px + nx2 * R, c3y = py + ny2 * R;
        D.line(ctx, c1x, c1y, c2x, c2y, { color: C.violet, width: 1.2, alpha: 0.75 });
        D.line(ctx, c2x, c2y, c3x, c3y, { color: C.violet, width: 1.2, alpha: 0.75 });
      }

      if (nearlySame) {
        D.text(ctx, 'Q', v.px(ax) + 16, v.py(ay) - 14, { size: 15, color: C.cyan, weight: 700, align: 'left' });
        D.text(ctx, 'K', v.px(bx) + 16, v.py(by) + 12, { size: 15, color: C.pink, weight: 700, align: 'left' });
      } else {
        D.text(ctx, 'Q', v.px(ax) + 15, v.py(ay) - 10, { size: 15, color: C.cyan, weight: 700, align: 'left' });
        D.text(ctx, 'K', v.px(bx) + 15, v.py(by) - 10, { size: 15, color: C.pink, weight: 700, align: 'left' });
      }

      // 数值面板
      const panelW = 224, panelX = w - panelW - 16;
      D.round(ctx, panelX, 16, panelW, 140, 10, { fill: 'rgba(14,22,38,0.92)', stroke: C.line, width: 1 });
      D.text(ctx, 'Q = (' + M.fmt(ax, 2) + ', ' + M.fmt(ay, 2) + ')   |Q|=' + M.fmt(lenA, 1), panelX + 14, 38, {
        size: 11.5, color: C.cyan, align: 'left',
      });
      D.text(ctx, 'K = (' + M.fmt(bx, 2) + ', ' + M.fmt(by, 2) + ')   |K|=' + M.fmt(lenB, 2), panelX + 14, 58, {
        size: 11.5, color: C.pink, align: 'left',
      });
      D.text(ctx, 'Q·K = |Q||K|cosθ', panelX + 14, 82, { size: 11, color: C.faint, align: 'left' });
      D.text(ctx, '= ' + M.fmt(dot, 3), panelX + 14, 106, {
        size: 17, color: dot > 0.3 ? C.green : dot < -0.3 ? C.red : C.yellow, align: 'left', weight: 700,
      });
      D.text(ctx, 'cosθ = ' + M.fmt(cosT, 3) + '（只看方向）', panelX + 14, 130, {
        size: 10.5, color: C.violet, align: 'left',
      });

      // 语义提示：按 cosθ 判断，不按点积大小
      let verdict, vcol;
      if (cosT > 0.85) { verdict = '方向几乎一致 → 高相关'; vcol = C.green; }
      else if (cosT > 0.2) { verdict = '方向大致同向 → 有点相关'; vcol = C.cyan; }
      else if (cosT > -0.2) { verdict = '近乎垂直 → 基本无关'; vcol = C.yellow; }
      else { verdict = '方向相反 → 负相关'; vcol = C.red; }
      D.text(ctx, verdict, w / 2, h - 16, { size: 13.5, color: vcol, weight: 700 });

      scene.setReadout(
        '<span><span class="k">点积 Q·K =</span> <span class="v">' + M.fmt(dot, 4) + '</span></span>' +
        '<span><span class="k">cos θ =</span> ' + M.fmt(cosT, 4) + '</span>' +
        '<span><span class="k">夹角 θ =</span> ' + M.fmt(theta, 1) + '°</span>' +
        '<span><span class="k">K 在 Q 上的投影 =</span> <span class="c2">' + M.fmt(projLen, 3) + '</span></span>' +
        '<span><span class="k">注意 =</span> 把 |K| 拖大，点积一起变大，但 cosθ 不变 → 方向没变</span>'
      );
    }

    let autoSpin = 0;
    function frameAuto(dt, t) {
      if (autoSpin) {
        const next = M.clamp(scene.params.ang + dt * 0.28, 0, 1);
        const wrapped = next >= 1 ? 0 : next;
        scene.params.ang = wrapped;
        scene.syncParam('ang', wrapped.toFixed(3));
      }
      frame(dt, t);
    }

    return {
      frame: frameAuto,
      onResize(w, h) { v.w = w; v.h = h; fitView(); },
      onParam(name) { if (name === 'ang') autoSpin = 0; },
      onAction(act) {
        if (act === 'autorotate') autoSpin = autoSpin ? 0 : 1;
        return autoSpin ? '停止旋转' : '自动旋转';
      },
    };
  });

  /* ======================================================================
     场景 7：矩阵 = 对空间的线性变换
     ====================================================================== */
  TUT.register('matrix-transform', function (scene) {
    /* 这里也必须是等比坐标！
       本场景演示"旋转 45°""镜像""错切"，x/y 一旦不等比，
       正方形网格会被压成扁方格，"旋转 45°"看起来会像"旋转 + 拉伸"，
       "旋转不改变长度"这个核心结论就看不出来了。 */
    let v = new View(scene.w, scene.h, { x0: -2.6, x1: 2.6, y0: -2.6, y1: 2.6, pad: 30 });

    /** 按画布实际尺寸重算坐标范围，保证 1 单位 x = 1 单位 y */
    function fitView() {
      const pad = 26;
      const half = 3.0;                         // 数学半径，覆盖变换后可能超出的范围
      const size = Math.min(v.w - 2 * pad, v.h - 2 * pad);
      const ppu = size / (2 * half);
      const xSpan = (v.w - 2 * pad) / ppu;
      const ySpan = (v.h - 2 * pad) / ppu;
      v.x0 = -xSpan / 2; v.x1 = xSpan / 2;
      v.y0 = -ySpan / 2; v.y1 = ySpan / 2;
    }
    fitView();

    const presets = {
      shear:   { a: 1, b: 0.8, c: 0, d: 1, name: '错切（剪切）', note: '面积不变，det = 1' },
      rotate:  { a: 0.707, b: -0.707, c: 0.707, d: 0.707, name: '旋转 45°', note: '长度不变，det = 1' },
      scale:   { a: 1.7, b: 0, c: 0, d: 0.55, name: '拉伸 + 压扁', note: 'det = 0.94 ≠ 1，面积变了' },
      project: { a: 1, b: 0, c: 0, d: 0, name: '投影（压扁成一条线）', note: 'det = 0，信息丢了，不可逆' },
      mirror:  { a: -1, b: 0, c: 0, d: 1, name: '镜像（左右翻转）', note: 'det = −1，方向反了' },
    };

    function frame(dt, t) {
      const ctx = scene.ctx, w = scene.w, h = scene.h;
      D.clear(ctx, w, h, '#060a12');
      v.axes(ctx, { stepX: 1, stepY: 1 });

      const key = scene.params.preset || 'shear';
      const P = presets[key] || presets.shear;
      const ph = M.phase(t, 6);
      const k = ph < 0.5 ? M.easeInOut(ph * 2) : M.easeInOut((1 - ph) * 2);

      const N = 3;                            // 铺满纵向视野（等比后 y 约 ∈[-3,3]）
      ctx.save();
      for (let i = -N; i <= N; i++) {
        for (let seg = -N; seg < N; seg += 0.1) {
          const y1 = seg, y2 = Math.min(seg + 0.1, N);
          const x1t = P.a * i + P.b * y1, y1t = P.c * i + P.d * y1;
          const x2t = P.a * i + P.b * y2, y2t = P.c * i + P.d * y2;
          const X1 = M.lerp(i, x1t, k), Y1 = M.lerp(y1, y1t, k);
          const X2 = M.lerp(i, x2t, k), Y2 = M.lerp(y2, y2t, k);
          D.line(ctx, v.px(X1), v.py(Y1), v.px(X2), v.py(Y2), {
            color: 'rgba(74,108,247,' + (0.32 - 0.07 * Math.abs(i)) + ')', width: 1,
          });
        }
        for (let seg = -N; seg < N; seg += 0.1) {
          const x1 = seg, x2 = Math.min(seg + 0.1, N);
          const x1t = P.a * x1 + P.b * i, y1t = P.c * x1 + P.d * i;
          const x2t = P.a * x2 + P.b * i, y2t = P.c * x2 + P.d * i;
          const X1 = M.lerp(x1, x1t, k), Y1 = M.lerp(i, y1t, k);
          const X2 = M.lerp(x2, x2t, k), Y2 = M.lerp(i, y2t, k);
          D.line(ctx, v.px(X1), v.py(Y1), v.px(X2), v.py(Y2), {
            color: 'rgba(74,108,247,' + (0.32 - 0.07 * Math.abs(i)) + ')', width: 1,
          });
        }
      }
      ctx.restore();

      const e1 = { x: P.a, y: P.c }, e2 = { x: P.b, y: P.d };
      D.arrow(ctx, v.px(0), v.py(0), v.px(1), v.py(0), { color: C.faint, width: 1.5, head: 8, alpha: 0.7 });
      D.arrow(ctx, v.px(0), v.py(0), v.px(0), v.py(1), { color: C.faint, width: 1.5, head: 8, alpha: 0.7 });
      D.arrow(ctx, v.px(0), v.py(0), v.px(M.lerp(1, e1.x, k)), v.py(M.lerp(0, e1.y, k)), {
        color: C.cyan, width: 3, head: 11, glow: 12,
      });
      D.arrow(ctx, v.px(0), v.py(0), v.px(M.lerp(0, e2.x, k)), v.py(M.lerp(1, e2.y, k)), {
        color: C.pink, width: 3, head: 11, glow: 12,
      });

      // 矩阵展示
      const mx = 18, my = 18;
      D.round(ctx, mx, my, 196, 96, 10, { fill: 'rgba(14,22,38,0.94)', stroke: C.line, width: 1 });
      D.text(ctx, P.name, mx + 98, my + 16, { size: 11.5, color: C.violet, weight: 600 });
      const bx = mx + 44, by = my + 32;
      ctx.save();
      ctx.strokeStyle = C.dim; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bx + 12, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + 40); ctx.lineTo(bx + 12, by + 40);
      ctx.moveTo(bx + 116, by); ctx.lineTo(bx + 128, by); ctx.lineTo(bx + 128, by + 40); ctx.lineTo(bx + 116, by + 40);
      ctx.stroke();
      ctx.restore();
      const vals = [P.a, P.b, P.c, P.d];
      vals.forEach((vv, i) => {
        const cx = bx + 34 + (i % 2) * 46;
        const cy = by + 12 + Math.floor(i / 2) * 22;
        D.text(ctx, M.fmt(vv, 2), cx, cy, {
          size: 13, color: [C.cyan, C.pink, C.cyan, C.pink][i], weight: 600,
        });
      });
      D.text(ctx, P.note, mx + 98, my + 84, { size: 9.5, color: C.faint });

      D.text(ctx, '矩阵的每一列 = 原来的坐标轴被搬到哪里', w - 16, h - 34, {
        size: 12, color: C.dim, align: 'right',
      });
      D.text(ctx, '蓝色 = x 轴基向量 ê₁ 的去向', 16, h - 34, { size: 11, color: C.cyan, align: 'left' });
      D.text(ctx, '粉色 = y 轴基向量 ê₂ 的去向', 16, h - 18, { size: 11, color: C.pink, align: 'left' });

      scene.setReadout(
        '<span><span class="k">变换 =</span> <span class="v">' + P.name + '</span></span>' +
        '<span><span class="k">ê₁ →</span> <span class="c1">(' + M.fmt(e1.x, 2) + ', ' + M.fmt(e1.y, 2) + ')</span></span>' +
        '<span><span class="k">ê₂ →</span> <span class="c4">(' + M.fmt(e2.x, 2) + ', ' + M.fmt(e2.y, 2) + ')</span></span>' +
        '<span><span class="k">行列式（面积缩放倍数）=</span> ' + M.fmt(P.a * P.d - P.b * P.c, 2) + '</span>'
      );
    }
    return {
      frame,
      onResize(w, h) { v.w = w; v.h = h; fitView(); },
    };
  });
})();
