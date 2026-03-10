# Smart English 认知增强改造计划（代码基线版）

更新时间：2026-03-03  
适用范围：`backend/` + `frontend/` + `mobile/`  
执行模式：多角色 Agent Team 并行开发（可同步、可串行、可灰度发布）

---

## 0. 本次更新目的

基于以下三类输入重做计划文档，使计划可直接分派执行：

1. 现有产品/改造文档
   - `PROJECT.md`
   - `PROJECT_OVERVIEW.md`
   - `REDESIGN_PROPOSAL.md`
   - `README.md`
2. 当前代码实现
   - `backend/app/routers/*`、`backend/app/services/*`、`backend/app/models/*`
   - `frontend/src/app/*`、`frontend/src/stores/*`
   - `mobile/app/*`、`mobile/lib/*`
3. 工程现状
   - 测试、迁移、配置、发布方式

---

## 1. 当前代码基线（事实盘点）

## 1.1 功能覆盖现状

| 领域 | 文档目标 | 当前实现状态 | 结论 |
|---|---|---|---|
| Chat/AI 导师 | 苏格拉底引导、认知增强 | 已有 `POST /chat/send` + SSE；4种模式；仍是通用对话模板 | 有基础链路，缺认知增强机制 |
| Exam 全链路 | 诊断/训练/模考/弱项/预测/心流等 | 路由完整（`/exam/*`），服务实现丰富 | 功能多，但“认知过程建模”不足 |
| Error Clinic | 错误聚合+诊疗 | 已有诊断、pattern、treat、exercise | 具备入口，缺 TQI/反思循环 |
| Screenshot/Story/Galaxy/Arena/Quest | 六大颠覆模块 | 均已实现 API 与页面/Store | 已有产品骨架，可增量改造 |
| 学习报告与统计 | 多维指标 | 已有 `/stats/report/*` 与 profile 报告 | 缺“认知增益”指标 |
| 管理后台 | 教学管理 | 现为内容管理后台（教材/语法/阅读录入） | 非教师编排台 |
| Web 端 | 主业务平台 | 页面约 29 个，模块完整 | 可作为主战场 |
| Mobile 端 | 移动端同步能力 | Expo 路由齐全，已接入 API；对话流式用 XHR | 功能跟随 Web，缺认知增强特性对齐 |

## 1.2 关键技术事实

1. 后端为 FastAPI + SQLAlchemy async + SSE；LLM 统一封装在 `backend/app/services/llm.py`。  
2. `adaptive.py` 当前为轻量能力估计（并非真正 ZPD/IRT/BKT）。  
3. 训练/诊断/错因模块已大量使用 LLM，但目标仍偏“判题/给结论”，非“反思驱动”流程。  
4. 测试几乎为空：`backend/tests` 仅 `__init__.py`。  
5. Alembic 迁移仅 1 个 revision，和当前大量模型存在明显治理风险。  
6. 默认 `.env` 使用 SQLite，但 `docker-compose.yml` 提供 Postgres/Redis，存在环境分裂。  
7. Web API 支持 `NEXT_PUBLIC_API_URL`，Mobile `API_BASE` 写死 `http://127.0.0.1:8000`。

## 1.3 与 `PROJECT.md` 的主要差距

| 目标能力（PROJECT.md） | 当前差距 | 优先级 |
|---|---|---|
| 设计摩擦（先思考后提示、对比审计） | 交互尚未强制反思；直接问即直接答 | P0 |
| 苏格拉底+ZPD 调度 | 有简单自适应，缺难度函数与回合策略 | P0 |
| 认知之镜（P→Q→R→R） | 无会话状态机、无镜像层级响应 | P0 |
| TQI 与认知增益测度 | 仅学习时长/正确率，不追踪认知过程 | P0 |
| 多智能体编排 | 目前单模型调用 | P1 |
| 教师认知编排台 | 当前 admin 是内容管理台 | P1 |

---

## 2. 改造原则（本计划执行约束）

1. **增量改造，不推翻现有模块**：在现有 API/页面上逐步增强，保留兼容。  
2. **合约优先**：先冻结 API/事件/埋点字典，再并行开发。  
3. **可灰度可回滚**：每个核心能力有 feature flag。  
4. **避免目录冲突**：按角色独占目录，公共入口由集成角色统一改。  
5. **数据先行**：认知过程数据结构先落库，再接引导算法与 UI。

---

## 3. 多角色并行组织设计（Agent Team）

## 3.1 角色与职责

| 角色 | 代号 | 职责焦点 | 交付物 |
|---|---|---|---|
| 总编排/PMO | R0 | 任务拆分、节奏控制、依赖管理 | 迭代看板、风险清单 |
| 合约设计 | R1 | API/事件/埋点契约 | `docs/contracts/*` |
| 数据与迁移 | R2 | 新表、迁移、索引、回滚脚本 | models + alembic |
| 认知引擎 | R3 | ZPD、Socratic、镜像流程内核 | services/llm + orchestration |
| Exam 集成 | R4 | exam 链路接入认知引擎 | exam routers/services |
| Clinic 集成 | R5 | clinic 链路接入认知镜像 | clinic routers/services |
| Web 交互 | R6 | 设计摩擦 UI + 反思交互 | tutor/exam/clinic 页面组件 |
| Mobile 对齐 | R7 | 移动端协议/交互同步 | mobile screens + lib |
| 指标分析 | R8 | TQI/认知增益计算与看板 | stats/reports/admin |
| QA/实验 | R9 | 测试、A/B、验收与质量门禁 | tests + test report |
| 发布运维 | R10 | feature flag、灰度、回滚 | release playbook |
| 集成收口 | R11 | 公共入口整合、冲突解决 | 可部署主干分支 |

## 3.2 目录所有权（防冲突）

| 目录/文件 | 负责人 | 备注 |
|---|---|---|
| `backend/alembic/versions/*` | R2 独占 | 禁止其他角色修改 |
| `backend/app/services/llm.py` + 新增 orchestration 服务 | R3 主责 | R4/R5 仅调用，不改内核 |
| `backend/app/services/exam_*` + `backend/app/routers/exam.py` | R4 | exam 领域独占 |
| `backend/app/services/clinic.py` + `backend/app/routers/clinic.py` | R5 | clinic 领域独占 |
| `frontend/src/app/tutor/*` + `frontend/src/components/chat/*` | R6 | Web 导师链路 |
| `mobile/app/(tabs)/tutor.tsx` + `mobile/lib/api.ts` | R7 | Mobile 导师链路 |
| `backend/app/services/reports.py` + `backend/app/routers/stats.py` | R8 | 指标独占 |
| `backend/tests/*` + 前端/移动端测试目录 | R9 | 测试独占 |
| `backend/app/main.py` | R11 独占 | 统一收口 |
| `frontend/src/lib/api.ts`、`frontend/src/app/layout.tsx` | R11 独占 | 公共入口 |

## 3.3 并行协作协议

