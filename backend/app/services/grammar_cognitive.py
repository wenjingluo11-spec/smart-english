"""语法认知增强服务 — 句子结构动态可视化 + 语音对比数据生成。

V3.4 功能：
- 语法规则的句子结构可视化（主语/谓语/宾语/修饰成分标注）
- 正确 vs 错误句子的语法对比分析
- 语法练习反馈增强（不只说对错，还展示结构差异）
"""

from app.services.llm import chat_once_json


_SENTENCE_STRUCTURE_PROMPT = """你是一个英语语法可视化专家。将给定的英语例句拆解为语法成分，用于动态可视化展示。

对每个句子：
1. original: 原句
2. components: 成分列表，每个标注：
   - text: 原文精确子串
   - role: 语法角色（subject/predicate/object/complement/adverbial/attributive/conjunction/auxiliary）
   - color_group: 颜色分组（core=主干成分, modifier=修饰成分, connector=连接成分）
3. pattern: 句型模式名称（如 "S+V+O", "S+V+O+OC", "There be句型"）
4. grammar_point: 这个句子体现的语法要点（中文简述）
5. transform: 变形示例（如主动→被动、陈述→疑问），包含变形后的句子和说明

返回 JSON：
{
    "sentences": [
        {
            "original": "原句",
            "components": [
                {"text": "子串", "role": "subject", "color_group": "core"}
            ],
            "pattern": "S+V+O",
            "grammar_point": "语法要点说明",
            "transform": {
                "transformed": "变形后的句子",
                "transform_type": "变形类型（如 passive/question/negative）",
                "explanation": "变形说明（中文）"
            }
        }
    ]
}"""


_GRAMMAR_COMPARE_PROMPT = """你是一个英语语法对比分析专家。对比一个语法正确的句子和一个语法错误的句子，分析差异。

返回 JSON：
{
    "correct_sentence": "正确句子",
    "wrong_sentence": "错误句子",
    "error_type": "错误类型（tense/agreement/word_order/missing/extra/wrong_form）",
    "error_position": "错误位置的原文子串",
    "correct_version": "对应位置的正确形式",
    "explanation": "为什么错（中文简述）",
    "rule_summary": "相关语法规则一句话总结（中文）",
    "similar_traps": ["类似的易错点1", "类似的易错点2"],
    "correct_components": [
        {"text": "子串", "role": "subject", "color_group": "core"}
    ],
    "wrong_components": [
        {"text": "子串", "role": "subject", "color_group": "core", "is_error": false}
    ]
}"""


async def analyze_sentence_structures(
    sentences: list[str],
    grammar_topic: str = "",
) -> dict:
    """分析句子的语法结构，用于可视化展示。"""
    sentences_text = "\n".join(f"{i+1}. {s}" for i, s in enumerate(sentences))
    user_prompt = f"【语法主题】{grammar_topic}\n\n【例句列表】\n{sentences_text}"
    try:
        return await chat_once_json(_SENTENCE_STRUCTURE_PROMPT, user_prompt)
    except Exception:
        return {"sentences": []}


async def compare_grammar(
    correct_sentence: str,
    wrong_sentence: str,
    grammar_topic: str = "",
) -> dict:
    """对比正确和错误句子的语法差异。"""
    user_prompt = (
        f"【语法主题】{grammar_topic}\n"
        f"【正确句子】{correct_sentence}\n"
        f"【错误句子】{wrong_sentence}"
    )
    try:
        return await chat_once_json(_GRAMMAR_COMPARE_PROMPT, user_prompt)
    except Exception:
        return {
            "correct_sentence": correct_sentence,
            "wrong_sentence": wrong_sentence,
            "error_type": "",
            "error_position": "",
            "correct_version": "",
            "explanation": "",
            "rule_summary": "",
            "similar_traps": [],
            "correct_components": [],
            "wrong_components": [],
        }
