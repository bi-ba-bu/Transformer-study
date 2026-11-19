/* ==========================================================================
   quiz.js —— 自测题交互
   ========================================================================== */
(function () {
  'use strict';
  const M = window.TUT.M;

  function init() {
    const quiz = document.querySelector('.quiz');
    if (!quiz) return;

    const qs = Array.from(quiz.querySelectorAll('.q'));
    let answered = 0;
    let correct = 0;
    const total = qs.length;

    qs.forEach((q, qi) => {
      const opts = Array.from(q.querySelectorAll('.q-opt'));
      const explain = q.querySelector('.q-explain');
      const answer = Number(q.dataset.answer);

      opts.forEach((opt, oi) => {
        const mark = opt.querySelector('.mark');
        if (mark) mark.textContent = String.fromCharCode(65 + oi);
        opt.addEventListener('click', () => {
          if (q.dataset.done === '1') return;
          q.dataset.done = '1';
          answered++;
          const isRight = oi === answer;
          if (isRight) {
            correct++;
            opt.classList.add('correct');
          } else {
            opt.classList.add('wrong');
            if (opts[answer]) opts[answer].classList.add('correct');
          }
          // 其他选项淡化
          opts.forEach((o, k) => {
            if (k !== oi && k !== answer) o.style.opacity = '0.42';
          });
          if (explain) explain.classList.add('show');
          updateScore();
        });
      });
    });

    // 计分板
    const scoreEl = document.querySelector('.quiz-score');
    let numEl, tipEl;
    if (scoreEl) {
      numEl = scoreEl.querySelector('.num');
      tipEl = scoreEl.querySelector('.tip-text');
    }

    function updateScore() {
      if (!numEl) return;
      numEl.textContent = correct + ' / ' + total;
      if (tipEl) {
        const pct = correct / total;
        let msg;
        if (answered < total) {
          msg = '已答 ' + answered + ' / ' + total + ' 题，继续。';
        } else if (pct === 1) {
          msg = '全对。你已经能自己推导一遍 Transformer 了 —— 下一步试着用 numpy 从零实现前向传播。';
        } else if (pct >= 0.8) {
          msg = '很扎实。把错的那几题对应的章节动画再看一遍即可。';
        } else if (pct >= 0.5) {
          msg = '基本框架有了，但细节还不牢。重点回看：Q/K/V 的用途、为什么要除以 √d、因果掩码、残差的作用。';
        } else {
          msg = '不着急。建议按顺序重看第 10~15 章（Q/K/V → 打分 → softmax → 加权求和 → 多头 → 掩码），这是 Transformer 的骨架。';
        }
        tipEl.textContent = msg;
      }
    }

    const resetBtn = document.querySelector('.quiz-score button');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        answered = 0;
        correct = 0;
        qs.forEach((q) => {
          delete q.dataset.done;
          q.querySelectorAll('.q-opt').forEach((o) => {
            o.classList.remove('correct', 'wrong');
            o.style.opacity = '';
          });
          const ex = q.querySelector('.q-explain');
          if (ex) ex.classList.remove('show');
        });
        updateScore();
        quiz.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    updateScore();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