1. 每个角色只改自己所有权目录。  
2. 跨角色需求通过契约文档和接口 Mock 完成。  
3. 每日一次合并窗口（建议 17:00），窗口外不合主干。  
4. 每个角色提交必须附带：变更清单、影响接口、回滚点、测试结果。  
5. 公共文件冲突统一交由 R11 处理。

---

## 4. 目标架构增量设计（基于现有代码）

## 4.1 后端新增能力

1. 认知会话与回合状态机（chat/exam/clinic 共享）。  
2. ZPD 难度估计器（从现有 `adaptive.py` 升级）。  
3. 苏格拉底引导策略层（提示预算、泄露防护、追问策略）。  
4. 认知之镜四段循环：
   - Present：学生先表达
   - Query：AI 澄清追问
   - Reflect：学生反思修正
   - Refine：AI 给结构化反馈
5. TQI 计算与 M0-M3 指导级别。  
6. 认知增益指标 API。

## 4.2 前端新增能力（Web + Mobile）

1. 强制先思考后提示（Reflective Pause）。  
2. 双栏对比审计（我的草稿 vs AI建议）。  
3. 反思报告输入与提交。  
4. 导师、exam、clinic 三条链路统一交互规范。  
5. SSE 事件升级为结构化事件，前端兼容旧文本流。

## 4.3 数据新增能力

建议新增表（命名可按项目规范调整）：

1. `cognitive_sessions`
2. `cognitive_turns`
3. `reflection_entries`
4. `teaching_quality_metrics`
5. `cognitive_gain_snapshots`

关键索引建议：

1. `user_id + created_at`
2. `session_id + turn_index`
3. `module + created_at`

---

## 5. 分阶段详细执行计划（支持同步执行）

## 5.1 Phase S0（2天）：基线冻结与契约冻结

| 任务 ID | 角色 | 任务 | 依赖 | 验收 |
|---|---|---|---|---|
| S0-R1-01 | R1 | 输出 API 契约 v1（chat/exam/clinic/stats） | 无 | 契约文档评审通过 |
| S0-R1-02 | R1 | 输出 SSE 事件字段规范 | 无 | 前后端确认字段 |
| S0-R0-01 | R0 | 输出 ownership matrix + 集成节奏 | 无 | 全员确认 |
| S0-R2-01 | R2 | 输出 DB 现状审计与迁移策略 | 无 | 给出 migration 路线 |

## 5.2 Phase S1（4天）：数据层 + 认知内核

| 任务 ID | 角色 | 任务 | 依赖 | 验收 |
|---|---|---|---|---|
| S1-R2-01 | R2 | 新增认知过程数据表与索引 | S0 | 本地迁移可 upgrade/downgrade |
| S1-R3-01 | R3 | 实现 `GuidanceOrchestrator`（ZPD + Socratic） | S0 | 单测通过 |
| S1-R3-02 | R3 | 实现 `MirrorEngine`（P-Q-R-R + M0-M3） | S1-R2-01 | 回合状态可回放 |
| S1-R3-03 | R3 | `/chat/send` 增强入参处理（兼容旧版） | S0 | 旧前端不崩溃，新字段生效 |

## 5.3 Phase S2（5天）：业务模块接入（Exam + Clinic）

| 任务 ID | 角色 | 任务 | 依赖 | 验收 |
|---|---|---|---|---|
| S2-R4-01 | R4 | exam 训练链路接入引导策略 | S1-R3-* | 提交答案前可触发反思 |
| S2-R4-02 | R4 | exam 反馈输出加入 `guidance_meta` | S2-R4-01 | 前端可读取 |
| S2-R5-01 | R5 | clinic 诊疗链路接入 MirrorEngine | S1-R3-* | 诊疗回合可追踪 |
| S2-R5-02 | R5 | 直接索要答案触发偏离重构 | S1-R3-* | 规则命中率达标 |

## 5.4 Phase S3（5天）：Web/Mobile 交互改造

| 任务 ID | 角色 | 任务 | 依赖 | 验收 |
|---|---|---|---|---|
| S3-R6-01 | R6 | Tutor 页加入“先思考后提示” | S1-R3-03 | 无草稿不可看提示 |
| S3-R6-02 | R6 | 新增双栏对比审计组件 | S3-R6-01 | 可高亮差异并提交反思 |
| S3-R6-03 | R6 | exam/clinic 页面复用交互框架 | S2-R4/S2-R5 | 三链路体验一致 |
| S3-R7-01 | R7 | Mobile Tutor 对齐新入参/新事件 | S1-R3-03 | 移动端可完整走新流程 |
| S3-R7-02 | R7 | Mobile API_BASE 配置化 | 无 | 支持 env 切换 |

## 5.5 Phase S4（4天）：指标、编排台、实验

| 任务 ID | 角色 | 任务 | 依赖 | 验收 |
|---|---|---|---|---|
| S4-R8-01 | R8 | TQI 计算服务 + 聚合任务 | S1-R2 | 指标可按日/周查询 |
| S4-R8-02 | R8 | 新增 `/stats/cognitive-gain` | S4-R8-01 | 接口稳定 |
| S4-R8-03 | R8 | Admin 页面新增“认知编排”tab | S4-R8-02 | 可查看分层与干预建议 |
| S4-R9-01 | R9 | A/B 实验方案与埋点校验 | S4-R8-* | 产出实验方案文档 |

## 5.6 Phase S5（3天）：硬化、发布、回滚演练

| 任务 ID | 角色 | 任务 | 依赖 | 验收 |
|---|---|---|---|---|
| S5-R9-01 | R9 | 后端/前端/移动端回归测试 | S2-S4 | 回归通过率达标 |
| S5-R10-01 | R10 | 加 feature flag + 灰度策略 | S3-S4 | 可按比例放量 |
| S5-R10-02 | R10 | 回滚预案与演练 | S5-R10-01 | 演练记录通过 |
| S5-R11-01 | R11 | 主干集成与发布收口 | 全部 | 发布版本可运行 |

---

## 6. API 改造清单（兼容优先）

## 6.1 `POST /chat/send`（扩展）

新增入参（建议）：

1. `session_id`：认知会话 ID（可空，后端自动创建）  
2. `guidance_level`：`socratic|mirror|hybrid`  
3. `reflection_text`：学生先行思考文本  
4. `hint_budget`：提示预算  
5. `allow_direct_answer`：默认 `false`

SSE 返回从“纯文本 chunk”升级为“结构化事件”：

1. `event=token`：增量文本  
2. `event=turn_meta`：`turn_type`, `mirror_level`, `zpd_band`  
3. `event=hint_gate`：是否允许查看提示  
4. `event=done`：回合结束

兼容策略：

1. 后端保留旧文本流输出 1 个迭代周期。  
2. Web/Mobile 可按能力探测切换解析逻辑。

## 6.2 新增指标接口（建议）

1. `GET /stats/cognitive-gain`
2. `GET /stats/tqi-trend`
3. `GET /stats/orchestration`（教师编排）

