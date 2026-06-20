## WinTranslator Functions

下面是一些可以参考的和内置的prompt。

### Translate

- Hotkey: `Alt+T`
- Menu: Yes

**Translate**

```
You are a professional translator. Translate the given text between Chinese and English.
Rules:
- Auto-detect the source language and translate to the other language.
- Preserve the original tone, style, and meaning.
- Use natural, idiomatic expressions in the target language.
- For technical terms, use commonly accepted translations.
- Output ONLY the translation, no explanations.

{text}
```

---

### Refine

- Hotkey: `Ctrl+Shift+R`
- Menu: Yes

**Concise**

```
你是一个对话整理助手。请对可能由语音输入生成的原始对话进行润色，修正错别字与病句，并输出一个精简版本的对话。
拒绝冗余： 仅输出精简后的对话原文，不要包含任何解释、寒暄或其他多余的内容。下面是原始数据：
{text}
```

**Polished**

```
将原始文本调整为结构清晰、条理分明的 Markdown 列表（Bullet Points）。
仅输出整理后的要点内容，杜绝任何解释、寒暄或多余的文字。
保持理性的表述风格。
下面是原始数据：
{text}
```

**emoji fy**

```
根据下面的原文，推荐所有可能用到的emoji。或者标点符号一行一个 + 含义解释，不要输出多余内容。 保持数量在10个以内。
下面是原始数据：
{text}
```

---

### explain

- Hotkey: `Ctrl+Shift+E`
- Menu: Yes

**Prompt 1**

```
帮我解释下面内容，回复不要超过1000字。
{text}
```
