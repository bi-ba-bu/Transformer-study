/* ==========================================================================
   core.js —— 动画引擎与绘图工具
   纯原生 JS，无任何外部依赖，file:// 直接双击即可运行。
   ========================================================================== */
(function () {
  'use strict';

  const TUT = (window.TUT = window.TUT || {});
  TUT.scenes = TUT.scenes || {};

  /** 注册一个动画场景：id 对应 HTML 里的 data-scene 属性 */
  TUT.register = function (id, factory) {
    TUT.scenes[id] = factory;
  };

  /* ======================================================================
     1. 数学小工具
     ====================================================================== */
  const M = {
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    /** 把 v 从 [a,b] 映射到 [0,1] */
    norm(v, a, b) { return b === a ? 0 : (v - a) / (b - a); },
    easeInOut(t) {
      t = M.clamp(t, 0, 1);
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },
    easeOut(t) { t = M.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); },
    easeIn(t) { t = M.clamp(t, 0, 1); return t * t * t; },
    smooth(t) { t = M.clamp(t, 0, 1); return t * t * (3 - 2 * t); },
    /** 从 start 秒开始，用 dur 秒从 0 走到 1，之后钉在 1 */
    seg(t, start, dur) { return M.clamp((t - start) / dur, 0, 1); },
    /** 一段 0→1→0 的脉冲 */
    pulse(t, start, dur) { return Math.sin(M.seg(t, start, dur) * Math.PI); },
    /** 0..1 的循环相位 */
    phase(t, period) { return (t % period) / period; },
    round(v, n) {
      const p = Math.pow(10, n);
      return Math.round(v * p) / p;
    },
    /** 固定小数位格式化，顺手消掉 -0 */
    fmt(v, n = 2) {
      const r = M.round(v, n);
      return (Object.is(r, -0) || r === 0 ? 0 : r).toFixed(n);
    },
    /** 一维数组 softmax */
    softmax(arr, temp = 1) {
      const t = Math.max(1e-6, temp);
      const mx = Math.max.apply(null, arr);
      const ex = arr.map((v) => Math.exp((v - mx) / t));
      const s = ex.reduce((a, b) => a + b, 0) || 1;
      return ex.map((v) => v / s);
    },
    /** 正切函数（谐波）*/
    sin(x) { return Math.sin(x); },
  };
  TUT.M = M;

  /* ======================================================================
     2. 配色
     ====================================================================== */
  const C = (TUT.C = {
    bg: '#070b14',
    panel: '#0e1626',
    panel2: '#141f33',
    line: '#22304b',
    grid: '#162033',
    text: '#e8eefb',
    dim: '#8595b3',
    faint: '#4c5b78',
    cyan: '#4cc9f0',
    blue: '#4a6cf7',
    violet: '#a06bff',
    pink: '#ff4d8d',
    yellow: '#ffd166',
    green: '#2ee6a8',
    orange: '#ff9f43',
    red: '#ff5d6c',
  });

  /* ======================================================================
     3. 绘图工具
     ====================================================================== */
  const FONT = '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",system-ui,sans-serif';
  const MONO = '"Cascadia Code",Consolas,"Courier New",monospace';

  const D = {
    font(size, weight) { return (weight || 400) + ' ' + size + 'px ' + FONT; },
    mono(size, weight) { return (weight || 400) + ' ' + size + 'px ' + MONO; },

    clear(ctx, w, h, color) {
      ctx.clearRect(0, 0, w, h);
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
      }
    },

    /** 文本：默认居中 */
    text(ctx, str, x, y, opt) {
      const o = opt || {};
      ctx.save();
      ctx.font = D.font(o.size || 13, o.weight);
      ctx.fillStyle = o.color || C.text;
      ctx.textAlign = o.align || 'center';
      ctx.textBaseline = o.baseline || 'middle';
      if (o.alpha != null) ctx.globalAlpha = o.alpha;
      if (o.glow) {
        ctx.shadowColor = o.color || C.text;
        ctx.shadowBlur = o.glow;
      }
      ctx.fillText(str, x, y);
      ctx.restore();
    },

    textWidth(ctx, str, size, weight) {
      ctx.save();
      ctx.font = D.font(size || 13, weight);
      const w = ctx.measureText(str).width;
      ctx.restore();
      return w;
    },

    line(ctx, x1, y1, x2, y2, opt) {
      const o = opt || {};
      ctx.save();
      ctx.strokeStyle = o.color || C.line;
      ctx.lineWidth = o.width || 1;
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      if (o.dash) ctx.setLineDash(o.dash);
      if (o.glow) {
        ctx.shadowColor = o.color || C.cyan;
        ctx.shadowBlur = o.glow;
      }
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    },

    /** 带箭头的线段，箭头大小自适应 */
    arrow(ctx, x1, y1, x2, y2, opt) {
      const o = opt || {};
      const head = o.head || 8;
      const ang = Math.atan2(y2 - y1, x2 - x1);
      D.line(ctx, x1, y1, x2, y2, o);
      const ax = x2 - Math.cos(ang) * head;
      const ay = y2 - Math.sin(ang) * head;
      ctx.save();
      ctx.fillStyle = o.color || C.line;
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      if (o.glow) {
        ctx.shadowColor = o.color || C.cyan;
        ctx.shadowBlur = o.glow;
      }
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(ax + Math.sin(ang) * head * 0.5, ay - Math.cos(ang) * head * 0.5);
      ctx.lineTo(ax - Math.sin(ang) * head * 0.5, ay + Math.cos(ang) * head * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    dot(ctx, x, y, r, color, glow) {
      ctx.save();
      ctx.fillStyle = color || C.cyan;
      if (glow) {
        ctx.shadowColor = color || C.cyan;
        ctx.shadowBlur = glow;
      }
      ctx.beginPath();
      ctx.arc(x, y, r || 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    circle(ctx, x, y, r, opt) {
      const o = opt || {};
      ctx.save();
      if (o.fill) {
        ctx.fillStyle = o.fill;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (o.stroke) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = o.width || 1.5;
        if (o.dash) ctx.setLineDash(o.dash);
        if (o.glow) {
          ctx.shadowColor = o.stroke;
          ctx.shadowBlur = o.glow;
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },

    /** 圆角矩形（可只填充、只描边，或两者） */
    round(ctx, x, y, w, h, r, opt) {
      const o = opt || {};
      const rad = Math.min(r, Math.min(w, h) / 2);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + w, y, x + w, y + h, rad);
      ctx.arcTo(x + w, y + h, x, y + h, rad);
      ctx.arcTo(x, y + h, x, y, rad);
      ctx.arcTo(x, y, x + w, y, rad);
      ctx.closePath();
      if (o.fill) {
        ctx.fillStyle = o.fill;
        ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
        if (o.glow) {
          ctx.shadowColor = o.glowColor || o.fill;
          ctx.shadowBlur = o.glow;
        }
        ctx.fill();
      }
      if (o.stroke) {
        ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = o.width || 1.5;
        if (o.dash) ctx.setLineDash(o.dash);
        if (o.glow) {
          ctx.shadowColor = o.glowColor || o.stroke;
          ctx.shadowBlur = o.glow;
        }
        ctx.stroke();
      }
      ctx.restore();
    },

    /** 画一条函数曲线 */
    curve(ctx, fn, v, opt) {
      const o = opt || {};
      ctx.save();
      ctx.strokeStyle = o.color || C.cyan;
      ctx.lineWidth = o.width || 2;
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      if (o.glow) {
        ctx.shadowColor = o.color || C.cyan;
        ctx.shadowBlur = o.glow;
      }
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath();
      let started = false;
      const steps = o.steps || 240;
      for (let i = 0; i <= steps; i++) {
        const xv = M.lerp(v.x0, v.x1, i / steps);
        const yv = fn(xv);
        if (!isFinite(yv)) { started = false; continue; }
        const px = v.px(xv);
        const py = v.py(yv);
        if (py < -4000 || py > 4000) { started = false; continue; }
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    },
  };
  TUT.D = D;

  /* ======================================================================
     4. 坐标视图：把数学坐标映射成像素坐标
     ====================================================================== */
  class View {
    constructor(w, h, opts) {
      const o = opts || {};
      this.w = w;
      this.h = h;
      this.x0 = o.x0 != null ? o.x0 : -5;
      this.x1 = o.x1 != null ? o.x1 : 5;
      this.y0 = o.y0 != null ? o.y0 : -3;
      this.y1 = o.y1 != null ? o.y1 : 3;
      this.pad = o.pad != null ? o.pad : 28;
    }
    /** 数学 x → 像素 x */
    px(x) {
      return M.lerp(this.pad, this.w - this.pad, M.norm(x, this.x0, this.x1));
    }
    /** 数学 y → 像素 y（注意屏幕 y 向下） */
    py(y) {
      return M.lerp(this.h - this.pad, this.pad, M.norm(y, this.y0, this.y1));
    }
    /** 像素 → 数学 */
    ix(px) {
      return M.lerp(this.x0, this.x1, M.norm(px, this.pad, this.w - this.pad));
    }
    iy(py) {
      return M.lerp(this.y0, this.y1, M.norm(py, this.h - this.pad, this.pad));
    }
    /** 画网格和坐标轴 */
    axes(ctx, opt) {
      const o = opt || {};
      const stepX = o.stepX || 1;
      const stepY = o.stepY || 1;
      ctx.save();
      // 网格
      for (let x = Math.ceil(this.x0 / stepX) * stepX; x <= this.x1; x += stepX) {
        D.line(ctx, this.px(x), this.py(this.y1), this.px(x), this.py(this.y0), {
          color: C.grid, width: 1,
        });
      }
      for (let y = Math.ceil(this.y0 / stepY) * stepY; y <= this.y1; y += stepY) {
        D.line(ctx, this.px(this.x0), this.py(y), this.px(this.x1), this.py(y), {
          color: C.grid, width: 1,
        });
      }
      // 坐标轴
      const ax = this.py(0);
      const ay = this.px(0);
      D.line(ctx, this.px(this.x0), ax, this.px(this.x1), ax, { color: C.faint, width: 1.4 });
      D.line(ctx, ay, this.py(this.y0), ay, this.py(this.y1), { color: C.faint, width: 1.4 });
      // 刻度标签
      ctx.font = D.font(10);
      ctx.fillStyle = C.faint;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let x = Math.ceil(this.x0 / stepX) * stepX; x <= this.x1; x += stepX) {
        if (Math.abs(x) < 1e-9) continue;
        ctx.fillText(String(M.round(x, 2)), this.px(x), ax + 5);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let y = Math.ceil(this.y0 / stepY) * stepY; y <= this.y1; y += stepY) {
        if (Math.abs(y) < 1e-9) continue;
        ctx.fillText(String(M.round(y, 2)), ay - 6, this.py(y));
      }
      ctx.restore();
    }
  }
  TUT.View = View;

  /* ======================================================================
     5. 场景引擎
     ====================================================================== */
  let running = 0;
  const loopItems = new Set();
  let lastTime = 0;

  function tick(now) {
    if (!lastTime) lastTime = now;
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.06) dt = 0.06; // 切后台回来不要跳帧
    loopItems.forEach((s) => {
      try {
        if (s.playing) s.t += dt * (s.speed || 1);
        s.frame(dt, s.t);
      } catch (e) {
        s.errors = (s.errors || 0) + 1;
        if (s.errors < 3) console.error('[场景 ' + s.id + '] 绘制出错：', e);
        if (s.errors >= 3) { s.playing = false; loopItems.delete(s); }
      }
    });
    requestAnimationFrame(tick);
  }

  function ensureLoop() {
    if (!running) {
      running = 1;
      requestAnimationFrame(tick);
    }
  }

  /** 把一个 DOM 块变成一个可运行的动画场景 */
  function mountBlock(block) {
    const id = block.dataset.scene;
    const factory = TUT.scenes[id];
    const canvas = block.querySelector('canvas');
    if (!canvas) return null;
    if (!factory) {
      console.warn('未注册的动画场景:', id);
      return null;
    }

    const scene = {
      id,
      block,
      canvas,
      ctx: canvas.getContext('2d'),
      t: 0,
      speed: 1,
      playing: true,
      params: {},
      w: canvas.clientWidth || 600,
      h: canvas.clientHeight || 320,
      counter: 0,
    };

    scene.setReadout = function (html) {
      const el = block.querySelector('.anim-readout');
      if (el && el.innerHTML !== html) el.innerHTML = html;
    };
    /** 让场景反过来驱动某个控件（如自动旋转时同步滑块位置） */
    scene.syncParam = function (name, value) {
      const el = block.querySelector('[data-param="' + name + '"]');
      if (!el) return;
      if (el.type === 'checkbox') {
        if (el.checked !== !!value) el.checked = !!value;
      } else {
        const s = String(value);
        if (el.value !== s) el.value = s;
      }
      scene.params[name] = typeof value === 'boolean' ? value : Number(value);
      const out = el.parentElement && el.parentElement.querySelector('.param-value');
      if (out) out.textContent = M.fmt(scene.params[name], el.dataset.digits ? +el.dataset.digits : 2);
    };    scene.emit = function () { /* 预留：场景向外部广播状态 */ };
    scene.scale = 1;

    // 读取控件初始值
    block.querySelectorAll('[data-param]').forEach((el) => {
      const name = el.dataset.param;
      // 补上 id / name，满足无障碍规范（提示"表单字段应有 id 或 name"）
      if (!el.id) el.id = 'ctl-' + id + '-' + name;
      if (!el.name) el.name = id + '.' + name;
      if (!el.getAttribute('aria-label')) {
        const lbl = el.parentElement && el.parentElement.querySelector('.param-label');
        el.setAttribute('aria-label', lbl ? lbl.textContent.trim() : name);
      }
      scene.params[name] = readCtrl(el);
    });

    function readCtrl(el) {
      if (el.type === 'checkbox') return el.checked ? 1 : 0;
      if (el.tagName === 'SELECT') return el.value;
      return el.value === '' ? 0 : Number(el.value);
    }
    scene.readCtrl = readCtrl;

    let impl;
    try {
      impl = factory(scene);
    } catch (e) {
      console.error('[场景 ' + id + '] 初始化失败：', e);
      return null;
    }
    if (impl) {
      Object.keys(impl).forEach((k) => {
        if (typeof impl[k] === 'function') scene[k] = impl[k].bind(scene);
        else scene[k] = impl[k];
      });
    }

    // 尺寸自适应
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 320;
      scene.w = w;
      scene.h = h;
      scene.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      scene.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (scene.onResize) scene.onResize(w, h);
      if (scene.playing === false) scene.frame(0, scene.t);
    }
    scene.resize = resize;
    resize();

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => resize());
      ro.observe(canvas);
      scene.resizeObserver = ro;
    } else {
      window.addEventListener('resize', resize);
    }

    // 控件绑定
    block.querySelectorAll('[data-param]').forEach((el) => {
      const handler = () => {
        const name = el.dataset.param;
        scene.params[name] = readCtrl(el);
        const out = el.parentElement && el.parentElement.querySelector('.param-value');
        if (out && typeof scene.params[name] === 'number') {
          out.textContent = M.fmt(scene.params[name], el.dataset.digits ? +el.dataset.digits : 2);
        }
        if (scene.onParam) scene.onParam(name, scene.params[name]);
        if (!scene.playing) scene.frame(0, scene.t);
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
      const out = el.parentElement && el.parentElement.querySelector('.param-value');
      if (out && typeof scene.params[el.dataset.param] === 'number') {
        out.textContent = M.fmt(scene.params[el.dataset.param], el.dataset.digits ? +el.dataset.digits : 2);
      }
    });

    block.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'play') {
          scene.playing = !scene.playing;
          btn.textContent = scene.playing ? '暂停' : '播放';
          btn.classList.toggle('is-paused', !scene.playing);
          if (scene.playing) loopItems.add(scene);
        } else if (act === 'reset') {
          scene.t = 0;
          if (scene.reset) scene.reset();
          if (!scene.playing) scene.frame(0, 0);
        } else if (act === 'step') {
          scene.t += 0.35;
          scene.frame(0, scene.t);
        } else if (act === 'once') {
          scene.t = 0;
          scene.playing = true;
          const b = block.querySelector('[data-act="play"]');
          if (b) { b.textContent = '暂停'; b.classList.remove('is-paused'); }
          loopItems.add(scene);
        } else if (scene.onAction) {
          // 场景自定义动作，返回值用于更新按钮文字
          const label = scene.onAction(act);
          if (typeof label === 'string') {
            btn.textContent = label;
            btn.classList.toggle('on', !/^自动/.test(label));
          }
          if (!scene.playing) scene.frame(0, scene.t);
        }
      });
    });

    // 开关型按钮：data-toggle="参数名"
    block.querySelectorAll('[data-toggle]').forEach((btn) => {
      const name = btn.dataset.toggle;
      // 初始状态以按钮上的 on 类为准
      scene.params[name] = btn.classList.contains('on') ? 1 : 0;
      btn.addEventListener('click', () => {
        const on = !btn.classList.contains('on');
        btn.classList.toggle('on', on);
        scene.params[name] = on ? 1 : 0;
        if (scene.onParam) scene.onParam(name, scene.params[name]);
        if (!scene.playing) scene.frame(0, scene.t);
      });
    });

    // 只在进入视口时渲染，省电
    scene.visible = false;
    if (window.IntersectionObserver) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            scene.visible = e.isIntersecting;
            if (e.isIntersecting) {
              loopItems.add(scene);
              ensureLoop();
            } else {
              loopItems.delete(scene);
            }
          });
        },
        { rootMargin: '120px' }
      );
      io.observe(block);
      scene.io = io;
    } else {
      loopItems.add(scene);
      ensureLoop();
    }

    scene.frame(0, 0);
    block.classList.add('is-ready');
    return scene;
  }

  /** 页面入口 */
  function boot() {
    const scenes = [];
    document.querySelectorAll('.anim-block[data-scene]').forEach((block) => {
      const s = mountBlock(block);
      if (s) scenes.push(s);
    });
    TUT.scenesList = scenes;
    ensureLoop();
    buildToc();
    buildProgress();
    // 符号速查表要在正文就绪后再扫，否则扫不到动态生成的目录
    if (TUT.buildGlossary) TUT.buildGlossary();
  }

  /* ======================================================================
     6. 目录导航 + 阅读进度
     ====================================================================== */
  function buildToc() {
    const chapters = Array.from(document.querySelectorAll('section.chapter'));
    const lists = {};
    document.querySelectorAll('.toc-list').forEach((el) => {
      lists[el.dataset.part || ''] = el;
    });
    const nav = lists[''] || document.querySelector('.toc-list');
    if (!nav && !Object.keys(lists).length) return;

    /** 按章节顺序把目录分到几个组里 */
    function partOf(i) {
      if (i < 14) return 'math';     // 01~14 数学地基
      if (i < 20) return 'attn';     // 15~20 注意力核心
      return 'asm';                   // 21~ 组装与验收
    }

    const links = [];
    chapters.forEach((ch, i) => {
      const h = ch.querySelector('h2');
      if (!h) return;
      if (!ch.id) ch.id = 'ch-' + (i + 1);
      let host = lists[partOf(i)];
      // 没有对应分组容器就退回第一个
      if (!host) host = nav || Object.values(lists)[0];
      if (!host) return;
      const a = document.createElement('a');
      a.href = '#' + ch.id;
      a.className = 'toc-link';
      a.innerHTML =
        '<span class="toc-num">' + (ch.dataset.num || String(i).padStart(2, '0')) + '</span>' +
        '<span class="toc-title">' + (ch.dataset.short || h.textContent.trim()) + '</span>';
      host.appendChild(a);
      links.push(a);
    });

    const map = new Map();
    links.forEach((l) => {
      const target = document.querySelector(l.getAttribute('href'));
      if (target) map.set(target, l);
    });

    if (window.IntersectionObserver) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            const l = map.get(e.target);
            if (!l) return;
            if (e.isIntersecting) {
              links.forEach((x) => x.classList.remove('active'));
              l.classList.add('active');
            }
          });
        },
        { rootMargin: '-15% 0px -70% 0px' }
      );
      map.forEach((_, target) => io.observe(target));
    }
  }

  function buildProgress() {
    const bar = document.querySelector('.progress-fill');
    if (!bar) return;
    function update() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? M.clamp(window.scrollY / max, 0, 1) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