---

## 7. 数据迁移与治理策略（重点）

当前存在“`create_all_tables.py` + Alembic revision 数量不足”风险，执行策略如下：

1. R2 先做 schema snapshot（线上/本地）。  
2. 统一迁移入口为 Alembic。  
3. 认知增强表作为独立 revision 引入。  
4. 迁移脚本必须支持 downgrade。  
5. 迁移前后执行数据一致性检查脚本。

---

## 8. 质量门禁（DoD）

## 8.1 开发完成定义

1. 功能代码 + 类型定义 + 错误处理完整。  
2. 契约文档同步更新。  
3. 提交信息包含影响面和回滚点。

## 8.2 测试门禁

1. 后端：新增核心单测（ZPD、M0-M3、偏离重构、会话写入）。  
2. 前端：Tutor/Exam/Clinic 至少 3 条 E2E 主流程。  
3. 移动端：对话流式与反思提交流程通过。  
4. 性能：SSE 首 token 和 P95 响应保持在阈值内。

## 8.3 业务门禁（灰度期）

1. 直接索要答案被引导重构命中率 >= 95%。  
2. 反思完成率相比基线提升 >= 20%。  
3. 提示依赖率下降，正确率不出现不可接受下滑。  
4. 错误率、崩溃率、超时率在可控区间。

---

## 9. 发布与回滚

## 9.1 灰度节奏（建议）

1. Day 1：5%  
2. Day 2：25%  
3. Day 3：50%  
4. Day 4：100%（满足门禁再放量）

## 9.2 回滚触发条件

1. Chat/Exam/Clinic 主链路错误率异常升高。  
2. 会话数据写入失败导致无法回放。  
3. 认知增强特性对核心留存造成显著负面影响。

## 9.3 回滚动作

1. 关闭 `COGNITIVE_ENHANCEMENT_ENABLED`。  
2. 路由回退到旧逻辑（保留旧解析能力）。  
3. 暂停新指标写入，仅保留读取。  
4. 记录事件并进入故障复盘。

---

## 10. 风险清单

| 风险 | 影响 | 预防 | 兜底 |
|---|---|---|---|
| LLM 仍输出直接答案 | 偏离认知增强目标 | 服务端规则拦截 + 提示模板分层 | 二次改写响应 |
| 迁移冲突 | 阻塞迭代 | R2 独占迁移目录 | 回退 revision + 热修复 |
| Web/Mobile 协议不一致 | 多端体验断裂 | 契约测试 + 兼容字段 | 服务端兼容旧协议 |
| 摩擦过强影响留存 | 业务下滑 | 分层灰度 + 参数化摩擦强度 | 降级 guidance level |
| 指标口径不一致 | 决策偏差 | 事件字典统一 + 对账脚本 | 指标冻结后再发布 |
| 环境分裂（SQLite/Postgres） | 行为不一致 | 明确环境矩阵与 CI 基准 | 发布前全量冒烟 |

---

## 11. 两周落地排期（可直接分派）

## Week 1

1. R1：契约冻结（API + SSE + 指标字典）  
2. R2：认知表迁移 + 索引 + 回滚  
3. R3：Orchestrator/MirrorEngine MVP  
4. R4：exam 训练链路接入 MVP  
5. R6：Tutor 先思考后提示 MVP

## Week 2

1. R5：clinic 镜像流程接入  
2. R6：双栏审计 + exam/clinic 复用  
3. R7：mobile 协议对齐与配置化  
4. R8：TQI 与认知增益 API + Admin 编排 tab  
5. R9/R10/R11：回归、灰度、收口发布

---

## 12. 立即执行清单（今天可以启动）

1. 创建 `docs/contracts/` 目录并提交契约草案。  
2. 确认角色目录所有权并冻结公共文件改动权限。  
3. 由 R2 输出“当前 DB 真实结构 vs Alembic revision 差异报告”。  
4. 由 R3 在 `backend/app/services/` 增加独立 orchestration 模块骨架。  
5. 由 R6 在 `frontend/src/app/tutor/page.tsx` 挂载“反思输入框”占位版（先走假数据）。

以上五项完成后即可进入全并行开发窗口。

---

## 13. 按当前功能逐项改造方案（对齐 `PROJECT.md`）

本章聚焦“当前已有功能如何改造”，不是新做一套产品。  
改造目标统一对齐 `PROJECT.md` 的四个核心要求：

1. 从“认知卸载”改为“认知增强”。  
2. 引入“设计摩擦”（先思考再提示、对比审计、反思修正）。  
3. 落地“苏格拉底 + ZPD + 认知之镜”交互内核。  
4. 用“认知增益”替代单一正确率作为评价核心。

## 13.1 功能改造总映射

| 功能模块 | 当前入口 | 当前主要问题 | 改造目标（对齐 PROJECT.md） | 角色 |
|---|---|---|---|---|
| AI 导师 Chat | `/chat/send` + tutor 页面 | 仍可直接给答案，反思约束弱 | 强制 P-Q-R-R 循环 + 直接答案偏离重构 | R3/R6/R7 |
| Exam 诊断 | `/exam/diagnostic/*` | 重结果轻推理过程 | 增加“解题思路采样 + ZPD画像” | R4/R8 |
| Exam 专项训练 | `/exam/training/*` | 提交即判题，缺反思步骤 | 加入“先策略后作答 + 错因自解释” | R4/R6 |
| Exam 模考 | `/exam/mock/*` | 一次性结果导向 | 双阶段：独立作答 → 复盘辩证 | R4/R6 |
| 心流刷题 | `/exam/flow/*` | 连击驱动，认知维度弱 | 难度控制改为 ZPD sweet spot | R4/R3 |
| 薄弱突破/错题基因 | `/exam/weakness/*` `/exam/error-genes/*` | 治疗任务偏“做题” | 增加“教回去（protégé）”关卡 | R4/R3 |
| AI 错题诊所 | `/clinic/*` | 有诊断无镜像分级 | TQI + M0-M3 指导层级 | R5/R8 |
| 写作 | `/writing/*` | 可被 AI 代写风险 | 改为“提问式引导+对比审计” | R6/R3 |
| 阅读/题库 | `/reading` `/practice` | 关注答案，不关注证据链 | 强制“证据定位+反证” | R6/R3 |
| 词汇/知识星系 | `/vocabulary` `/galaxy` | 学习状态偏记忆统计 | 引入“关系解释与迁移任务” | R6/R8 |
| 截图学英语 | `/screenshot/*` | AI 自动提取为主 | 先让学生提取再对照 AI | R6/R3 |
| 互动故事 | `/story/*` | 冒险驱动强，认知驱动弱 | 选择前后加入推理解释与反思 | R6/R3 |
| 英语对战/任务 | `/arena/*` `/quest/*` | 竞技和完成导向 | 增加逻辑审计与元认知评分 | R6/R8 |
| 统计/后台 | `/stats/*` `/admin` | 缺认知指标和教学编排 | 增加认知增益和教师编排台 | R8 |
| 通知与激励 | missions/notifications | 主要提醒打卡 | 增加“反思完成”和“复盘提醒” | R8/R10 |

