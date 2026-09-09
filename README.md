<div align="center">
  <h1>集成战略随机开局</h1>
  <p>《明日方舟》集成战略开局随机器</p>
  <p>随机分队、初始招募组合与每张招募券的具体干员，在希望预算内尽量给出更高星的可用开局。</p>
  <p>
    <a href="https://ark.slayerwalt.cn/"><strong>在线使用</strong></a>
    ·
    <a href="#功能亮点">功能亮点</a>
    ·
    <a href="#使用说明">使用说明</a>
    ·
    <a href="#本地开发">本地开发</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Vue-3.5-42b883?logo=vuedotjs&amp;logoColor=white" alt="Vue 3.5" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&amp;logoColor=white" alt="TypeScript 5.9" />
    <img src="https://img.shields.io/badge/Vite-8.2-646cff?logo=vite&amp;logoColor=white" alt="Vite 8.2" />
    <img src="https://img.shields.io/badge/部署-GitHub%20Pages-222222?logo=githubpages&amp;logoColor=white" alt="GitHub Pages" />
  </p>
</div>

## 项目简介

这个工具用于快速决定集成战略的开局阵容。它会随机选择一个分队和一组初始招募券，再结合初始希望、分队减免和干员自身减免，为每张券随机一名当前预算能够招募的干员。

项目是纯静态网页，不需要登录，不连接游戏客户端，也没有后端服务。游戏数据和图片资源在构建时打包，浏览器只负责随机计算和保存本地设置。

## 功能亮点

- **完整开局随机**：一次生成分队、招募组合和每张招募券对应的干员。
- **希望硬约束**：所有干员的总消耗不会超过本次开局的初始希望。
- **尽量选择高星**：每个券位优先从当前希望可承担的最高星级中随机，不会固定高星出现在哪个券位。
- **规则适配**：支持后勤分队初始希望、战术分队招募减免、机械师自身减免，以及阿米娅多形态减免判定。
- **局部重摇**：可以单独重摇分队、招募组合或某一张招募券，也可以重新随机整个开局。
- **自定义干员范围**：按 6、5、4 星切换，支持姓名搜索、职业筛选和仅看已选；提供“常见”“全选”“清空”快捷操作，三星固定参与。
- **设置本地保存**：干员池设置保存在浏览器本地，下次访问会自动恢复，并清理数据更新后已经不存在的干员。

## 当前支持

| 集成战略主题 | 状态 |
|---|---|
| 傀影与猩红孤钻 | 主题入口与展示图已提供，随机功能开发中 |
| 水月与深蓝之树 | 主题入口与展示图已提供，随机功能开发中 |
| 探索者的银凇止境 | 主题入口与展示图已提供，随机功能开发中 |
| 萨卡兹的无终奇语 | 主题入口与展示图已提供，随机功能开发中 |
| 岁的界园志异 | 主题入口与展示图已提供，随机功能开发中 |
| **沉沦者的黑流树海** | **已开放** |

## 使用说明

1. 打开[在线页面](https://ark.slayerwalt.cn/)。
2. 点击右上角“切换主题”，通过主题缩略图选择旅程；目前可随机的主题为“沉沦者的黑流树海”。
3. 点击“调整范围”打开设置抽屉，按星级选择干员。搜索和职业筛选只影响显示；快捷操作作用于当前星级的全部干员。
4. 点击“开始随机”生成开局。生成后可以重抽分队、组合或单个券位，也可以点击“重新随机全部”。希望统计展示初始、已用和剩余预算。

如果任一 6、5、4 星干员池为空，所有随机与重抽操作都会暂停，并提示补充范围。设置即时保存，仅影响后续随机，不会自动改掉已有阵容；浏览器存储不可用时仍可在本次会话使用。切换到未开放主题再返回，会恢复之前的开局。

页面采用浅色工作台布局，移动端干员卡片按纵向排列。使用说明可随时打开，面板支持 Escape 关闭和键盘焦点恢复；单券重抽仅更新该券位的动效，并尊重系统的减少动态效果设置。

## 随机规则

- 黑流树海开局基础希望为 6；后勤分队额外提供 2 点初始希望。
- 初始招募中，六星、五星、四星及以下干员的基础消耗分别为 6、2、0。
- 脚本先随机分队和招募组合，再打乱券位处理顺序。
- 每个券位会过滤职业、星级上限、用户干员池和剩余希望，然后从可承担的最高星级中随机一名干员。
- 分队减免与干员自身减免可以叠加，最终希望消耗最低为 0。
- 重摇分队时会按新的希望与减免重新随机全部券位；单独重摇券位时会保留其他券位已经消耗的希望。

## 本地开发

需要 Node.js `^20.19.0` 或 `>=22.12.0`，以及随 Node.js 提供的 npm。

```powershell
git clone https://github.com/slayerwalt/ArkRogueStartRandomizer.git
cd ArkRogueStartRandomizer
npm ci
npm run dev
```

常用命令：

| 命令 | 用途 |
|---|---|
| `npm run dev` | 启动本地开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run typecheck` | 运行 TypeScript 类型检查 |
| `npm test` | 运行 Vitest 测试 |
| `npm run extract -- <资源仓库路径>` | 从游戏资源仓库更新项目数据 |

## 游戏数据更新

结构化游戏数据来自 [yuanyan3060/ArknightsGameResource](https://github.com/yuanyan3060/ArknightsGameResource)。网页不会在运行时请求该仓库；发生干员更新、黑流树海版本更新或相关规则调整后，再由维护者人工运行提取脚本：

```powershell
npm run extract -- <ArknightsGameResource 仓库路径>
```

生成的 `src/data/rogue-data.json` 会记录上游仓库、commit、游戏数据版本及输入文件 SHA-256。提取过程还会：

- 在业务数据没有变化时跳过写入，避免产生日期噪声。
- 输出干员、分队和招募组合的新增、移除及关键字段变化。
- 在数量下降时默认停止写入；确认属于正常版本变化后才能使用 `--allow-removals`。
- 检查干员数据与本地头像是否一一对应，缺图时保留纯文字降级能力。

## 项目结构

```text
src/components/       页面组件
src/composables/      随机会话与设置状态管理
src/lib/              随机规则、设置与数据校验
src/styles/           设计变量与组件样式
src/data/             构建时打包的游戏数据
src/assets/           主题、分队和干员图片
scripts/              游戏数据提取与更新检查
tests/                随机逻辑、会话协调和数据提取测试
```

## 数据与素材来源

- 游戏结构化数据：[ArknightsGameResource](https://github.com/yuanyan3060/ArknightsGameResource)
- 干员头像：[ArknightsAssets2](https://github.com/ArknightsAssets/ArknightsAssets2)，个别缺失素材补充自 [PRTS Wiki](https://prts.wiki/)
- 集成战略主题图与分队图标：[路标档案馆](https://lubiao.wiki/)

感谢上述项目和社区资料站的维护者。为避免上游地址变化影响使用，当前所需图片均已下载并随项目打包，网页不使用运行时热链。

## 反馈与贡献

发现规则错误、数据遗漏或功能问题时，欢迎提交 [Issue](https://github.com/slayerwalt/ArkRogueStartRandomizer/issues)。如果修改了随机规则，请同时补充相应测试；涉及游戏版本变化时，请在提交前检查生成数据的差异摘要。

## 声明

本项目是由玩家制作的非官方工具，与《明日方舟》及其开发、发行方不存在隶属或合作关系。游戏名称、图像及相关素材的权利归其各自权利人所有，本项目仅供学习与交流使用。
