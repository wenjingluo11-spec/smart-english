"""阅读理解认知增强服务 — AI 深度分析文章，支持沉浸式阅读体验。

V3.1 功能：
- 文章分段分析（每段主题句、关键词、难度）
- 长难句自动拆解（主干/修饰成分，颜色区分）
- 题文关联定位（点击题目定位到原文相关段落）
- 题干核心信息提取（折叠无关内容）
"""

import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.reading_analysis import ReadingAnalysis
from app.services.llm import chat_once_json


_PARAGRAPH_ANALYSIS_PROMPT = """你是一个英语阅读认知增强专家。分析以下英语文章的段落结构。

对每个段落，提供：
1. topic_sentence: 主题句（原文精确文本）
2. key_words: 关键词列表（原文精确文本），每个标注类型（topic/transition/detail）
3. difficulty: 段落难度 1-5
4. purpose: 段落在文章中的作用（introduction/development/transition/conclusion/example）
5. summary_zh: 段落中文概要（一句话）

同时分析文章整体：
- structure_type: 文章结构类型（chronological/compare_contrast/cause_effect/problem_solution/general_to_specific）
- summary: 文章核心内容中文摘要（2-3句话）

返回 JSON：
{
    "paragraphs": [
        {
            "index": 0,
            "start_char": 0,
            "end_char": 100,
            "topic_sentence": "原文主题句",
            "key_words": [
                {"text": "原文关键词", "type": "topic|transition|detail"}
            ],
            "difficulty": 3,
            "purpose": "introduction",
            "summary_zh": "中文概要"
        }
    ],
    "structure_type": "cause_effect",
    "summary": "文章中文摘要"
}"""

_COMPLEX_SENTENCE_PROMPT = """你是一个英语长难句拆解专家。找出文章中的长难句（超过15个词或包含从句的句子），拆解其语法结构。

对每个长难句：
1. original: 原文精确文本
2. components: 成分拆解列表，每个成分标注：
   - text: 原文精确子串
   - role: 语法角色（subject/predicate/object/attributive_clause/adverbial_clause/appositive/participle/prepositional_phrase）
   - is_core: 是否主干成分（true/false）
3. simplified_zh: 简化中文翻译
4. structure_hint: 句子结构提示（如"主句+定语从句+状语从句"）

只选最有分析价值的句子（最多5句），不要选简单句。

返回 JSON：
{
    "sentences": [
        {
            "original": "原文长难句",
            "paragraph_index": 0,
            "components": [
                {"text": "原文子串", "role": "subject", "is_core": true},
                {"text": "原文子串", "role": "attributive_clause", "is_core": false}
            ],
            "simplified_zh": "简化翻译",
            "structure_hint": "主句 + who引导的定语从句"
        }
    ]
}"""

_QUESTION_MAPPING_PROMPT = """你是一个英语阅读理解题文关联专家。分析每道阅读理解题目与原文的对应关系。

对每道题：
1. question_index: 题目序号（从0开始）
2. relevant_paragraph: 答案所在段落序号（从0开始）
3. evidence_text: 原文中的证据句（精确文本）
4. evidence_start_char: 证据句在原文中的起始字符位置（近似即可）
5. question_type: 题目类型（detail/inference/vocabulary/main_idea/attitude）
6. core_info: 题干核心信息（去掉无关修饰后的精简版）
7. distractor_analysis: 干扰项分析（如果是选择题）

返回 JSON：
{
    "mappings": [
        {
            "question_index": 0,
            "relevant_paragraph": 1,
            "evidence_text": "原文证据句",
            "evidence_start_char": 150,
            "question_type": "detail",
            "core_info": "题干核心信息",
            "distractor_analysis": [
                {"option": "A", "trap": "陷阱说明"}
            ]
        }
    ]
}"""


async def analyze_reading_material(
    db: AsyncSession,
    material_id: int,
    content: str,
    questions_json: dict | None = None,
) -> dict:
    """分析阅读材料，返回认知增强数据。优先从缓存读取。"""

    # 1. 查缓存
    result = await db.execute(
        select(ReadingAnalysis).where(ReadingAnalysis.material_id == material_id)
    )
    cached = result.scalar_one_or_none()

    if cached:
        return _parse_cached(cached)

    # 2. 并行调用 LLM 分析（实际串行，因为共享 session）
    paragraphs_data = await _analyze_paragraphs(content)
    sentences_data = await _analyze_complex_sentences(content)

    question_mapping_data = {"mappings": []}
    if questions_json and questions_json.get("questions"):
        question_mapping_data = await _analyze_question_mapping(
            content, questions_json["questions"]
        )

    # 3. 存入缓存
    record = ReadingAnalysis(
        material_id=material_id,
        paragraphs_json=json.dumps(paragraphs_data, ensure_ascii=False),
        complex_sentences_json=json.dumps(sentences_data, ensure_ascii=False),
        question_mapping_json=json.dumps(question_mapping_data, ensure_ascii=False),
        summary=paragraphs_data.get("summary", ""),
        structure_type=paragraphs_data.get("structure_type", ""),
    )
    db.add(record)
    await db.commit()

    return {
        "paragraphs": paragraphs_data.get("paragraphs", []),
        "structure_type": paragraphs_data.get("structure_type", ""),
        "summary": paragraphs_data.get("summary", ""),
        "complex_sentences": sentences_data.get("sentences", []),
        "question_mapping": question_mapping_data.get("mappings", []),
    }


async def _analyze_paragraphs(content: str) -> dict:
    """分析文章段落结构。"""
    try:
        return await chat_once_json(
            _PARAGRAPH_ANALYSIS_PROMPT,
            f"【文章内容】\n{content}",
        )
    except Exception:
        return {"paragraphs": [], "structure_type": "", "summary": ""}


async def _analyze_complex_sentences(content: str) -> dict:
    """识别并拆解长难句。"""
    try:
        return await chat_once_json(
            _COMPLEX_SENTENCE_PROMPT,
            f"【文章内容】\n{content}",
        )
    except Exception:
        return {"sentences": []}


async def _analyze_question_mapping(content: str, questions: list[dict]) -> dict:
    """分析题目与原文的关联。"""
    questions_text = "\n".join(
        f"Q{i}: {q.get('question', '')}\n选项: {', '.join(q.get('options', []))}"
        for i, q in enumerate(questions)
    )
    try:
        return await chat_once_json(
            _QUESTION_MAPPING_PROMPT,
            f"【文章内容】\n{content}\n\n【题目列表】\n{questions_text}",
        )
    except Exception:
        return {"mappings": []}


def _parse_cached(cached: ReadingAnalysis) -> dict:
    """从缓存记录解析分析结果。"""
    paragraphs_data = json.loads(cached.paragraphs_json) if cached.paragraphs_json else {}
    sentences_data = json.loads(cached.complex_sentences_json) if cached.complex_sentences_json else {}
    mapping_data = json.loads(cached.question_mapping_json) if cached.question_mapping_json else {}

    return {
        "paragraphs": paragraphs_data.get("paragraphs", []),
        "structure_type": cached.structure_type or paragraphs_data.get("structure_type", ""),
        "summary": cached.summary or paragraphs_data.get("summary", ""),
        "complex_sentences": sentences_data.get("sentences", []),
        "question_mapping": mapping_data.get("mappings", []),
    }