## 13.2 逐模块详细改造包（可直接拆票）

### 13.2.1 AI 导师 Chat（P0）

当前代码入口：

1. `backend/app/routers/chat.py`
2. `backend/app/services/llm.py`
3. `frontend/src/app/tutor/page.tsx`
4. `frontend/src/components/chat/*`
5. `mobile/app/(tabs)/tutor.tsx`
6. `mobile/lib/api.ts`

改造动作：

1. 请求层新增 `reflection_text`, `guidance_level`, `hint_budget`。  
2. 服务层增加“直接答案拦截器”，命中后返回偏离重构提问。  
3. 引入四步循环状态：`present/query/reflect/refine`。  
4. Web 与 Mobile 聊天框增加“我的思路”输入区，未填写不可触发提示。  
5. 消息区增加“对比审计卡片”（我的答案 vs AI建议 vs 差异说明）。

验收标准：

1. 当用户直接索要答案时，系统不直接给最终答案。  
2. 每个会话至少记录一次学生反思文本。  
3. Web 与 Mobile 流程一致，协议兼容旧版本。

### 13.2.2 Exam 诊断（P0）

当前代码入口：

1. `backend/app/services/exam_diagnostic.py`
2. `backend/app/routers/exam.py`（`/diagnostic/*`）
3. `frontend/src/app/exam/diagnostic/page.tsx`

改造动作：

1. 诊断提交增加“思路描述字段”（每题可选）。  
2. AI 分析从“只看对错”扩展为“错因 + 思维路径质量 + TQI 子分”。  
3. 输出“ZPD 区间画像”：太易、适配、过难题比例。  
4. 生成计划时附带“认知任务”（解释、举例、反证）而不仅是刷题任务。

验收标准：

1. 诊断结果包含 `zpd_profile` 与 `thinking_gaps` 字段。  
2. 冲刺计划中至少 30% 任务为“解释/反思类任务”。

### 13.2.3 Exam 专项训练（P0）

当前代码入口：

1. `backend/app/services/exam_training.py`
2. `frontend/src/app/exam/training/[section]/page.tsx`
3. `frontend/src/components/exam/answer-feedback.tsx`

改造动作：

1. 每题新增“先选策略”步骤（如定位、排除、语法判定）。  
2. 答题后新增“错因自解释”输入框，提交后才显示完整解析。  
3. `answer-feedback` 新增“反证问题”：要求学生写为什么另一个选项错。  
4. 掌握度更新引入“反思质量权重”（不是只看 `is_correct`）。

验收标准：

1. 至少 80% 训练提交记录包含策略或错因描述。  
2. 反馈卡片可展示 `reasoning_quality_delta`。

### 13.2.4 Exam 模考（P1）

当前代码入口：

1. `backend/app/services/exam_mock.py`
2. `frontend/src/app/exam/mock/page.tsx`

改造动作：

1. 模考后拆两阶段：
   - 阶段A：原始分数报告
   - 阶段B：关键错题复盘（学生先解释，AI再追问）
2. 报告新增“认知卸载风险评分”（提示依赖、空思考提交比例）。  
3. 错题自动进入“认知修复队列”而不是只进错题本。

验收标准：

1. 模考详情可查看每道错题的复盘记录。  
2. 周报可读取模考后的认知指标变化。

### 13.2.5 心流刷题（P1）

当前代码入口：

1. `backend/app/services/exam_flow.py`
2. `frontend/src/app/exam/flow/page.tsx`

改造动作：

1. 难度调整从 streak 规则升级为“成功率窗口 + ZPD”。  
2. 在连错时不直接降难度到底，先触发引导问题（支架降级）。  
3. 战报新增“稳定思维时长”“独立解决率”。

验收标准：

1. `difficulty_curve` 新增 `zpd_state`。  
2. 连错用户可看到分层支架而非仅提示答案。

### 13.2.6 薄弱突破 + 错题基因（P1）

当前代码入口：

1. `backend/app/services/exam_weakness.py`
2. `backend/app/services/exam_error_gene.py`
3. `frontend/src/app/exam/weakness/page.tsx`
4. `frontend/src/app/exam/error-genes/page.tsx`

改造动作：

1. 每个突破计划加入“Teach-back 任务”：学生向 AI 讲解知识点。  
2. 错题基因修复从“题海”改为“解释-反驳-迁移”三步。  
3. 基因状态判定引入 TQI，不仅看练习正确数。

验收标准：

1. 每个已修复基因至少有 1 条 teach-back 记录。  
2. `gene_status=fixed` 时必须满足正确率和解释质量双门槛。

### 13.2.7 AI 错题诊所（P0）

当前代码入口：

1. `backend/app/services/clinic.py`
2. `backend/app/routers/clinic.py`
3. `frontend/src/components/clinic/*`

改造动作：

1. 诊断结果新增 `mirror_level` 建议（M0-M3）。  
2. 治疗练习加入“为什么你会这样想”的追问字段。  
3. `TreatmentSession` 页面加入反思回写，不再只做题对错。  
4. 治疗完成条件增加“反思质量阈值”。

验收标准：

1. clinic 返回包含 TQI/镜像层级字段。  
2. 治疗完成后可查看“思维变化轨迹”。

### 13.2.8 写作（P1）

当前代码入口：

1. `backend/app/routers/writing.py`
2. `frontend/src/app/writing/page.tsx`

改造动作：

1. 生成提纲改为“先问后给”：先收集学生3个观点再生成提纲。  
2. 批改结果增加“逻辑薄弱点提问”，要求学生二次改写。  
3. 新增“原稿 vs 修改稿 vs AI建议”三栏对比审计。  
4. 高风险代写模式触发“缩写提示”（只给框架不给全文）。

验收标准：

1. 写作提交链路可追踪至少一次学生自改。  
2. 历史页可查看“认知增益版本差异”。

### 13.2.9 阅读与题库（P1）

当前代码入口：

1. `backend/app/routers/reading.py`
2. `backend/app/routers/practice.py`
3. `frontend/src/app/reading/page.tsx`
4. `frontend/src/app/practice/page.tsx`

改造动作：

1. 阅读题新增“证据句定位”必填。  
2. 题库增加“反证选择”：解释一个错误选项为什么错。  
3. 提示改为阶梯式（hint1→hint2→hint3），并记录依赖度。

验收标准：

1. 阅读作答记录包含证据位置。  
2. 练习日志可统计提示阶梯使用分布。

### 13.2.10 词汇与知识星系（P1）

当前代码入口：

1. `backend/app/services/knowledge.py`
2. `frontend/src/app/galaxy/page.tsx`
3. `frontend/src/app/vocabulary/page.tsx`

改造动作：

