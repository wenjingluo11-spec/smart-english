# 认知增强改造执行清单

> 基于 `MODIFICATION_PLAN.md` 顺序执行。每完成一项立即标记。

## 批次 A（P0，先后顺序）

- [x] A1. 新增认知过程数据模型与 Alembic 迁移（`cognitive_sessions`/`cognitive_turns`/`reflection_entries`/`teaching_quality_metrics`/`cognitive_gain_snapshots`）
- [x] A2. 新增认知编排内核（ZPD 基础估计 + 直接答案偏离重构 + 回合阶段控制）
- [x] A3. 扩展 Chat API 协议（`reflection_text`/`guidance_level`/`hint_budget`），并接入编排内核
- [x] A4. Web Tutor 接入反思输入与新协议（发送前反思、展示引导提示）
- [x] A5. Mobile Tutor 接入反思输入与新协议（与 Web 对齐）

## 批次 B（P0/P1，后续）

- [x] B1. Exam 训练链路接入“先策略后作答 + 错因自解释”
- [x] B2. Clinic 链路接入 Mirror/TQI 字段与反思门槛
- [x] B3. Stats 新增认知增益接口（`/stats/cognitive-gain`）
- [x] B4. Admin 增加认知编排视图（M0-M3 与干预建议）

## 批次 C（P1，按顺序继续）

- [x] C1. Exam 模考接入“双阶段复盘”（独立作答后错题复盘、认知卸载风险评分、复盘记录）
- [x] C2. Writing 接入“先问后给 + 自改审计”（3观点门槛、逻辑追问、原稿/改稿/AI建议对比）
- [x] C3. Screenshot 接入“先自提取后对照”（self_extract、delta_reflection、迁移句）

## 批次 D（数据采集专项，新增）

- [ ] D1. 冻结事件字典 `events_v1`（模块事件名、字段、版本、样例）
- [ ] D2. 新增统一事件原始表与日级指标快照表（含 Alembic 迁移）
- [ ] D3. Chat/Exam/Clinic/Writing/Screenshot 关键事件落库
- [ ] D4. 指标聚合作业与 `/stats/*` 口径对齐
- [ ] D5. 数据质量巡检与对账脚本（缺失率/重复率/延迟）
