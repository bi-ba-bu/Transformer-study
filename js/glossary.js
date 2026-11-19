/* ==========================================================================
   glossary.js —— 数学符号词典
   两个职责：
   ① 把「符号速查表」章节渲染出来（每个符号一张卡片，各有独立 id）
   ② 在正文里把出现过的符号自动变成可点击的链接，点了跳到对应卡片
   ========================================================================== */
(function () {
  'use strict';
  const TUT = (window.TUT = window.TUT || {});

  /* ======================================================================
     一、符号定义
     k  = id 后缀（最终 id 为 sym-<k>）
     s  = 符号显示
     r  = 读法（口头怎么念）
     g  = 分组
     t  = 搜索用的关键词（可选，补充同义词）
     d  = 详细解释（HTML）
     ====================================================================== */
  const GROUPS = [
    { id: 'g-calc', name: '微积分与优化', hint: '导数、极限、梯度、学习率' },
    { id: 'g-linalg', name: '线性代数', hint: '向量、点积、矩阵、转置' },
    { id: 'g-prob', name: '概率与统计', hint: '均值、标准差、指数、对数' },
    { id: 'g-fn', name: '函数与运算', hint: 'softmax、ReLU、交叉熵' },
    { id: 'g-attn', name: '注意力符号', hint: 'Q/K/V、W 矩阵、分数与权重' },
    { id: 'g-dim', name: '维度与形状', hint: 'n、d_model、d_k、d_ff、V' },
  ];

  const SYMS = [
    /* ---------------- 微积分与优化 ---------------- */
    {
      k: 'f-prime', s: 'f′(x)', r: 'f prime x（f 撇 x）', g: 'g-calc', t: '导数 求导 derivative',
      d: '<b>含义</b>：函数 f 在 x 这一点的导数，也就是那一点的<strong>切线斜率</strong>。' +
        '<b>怎么读</b>：念"f 撇 x"。那个小撇 ′ 就是"求导"的记号。' +
        '<b>注意</b>：它不是一个固定的数，是 x 的函数——同一个 f，x 不同导数就不同。' +
        '<b>在哪用</b>：第 01 章 导数。',
    },
    {
      k: 'dydx', s: 'dy/dx', r: 'd y over d x（dy 比 dx）', g: 'g-calc', t: '导数 莱布尼茨',
      d: '<b>含义</b>：和 <a class="sym" href="#sym-f-prime">f′(x)</a> 是同一件事，只是换了记法。' +
        '它强调"<strong>微小的 y 变化 ÷ 微小的 x 变化</strong>"，读作"y 对 x 的导数"。' +
        '<b>为什么有两种写法</b>：牛顿记法 f′ 简洁，莱布尼茨记法 dy/dx 能直接看出"谁对谁求导"，' +
        '链式法则里用后者更清楚。',
    },
    {
      k: 'delta-x', s: 'Δx', r: 'delta x', g: 'g-calc', t: '增量 变化量',
      d: '<b>含义</b>：x 的一个<strong>小增量</strong>（"挪一点点"）。Δ 是希腊字母 Delta 的大写，' +
        '在数学里统一表示"变化量"。<b>注意</b>：Δx 是"两个 x 的差"，不是"Δ 乘 x"。' +
        '<b>在哪用</b>：第 01 章里割线的两个点就差一个 Δx。',
    },
    {
      k: 'delta-y', s: 'Δy', r: 'delta y', g: 'g-calc', t: '增量 变化量',
      d: '<b>含义</b>：y 跟着变化的量。斜率 = <a class="sym" href="#sym-delta-x">Δy</a> / ' +
        '<a class="sym" href="#sym-delta-x">Δx</a>，意思是"横着挪一点，竖着涨多少"。',
    },
    {
      k: 'lim', s: 'lim', r: 'limit（极限）', g: 'g-calc', t: '极限',
      d: '<b>含义</b>：limit 的缩写，"极限"。<code>lim<sub>Δx→0</sub></code> 读作' +
        '"当 Δx 趋近于 0 时的极限"。<b>它不神秘</b>：只是说"让 Δx 越来越小，看结果稳定在哪"。' +
        '<b>注意</b>：极限值可以永远取不到，只是"无限接近"——这就是导数的严格含义。',
    },
    {
      k: 'arrow-to', s: '→', r: '趋近 / 变成', g: 'g-calc', t: '箭头 映射 趋近',
      d: '<b>三处会出现它，含义不同</b>：<br>' +
        '① <code>Δx→0</code>：趋近于零；<br>' +
        '② <code>x → u → y</code>：数据流经管道，上一层的输出变成下一层的输入；<br>' +
        '③ <code>θ ← θ − η∇L</code> 反过来写：表示"赋值/更新"。',
    },
    {
      k: 'nabla', s: '∇', r: 'nabla（倒三角）', g: 'g-calc', t: '梯度 gradient',
      d: '<b>含义</b>：梯度算子。<a class="sym" href="#sym-f-prime">f′(x)</a> 是"一个输入、一个输出"时的导数；' +
        '当有<strong>很多个输入</strong>（几百万个参数）时，把每个方向的导数排成一个向量，就是梯度 ∇L。' +
        '<b>关键性质</b>：∇ 指向"上坡最陡"的方向，所以要<strong>减去</strong>它才能下山。',
    },
    {
      k: 'eta', s: 'η', r: 'eta（读"伊塔"）', g: 'g-calc', t: '学习率 learning rate',
      d: '<b>含义</b>：学习率，也就是"下山时每一步迈多大"。' +
        '<b>太大会怎样</b>：一步跨过谷底冲到对面，来回震荡甚至发散（第 03 章可拖滑块看到）。' +
        '<b>太小会怎样</b>：走得很稳但极慢。这就是调参最主要的矛盾。',
    },
    {
      k: 'lambda', s: 'λ', r: 'lambda（兰姆达）', g: 'g-calc', t: '特征值 eigenvalue',
      d: '<b>含义</b>：<strong>特征值</strong>。可以粗略理解为"这个方向上的弯曲程度/陡峭程度"。' +
        '<b>为什么关心它</b>：二次型损失下，学习率的发散阈值正好是 <code>2/λmax</code>（λmax 是最大特征值）。' +
        '第 03 章那个地形的 λmax = 4.155，所以 η 超过 0.481 必发散。',
    },
    {
      k: 'partial', s: '∂', r: 'partial（偏导符号）', g: 'g-calc', t: '偏导数',
      d: '<b>含义</b>：偏导数。当函数有多个输入时，"只对其中一个求导、其他当作常数"就叫偏导。' +
        '写成 <code>∂(x+F)/∂x</code> 读作"x+F 对 x 的偏导"。' +
        '<b>残差为什么有效</b>：因为这个偏导等于 <code>1 + ∂F/∂x</code>，那个 1 就是梯度的高速公路。',
    },
    {
      k: 'left-arrow', s: '←', r: '赋值 / 更新为', g: 'g-calc', t: '赋值 更新',
      d: '<b>含义</b>：编程里的赋值号。<code>θ ← θ − η∇L</code> 读作"把旧的 θ 减去一小步，' +
        '结果存回 θ"。<b>注意</b>：它不是"等于"，右边用的是更新前的 θ。',
    },

    /* ---------------- 线性代数 ---------------- */
    {
      k: 'vec-len', s: '|a|', r: 'a 的模 / a 的长度', g: 'g-linalg', t: '长度 范数 norm 模',
      d: '<b>含义</b>：向量 a 的<strong>长度</strong>（也叫模、范数）。竖线不是绝对值，是"取长度"。' +
        '<b>怎么算</b>：<code>|a| = √(a₁² + a₂² + … )</code>，就是勾股定理。' +
        '<b>例</b>：<code>[3,4]</code> 的长度是 √(9+16)=5。',
    },
    {
      k: 'sqrt', s: '√', r: '根号（开平方）', g: 'g-linalg', t: '开方 平方根 sqrt',
      d: '<b>含义</b>：开平方。√25 = 5，因为 5×5 = 25。' +
        '<b>它为什么老出现</b>：代价函数常带平方，要还原成"原来的尺度"就得开根号——' +
        '比如方差 σ² 开根号才是标准差 σ。',
    },
    {
      k: 'sqrt-d', s: '√d', r: '根号 d', g: 'g-dim', t: '缩放 scale 缩放因子',
      d: '<b>含义</b>：维度 d 的平方根，注意力里那个"缩放因子"。' +
        '<b>为什么除它</b>：d 维点积的标准差正好是 √d，除以它就回到 1 附近。' +
        '不除的话分数太大，<a class="sym" href="#sym-softmax">softmax</a> 会饱和成 one-hot，梯度接近 0，模型训不动。' +
        '<b>在哪用</b>：第 18 章。',
    },
    {
      k: 'dot-prod', s: 'a·b', r: 'a dot b（a 点乘 b）', g: 'g-linalg', t: '点积 内积 dot',
      d: '<b>含义</b>：点积。<strong>对应位置相乘再全部相加</strong>，结果是一个数，不是向量。' +
        '<b>例</b>：<code>[2,3]·[4,1] = 2×4+3×1 = 11</code>。' +
        '<b>为什么代表相似</b>：<code>a·b = |a||b|cosθ</code>，方向越一致点积越大。' +
        '中间那个小圆点 · 是"点乘"专用记号，不能省成 ab（那是另一种乘法）。',
    },
    {
      k: 'times', s: '×', r: '乘', g: 'g-linalg', t: '乘 乘法',
      d: '<b>含义</b>：普通乘法。在矩阵语境里 <code>A×B</code> 和 <code>A·B</code> 常混用，' +
        '都指矩阵乘法。但要注意它和 <a class="sym" href="#sym-dot-prod">点积 a·b</a> 的层次不同：' +
        '点积的结果是一个数，矩阵乘法的结果是一个矩阵。',
    },
    {
      k: 'cos-theta', s: 'cos θ', r: 'cosine theta（余弦 theta）', g: 'g-linalg', t: '余弦 夹角',
      d: '<b>含义</b>：夹角 θ 的余弦值，范围 [−1, 1]。' +
        '<b>读法表</b>：θ=0° → cos=1（同向）；θ=90° → cos=0（垂直、无关）；θ=180° → cos=−1（反向）。' +
        '<b>用途</b>：把长度因素除掉，<strong>只看方向像不像</strong>。',
    },
    {
      k: 'theta', s: 'θ', r: 'theta（西塔）', g: 'g-linalg', t: '夹角 参数',
      d: '<b>它有两个完全不同的含义，看上下文</b>：<br>' +
        '① <strong>几何里</strong>：两个向量的夹角（配合 <a class="sym" href="#sym-cos-theta">cos θ</a>）；<br>' +
        '② <strong>优化里</strong>：模型所有可训练参数的总称，' +
        '<code>θ ← θ − η∇L</code> 就是"更新全部参数"。',
    },
    {
      k: 'transpose', s: 'ᵀ', r: 'transpose（转置）', g: 'g-linalg', t: '转置 transpose',
      d: '<b>含义</b>：转置，把矩阵的<strong>行列互换</strong>：第 i 行变成第 i 列。' +
        '<b>形状变化</b>：<code>[n, dk]</code> 转置后是 <code>[dk, n]</code>。' +
        '<b>为什么注意力必须有它</b>：矩阵乘法要求"内维相等"。' +
        '<code>Q[n,dk]</code> 要乘 <code>K[n,dk]</code> 不合法，写成 <code>Kᵀ[dk,n]</code> 就通了，' +
        '结果 <code>[n,n]</code> 正好是"每个词对每个词"的分数。见第 08 章。',
    },
    {
      k: 'determinant', s: 'det(A)', r: 'determinant（行列式）', g: 'g-linalg', t: '行列式 面积',
      d: '<b>含义</b>：矩阵 A 的行列式，几何意义是<strong>面积（体积）缩放倍数</strong>。' +
        '二维时 <code>det = ad − bc</code>。<br>' +
        '<b>三种关键情况</b>：=1 面积不变（旋转、错切）；=0 空间被压扁成一条线、<strong>信息丢失不可逆</strong>；' +
        '<0 面积不变但方向翻转。',
    },

    /* ---------------- 概率与统计 ---------------- */
    {
      k: 'mu', s: 'μ', r: 'mu（读"谬"）', g: 'g-prob', t: '均值 平均数 mean',
      d: '<b>含义</b>：平均值（mean）。LayerNorm 里指"<strong>这一个向量内部</strong>所有分量的平均"，' +
        '不是跨样本的平均。<b>例</b>：<code>[2,4,4,6]</code> 的 μ = 16/4 = 4。',
    },
    {
      k: 'sigma-sq', s: 'σ²', r: 'sigma squared（σ 的平方）', g: 'g-prob', t: '方差 variance',
      d: '<b>含义</b>：方差。衡量数据"离平均值有多散"。' +
        '<b>怎么算</b>：每个数与 <a class="sym" href="#sym-mu">μ</a> 的差，平方，再平均。' +
        '<b>为什么用平方</b>：不平方的话正负差会互相抵消。',
    },
    {
      k: 'sigma', s: 'σ', r: 'sigma（西格玛）', g: 'g-prob', t: '标准差 std',
      d: '<b>含义</b>：标准差，就是<strong>方差开根号</strong>：σ = √(σ²)。' +
        '用开根号是为了让单位和原数据一致（方差是"平方单位"，不好直观理解）。' +
        '<b>注意区分</b>：第 04 章的 <a class="sym" href="#sym-sigma">σ</a> 是"标准差"，' +
        '而 <a class="sym" href="#sym-sum">Σ</a>（大写）是"求和"，两者长得像但完全不同。',
    },
    {
      k: 'sum', s: 'Σ', r: 'sigma（大写，求和号）', g: 'g-prob', t: '求和 sum 累加',
      d: '<b>含义</b>：求和。<code>Σqᵢkᵢ</code> 读作"把每个 i 对应的 qᵢkᵢ 全加起来"，' +
        '本质就是<a class="sym" href="#sym-dot-prod">点积</a>的展开写法。' +
        '<b>易混提醒</b>：小写 <a class="sym" href="#sym-sigma">σ</a> 是标准差，大写 Σ 是求和，' +
        '在最简化的写法里，Σ 还会直接当"求和节点"画在图上。',
    },
    {
      k: 'subscript-i', s: 'xᵢ', r: 'x sub i（x 下标 i）', g: 'g-prob', t: '下标 索引',
      d: '<b>含义</b>：下标表示"第 i 个"。<code>xᵢ</code> = 向量里的第 i 个分量；' +
        '<code>wᵢ</code> = 第 i 个权重。<b>例</b>：<code>a = [2,3]</code> 时 a₁=2、a₂=3。' +
        '<b>约定</b>：数学里下标通常从 1 开始数，编程里从 0 开始——这是很多 bug 的来源。',
    },
    {
      k: 'ln', s: 'ln', r: 'natural log（自然对数）', g: 'g-prob', t: '对数 log',
      d: '<b>含义</b>：以 e 为底的对数，是 <a class="sym" href="#sym-exp">eˣ</a> 的反函数。' +
        '<b>只记三件事</b>：ln(1) = 0；0 &lt; p &lt; 1 时 ln(p) 是<strong>负数</strong>；p 越接近 0，ln(p) 掉得越快（趋向 −∞）。' +
        '<b>为什么损失里用它</b>：正是这三个性质让 <code>−ln(p)</code> 成为"越错罚得越狠"的度量。',
    },
    {
      k: 'exp', s: 'eˣ', r: 'e 的 x 次方 / exp(x)', g: 'g-prob', t: '指数 自然常数 e',
      d: '<b>含义</b>：自然常数 e ≈ 2.718 的 x 次方，也叫 exp(x)。' +
        '<b>三个关键性质</b>：永远 &gt; 0（不用处理负号）；单调递增（不打乱大小顺序）；' +
        '导数等于自己（反向传播好算）。' +
        '<b>代价值得记住</b>：e²≈7.39、e¹≈2.72、e⁰=1、e⁻¹≈0.37、e¹⁶≈8.9×10⁶（爆炸性增长）。',
    },
    {
      k: 'neg-inf', s: '−∞', r: '负无穷', g: 'g-prob', t: '无穷 掩码 mask',
      d: '<b>含义</b>：负无穷大。因果掩码里把"不许看"的位置设成它，' +
        '经过 <a class="sym" href="#sym-exp">eˣ</a> 之后<strong>精确等于 0</strong>，实现彻底排除。' +
        '<b>为什么不用 0</b>：设成 0 的话 e⁰ = 1，仍然占一份权重，等于没遮住。' +
        '<b>代码里</b>通常写 <code>-1e9</code>（避免真产生 NaN）。',
    },
    {
      k: 'propto', s: '∝', r: '正比于', g: 'g-prob', t: '正比 比例',
      d: '<b>含义</b>："正比于"。<code>σ ∝ √d</code> 读作"σ 与 √d 成正比"，' +
        '意思是"d 变大多少倍，σ 按它的平方根同步变大"。' +
        '<b>为什么用它</b>：不想写死具体系数时，用它只强调变化趋势。',
    },
    {
      k: 'gamma', s: 'γ', r: 'gamma（伽马）', g: 'g-prob', t: '缩放 参数 可学习',
      d: '<b>含义</b>：LayerNorm 里的<strong>缩放参数</strong>（可学习）。' +
        '归一化把向量压成均值 0、方差 1 之后，乘上 γ 可以让模型自己决定"要不要放大回去"。' +
        '<b>例</b>：γ=1 表示保持归一化结果；γ=2 表示整体放大一倍；γ=0 表示把这个方向彻底关掉。',
    },
    {
      k: 'beta', s: 'β', r: 'beta（贝塔）', g: 'g-prob', t: '平移 参数 可学习',
      d: '<b>含义</b>：LayerNorm 里的<strong>平移参数</strong>（可学习）。' +
        '归一化后数据以 0 为中心，加上 β 可以把中心挪到别处。' +
        '<b>为什么需要它</b>：因为不是所有特征都希望以 0 为中心，' +
        'γ 管"缩放"、β 管"平移"，两者都是可学习的，模型自己学出最合适的值。',
    },
    {
      k: 'epsilon', s: 'ε', r: 'epsilon（读"艾普西龙"）', g: 'g-prob', t: '防除零 小常数',
      d: '<b>含义</b>：一个<strong>极小的常数</strong>（常见 1e-5 或 1e-6）。' +
        '<b>唯一作用</b>：加在分母里防止<strong>除以 0</strong>。' +
        '因为 LayerNorm 要除以 √(σ²+ε)，如果某个向量所有分量完全相同，' +
        'σ² 就是 0，不加 ε 会直接算出 NaN。' +
        '<b>注意</b>：它不影响正常情况的结果（太小了），纯属保险。',
    },
    {
      k: 'kv-cache', s: 'KV Cache', r: 'K V 缓存', g: 'g-attn', t: '缓存 推理 加速',
      d: '<b>含义</b>：推理时的缓存机制。生成新词时，前面那些词的 K 和 V <strong>不会改变</strong>，' +
        '所以可以存下来不重算，只算新词的 K/V 追加到末尾。' +
        '<b>收益</b>：生成第 n 个词从"重算 n 个位置"变成"只算 1 个"，总计算量从 O(n²) 降到 O(n)。' +
        '<b>代价</b>：显存。上下文越长缓存越大，这是长上下文推理最吃显存的地方。',
    },
    {
      k: 'approx', s: '≈', r: '约等于', g: 'g-prob', t: '约等 近似',
      d: '<b>含义</b>："约等于"，表示取值足够接近、不影响结论。' +
        '<b>例</b>：√2 ≈ 1.414，是无限不循环小数，写不完，所以用约等号。' +
        '<b>注意</b>：和 <code>=</code> 严格区分——教程里凡是标 ≈ 的地方都是"数值近似"，' +
        '凡是标 = 的地方都能精确推导。',
    },

    /* ---------------- 函数与运算 ---------------- */
    {
      k: 'softmax', s: 'softmax', r: 'soft max（软的取最大）', g: 'g-fn', t: '归一化 概率 温度',
      d: '<b>作用</b>：把任意实数分数（logits）变成"<strong>全为正、加起来等于 1</strong>"的分配比例。' +
        '<b>三步</b>：① 每个数取 <a class="sym" href="#sym-exp">eˣ</a>；② 求和；③ 每个除以总和。' +
        '<b>为什么叫 soft</b>：它不是硬邦邦地只留最大的那个（hard max），' +
        '而是"大的多分、小的也留一点"，所以是"软"的。<b>见第 09、10 章</b>。',
    },
    {
      k: 'relu', s: 'ReLU', r: 'rectified linear unit（修正线性单元）', g: 'g-fn', t: '激活函数 非线性',
      d: '<b>规则只有两条</b>：输入是负数 → 输出 0；输入是正数 → 原样输出。即 <code>max(0, z)</code>。' +
        '<b>为什么必须有它</b>：没有非线性的话，多层加权和叠起来仍然等价于<strong>一层</strong>' +
        '（矩阵乘矩阵还是矩阵），堆多深都白堆。' +
        '<b>优点</b>：计算极快，且不像 Sigmoid 那样在两端饱和。',
    },
    {
      k: 'cross-entropy', s: '−ln(p)', r: '负的 ln p', g: 'g-fn', t: '交叉熵 损失 loss',
      d: '<b>含义</b>：交叉熵损失。p 是"模型给<strong>正确答案</strong>的概率"。' +
        '<b>数值感受</b>：p=0.9 → 0.105；p=0.5 → 0.693；p=0.1 → 2.303；p=0.001 → 6.908。' +
        '<b>关键</b>：它前面的负号必不可少——因为 ln(p) 是负的，加负号才让损失变成正数、且"越错越大"。' +
        '<b>见第 04 章</b>。',
    },
    {
      k: 'argmax', s: 'argmax', r: 'arg max', g: 'g-fn', t: '取最大值位置',
      d: '<b>含义</b>：返回"让函数取到最大值的那个<strong>下标</strong>"，而不是最大值本身。' +
        '<b>对比</b>：<code>max([3,7,2]) = 7</code>（值是 7）；<code>argmax([3,7,2]) = 1</code>（最大的是第 1 号）。' +
        '<b>用途</b>：生成文本时用 argmax 就是"永远选概率最高的词"（贪心解码）。',
    },

    /* ---------------- 注意力符号 ---------------- */
    {
      k: 'qkv', s: 'Q / K / V', r: 'Query / Key / Value', g: 'g-attn', t: '查询 键 值 注意力',
      d: '<b>三个角色</b>：<br>' +
        '<strong>Q（Query）</strong>= 我在找什么信息，像你在搜索框输入的关键词；<br>' +
        '<strong>K（Key）</strong>= 我身上带什么标签，像每篇文章的标题索引；<br>' +
        '<strong>V（Value）</strong>= 如果被选中，我实际给出什么内容，像文章正文。<br>' +
        '<b>关键点</b>：三者都来自<strong>同一个输入 X</strong>，只是乘了三个不同的矩阵，' +
        '所以叫"自"注意力。见第 15 章。',
    },
    {
      k: 'wqkv', s: 'W_Q / W_K / W_V', r: 'W sub Q / W sub K / W sub V', g: 'g-attn', t: '权重矩阵 投影',
      d: '<b>含义</b>：三个可学习的权重矩阵，分别把 X 投影成 Q、K、V：' +
        '<code>Q = X·W_Q</code>、<code>K = X·W_K</code>、<code>V = X·W_V</code>。' +
        '<b>下标含义</b>：W<sub>Q</sub> 里的 Q 表示"这个矩阵专门用来生产 Q"。' +
        '<b>谁决定它们的值</b>：训练时由梯度下降学出来，没有人手工设计。',
    },
    {
      k: 'wo', s: 'W_O', r: 'W sub O（输出矩阵）', g: 'g-attn', t: '输出投影 多头',
      d: '<b>含义</b>：多头注意力最后那个"融合矩阵"，O = Output。' +
        '把 h 个头拼接后的结果再过一次线性变换，融成一个统一的表示。' +
        '<b>形状</b>：<code>[d_model, d_model]</code>，所以不改变维度。',
    },
    {
      k: 'qk', s: 'Q·Kᵀ', r: 'Q 乘 K 的转置', g: 'g-attn', t: '注意力分数 scores',
      d: '<b>含义</b>：注意力分数矩阵，形状 <code>[n, n]</code>。' +
        '第 i 行第 j 列 = "第 i 个词的 Q"与"第 j 个词的 K"的<a class="sym" href="#sym-dot-prod">点积</a>，' +
        '也就是"第 i 个词有多该关注第 j 个词"。' +
        '<b>为什么转置</b>：为了满足矩阵乘法的内维相等要求，见 <a class="sym" href="#sym-transpose">ᵀ</a>。',
    },
    {
      k: 'attention-formula', s: 'Attention(Q,K,V)', r: 'attention of Q K V', g: 'g-attn', t: '注意力公式 核心公式',
      d: '<b>完整公式</b>：<code>softmax(QKᵀ/√d)·V</code>，这是 Transformer 的心脏。' +
        '<b>三步读法</b>：① 算匹配度 <a class="sym" href="#sym-qk">Q·Kᵀ</a>；' +
        '② 除以 <a class="sym" href="#sym-sqrt-d">√d</a> 再 <a class="sym" href="#sym-softmax">softmax</a> 归一化成权重；' +
        '③ 用权重把各词的 V 加权混合。' +
        '<b>结果形状</b>：<code>[n, d_v]</code>，和输入同构，与序列长度 n 无关。',
    },
    {
      k: 'w12', s: 'W₁ / W₂', r: 'W 一 / W 二', g: 'g-attn', t: 'FFN 升维 降维',
      d: '<b>含义</b>：FFN 里的两个矩阵。<strong>W₁</strong> 负责把维度升高（通常是 4 倍），' +
        '<strong>W₂</strong> 负责降回原维度。' +
        '<b>为什么先升后降</b>：升维给了更大的"工作台"，能同时考虑更多特征组合，过完激活再压缩回来。' +
        '<b>参数占比</b>：两者合计约占一个 Block 的 2/3。',
    },
    {
      k: 'b12', s: 'b₁ / b₂', r: 'b 一 / b 二', g: 'g-attn', t: '偏置 bias',
      d: '<b>含义</b>：偏置项（bias）。在加权和之外额外加的一个常数，' +
        '让输出不必"必须过原点"。' +
        '<b>直观理解</b>：<code>y = wx</code> 只能过原点的直线，<code>y = wx + b</code> 才能上下平移。',
    },

    /* ---------------- 维度与形状 ---------------- */
    {
      k: 'n', s: 'n', r: '序列长度', g: 'g-dim', t: '序列长度 token 数',
      d: '<b>含义</b>：序列长度，也就是这句话有几个 token。' +
        '<b>它决定什么</b>：注意力矩阵是 <code>n × n</code>，所以 n 翻倍，计算量翻 4 倍——' +
        '这就是长上下文很贵的原因。',
    },
    {
      k: 'd-model', s: 'd_model', r: 'd model（模型维度）', g: 'g-dim', t: '模型维度 特征维度',
      d: '<b>含义</b>：模型的主维度，每个 token 被表示成多少个数字。' +
        '<b>常见值</b>：768（GPT-2 small）、1024、4096。' +
        '<b>贯穿全程</b>：整个 Transformer 内部张量形状始终是 <code>[n, d_model]</code>，不会变。',
    },
    {
      k: 'd-k', s: 'd_k', r: 'd sub k（K 的维度）', g: 'g-dim', t: 'key 维度 缩放',
      d: '<b>含义</b>：单个头的 Q/K 向量维度。多维度里的 <code>d_k</code>，' +
        '通常等于 <code>d_model / h</code>（h 是头数）。' +
        '<b>为什么是它</b>：<a class="sym" href="#sym-sqrt-d">√d</a> 里那个 d 指的就是 d_k，' +
        '因为缩放的是 Q 和 K 点积的尺度。',
    },
    {
      k: 'd-ff', s: 'd_ff', r: 'd F F（FFN 中间维度）', g: 'g-dim', t: 'FFN 中间层 4倍',
      d: '<b>含义</b>：FFN 中间层的维度，通常取 <code>4 × d_model</code>。' +
        '<b>例</b>：d_model=768 时 d_ff=3072。<b>为什么是 4 倍</b>：经验值，' +
        '在容量和算力之间取得平衡，原始论文就用这个比例。',
    },
    {
      k: 'v-vocab', s: 'V（词表）', r: 'V（词表大小）', g: 'g-dim', t: '词表 vocabulary',
      d: '<b>含义</b>：词表大小，也就是模型认识多少个不同的 token。' +
        '<b>常见值</b>：3 万 ~ 15 万。<b>注意别混</b>：这个 V 和 <a class="sym" href="#sym-qkv">Value 的 V</a>' +
        '是两回事，只是字母撞了，看上下文区分。' +
        '<b>它决定最后一步</b>：LM Head 把 <code>[n, d]</code> 映射成 <code>[n, V]</code>。',
    },
    {
      k: 'h-heads', s: 'h（头数）', r: 'h（注意力头数）', g: 'g-dim', t: '多头 头数',
      d: '<b>含义</b>：多头注意力的头数。每个头分到 <code>d_model / h</code> 维，' +
        '独立算一次注意力，最后拼回来。' +
        '<b>常见误解</b>：不是计算量翻 h 倍——因为每个头只处理 1/h 的数据，总运算量基本相当。',
    },
    {
      k: 'shape', s: '[n, d]', r: 'n 行 d 列', g: 'g-dim', t: '形状 shape 张量',
      d: '<b>含义</b>：张量形状，记作 <code>[行数, 列数]</code>。' +
        '<code>[n, d]</code> 表示"n 个 token、每个 d 维"。' +
        '<b>乘法规则</b>：<code>[m,k] × [k,n] → [m,n]</code>——内维必须相等，然后被"消掉"。' +
        '<b>为什么反复强调</b>：Transformer 的所有 bug 里，一半是形状对不上。',
    },
  ];

  TUT.GLOSSARY = { GROUPS, SYMS };

  /* ======================================================================
     二、渲染速查表
     ====================================================================== */
  function renderGlossary() {
    const host = document.getElementById('glossary-body');
    if (!host) return;

    let html = '';
    GROUPS.forEach((g) => {
      const items = SYMS.filter((s) => s.g === g.id);
      if (!items.length) return;
      html += '<div class="gloss-group" data-group="' + g.id + '">' +
        '<h3 class="gloss-group-title">' + g.name +
        '<span class="gloss-group-hint">' + g.hint + '</span></h3>' +
        '<div class="gloss-grid">';
      items.forEach((s) => {
        html += '<div class="gloss-card" id="sym-' + s.k + '" data-search="' +
          (s.s + ' ' + s.r + ' ' + (s.t || '')).toLowerCase().replace(/"/g, '&quot;') + '">' +
          '<div class="gloss-sym">' + s.s + '</div>' +
          '<div class="gloss-read">' + s.r + '</div>' +
          '<div class="gloss-detail">' + s.d + '</div>' +
          '</div>';
      });
      html += '</div></div>';
    });
    host.innerHTML = html;

    // 搜索过滤
    const input = document.getElementById('gloss-search');
    if (input) {
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        document.querySelectorAll('.gloss-card').forEach((card) => {
          const hit = !q || card.dataset.search.indexOf(q) >= 0;
          card.classList.toggle('is-hidden', !hit);
        });
        document.querySelectorAll('.gloss-group').forEach((grp) => {
          const any = grp.querySelectorAll('.gloss-card:not(.is-hidden)').length > 0;
          grp.classList.toggle('is-hidden', !any);
        });
        const empty = document.getElementById('gloss-empty');
        if (empty) {
          const total = document.querySelectorAll('.gloss-card:not(.is-hidden)').length;
          empty.style.display = total ? 'none' : 'block';
        }
      });
    }
  }

  /* ======================================================================
     三、给正文里的符号自动加链接
     只处理散文与公式块；跳过代码、已有链接、动画、自测题、速查表本身
     ====================================================================== */
  // 参与匹配的容器
  const SCAN_SELECTOR = [
    '.chapter p', '.chapter li', '.chapter td', '.chapter th',
    '.math', '.key', '.note', '.warn', '.tip', '.chapter h3', '.chapter h4',
  ].join(',');
  // 出现这些祖先就跳过
  const SKIP_ANCESTOR = ['CODE', 'A', 'BUTTON', 'SCRIPT', 'STYLE', 'SUB', 'SUP'];

  /** 用于匹配的模式 → 词条 key。顺序在运行时按长度倒序 */
  const PATTERNS = [
    ['Attention(Q,K,V)', 'attention-formula'],
    ['Q·Kᵀ', 'qk'],
    ['QKᵀ', 'qk'],
    ['W_Q', 'wqkv'], ['W_K', 'wqkv'], ['W_V', 'wqkv'],
    ['W₁', 'w12'], ['W₂', 'w12'],
    ['b₁', 'b12'], ['b₂', 'b12'],
    ['W_O', 'wo'],
    ['d_model', 'd-model'], ['d_ff', 'd-ff'],
    ['√d', 'sqrt-d'], ['d_k', 'd-k'], ['dk', 'd-k'],
    ['f′(x)', 'f-prime'], ['f′', 'f-prime'],
    ['dy/dx', 'dydx'],
    ['Δx', 'delta-x'], ['Δy', 'delta-y'],
    ['lim', 'lim'],
    ['∇L', 'nabla'], ['∇', 'nabla'],
    ['μ', 'mu'], ['σ²', 'sigma-sq'], ['σ', 'sigma'], ['Σ', 'sum'],
    ['η', 'eta'], ['λ', 'lambda'], ['θ', 'theta'],
    ['γ', 'gamma'], ['β', 'beta'], ['ε', 'epsilon'],
    ['∂', 'partial'],
    ['eˣ', 'exp'], ['ln', 'ln'],
    ['−∞', 'neg-inf'],
    // '√' 单独不加链接：它总是跟着内容出现（√d、√(a²+b²)），
    // 拆出孤零零一个根号做链接没有意义，具体场景由 '√d' 这条覆盖。
    ['ᵀ', 'transpose'],
    ['cos θ', 'cos-theta'], ['cosθ', 'cos-theta'],
    ['a·b', 'dot-prod'], ['|a|', 'vec-len'],
    ['xᵢ', 'subscript-i'],
    ['∝', 'propto'], ['≈', 'approx'], ['←', 'left-arrow'],
    // 注意：'→' 和 '×' 故意不做成链接。
    // 它们属于"看到就懂"的符号（趋近/相乘），正文里出现 170+ 次，
    // 全加链接反而让页面看起来全是虚线，干扰主要符号的识别。
    ['softmax', 'softmax'], ['Softmax', 'softmax'],
    ['ReLU', 'relu'], ['relu', 'relu'],
    ['argmax', 'argmax'],
    ['det(A)', 'determinant'],
    ['[n, d]', 'shape'],
    ['KV Cache', 'kv-cache'],
    // —— 补全：让词典里每个符号在正文中都至少有一个入口 ——
    // 只挑「一词一义」的精准写法，避免把"形状""词表"这类日常词全变成链接
    ['交叉熵', 'cross-entropy'],
    ['多头注意力', 'h-heads'],
    ['词表大小 V', 'v-vocab'],
    ['λmax', 'lambda'], ['λ_max', 'lambda'],
    ['x₁', 'subscript-i'], ['x₂', 'subscript-i'],
    ['a₁', 'subscript-i'], ['a₂', 'subscript-i'],
  ];

  function buildLinkTable() {
    // 过滤掉没有对应词条的模式，并按长度倒序（长的先匹配，避免被短的截断）
    const valid = {};
    SYMS.forEach((s) => { valid[s.k] = true; });
    const list = PATTERNS
      .filter((p) => valid[p[1]])
      .map((p) => ({ pat: p[0], key: p[1] }));
    // 去重（同一 pattern 只保留第一次）
    const seen = new Set();
    const uniq = list.filter((p) => {
      if (seen.has(p.pat)) return false;
      seen.add(p.pat);
      return true;
    });
    uniq.sort((a, b) => b.pat.length - a.pat.length);
    return uniq;
  }

  function shouldSkip(node) {
    let el = node.parentElement;
    while (el) {
      if (SKIP_ANCESTOR.indexOf(el.tagName) >= 0) return true;
      if (el.id === 'glossary') return true;
      if (el.classList && (el.classList.contains('sym') || el.classList.contains('quiz') ||
        el.classList.contains('anim-block'))) return true;
      el = el.parentElement;
    }
    return false;
  }

  /** 把一段文本里的符号替换成 <a class="sym" href="#sym-xxx"> */
  function linkifyText(text, table) {
    let out = '';
    let i = 0;
    while (i < text.length) {
      let hit = null;
      for (let n = 0; n < table.length; n++) {
        const item = table[n];
        if (text.startsWith(item.pat, i)) { hit = item; break; }
      }
      if (hit) {
        out += '<a class="sym" href="#sym-' + hit.key + '" data-sym="' + hit.key + '">' +
          hit.pat + '</a>';
        i += hit.pat.length;
      } else {
        out += text[i];
        i += 1;
      }
    }
    return out;
  }

  function linkifyAll() {
    const table = buildLinkTable();
    const roots = Array.from(document.querySelectorAll(SCAN_SELECTOR));

    roots.forEach((root) => {
      if (root.closest('#glossary')) return;
      // 用 TreeWalker 收集纯文本节点，避免破坏既有标签结构
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const nodes = [];
      let n;
      while ((n = walker.nextNode())) nodes.push(n);

      nodes.forEach((node) => {
        const txt = node.nodeValue;
        if (!table.some((t) => txt.indexOf(t.pat) >= 0)) return;
        const html = linkifyText(txt, table);
        const span = document.createElement('span');
        span.innerHTML = html;
        node.parentNode.replaceChild(span, node);
      });
    });

    // 必须遍历结束后再数：同一段文字可能被多个容器重复扫到，
    // 边插边数会因节点已被替换而漏计
    const total = document.querySelectorAll('.chapter a.sym').length -
      document.querySelectorAll('#glossary a.sym').length;
    TUT.symLinkCount = total;
    return total;
  }

  /* ======================================================================
     四、点击跳转与返回

     踩过的坑（很重要，别改回去）：
     全站 CSS 有 `html { scroll-behavior: smooth }`。它会带来两个连锁问题：
       ① 每次 window.scrollTo 都变成异步动画，连续调用时后一次取消前一次，
          实测表现为"完全没滚动"；
       ② 如果在 rAF 里延迟把 scrollBehavior 恢复成默认值，这个恢复动作
          会打断正在进行的滚动动画，停在半路。
     所以这里【彻底不用平滑滚动、也不碰 CSS 的 scroll-behavior】：
     定位全部用 moment 定位（先临时置 auto → 立刻 scrollTo → 立刻恢复），
     跳转的可感知性由卡片高亮闪烁来承担，比滚屏更直接。
     ====================================================================== */
  /** 瞬时滚动到某个绝对位置，不受 CSS smooth 影响 */
  function scrollToInstant(top) {
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    const max = root.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.max(0, Math.min(top, max)));
    root.style.scrollBehavior = prev;
  }

  function absoluteTop(el) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  /** 让元素居中显示所需的滚动位置 */
  function centerTop(el) {
    return absoluteTop(el) - window.innerHeight / 2 + el.offsetHeight / 2;
  }

  function bindJump() {
    let lastOriginEl = null;
    let lastScroll = 0;

    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a.sym');
      if (!a) return;

      const id = a.getAttribute('href').slice(1);
      const card = document.getElementById(id);
      if (!card) return;

      // 必须在任何滚动操作之前拦下，否则浏览器先做原生 hash 跳转
      e.preventDefault();

      lastOriginEl = a;
      lastScroll = window.scrollY;

      document.querySelectorAll('.gloss-card.is-hit').forEach((c) => c.classList.remove('is-hit'));
      card.classList.add('is-hit');

      // 搜索框若在过滤，目标卡片可能是隐藏的，先清空
      const search = document.getElementById('gloss-search');
      if (search && search.value) {
        search.value = '';
        search.dispatchEvent(new Event('input'));
      }

      if (history.replaceState) history.replaceState(null, '', '#' + id);

      // 布局在这一帧已确定，直接算位置即可
      scrollToInstant(centerTop(card));
    });

    // 「回到正文刚才的位置」
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('[data-act="back-to-text"]');
      if (!b) return;
      e.preventDefault();
      if (lastOriginEl && document.contains(lastOriginEl)) {
        scrollToInstant(centerTop(lastOriginEl));
      } else {
        scrollToInstant(lastScroll);
      }
    });
  }

  /* ======================================================================
     五、入口
     ====================================================================== */
  TUT.buildGlossary = function () {
    renderGlossary();
    const n = linkifyAll();
    bindJump();
    // 给每张卡片补一个"返回正文"，只在有跳转记录时才有意义
    document.querySelectorAll('.gloss-card').forEach((card) => {
      const btn = document.createElement('button');
      btn.className = 'gloss-back';
      btn.type = 'button';
      btn.dataset.act = 'back-to-text';
      btn.textContent = '↑ 回到正文刚才的位置';
      card.appendChild(btn);
    });
    const meta = document.getElementById('gloss-count');
    if (meta) meta.textContent = String(n);
    const total = document.getElementById('gloss-total');
    if (total) total.textContent = String(SYMS.length);
  };
})();