1. 节点状态升级条件加入“关系解释任务”（同义/反义/搭配理由）。  
2. 星系探索新增“迁移挑战”：用新词解释旧词差异。  
3. 词汇复习卡加入“先生成句子后看答案”。

验收标准：

1. `mastered` 节点需有生成性证据。  
2. 星系页面可显示“关系理解度”。

### 13.2.11 截图学英语（P1）

当前代码入口：

1. `backend/app/services/screenshot.py`
2. `frontend/src/app/screenshot/page.tsx`

改造动作：

1. 上传后先让学生手动提取关键词，再展示 AI 提取结果。  
2. 增加“差异反思”输入（我漏掉了什么，为什么漏）。  
3. 练习题答后必须完成一条迁移句子（把词用到自己场景）。

验收标准：

1. 每条截图学习记录包含 `self_extract` 与 `delta_reflection`。  
2. 历史记录可回看认知修正过程。

### 13.2.12 互动故事（P2）

当前代码入口：

1. `backend/app/services/story.py`
2. `frontend/src/app/story/page.tsx`
3. `frontend/src/components/story/*`

改造动作：

1. 每个剧情选择前加入“选择理由”。  
2. 章节挑战后加入“把本章知识讲给 NPC”任务（认知之镜）。  
3. 故事结算新增“语言能力与推理能力双报告”。

验收标准：

1. `story_chapters` 可回放用户理由文本。  
2. 至少 1 个章节包含 teach-back 环节。

### 13.2.13 英语对战 + 现实任务（P2）

当前代码入口：

1. `backend/app/services/arena.py`
2. `backend/app/services/quest.py`
3. `frontend/src/app/arena/page.tsx`
4. `frontend/src/app/quests/page.tsx`

改造动作：

1. 对战评分增加“论证质量/反驳质量”，降低纯速度权重。  
2. Quest 提交增加“反思摘要”（做了什么、学到什么、下次改进）。  
3. 社区展示优先显示“高认知增益案例”。

验收标准：

1. 竞技战报可显示 reasoning 分。  
2. Quest 完成率与反思完成率可独立统计。

### 13.2.14 统计、后台、通知（P0）

当前代码入口：

1. `backend/app/services/reports.py`
2. `backend/app/routers/stats.py`
3. `frontend/src/app/admin/page.tsx`
4. `backend/app/services/notifications.py`

改造动作：

1. 新增认知指标：TQI、独立解题率、提示依赖率、反思完成率。  
2. Admin 从“内容管理”扩展“认知编排”tab：按学生分层推荐干预策略。  
3. 通知新增“反思未完成提醒”“复盘窗口提醒”。

验收标准：

1. `/stats/*` 可返回认知增益趋势。  
2. Admin 可按班级查看 `M0-M3` 分布。  
3. 通知触发逻辑支持认知事件。

## 13.3 并行实施批次（避免互相影响）

### 批次 A（可并行，P0）

1. R2：数据表与迁移。  
2. R3：Chat 内核策略。  
3. R4：Exam 训练/诊断接入。  
4. R5：Clinic 接入。  
5. R8：指标 API 基础版。

### 批次 B（可并行，依赖 A）

1. R6：Web Tutor + Exam + Clinic 交互改造。  
2. R7：Mobile Tutor 对齐。  
3. R8：Admin 认知编排视图。  
4. R9：联调测试与契约测试。

### 批次 C（串行收口）

1. R10：灰度开关、发布策略。  
2. R11：公共文件整合、冲突解决、最终发布。

## 13.4 业务验收清单（按功能）

1. Chat：直接答案请求不再直出答案。  
2. Exam：训练页面具备“策略+反思”双输入。  
3. Clinic：完成治疗必须通过正确率+反思质量双门槛。  
4. Writing：至少一次自改后再终稿提交。  
5. Screenshot：存在“用户提取 vs AI提取”的差异记录。  
6. Story：章节选择有理由，至少一次 teach-back。  
7. Stats/Admin：可查看 TQI 与认知增益趋势。

---

## 14. 数据收集与指标工程实施方案（新增）

本章是对前文“数据先行”的落地补充，目标是把“认知增强”从功能改造升级为可度量、可追踪、可复盘的数据闭环。

## 14.1 目标与原则

1. **过程优先**：优先采集“思考过程”而非仅“最终对错”。  
2. **契约先行**：事件字典版本化，先冻结再开发。  
3. **端到端可追踪**：每次学习交互必须可回放（trace 级别）。  
4. **最小必要采集**：不收集与教学目标无关的敏感信息。  
5. **隐私内建**：采集、存储、分析、导出全链路有访问控制与脱敏策略。

## 14.2 数据采集总体架构

### 14.2.1 链路分层

1. Client 埋点层（Web/Mobile）：交互事件、UI 摩擦事件、耗时事件。  
2. API 业务层（FastAPI）：业务结果、评分结果、引导策略结果。  
3. 事件入湖层（Raw Event）：统一事件信封写入 `learning_events_raw`（建议新增）。  
4. 主题明细层（DWD）：按模块拆分明细表（chat/exam/clinic/writing/screenshot）。  
5. 指标聚合层（DWS）：按日/周汇总 TQI、提示依赖率、反思完成率、认知增益。  
6. 应用层（ADS）：`/stats/*`、Admin 编排页、实验看板。

### 14.2.2 当前代码与增量策略

1. 当前已有：`cognitive_sessions/cognitive_turns/reflection_entries/teaching_quality_metrics/cognitive_gain_snapshots`。  
2. 本次补齐：统一事件总线表 + 指标快照任务 + 口径字典 + 对账脚本。  
3. 迁移策略：先增表，不改主流程；灰度写入；稳定后切换指标读取到新聚合。

## 14.3 统一事件契约（Event Contract v1）

### 14.3.1 事件信封（所有事件必填）

| 字段 | 类型 | 说明 |
|---|---|---|
| `event_id` | string(uuid) | 幂等去重键 |
| `event_name` | string | 事件名（见 14.4） |
| `event_version` | string | 版本号（如 `v1`） |
| `occurred_at` | datetime(utc) | 事件发生时间 |
| `user_id` | int | 用户 ID（内部） |
| `module` | string | chat/exam/clinic/writing/screenshot/... |
| `session_id` | string/int | 业务会话 ID |
| `trace_id` | string | 一次链路追踪 ID |
| `platform` | string | web/mobile/backend |
| `client_version` | string | 前端版本 |
| `payload` | json | 事件业务体 |

### 14.3.2 统一业务字段（payload 建议保留）

1. `zpd_band`: `easy|sweet|hard`  
2. `mirror_level`: `M0|M1|M2|M3`  
3. `tqi_score`: `0-1`  
4. `reflection_quality`: `0-1`  
5. `hint_budget` / `hint_used`  
6. `attempt_index` / `latency_ms` / `time_spent_seconds`  
7. `is_correct` / `score_delta` / `mastery_delta`

## 14.4 分模块事件字典（首批）

### 14.4.1 Chat/Tutor

