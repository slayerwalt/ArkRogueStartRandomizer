# 黑流树海开局随机器

明日方舟集成战略「沉沦者的黑流树海」开局随机器：随机开局分队和招募组合，按「希望」约束随机每个券位的具体干员——开局总希望消耗不超过初始希望，并尽量选最高星（含分队招募减免与机械师特殊减免）。

分队、招募组合、单个券位都可以单独重摇；每次开局可通过「就这个了！」/「重roll！」记录接受或放弃，页面底部的开局排行榜按星级（6/5/4）统计最喜欢与最不想要的开局干员，数据仅保存在浏览器本地。

随机设置中可按 6/5/4 星分别选择随机干员范围（全选 / 常见 / 全不选，并可逐个调整），3 星及以下不受限制；任何星级范围为空时无法随机。默认范围为「常见」，名单维护在 `src/lib/common-operators.ts`。

## 使用

```bash
npm install
npm run dev        # 开发预览
npm run build      # 构建静态产物到 dist/
```

## 更新游戏数据

数据已打包在 `src/data/rogue-data.json`。游戏版本更新后重新生成：

```bash
git clone --depth 1 https://github.com/yuanyan3060/ArknightsGameResource.git
npm run extract -- <ArknightsGameResource 仓库路径>
```

## 测试

```bash
npm test
```