1. `chat.session_started`  
2. `chat.user_turn_submitted`  
3. `chat.direct_answer_diverted`  
4. `chat.reflection_submitted`  
5. `chat.assistant_turn_completed`  
6. `chat.hint_requested`

### 14.4.2 Exam

1. `exam.training.question_presented`  
2. `exam.training.strategy_selected`  
3. `exam.training.answer_submitted`  
4. `exam.training.reflection_submitted`  
5. `exam.mock.started`  
6. `exam.mock.submitted`  
7. `exam.mock.review_submitted`  
8. `exam.flow.answer_submitted`

### 14.4.3 Clinic/Writing/Screenshot

1. `clinic.diagnosis_generated`  
2. `clinic.exercise_submitted`  
3. `clinic.reflection_submitted`  
4. `writing.points_submitted`  
5. `writing.outline_generated`  
6. `writing.revision_submitted`  
7. `writing.audit_saved`  
8. `screenshot.self_extract_submitted`  
9. `screenshot.analysis_generated`  
10. `screenshot.delta_reflection_submitted`  
11. `screenshot.transfer_sentence_submitted`  
12. `screenshot.exercise_submitted`

## 14.5 核心指标口径（冻结版）

### 14.5.1 认知增强核心 KPI

| 指标 | 定义 | 计算口径 | 更新频率 |
|---|---|---|---|
| `tqi_avg` | 教学质量均值 | `avg(tqi_score)` | 日/周 |
| `reflection_completion_rate` | 反思完成率 | 反思提交会话 / 有引导会话 | 日 |
| `hint_dependency_rate` | 提示依赖率 | 使用提示回合 / 总回合 | 日 |
| `independent_solve_rate` | 独立解题率 | 无提示正确题 / 正确题 | 日 |
| `cognitive_gain_index` | 认知增益指数 | `w1*TQI + w2*反思质量 + w3*独立解题率 - w4*提示依赖` | 周 |
| `direct_answer_divert_hit_rate` | 偏离重构命中率 | 被拦截直答请求 / 直答请求总数 | 日 |

### 14.5.2 业务保护指标（Guardrail）

1. `task_success_rate`：任务完成率。  
2. `error_rate`：接口错误率。  
3. `timeout_rate`：超时率。  
4. `retention_d1/d7`：灰度期留存。  
5. `avg_session_duration`：会话时长变化。

## 14.6 数据表与任务补充（建议）

### 14.6.1 新增表（R2）

1. `learning_events_raw`：统一事件原始表（JSONB payload + 幂等键）。  
2. `metric_daily_user_cognitive`：用户日级认知指标快照。  
3. `metric_daily_cohort_cognitive`：分群/班级日级聚合。  
4. `experiment_assignment_logs`：A/B 分桶日志。  
5. `metric_data_quality_daily`：数据质量巡检结果。

### 14.6.2 周期任务（R8）

1. `job_build_daily_cognitive_metrics`：每日汇总。  
2. `job_backfill_cognitive_metrics`：历史回填。  
3. `job_data_reconciliation`：事件与业务表对账。  
4. `job_quality_alert`：空值率/延迟/重复率告警。

## 14.7 数据质量门禁（Data DoD）

1. 事件接入成功率 >= 99.5%。  
2. `event_id` 去重后重复率 <= 0.2%。  
3. 必填字段缺失率 <= 0.5%。  
4. 事件延迟（P95）<= 5 分钟。  
5. 指标对账误差 <= 1%。  
6. 新增事件必须有 schema 校验与示例 payload。

## 14.8 隐私、合规与权限

1. 数据分级：
   - L1：一般学习行为（可用于看板）
   - L2：文本反思内容（受限访问）
   - L3：潜在敏感文本（默认不外发）
2. 默认策略：
   - 原始文本仅内部可读，不进入公开报表。
   - 导出与对外分享数据使用脱敏视图。
3. 保留周期（建议）：
   - `learning_events_raw`：180 天
   - 聚合指标表：24 个月
4. 删除权支持：
   - 用户注销触发按 `user_id` 级联删除或匿名化任务。

## 14.9 多角色并行拆票（数据专项）

| 任务 ID | 角色 | 任务 | 依赖 | 验收 |
|---|---|---|---|---|
| D0-R1-01 | R1 | 冻结事件字典 v1（14.4） | 无 | `docs/contracts/events_v1.md` |
| D1-R2-01 | R2 | 新增 `learning_events_raw` 与指标快照表迁移 | D0 | upgrade/downgrade 通过 |
| D1-R3-01 | R3 | Chat/Orchestrator 关键事件落库 | D0 | 样例链路可回放 |
| D2-R4-01 | R4 | Exam 训练/模考/复盘事件落库 | D1 | 覆盖率 >= 90% |
| D2-R5-01 | R5 | Clinic 事件落库 | D1 | 覆盖率 >= 90% |
| D2-R6-01 | R6 | Writing/Screenshot 前端埋点接入 | D0 | 前后端字段一致 |
| D3-R8-01 | R8 | 日级指标任务与 `/stats/*` 对接 | D1-D2 | 指标可查可对账 |
| D3-R9-01 | R9 | 数据质量巡检 + A/B 埋点校验 | D3-R8-01 | 质检报告通过 |
| D4-R10-01 | R10 | 采集灰度与回滚开关 | D3 | 可一键停写入 |

## 14.10 验收产物清单（数据专项）

1. `docs/contracts/events_v1.md`（事件字典与示例）。  
2. `docs/metrics/cognitive_metrics_v1.md`（指标口径）。  
3. `docs/runbook/data_collection_runbook.md`（采集故障处置）。  
4. `backend/scripts/reconcile_cognitive_metrics.py`（对账脚本）。  
5. Admin 新增“数据质量卡片”（延迟、缺失、重复）。

---

## 15. 各改造功能点详细产品改造说明（新增）

本章在 13.2 的任务级改造基础上，补充“产品级可执行描述”，确保产品、设计、前后端、数据与测试对齐。

### 15.1 AI 导师 Chat（13.2.1）详细改造

**产品目标**
1. 把“直接问答案”改成“先表达思路，再拿到分层引导”。  
2. 统一 P-Q-R-R（呈现-追问-反思-修正）对话节奏。  

**用户可见改造**
1. 输入区增加“我的思路/反思”字段，默认要求填写。  
2. 当用户请求“直接答案”时，界面展示偏离重构卡片，而不是直接答案。  
3. 消息流中增加“引导标签”：当前阶段、ZPD 区间、镜像级别。  

**交互流程**
1. 用户输入问题 -> 若命中直答请求且未授权，返回“先写思路”提示。  
2. 用户补充思路 -> 系统进入 Query/Reflect 阶段给局部提示。  
3. 用户修正答案 -> 系统给结构化反馈并记录本轮质量。  

**策略与规则**
1. `allow_direct_answer=false` 为默认值，教师/特定场景可白名单放开。  
2. `hint_budget` 控制每轮可用提示次数，超限后强制反思问题。  
3. `guidance_level` 支持 `socratic/mirror/hybrid`，分别控制追问强度。  

**数据采集重点**
1. 事件：`chat.direct_answer_diverted/chat.reflection_submitted/chat.hint_requested`。  
2. 字段：`tqi_score,mirror_level,zpd_band,hint_used,reflection_quality`。  

**验收**
1. 直答偏离命中率 >= 95%。  
2. 导师会话反思提交率显著高于基线。  

### 15.2 Exam 诊断（13.2.2）详细改造

**产品目标**
1. 诊断从“测分”升级为“测分+测思维路径”。  
2. 输出可行动的认知画像而非单纯薄弱点列表。  

**用户可见改造**
1. 每题增加“我这样想”的可选输入区。  
2. 结果页新增“ZPD 画像卡”：过易/适配/过难比例。  
3. 结果页新增“思维断层卡”：证据不足、跳步推理、概念混淆等。  

**交互流程**
1. 开始诊断 -> 常规答题。  
2. 提交后先显示分数概览，再显示思维质量分析。  
3. 一键生成冲刺计划时自动加入解释/反证任务。  

**策略与规则**
1. 思路文本不强制，但影响报告完整度。  
2. 计划生成必须包含最少比例的“认知任务”。  

**数据采集重点**
1. 事件：`exam.diagnostic.answer_submitted/exam.diagnostic.completed`。  
2. 字段：`thinking_text_len,time_spent,zpd_profile,thinking_gaps`。  

**验收**
1. 结果包含 `zpd_profile` 与 `thinking_gaps`。  
2. 计划中反思类任务占比满足阈值。  

### 15.3 Exam 专项训练（13.2.3）详细改造

**产品目标**
1. 由“做题判对错”升级为“策略选择-作答-自解释-反馈”。  
2. 强化“可迁移解题策略”而非刷题记忆。  

**用户可见改造**
1. 作答前先选策略（定位/排除/语法判定等）。  
2. 提交后必须完成错因自解释才解锁完整解析。  
3. 反馈卡新增“反证问题”与推理质量变化。  

**交互流程**
1. 选策略 -> 答题 -> 写错因/反证 -> 查看完整反馈。  
2. 系统按推理质量与正确率共同更新掌握度。  

**策略与规则**
1. `strategy_choice` 为结构化字段，便于分策略统计。  
2. `reflection_text` 与 `reasoning_quality` 进入掌握度更新权重。  

**数据采集重点**
1. 事件：`exam.training.strategy_selected/exam.training.reflection_submitted`。  
2. 字段：`strategy_choice,reasoning_quality_delta,mastery_delta`。  

**验收**
1. 训练记录中策略/反思覆盖率达到目标。  
2. 反馈卡可见 `reasoning_quality_delta`。  

### 15.4 Exam 模考（13.2.4）详细改造

**产品目标**
1. 从“一次性交卷评分”升级为“双阶段：成绩报告+错题复盘”。  
2. 识别“认知卸载风险”并触发后续修复。  

**用户可见改造**
1. 模考完成页新增“认知卸载风险卡”（高/中/低 + 原因）。  
2. 新增阶段 B：逐题复盘输入与教练反馈。  
3. 错题带入“认知修复队列”，持续追踪复盘状态。  

**交互流程**
1. 阶段 A：提交模考 -> 分数与 AI 报告。  
2. 阶段 B：对关键错题写复盘 -> 获取偏差与下一步动作建议。  

**策略与规则**
1. 复盘优先错题，正确题默认不进入强制复盘。  
2. 风险评分参考：空白率、作答速度、正确率。  

**数据采集重点**
1. 事件：`exam.mock.submitted/exam.mock.review_submitted`。  
2. 字段：`cognitive_offload_risk,review_quality,review_progress`。  

**验收**
1. 每场模考可查看错题复盘记录。  
2. 周报可读取模考后的认知指标变化。  

### 15.5 心流刷题（13.2.5）详细改造

**产品目标**
1. 难度调节从“连击规则”改为“ZPD 甜区维持”。  
2. 连错时优先降支架，不直接降到最低难度。  

**用户可见改造**
1. 连错时出现分层引导（提示1/提示2/局部拆解）而非直接答案。  
2. 战报显示“稳定思维时长”“独立解决率”。  

**交互流程**
1. 每题作答后根据正确率窗口与延迟更新 `zpd_state`。  
2. 连错触发支架，恢复后逐步回升难度。  

**策略与规则**
1. 保持“挑战但不崩溃”的成功率区间。  
2. 支架触发与回收阈值可配置。  

**数据采集重点**
1. 事件：`exam.flow.answer_submitted`。  
2. 字段：`zpd_state,scaffold_level,response_ms,streak`。  

**验收**
1. `difficulty_curve` 含 `zpd_state`。  
2. 支架触发链路稳定可回放。  

### 15.6 薄弱突破 + 错题基因（13.2.6）详细改造

**产品目标**
1. 从“题海修复”升级为“解释-反驳-迁移”闭环。  
2. 引入 teach-back，验证是否真正理解。  

**用户可见改造**
1. 每个突破计划增加“给 AI 讲解”任务。  
2. 错题基因修复任务分三步并显示阶段进度。  

**交互流程**
1. 完成基础练习 -> teach-back -> 迁移题验证。  
2. 系统根据正确率+解释质量共同判定 `fixed`。  

**策略与规则**
1. `gene_status=fixed` 需双门槛通过。  
2. teach-back 文本长度与质量纳入评估。  

**数据采集重点**
1. 事件：`exam.weakness.teach_back_submitted/exam.error_gene.fix_submitted`。  
2. 字段：`teach_back_quality,gene_progress,gene_status`。  

**验收**
1. 每个修复基因至少一条 teach-back。  
2. 基因状态变更可追溯。  

### 15.7 AI 错题诊所（13.2.7）详细改造

**产品目标**
1. 用 M0-M3 镜像分层替代“一刀切诊疗”。  
2. 强化“反思质量”在治疗完成判定中的权重。  

**用户可见改造**
1. 诊断结果显示 `mirror_level` 与建议干预方式。  
2. 治疗页新增“为什么会这样想”反思输入。  
3. 完成后显示“思维变化轨迹”摘要。  

**交互流程**
1. 诊断 -> 治疗任务 -> 练习与反思并行提交 -> 双门槛判定完成。  

**策略与规则**
1. 完成条件：正确率阈值 + 反思质量阈值。  
2. 镜像层级驱动提示力度与追问深度。  

**数据采集重点**
1. 事件：`clinic.diagnosis_generated/clinic.reflection_submitted`。  
2. 字段：`mirror_level,tqi_score,reflection_quality,treatment_status`。  

**验收**
1. 返回字段包含 TQI 与镜像层级。  
2. 治疗链路可回放反思轨迹。  

### 15.8 写作（13.2.8）详细改造

**产品目标**
1. 防止“AI 代写直出”，改为“先观点、后提纲、再自改”。  
2. 把写作评价从“最终稿质量”扩展到“修订过程质量”。  

**用户可见改造**
1. 提纲前强制输入 3 个观点。  
2. 修改阶段增加逻辑追问与二次改写区。  
3. 结果页新增“原稿/改稿/AI建议”三栏审计。  

**交互流程**
1. 观点输入 -> 生成提纲 -> 草稿 -> 修改建议 -> 二次改写 -> 提交。  
2. 系统保存 `cognitive_audit`（是否自改、反思质量、代写风险）。  

**策略与规则**
1. 高风险代写场景降级为“框架建议模式”。  
2. 反思说明为空时降低反馈等级并提示补充。  

**数据采集重点**
1. 事件：`writing.points_submitted/writing.revision_submitted/writing.audit_saved`。  
2. 字段：`student_points_count,revision_applied,ghostwriting_risk`。  

**验收**
1. 至少一次可追踪自改记录。  
2. 历史可查看版本差异与认知审计。  

### 15.9 阅读与题库（13.2.9）详细改造

**产品目标**
1. 从“选对答案”升级到“提供证据链与反证能力”。  
2. 降低拍脑袋答题，提高文本依据意识。  

**用户可见改造**
1. 阅读题增加“证据句定位”必填。  
2. 题库题增加“反证一个错误选项”输入。  
3. 提示改为阶梯式（hint1/hint2/hint3）。  

**交互流程**
1. 作答 -> 证据定位 -> 反证输入 -> 才显示完整解析。  

**策略与规则**
1. 无证据定位时不给高阶解析。  
2. 反证质量影响该题学习得分。  

**数据采集重点**
1. 事件：`reading.evidence_submitted/practice.counter_example_submitted`。  
2. 字段：`evidence_span_count,hint_level_used,counter_example_quality`。  

**验收**
1. 阅读记录可还原证据位置。  
2. 提示阶梯分布可统计。  

### 15.10 词汇与知识星系（13.2.10）详细改造

**产品目标**
1. 从记忆型掌握升级到关系型与迁移型掌握。  
2. 验证“会解释、会迁移、会造句”。  

**用户可见改造**
1. 节点升级前新增“关系解释任务”。  
2. 新增迁移挑战：新词解释旧词差异。  
3. 复习卡改为“先造句后看答案”。  

**交互流程**
1. 学习 -> 关系解释 -> 迁移任务 -> 节点升级。  

**策略与规则**
1. `mastered` 必须有生成性证据。  
2. 纯选择题正确不再直接升级。  

**数据采集重点**
1. 事件：`vocab.relation_explained/galaxy.transfer_task_submitted`。  
2. 字段：`generative_evidence,relation_quality,node_status_change`。  

**验收**
1. 掌握节点可追溯生成证据。  
2. 星系页显示关系理解度趋势。  

### 15.11 截图学英语（13.2.11）详细改造

**产品目标**
1. 从“AI 自动提取”改为“先自提取再对照反思”。  
2. 强化迁移使用，避免只做识别不做应用。  

**用户可见改造**
1. 上传前先填自提取关键词。  
2. 结果页显示覆盖率、遗漏词与差异反思输入。  
3. 练习前要求填写迁移句并保存。  

**交互流程**
1. 自提取 -> 上传分析 -> 差异反思 -> 迁移句 -> 做题。  

**策略与规则**
1. 未填迁移句时拒绝练习提交。  
2. 历史记录可回看 `self_extract/delta_reflection/transfer_sentence`。  

**数据采集重点**
1. 事件：`screenshot.self_extract_submitted/screenshot.delta_reflection_submitted`。  
2. 字段：`self_extract_coverage,missing_tokens_count,transfer_sentence_len`。  

**验收**
1. 每条记录包含自提取与差异反思。  
2. 迁移句完成率可统计。  

### 15.12 互动故事（13.2.12）详细改造

**产品目标**
1. 让剧情选择承担“推理表达训练”而非仅娱乐推进。  
2. 在故事场景中嵌入 teach-back。  

**用户可见改造**
1. 每次关键选项前要求写“选择理由”。  
2. 章节结束增加“讲给 NPC 听”的复述任务。  
3. 结算页拆分语言能力与推理能力双报告。  

**交互流程**
1. 选择理由 -> 剧情结果 -> teach-back -> 章节结算。  

**策略与规则**
1. 理由缺失时限制高级分支解锁。  
2. teach-back 质量影响章节评价星级。  

**数据采集重点**
1. 事件：`story.choice_reason_submitted/story.teach_back_submitted`。  
2. 字段：`reason_quality,teach_back_quality,chapter_score`。  

**验收**
1. 章节数据可回放理由文本。  
2. 至少一个章节有 teach-back 闭环。  

### 15.13 英语对战 + 现实任务（13.2.13）详细改造

**产品目标**
1. 降低“速度即胜负”，提升论证质量权重。  
2. Quest 从“完成任务”升级为“任务+反思”。  

**用户可见改造**
1. 对战战报新增论证分、反驳分。  
2. Quest 提交增加反思摘要模板。  
3. 社区优先展示高认知增益案例。  

**交互流程**
1. 对战回合 -> 论证评分 -> 复盘提示。  
2. Quest 完成 -> 反思提交 -> 经验与能力双反馈。  

**策略与规则**
1. 排名规则加入 reasoning 权重。  
2. 无反思摘要时 Quest 仅记“完成”不记“高质量完成”。  

**数据采集重点**
1. 事件：`arena.round_scored/quest.reflection_submitted`。  
2. 字段：`argument_quality,rebuttal_quality,quest_reflection_quality`。  

**验收**
1. 战报显示 reasoning 分。  
2. Quest 完成率与反思完成率可分开统计。  

### 15.14 统计、后台、通知（13.2.14）详细改造

**产品目标**
1. 后台从内容管理升级为认知编排中心。  
2. 通知从“打卡提醒”升级为“反思与复盘驱动”。  

**用户可见改造**
1. Admin 新增认知编排 tab：M0-M3 分布、TQI 趋势、干预建议。  
2. 学习报告新增认知增益曲线与提示依赖趋势。  
3. 通知新增“反思未完成提醒/复盘窗口提醒”。  

**交互流程**
1. R8 指标聚合后 -> `/stats/*` 输出 -> Admin 展示 -> 教师干预。  
2. 通知服务按认知事件触发个性化提醒。  

**策略与规则**
1. 干预建议按分层策略生成（M0-M3 不同干预模板）。  
2. 指标异常触发质量告警卡片（延迟/缺失/重复）。  

**数据采集重点**
1. 事件：`stats.dashboard_viewed/admin.intervention_applied/notification.opened`。  
2. 字段：`cohort_id,metric_key,intervention_type,open_rate`。  

**验收**
1. `/stats/*` 返回认知增益趋势稳定。  
2. Admin 可按班级/分层查看并导出干预建议。  
3. 通知触发可追踪回执闭环。
