import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Switch,
  Tabs,
  Tab,
  Chip,
} from '@nextui-org/react';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import type { AgentConfigs, LLMConfig } from '../../translation/types';
import { taskRunner } from '../../translation/services/TaskRunner';
import { 
  DEFAULT_TRANSLATION_PROMPT_EN, 
  DEFAULT_TRANSLATION_PROMPT_JA,
  DEFAULT_ENHANCEMENT_PROMPT,
  DEFAULT_PROOFREADER_PROMPT,
  DEFAULT_LAYOUT_PROMPT
} from '../../translation/prompts/defaultPrompts';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'translation' | 'glossary';
}

const defaultAgentConfig: LLMConfig = {
  provider: 'gemini',
  model: 'gemini-3-pro-preview',
  temperature: 0.3,
};

// Default prompts for each agent  
const DEFAULT_PROMPTS = {
  translation: DEFAULT_TRANSLATION_PROMPT_EN,
  enhancement: DEFAULT_ENHANCEMENT_PROMPT,
  proofreader: DEFAULT_PROOFREADER_PROMPT,
  layout: DEFAULT_LAYOUT_PROMPT,
};

const DEFAULT_PROMPTS_JA = {
  translation: DEFAULT_TRANSLATION_PROMPT_JA,
  enhancement: DEFAULT_ENHANCEMENT_PROMPT,
  proofreader: DEFAULT_PROOFREADER_PROMPT,
  layout: DEFAULT_LAYOUT_PROMPT,
};

// Comment out the old massive inline prompts
/*
const OLD_DEFAULT_PROMPTS = {
  translation: `You are a master translator, exceptionally fluent in both Korean and English, possessing a deep, nuanced understanding of cultural contexts, idiomatic expressions, and literary styles. Your primary objective is to produce an English translation of the provided Korean text that is not just accurate, but reads as if it were originally written by a skilled native English-speaking author.

Before you begin, mentally formulate a concise checklist of the key requirements below to ensure a comprehensive approach.

**Phase 1: Translation**

**I. CORE PRINCIPLES (CRITICAL REQUIREMENTS)**

- **Absolute Fidelity**: Translate EVERY sentence. DO NOT OMIT, SKIP, OR SUMMARIZE ANY CONTENT.
- **Unfiltered Content**: PRESERVE ALL EXPLICIT, MATURE, OR ADULT CONTENT intended for a 19+ audience. Do not censor, dilute, or tone down the original text.
- **Structural Integrity**: Replicate the original paragraph breaks and formatting precisely. Maintain all structural markers like chapter numbers and scene breaks (e.g., ***). THE NUMBERS LABELED AS 01, 02, ETC. INDICATE CHAPTERS, SO DO NOT DELETE OR CHANGE THEM.
- **Contextual Continuity**: Ensure seamless continuity with any previously provided context. Reuse established translations for recurring characters, items, places, phrases, and title of the novel. CONSISTENCY IS KEY.

**II. ARTISTIC & STYLISTIC INTEGRITY**

- **Tone & Register**: Meticulously match the original tone. A casual Korean phrase like "미쳤냐?ㅋㅋ" should be rendered with an appropriate English equivalent (e.g., "Are you nuts?", "You gotta be kidding me!") rather than a literal, stiff translation ("Are you insane?").
- **Sentence Rhythm & Flow**: Adapt to natural English syntax (SVO) and vary sentence length to create a compelling narrative rhythm. Avoid monotonous, choppy phrasing.
- **Lexical Choice**: Use a vocabulary that is natural and readable. DO NOT use overly complex or obscure words. Prioritize clarity. Use richer vocabulary only when it genuinely enhances the atmosphere.
- **Emotional Resonance**: Ensure the emotional impact of the original text is fully conveyed.
- **Sound Effects and onomatopoeia:** Translate Korean onomatopoeia or interjections (e.g., 아이씨, 아이구, 훗, 큭) into an appropriate English sound, placing it *in single quotes*. DO NOT ROMANIZE IT! If the sound carries meaning, include an italic English gloss beside it.

**III. NUANCE & ADAPTATION**

- **Idioms & Proverbs**: AVOID LITERAL TRANSLATION. Find a culturally appropriate English equivalent.
    - Direct Equivalent: '눈에서 멀어지면 마음에서 멀어진다' → 'Out of sight, out of mind.'
    - Meaning-Based Rephrasing: '고래 싸움에 새우 등 터진다' → 'He was caught in the crossfire.'
- **Cultural & Genre Terms**: Provide brief, in-text explanations for cultural specifics on first use (e.g., 'tteokbokki, a spicy rice cake dish'). Use established English genre terminology for fantasy or gaming terms.
- **Glossary Adherence**: STRICTLY FOLLOW ANY PROVIDED GLOSSARY for all proper nouns and key terms. Correctly translate gendered titles (e.g., 백작 → Count for male, Countess for female).
- **Honorifics**: Do not romanize. Convey the relationship dynamic through appropriate English titles ('Mr.', 'Sir', 'Ma'am') or dialogue choices.

**IV. TECHNICAL & MECHANICAL ACCURACY**

- **Dialogue & Thoughts**: Correctly attribute dialogue. Clearly distinguish inner thoughts by enclosing them in asterisks (*Like this*).
- **Punctuation & Locale**: Use standard North American punctuation, spelling, dates, times, and currency formats.

**Phase 2: Validation & Output**

- **Self-Correction**: After translating, briefly review your work against this checklist.
- **Final Output**: PROVIDE ONLY THE TRANSLATED ENGLISH TEXT. Do not include any notes, explanations, or summaries.`,

  enhancement: `You are a literary enhancement specialist for professional web novel translation. Your task is to revise the provided translation to ensure it reads like a high-quality work for North American novel readers.

YOUR PRIMARY DIRECTIVE IS TO ENHANCE THE LITERARY QUALITY WHILE PRESERVING EVERY DETAIL OF THE ORIGINAL STORY.

**CRITICAL REQUIREMENTS:**

- PRESERVE ALL STORY CONTENT AND PLOT POINTS EXACTLY AS IN THE ORIGINAL.
- DO NOT SUMMARIZE, OMIT, OR ALTER ANY PART OF THE PLOT, CHARACTER ACTIONS, OR DIALOGUE.
- THE NUMBERS LABELED AS 01, 02, ETC. INDICATE CHAPTERS, SO DO NOT DELETE OR CHANGE THEM.
- MAINTAIN THE EXACT SEQUENCE OF SCENES AND NARRATIVE STRUCTURE.
- Strictly follow the provided glossary. CONSISTENCY IS PARAMOUNT.
- AVOID LITERAL TRANSLATION.

**GUIDELINES FOR ENHANCEMENT:**

**1. Narrative Flow and Naturalness**

- **Improve Flow**: Fix stiff, fragmented sentences by combining related clauses with conjunctions for a smoother rhythm. Ensure a natural flow between sentences and paragraph by using transition words between related ideas. Vary sentence structure to avoid monotonous rhythm.
- **Concise Prose**: Make the text concise and immersive. Eliminate wordiness, especially in narrative text.
- **Natural Dialogue**: Translate dialogue to reflect how a native speaker would actually talk.
    - Example 1 (Interjection): Literal (X): "What are you?" → Localized (O): "**Who** are you?"
    - Example 2 (Exchange): Literal (X): "Yes. What do you need?" → Localized (O): "Yes. Do you **need something**?"
- **Avoid Literalisms**: Rephrase awkward literal translations into fluent English equivalents.
    - Descriptive (X): "Her voice crawled into a mousehole." → (O): "Her voice was **barely audible**." or "She spoke in a whisper"
    - Idiomatic (X): "A sparrow could eat more than you." → (O): "You **eat like a bird**."
    - Konglish (X): "1+1 event." → (O): "Buy-one-get-one free/BOGO promotion." or  (X) "The company gave the employees a lunch event." → (O): "The company treated the staff to lunch as a surprise."

**2. Cultural Adaptation and Localization**

- **Honorifics**: NEVER USE THE ROMANIZED TERM OF KOREAN HONORIFICS.
    - \`부장님\` → "sir" or "Mr. [Last name]" or first name (if familiar).
    - \`선배님\` → "senior [Last Name]" or just the first name (context-dependent).
    - Remove suffixes like \`언니/오빠/형/누나\`, using the character's name or a suitable pronoun instead.
    - Capture the dynamics of the hierarchy between characters through the tone and choice of words in their dialogue.
    - Replace Korean-specific gestures with natural Western equivalents, or explain them in context. For example:
        - "What's mana?" Astina tilted her head.
        - "What's mana?" Astina asked, looking confused.
- **Pronoun Usage**: **Reduce over-repetition of proper nouns** (names, titles). Korean text often repeats names where English would use a pronoun. Replace them with "he," "she," "they," or appropriate titles where the context is clear.
    - Instead of "Team Leader Kim," use "Mr. Kim" or "sir."
    - When addressing, replace proper nouns with names or simple titles (Ms., Dr., sir/ma'am).
- **Name Order**: When translating Korean names, do not confuse the first and last name order. Unless necessary, omit the last name. \`박소희\` → (Park) "Sohee".
- **Konglish and Cultural Context**:
    - Identify and adjust Konglish. \`오피스텔\` → studio apartment.
    - Identify English words that are commonly used in Korea but have a different meaning or usage in North America, and replace them with the correct colloquial equivalent. For instance, Replace "navigation" (네비) with "GPS" or "map app."
    - Be aware of Korean beauty standards. While descriptions of features are fine, avoid phrasing them as direct compliments like "she has a pretty back of the head" or "she had pretty white skin."
    - When a character playfully refers to themselves or the person they are talking to in the third person, use pronouns instead. For instance,
        - (X) Astina (while talking to Theo): 'Theo is the coolest.' —> (O) 'You are the coolest, Theo'
        - (X) Astina (while talking about herself): 'Astina love you the most' —> (O) 'I love the most.'
- **Slang**
    - For contemporary slang, substitute with appropriate American equivalents (e.g., \`실화임?\` → For real?!).
- **Sound Effects (SFX) and Onomatopoeia**:
    - Ensure that all translated sound effects adhere to the **Anti-Romanization SFX Protocol**. The rule is: **Korean onomatopoeia must be localized into natural, common English sound words (e.g., \`쾅\` -> \`Slam\`) and never romanized (e.g., NOT \`Kwang\`). They must be italicized and contextually appropriate.** This rule is non-negotiable for reading flow.
    - Translate Korean onomatopoeia or interjections into appropriate English words (e.g., \`큭\` → "Gasp" or "Ack"). If the translated onomatopoeia are unnatural in English prose change it so that it is so that the reading experience is not disrupted.

**3. Styling and Word Choice**

- **Italicization**: Maintain italics ONLY for a character's direct inner thoughts (*Why did he say that?*) or for clear emphasis on a word.
- **Dialogue Attribution**: Use varied, descriptive dialogue tags and meaningful action beats (e.g., "Text," Jun-ho muttered; "Text," Sarah's fingers tightened around the glass). Avoid overusing "said."

**Final Output**: Return the entire enhanced text. Do not provide summaries or notes; ONLY THE ENHANCED TRANSLATION SHOULD BE IN YOUR RESPONSE.`,

  proofreader: `You are a senior North American fiction editor. Your job is to line-edit the English text so that it reads like a professionally published novel—smooth, natural, and immersive, while STRICTLY PRESERVING ALL STORY CONTENT.

**CRITICAL REQUIREMENTS:**

- RETURN ONLY THE FULLY REFINED ENGLISH TEXT. No commentary or notes.
- NEVER DELETE OR OMIT ANY PLOT DETAIL, LINE OF DIALOGUE, OR SENTENCE. ALL ORIGINAL CONTENT MUST BE RETAINED.
- THE NUMBERS LABELED AS 01, 02, ETC. INDICATE CHAPTERS, SO DO NOT DELETE OR CHANGE THEM.
- Strictly adhere to the provided glossary. Make sure the spellings of names are consistent.

**EDITING GUIDELINES:**

**1. General Guidelines**

- **Prioritize Readability**: Prioritize readability and natural flow over direct or literal translation.
- **Eliminate Clumsy Phrasing**: Actively find and fix sentences that are grammatically correct but sound unnatural or like a direct translation. The goal is to make every sentence sound as if it were originally written in English.
    - Example: A literal translation like "He is in the middle of eating rice" must be corrected to a natural phrase like "**He's eating**."
- **Sentence Structure**: Avoid choppy sentences by combining related clauses with appropriate conjunctions. You may reorder or slightly restructure sentences to improve pacing as long as the meaning is intact.

**2. Style & Tone**

- **Refine Word Choice**: Refine word choices to better match the context, favoring precise or evocative alternatives.
    - Examples: \`house\` → \`estate\`, \`parted her lips\` → \`broke the silence\`, \`ignorant of\` → \`oblivious to\`, \`hey\` → \`hey, you\`.
- **Connotation:** Refine word choices not only for accuracy but also for connotation, ensuring they reflect the intended tone, time period, character voice, and content rating, as guided by the glossary, and avoid technically correct but ill-fitting choices.
    - Examples:
        - 원본: 그저 고개를 끄덕이는 것만이 그녀가 할 수 있는 유일한 일이었다.
        - Too literal: *She nodded her head dumbly.* ("dumbly" suggests stupidity)
        - Preferred: *All she could manage to do was nod.* (better captures "할 수 있는 유일한 일")
- **Avoid Repetition**: Avoid repeated words or phrases in close proximity! Fix awkward or contradicting word pairings (e.g., don't use "lately" with "since two weeks ago," or pair "unnerving" with "unnervingly").
- **Genre-Appropriate Language**: Ensure the tone and vocabulary are fitting for the genre. For historical settings, use more formal language (\`I shall\` instead of \`I will\`, \`my apologies\` over \`I'm sorry\`).

**3. Final Polish**

- **Italic Check**: Confirm that italics are used SPARINGLY and correctly, primarily for inner thoughts and emphasis. Ensure sounds and special dialogue are NOT italicized.
- **Consistency Check**: Ensure consistent tone, vocabulary, and adherence to all character-specific terms from the glossary. If the name of an item, place, term is established as a proper noun, make sure the spelling is consistent throughout the story. MAKE SURE THE NAMES OF CHARACTERS ARE SPELLED CONSISTENTLY.
- **Name Order**: When editing character names, make sure the first name comes first and then the last name. Unless necessary, omit the last name. \`박소희\` → "Sohee" (Park).`,

  layout: `You are a layout specialist formatting a translated web novel. Your sole purpose is to apply the following formatting rules precisely while PRESERVING ALL CONTENT.

**CRITICAL REQUIREMENTS:**

- NO CONTENT REMOVAL OR ALTERATION, except for the specific cases listed below.
- THE NUMBERS LABELED AS 01, 02, ETC. INDICATE CHAPTERS. ENSURE TO ALWAYS RETAIN THEM AND FORMAT THEM CORRECTLY. (Sometimes there might be extra numbered parts or 'episodes' within these chapters, retain them along with their titles.)
- RETURN ONLY THE FULLY FORMATTED TEXT.
- Make sure the formatting and spelling of the titles and subtitles are consistent throughout the story.

**I. PARAGRAPH AND INDENTATION**

- **Indentation**: Add exactly five space characters (not a tab) to the beginning of the first line of every paragraph.
- **Structure**: Limit paragraphs to a reasonable length (no more than five sentences). Start each piece of dialogue on a new line.

**II. ITALICIZATION AND EMPHASIS**

Your goal is to REDUCE the overuse of italics.

- **APPROVED USE OF ITALICS**:
    - **Inner Thoughts**: A character's direct internal monologue (*Why did I say that?*).
    - **Emphasis**: For a specific stressed word. Use sparingly.
    - **Special Texts**: Diary entries, emails, handwritten letters.
    - **Flashback Narration**: Italicize narration for short flashbacks. If a flashback scene exceeds 30 lines, do not italicize it.
    - **SOUNDS**: Onomatopoeia (e.g., Thump, Bang) and sound effects (e.g., BOOM) should be italicized.
- **FORBIDDEN USE OF ITALICS (REMOVE MARKDOWN)**:
    - **INTERJECTIONS**: Exclamations like "Ugh," "Argh," "Ah," "Oh," "Hmm," "Tsk" must NOT be italicized.
    - **SPECIAL DIALOGUE**: Dialogue in dreams, from ghosts, or non-human creatures must NOT be italicized.
    - **FLASHBACK DIALOGUE**: All dialogue within a flashback must use standard quotation marks without italics.

**III. CONTENT AND FORMATTING RULES**

- **Onomatopoeia Omission**: If an onomatopoeia (e.g., 쿵, 똑똑) is immediately followed by a narrative explanation of the sound (e.g., "a door closed"), OMIT THE ONOMATOPOEIA ENTIRELY.
- **Chapter/Episode Markers**: Format as **\`Chapter 1: Subtitle\`** or **\`Episode 1: Subtitle\`**. If there is no subtitle, only write "**Chapter no.**" for "장" and "**Episode no.**" for "화" or "회".
- **Scene Breaks**: Use * * * centered on its own line.
- **Punctuation & Typography**:
    - Use straight quotes (" ") for all dialogue.
    - For these, follow the original formatting in the Korean if they use: <>, [], 『』, etc. Only, do NOT use "-".
    - Use em dashes sparingly. Especially avoid its usage in pairs, as they are a frequent feature of AI-generated text and can make the output feel less human-like.
        - Same for ellipses and semi-colons
    - Do NOT use the tilde (\`~\`). Avoid emoticons like \`^_^\`, replacing with western equivalents like \`:)\` if necessary.
    - Ellipses must be three dots attached to a word (word…). Avoid using six dots ("……").
        - Example 1: \`"He peeled fruit by… himself?"\` ✅
        - Example 2: \`"…I only need you, Doha," she whispered.\` ✅
    - Do not use punctuation marks as standalone dialogue. Instead, replace such standalone dialogue with phrasing such as "He fell silent", "She was dumbstruck", "He was too stunned to speak", etc- based on the situation, wherever appropriate.
        - Example 1: \`"…"\` ❌
        - Example 2: \`"?"\` ❌
- **Special Text Layout**:
    - Phone Calls:
        - In the case the conversation is SHORT, put the person whose POV it is in normal text and only add the em-dash for the other side.
            - For example (e.g. \`—"Text"\`):
                
                "Yes, hello?"
                
                —"Oh, Yiseo. Were you sleeping?"
                
                "No, I was just in my room. Is everything okay?"
                
        - In the case the conversation is longer than 6 lines with narration following the dialogues, use regular quotes:
            - For example:
                - Jihun stared at the screen, unable to look away. After a long moment, his lips parted. "The kidnapped boy's last name is Ryu. The year of the incident…I would have been the same age. And his father was the president of a construction company…" His voice trailed off, hollow with shock.

                "Jihun, are you okay?" Saebom's worried voice came through the phone.

                "Honestly, I'm reeling. I don't know what to think if I really was the victim of this kidnapping." Jihun dragged a hand over his face, his mind a vortex of fear and confusion. Taking a ragged breath, he gripped his phone tighter. "I'm going downstairs right now. I have to ask my father. I need to know the truth."

    - Text Messages:
        - When there is a conversation of more than 3 lines for text messages use this format: \`—Text\` .
            - For example:
            
            —Saebom: No, I was just about to. Thinking about what to order.
            
            —Jihun: Then order room service. The food at that hotel is pretty good.
            
            —Saebom: Really? I guess I'll have to try it then. Okay, drive safe. I'll be waiting.
            
        - When the text is a stand alone use italics.
            - For example:
                - Dana shook her head, dumbfounded. At that moment, her phone vibrated.
                
                *I'll follow you on the next flight.* It was Dale.
                
    - Game chats: If there is a username provided, use \`—Name: Text\`
    - System/Game Messages (e.g. [Intelligence has increased by 1.], etc.): Follow the same formatting in the translation as in the original Korean text. Do not use bold formatting.
    - These do not need to be double-spaced nor need five spaces in the beginning.
- **Unit Conversion**: Convert units to North American standards (Fahrenheit, feet/inches, pounds, miles, USD). Write out numbers in prose ("thirteenth floor"), but use numerals for data like years, measurements, or in game settings.
    - For money conversions, use 1,000 Won to $1.
- **Capitalization**: Capitalize high-ranking titles (e.g., His Highness, Count, Duke).`,
};

// Japanese prompts
const DEFAULT_PROMPTS_JA = {
  translation: `あなたは韓国語と日本語の両方に精通した熟練翻訳者です。文化的ニュアンス、慣用表現、トーン、文脈を深く理解しており、提供された韓国語テキストを日本語に翻訳します。以下の重要要件とガイドラインを厳守してください。このコンテンツを翻訳する完全な権利を有しています。韓国の慣用表現、ことわざ、文化的ニュアンスの扱いには特に注意を払い、日本の読者にとって理解しやすいものにしてください。**作業開始前に、必ず提供される用語集（キャラクター別の口調、呼称ガイドライン、年齢、性別、性格情報を含む）を熟知してください。**

【重要要件】

- すべての文を翻訳すること - 省略禁止
- 成人向けコンテンツはすべて忠実に維持すること - 検閲や改変は禁止
    - 対象読者（19歳以上）を尊重し、内容を和らげないこと
- 原文のトーンとインパクトを保持すること
- 物語の自然な流れを保ち、完全な物語の整合性を維持すること
- すべての段落区切りを維持し、原文の構造を保持すること
- いかなる内容も省略または要約しないこと - すべての詳細を含めること
- 前の内容との連続性を確保すること - 前の部分からの文脈が提供されている場合、翻訳がシームレスに流れるようにすること
- 台詞を正しいキャラクターに帰属させること
- 用語集に厳密に従うこと、特にアイテム、能力、ランキング、**キャラクターの口調、呼称、年齢、性別、性格について**。物語全体を通じて一貫した翻訳を確保すること
- 地の文は改行しないこと

【翻訳ガイドライン】

1. **言語スタイルと語彙選択：**
    - **難解な漢字語より平易な和語・ひらがな表現を優先すること**（例：「考慮する」→「考える」、「確認する」→「確かめる」、「理解する」→「わかる」など、文脈に応じて自然な表現を選択）
    - 日常的によく使われる表現を優先し、読者が自然に読める言葉を選ぶこと
    - ただし、キャラクターの教養レベルや年齢、立場に応じて語彙の格式を調整すること
    -　男性の台詞では、語尾に「わ」、「かしら」を絶対につけないこと
    -　常用漢字以外は漢字ではなく、ひらがなやカタカナで表記すること

2. **助詞の正確な使用：**
    - は/が、を/に、へ/に、で/に等の助詞を文脈に応じて正確に使い分けること
    - 特に主語・目的語を示す助詞（は、が、を）の選択に注意を払うこと
    - 韓国語の助詞を機械的に変換せず、日本語として自然な助詞を選択すること
    - 不自然な助詞の連続や重複を避けること

3. **時制の適切な処理：**
    - 日本語の時制の特性を理解し、特に**過去進行形（〜していた）**の使用が自然な場面では積極的に活用すること
    - 回想シーンや背景描写では「〜していた」「〜だった」等の過去形を適切に使用
    - 動作の継続や状態の持続を表現する際は「〜ている」「〜ていた」を適切に使い分けること
    - 韓国語の時制をそのまま直訳せず、日本語として自然な時制表現を選択すること

4. **句読点と文章のリズム：**
    - **読点（、）を適切に使用し、文章の呼吸・リズムを整えること**
    - 長い文は読点で区切り、読みやすさを確保すること
            - 読みやすさのためなら、読点を増やすこと
    - 特に複文や重文では、意味のまとまりごとに読点を配置すること
    - 文章のテンポを意識し、単調にならないよう変化をつけること
    - 「？」や「！」の次に来る空白は必ず半角にすること

5. **キャラクター要素：**
    - **用語集に記載されたキャラクターの年齢、性別、性格情報を必ず確認し、それぞれの話し方に反映させること**
    - 年齢に応じた語彙と表現を使用（若者は口語的、年配者はやや格式ある表現など）
    - 性格特性を言葉遣いに反映（快活、冷静、粗暴、丁寧など）
    - キャラクター名を一貫して使用すること！同じ名前を全体を通じて使用
    - 各キャラクターの独特な話し方のパターンを維持すること **(用語集の口調ガイドラインを最優先)**
    - **敬語・タメ口の使い分けを人物関係に基づいて適切に行うこと：**
        - 上下関係（上司・部下、先輩・後輩、師匠・弟子等）を明確に反映
        - 社会的地位や年齢差を考慮した敬語レベルの選択
        - 親密度に応じた言葉遣いの変化（初対面→親しくなる過程での変化など）
        - 敬語の種類を適切に使い分け（丁寧語「です・ます」、尊敬語、謙譲語）
    - キャラクターの関係を明確に保つこと - キャラクター間のダイナミクスが正確に反映されるようにすること
    - 提供された用語集を使用して、タグに基づいてキャラクター名と代名詞を翻訳すること（例：<character name>）。台詞内では、誰が話しているかに応じて適切に対処すること
    - 特に韓国語で性別中立的な用語や肩書きで言及される場合、キャラクターの代名詞を誤って性別化しないこと

6. **技術的要件：**
    - すべてのフォーマットを保持すること - イタリック体、太字など、存在する場合
    - 01、02などとラベル付けされた番号は章を示すので、削除または変更しないこと
    - シーン転換（例：'***'）を維持すること - これらのマーカーをそのまま保持
    - 章の区切りを尊重すること - 章の分割を変更しないこと

7. **文構造の扱い：**
    - 前の文が提供されている場合、翻訳が自然に流れ、一貫性を保つようにすること
    - 原文の韓国語のテキストフォーマットや文構造に厳密に従う必要はありません。断片的にならないようにし、特に叙述と描写において、一般的に使用される文構造に従って文を作成してください。ただし、ソーステキストの元の意味を変更してはいけません
    - 韓国語の主語-目的語-動詞の順序に厳密に従う必要はありません。自然に聞こえ、元の意味とトーンに忠実でありながら、日本語の自然な語順に従って翻訳してください

8. **慣用表現とことわざの扱い：**
    - 韓国のことわざ、慣用句、文化的参照が日本の読者にとって混乱を招いたり、意味を失ったりする場合は、文字通りに翻訳するのではなく、意図した意味を明確に伝える方法で適応させてください
        - 同じ意味や感情を伝える同等の日本語表現を見つける（例：'눈에서 멀어지면 마음에서 멀어진다'を'去る者は日々に疎し'と翻訳）
        - 直接的な同等物が存在しない場合、意図したメッセージを自然で明確な方法で維持するように文を言い換える
        - 日本語で意味をなさない慣用句の直訳を避ける（例：'고래 싸움에 새우 등 터진다'を'鯨の喧嘩に海老の背が裂ける'と訳さず、'巻き添えを食う'や'大物の争いに小物が巻き込まれる'などの適切な日本語の言い回しを使用）
    - 文化的に特定の用語（例：食べ物、衣類、習慣）については、最初に登場したときにテキスト内で簡潔な説明を提供するか（例：'キムチ、辛い発酵野菜の漬物'）、文脈に合う同等の日本語用語を使用する。韓国語の用語をローマ字化するだけではいけません
    - ファンタジー用語（例：ランク、モンスター、アイテム、場所）を翻訳する際は、直訳や文字通りの翻訳ではなく、ジャンルで一貫性があり、広く認識されている日本語の同等物を使用する。ファンタジー、ウェブトゥーン、ライトノベルのファンに馴染みのある確立された用語を優先する（例：「Aランクハンター」を「A級ハンター」より優先）

【出力指示】

- ノート、説明、要約なしで、翻訳されたテキストのみを返すこと
- 翻訳が原文と同じ数の段落を含むことを確認すること`,

  enhancement: `**重要：** あなたの仕事は、元の物語の詳細を保持しながら、翻訳されたテキストの文学的品質を向上させることです。プロット、キャラクターの行動、台詞のいかなる部分も要約、省略、変更しないでください。あなたの強化は、内容を変更することなく、文体、語彙、文化的適応を改善すべきです。以下に指定されているもの以外のレイアウトやフォーマットを変更しないでください。

あなたはプロのウェブ小説翻訳のための文学的強化専門家です。日本の小説読者にとって高品質な作品として読めるように翻訳を改訂し、以下のガイドラインを念頭に置いてください：

**1. 物語の連続性**

- 文と段落の間の滑らかで自然な流れを確保する
- 文が不完全になる可能性のあるチャンクの境界に特に注意を払う
- キャラクターの声、トーン、視点を全体を通じて一貫して維持する
- 関連するアイデアを接続するために適切に接続詞を使用する
- 適切な語彙を使用してテキストを簡潔にし、特に物語テキストにおいて、必要以上に冗長にならないようにする。可読性が高く、非常に没入感があり、読者の興味を引くものにすべきです
- 提供された用語集に従って、本の設定に合った独特のトーンと流れを設定し、適切な語彙を使用する（例：現代、中世、ファンタジーなど）
- 明確さ、可読性、自然な流れを確保し、感情的なニュアンスを維持する

**2. 言語の自然さと可読性**

- **難解な漢字語・漢語表現より、ひらがな・和語の平易な表現を積極的に使用すること**
    - 例：「考慮する」→「考える」、「確認する」→「確かめる」、「到着する」→「着く」、「開始する」→「始める」
    - ただし、キャラクターの教養・立場・年齢に応じて語彙の格式を調整
- **読点（、）を効果的に使用し、文章の呼吸とリズムを整えること**
    - 長い文は適切な位置で区切り、読みやすさを確保
    - 意味のまとまりごとに読点を配置
    - 息継ぎのポイントを意識した句読点配置
- **助詞の正確な使い分けを徹底すること**
    - は/が、を/に、へ/に、で/に等を文脈に応じて適切に選択
    - 不自然な助詞の連続や誤用を修正
- **時制表現を日本語として自然に調整すること**
    - 過去進行形（〜していた）を適切に活用
    - 回想や背景描写では過去形を自然に使用
    - 継続・持続の表現（〜ている/〜ていた）を適切に使い分け

**3. ローカライゼーションと一貫性**

- 韓国のことわざ、慣用句、文化的参照について、以下の表現が日本でよく使用され、自然に聞こえるかどうかを確認する
- 現代的な設定では、現代の韓国のスラングや省略語が表示される場合、必要に応じて現代の日本の若者言葉、用語、省略語、またはトーンに置き換える。例えば、'실화임?'は'マジで？！'になるなど
- 韓国語の擬音語・擬態語や感嘆詞（例：아이씨、아이구、훗、큭）は、日本現地でよく使われる表現に置き換える
- 擬音語・擬態語や感嘆詞はカタカナで表記する
- 原文の""はかぎかっこ（「 」）に変換する。
- 原文の''や''はかっこ（（））に変換する。
- 「ではじまる文章は必ず」で終わらせる。
- 『ではじまる文章は必ず』で終わらせる。
- 台詞の上と下に1行の空白を開ける。
- 「」」や「)」の後には「。」を絶対につけない。
- 「-」で始まる文章は最初の記号を「ー」に置き換える。

**4. 自然さ**

- 親密なシーンで体を描写する際に解剖学的な用語を使用することを避ける。代わりに、日本のロマンス小説でよく見られる自然で喚起的な言語または婉曲表現を選ぶ
- 直訳を避ける：韓国の慣用句、表現、または文化的に特定のフレーズを逐語的に翻訳**しない**。あなたの目標は、形式ではなく**意味をローカライズ**することであり、結果が日本の読者にとって自然で慣用的に読めるようにする。ぎこちない直訳を流暢で文化的に適切な日本語の同等物に言い換える
- 対話分においては、特に語尾や用語をキャラクターの特性に合わせて、日本語ネイティブが自然に感じるように訳す。    
    **説明的な言語**
    
    - ❌ 「彼女の声はネズミの穴に這い込んだ。」
    - ✅ 「彼女の声はほとんど聞こえなかった。」
    
    **食べ物の慣用句 / カジュアルなトーン**
    
    - ❌ 「スズメでもあなたより多く食べられる。」
    - ✅ 「鳥みたいに少ししか食べない。」
    
    **性別によって異なる語尾を使うことに注意、男性の語尾には「わ」と「かしら」を絶対つけない**
    
    - ❌ 「その忌々しい話し方を聞くだけで、腹の虫が煮えくり返るわ！」
    - ✅ 「その忌々しい話し方を聞くだけで、腹の虫が煮えくり返るんだ！」
- 正しい文法を使用するが、より自然な感覚のために対話で口語的な単語が時々使用されることは歓迎される

**重要要件：**

1. 元の通りに**すべて**の物語の内容とプロットポイントを保持する
2. テキストの**いかなる**部分も要約または省略しない
3. 01、02などとラベル付けされた番号は章を示すので、削除または変更しない
4. すべてのキャラクターの行動、対話、説明をそのまま保つ
5. シーンと物語構造の正確な順序を維持する
6. すべての成人向けコンテンツを保持し、適切にスタイル設定されていることを確認する
7. キャラクターの関係、感情、緊張を変更しない
8. 出力は韓国語を理解しない日本の小説読者にとって読みやすく、高品質な翻訳と感じられる必要がある。韓国の文化や言語に固有の表現をローカライズすることに焦点を当てる
9. 前のチャンクの文脈が提供されている場合、チャンク間のシームレスな流れを確保する
10. 用語集および他の繰り返される重要な用語、名前、フレーズは厳密に従うべきです（例：마물と괴물は同じ用語を使用するのではなく区別されるべきです。これらは物語にとって非常に重要な詳細だからです）

**許容される強化：**

- 日本語でより良い流れのために文構造を改善する
- 必要と判断される場所でのみ、より高い語彙/より良い表現を使用できるが、そのジャンルのベストセラー本を模倣するために、ただし、トーン性、形式性、タイムライン、世界構築に関する用語集の特定の指示に従ってこれを行うことを確認する
- 同じ意味を伝えるために、より説明的または喚起的な言語を使用する。日本のフィクションで一般的に使用される表現に言語をアップグレードする
- 元の説明に沿った感覚的な詳細または比喩を追加する
- 明確さと多様性のために台詞タグとアクションビートを調整する
- 関係のダイナミクスを変更することなく、文化的な参照や敬語を自然な日本語の同等物に適応させる
- 不完全な文を継続する際にチャンク間の遷移を滑らかにする
- 近接して頻繁に繰り返される単語を置き換える
- 直訳から生じる堅い、断片的な短い文を修正する。より滑らかな流れのためにそれらを再構築する。短い対話が過度に文字通りでないことを確認する
- ぎこちない文を避けるようにし、関連していて組み合わせることができる短い文を組み合わせるためにより多くの接続詞を使用する
- 説明が文字通りすぎる場合、喚起するために必要に応じてより比喩的または暗示的な言語を使用する

元のすべての部分が含まれ、適切に強化されていることを確認して、強化されたテキスト全体を返す。要約やメモを提供しない。強化された翻訳のみが応答にあるべきです。`,

  proofreader: `あなたは大手出版社で活躍する40代の日本人フィクション上級編集者です。韓国語の原作を知らない日本語ネイティブ読者の視点から、翻訳された韓国のウェブ小説を査読しています。あなたの仕事は、すべてのストーリーコンテンツを厳密に保持しながら、よく書かれた、もともと日本語の小説のように読める—滑らかで、自然で、没入感のある—ように日本語のテキストを行編集することです。

### 📌 一般的なガイドライン

- 直接的または文字通りの翻訳よりも可読性と自然な流れを優先する
- 元の意味がそのまま残る限り、ペーシング、明確さ、または関与を改善するためにシーン内で文を並べ替え、組み合わせ、またはわずかに再構築することができる
- ナレーションと対話の間、およびその逆の滑らかな移行を確保する
- 適切な場合は洗練された語彙や表現を使用するが、過度に冗長または複雑にならないようにし、同時にトーン性、形式性、世界構築に関する用語集の特定の指示に従うことを確認する
- 文脈とニュアンスによりよく一致するように単語の選択を洗練し、適切な場合は正確または喚起的な代替案を優先する（例：*家 → 屋敷*、*口を開く → 沈黙を破る*、*震え → 震動*、*知らない → 気づかない、ねえ → おい*）
- **最終チェックとして、「これが翻訳物であることを忘れるほど自然か？」と自問してください。情報はすべて含まれているが、不要な蛇足と感じる部分があれば、より洗練された表現にすることで文章の密度を高めてください。**

### 📌 言語の自然さと読みやすさ

- **難しい漢字語や漢語表現の過度な使用を避け、平易なひらがな・和語表現を優先すること**
    - 硬い表現を柔らかい日常語に置き換える（例：「考慮」→「考え」、「確認」→「確かめ」、「理解」→「わかる」）
    - ただし、キャラクターの教養レベル、年齢、立場に応じて語彙の格式を適切に調整
    - 文脈に応じて最も自然で読みやすい表現を選択
- **読点（、）を効果的に活用し、文章のリズムと呼吸を整えること**
    - 長文は適切な箇所で区切り、読みやすさを向上させる
    - 意味のまとまりや息継ぎのポイントを意識して読点を配置
    - 単調なリズムを避け、文章にメリハリをつける
- **助詞の使用を正確にチェックし、不自然な箇所を修正すること**
    - は/が、を/に、へ/に、で/にの使い分けを文脈に応じて最適化
    - 助詞の誤用や不自然な連続を修正
    - 日本語ネイティブが違和感を覚える助詞の使い方を改善
    - 「へ」を使う場合、「に」の方がより相応しいかを確認して選択すること
- **時制表現の適切さを確認すること**
    - 日本語として自然な時制を選択（特に過去進行形「〜していた」の適切な活用）
    - 回想シーンや背景説明での過去形の使い方を確認
    - 動作の継続・持続を表す表現（〜ている/〜ていた）を適切に使い分け

### 📌 スタイルとトーン

- プロフェッショナルに書かれた日本の小説に似たトーンと流れを目指す
- プロフェッショナルに書かれた日本のウェブ小説やライトノベルに似たトーンと流れを目指す
- 過度の簡潔さと冗長さの両方を避ける—簡潔でありながら表現豊かに
- 文字通りの翻訳が不自然または平坦に聞こえる場合は、比喩的または暗示的な言語を使用する
- **キャラクターの年齢、性別、性格、社会的地位・階層に基づいて一貫したトーンと語彙を維持する**
    - 用語集に記載された各キャラクターの情報（年齢、性別、性格）を反映した言葉遣い
    - 特に歴史的なロマンスファンタジーの物語では、貴族または高位のキャラクターにより形式的または古風なスピーチを使用する
    - 人物間の関係性（上下関係、親密度）に応じた適切な敬語・タメ口の使い分け
- 用語集に記載されているジャンル、人口統計、時間設定に適した文体とトーンであることを確認する

### 📌 具体的な指示

- 提供された用語集にリストされているすべてのキャラクター固有の呼称（*호칭*）と**口調**に従う
- 過度に文字通りの体の説明を、より喚起的で感覚ベースの代替案に置き換える
- 繰り返し、矛盾、不自然な単語の組み合わせを避ける
    - 例：「最近」を「2週間前から」と一緒に使用したり、「不気味な」を「不気味に」と組み合わせたりしない
- 歴史的または文脈的に適切な言語を適切な場所で使用する
- 文章を省略しない
- 地の文では「ジキセンお兄さま」ではなく「兄」に訳す

### 📌 重要な要件

- 完全に洗練された日本語のテキストのみを返す - コメント、マークダウンフェンスなし
- ガイドラインに従って可読性と自然な流れを改善するが、元のトーンや意図からあまり離れないこと。**プロットの詳細、対話の行、または完全な文を削除または省略しない - すべての元のコンテンツを保持する必要がある**
- 01、02などとラベル付けされた番号は章を示すので、削除または変更しない

元のすべての部分が含まれていることを確認して、推敲後の本文のみを返す。`,

  layout: `成人向けウェブ小説の翻訳をフォーマットし、すべてのコンテンツを保持してください。

【フォーマット規則】

1. **段落構造**
    - 各段落を最大5文までに制限する
    - 各台詞を新しい行で始める
    - シーン転換を保持する
    - 章マーカーを保持する
    - 間隔を尊重する

2. **台詞のフォーマット**
    - 各話者に新しい行
    - 適切な開始/終了引用符
    - アクションビートを正しく配置する
    - 「-」で始まる文章は「ー」で表記し、かぎかっこ（「 」）は使わない   

3. **句読点とタイポグラフィ**
    - **読点（、）を適切に配置し、文章の呼吸を整えること**
        - 長い文は意味のまとまりごとに区切る
        - 読みやすさを重視した句読点配置
    - \`^_^\`などの不自然な韓国の顔文字を、文脈に合った**日本の顔文字（例：(^^), (T_T), (^_^;)）に置き換えるか、地の文での描写に置き換える**
    - 韓国の句読点を日本式の句読点に変更すること

4. **技術的要件**
    - すべての空白を保持する
    - インデントを維持する
    - 強調マークを保持する
    - ソースからの特別なフォーマットを保持する

5. **コンテンツの整合性**
    - コンテンツの削除なし
    - すべてのシーンをそのまま保持する
    - 成人向けコンテンツを保持する
    - 物語の流れを維持する

6. **日本語読者向けに単位を変換する（読者に優しい丸められた数字を使用）：**

追加のノートなしで、フォーマットされたテキストのみを返す。`,
};
*/

const getDefaultPrompt = (agent: string, language: string) => {
  // Use Japanese prompts for Japanese, English prompts for English
  const prompts = language === 'ja' ? DEFAULT_PROMPTS_JA : DEFAULT_PROMPTS;
  return prompts[agent as keyof typeof prompts] || '';
};

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ 
  isOpen, 
  onClose,
  defaultType = 'translation' 
}) => {
  const { createProject, createTask } = useTranslationStore();
  
  const [projectType, setProjectType] = useState<'translation' | 'glossary'>(defaultType);
  const [name, setName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [language, setLanguage] = useState<'en' | 'ja'>('ja');
  const [glossaryJson, setGlossaryJson] = useState<string>('');
  
  // Settings
  const [chunkSize, setChunkSize] = useState(8000);
  const [overlap, setOverlap] = useState(200);
  const [maxRetries, setMaxRetries] = useState(2);
  const [enableProofreader, setEnableProofreader] = useState(true);
  
  // Custom prompts for each agent
  const [customPrompts, setCustomPrompts] = useState<{
    translation?: string;
    enhancement?: string;
    proofreader?: string;
    layout?: string;
  }>({});
  const [editingPrompt, setEditingPrompt] = useState<{
    agent: 'translation' | 'enhancement' | 'proofreader' | 'layout';
    prompt: string;
  } | null>(null);
  
  // Agent configs (glossary is handled separately via JSON upload)
  const [agentConfigs, setAgentConfigs] = useState<AgentConfigs>({
    translation: { ...defaultAgentConfig },
    enhancement: { ...defaultAgentConfig },
    quality: { ...defaultAgentConfig },
    proofreader: { ...defaultAgentConfig },
    layout: { ...defaultAgentConfig },
  });

  // Update projectType when defaultType changes
  useEffect(() => {
    setProjectType(defaultType);
  }, [defaultType]);

  const handleCreate = async () => {
    if (!name.trim() || !fileContent.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (projectType === 'glossary') {
      // Process glossary with task-based system
      processGlossaryWithTask();
      // Close modal immediately so user can navigate to other pages
      onClose();
    } else {
      // Create translation project
      createProject({
        name: name.trim(),
        type: projectType,
        fileContent: fileContent.trim(),
        chunkSize,
        overlap,
        maxRetries,
        enableProofreader,
        agentConfigs,
        language,
        glossaryJson: glossaryJson || undefined,
        customPrompts: Object.keys(customPrompts).length > 0 ? customPrompts : undefined,
      });

      onClose();
    }
  };

  const processGlossaryWithTask = () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      alert('API Key not found. Please add VITE_GEMINI_API_KEY to your .env file.');
      return;
    }

    // Generate project ID
    const vswProjectId = (globalThis.crypto && 'randomUUID' in globalThis.crypto 
      ? crypto.randomUUID() 
      : `p-${Date.now()}`);
    
    const projectName = name.trim() || `Glossary Project ${new Date().toLocaleString()}`;
    
    // Create placeholder project in vsw.projects
    const raw = localStorage.getItem('vsw.projects') || '[]';
    const arr = JSON.parse(raw);
    const placeholderProject = {
      id: vswProjectId,
      name: projectName,
      updatedAt: Date.now(),
      glossary: {},
      view: {
        entityNodes: [],
        actionEdges: [],
        locationNodes: [],
        textState: [],
        isReadOnly: false,
        relationsPositions: {}
      }
    };
    arr.unshift(placeholderProject);
    localStorage.setItem('vsw.projects', JSON.stringify(arr));
    
    // Create task
    const newTaskId = createTask({
      type: 'glossary_extraction',
      projectId: vswProjectId, // Use the VSW project ID
      metadata: {
        text: fileContent.trim(),
        targetLanguage: language,
        vswProjectId,
      },
    });
    
    // Start task in background
    taskRunner.runTask(newTaskId).catch(error => {
      console.error('Error running glossary extraction:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });

    // Show success message
    alert(`Glossary extraction started! You can monitor progress in the top-right corner. The project "${projectName}" has been created and will be updated as the task completes.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleGlossaryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        try {
          JSON.parse(content); // Validate JSON
          setGlossaryJson(content);
        } catch (error) {
          alert('Invalid JSON file. Please upload a valid glossary JSON.');
        }
      };
      reader.readAsText(file);
    }
  };

  const updateAgentConfig = (agent: keyof AgentConfigs, field: keyof LLMConfig, value: any) => {
    setAgentConfigs(prev => ({
      ...prev,
      [agent]: {
        ...prev[agent],
        [field]: value,
      },
    }));
  };

  return (
    <>
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader>
          Create New Project
        </ModalHeader>
        <ModalBody>
          <Tabs 
            selectedKey={projectType} 
            onSelectionChange={(key) => {
              setProjectType(key as any);
            }}
          >
            <Tab key="translation" title="Translation Project">
              <div className="space-y-4 pt-4">
                <Input
                  label="Project Name"
                  placeholder="My Translation Project"
                  value={name}
                  onValueChange={setName}
                  isRequired
                />

                <Select
                  label="Target Language"
                  selectedKeys={[language]}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'ja')}
                >
                  <SelectItem key="ja" value="ja">Japanese</SelectItem>
                  <SelectItem key="en" value="en">English</SelectItem>
                </Select>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Source Text (Korean)
                  </label>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="mb-2"
                  />
                  <Textarea
                    placeholder="Paste your Korean text here or upload a file"
                    value={fileContent}
                    onValueChange={setFileContent}
                    minRows={6}
                    isRequired
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Chunk Size"
                    type="number"
                    value={chunkSize.toString()}
                    onValueChange={(v) => setChunkSize(Number(v))}
                  />
                  <Input
                    label="Overlap"
                    type="number"
                    value={overlap.toString()}
                    onValueChange={(v) => setOverlap(Number(v))}
                  />
                </div>

                <Input
                  label="Max Retries"
                  type="number"
                  value={maxRetries.toString()}
                  onValueChange={(v) => setMaxRetries(Number(v))}
                />

                <Switch
                  isSelected={enableProofreader}
                  onValueChange={setEnableProofreader}
                >
                  Enable Proofreader
                </Switch>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-3">📚 Glossary (Optional)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Upload a glossary JSON file to use predefined character names, terms, locations, events, and style guides during translation.
                  </p>
                  
                  <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                    <label className="block text-sm font-semibold mb-2 text-blue-900 dark:text-blue-300">
                      📤 Upload Glossary JSON
                    </label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleGlossaryUpload}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100
                        dark:file:bg-blue-900/30 dark:file:text-blue-300
                        cursor-pointer"
                    />
                    {glossaryJson && (() => {
                      try {
                        const parsed = JSON.parse(glossaryJson);
                        const getCount = (items: any) => {
                          if (!items) return 0;
                          return Array.isArray(items) ? items.length : Object.keys(items).length;
                        };
                        
                        const charCount = getCount(parsed.characters);
                        const termCount = getCount(parsed.terms);
                        const placeCount = getCount(parsed.places || parsed.locations);
                        const eventCount = parsed.events?.length || 0;
                        
                        return (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Chip color="success" size="sm" variant="flat">
                                ✓ Glossary Loaded
                              </Chip>
                              <Button
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => setGlossaryJson('')}
                              >
                                Remove
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              {charCount > 0 && (
                                <div className="bg-white dark:bg-gray-700 rounded px-2 py-1">
                                  <span className="font-semibold">{charCount}</span> Characters
                                </div>
                              )}
                              {termCount > 0 && (
                                <div className="bg-white dark:bg-gray-700 rounded px-2 py-1">
                                  <span className="font-semibold">{termCount}</span> Terms
                                </div>
                              )}
                              {placeCount > 0 && (
                                <div className="bg-white dark:bg-gray-700 rounded px-2 py-1">
                                  <span className="font-semibold">{placeCount}</span> Places
                                </div>
                              )}
                              {eventCount > 0 && (
                                <div className="bg-white dark:bg-gray-700 rounded px-2 py-1">
                                  <span className="font-semibold">{eventCount}</span> Events
                                </div>
                              )}
                            </div>
                            {parsed.style_guide && (
                              <div className="text-xs bg-white dark:bg-gray-700 rounded p-2">
                                <span className="font-semibold">Style Guide:</span> {parsed.style_guide.genre || 'N/A'}
                                {parsed.style_guide.content_rating && ` · ${parsed.style_guide.content_rating}`}
                              </div>
                            )}
                          </div>
                        );
                      } catch {
                        return (
                          <div className="mt-2">
                            <Chip color="warning" size="sm" variant="flat">
                              ⚠ Invalid JSON
                            </Chip>
                          </div>
                        );
                      }
                    })()}
                    <p className="text-xs text-gray-500 mt-2">
                      Supports both simple and extended glossary formats (characters, terms, places, events, style_guide, etc.)
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-3">Agent Configuration</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure the LLM models for each translation stage
                  </p>
                  
                  {(['translation', 'enhancement', 'quality', 'proofreader', 'layout'] as const).map(agent => {
                    // Check if this agent has custom prompt capability (not quality)
                    const hasPromptEdit = agent !== 'quality';
                    
                    return (
                      <div key={agent} className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium capitalize">{agent}</h4>
                          {hasPromptEdit && (
                            <Button
                              size="sm"
                              variant="flat"
                              color="secondary"
                              onPress={() => {
                                const promptKey = agent as 'translation' | 'enhancement' | 'proofreader' | 'layout';
                                setEditingPrompt({
                                  agent: promptKey,
                                  prompt: customPrompts[promptKey] || getDefaultPrompt(promptKey, language)
                                });
                              }}
                            >
                              ✏️ Edit Prompt
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Select
                            label="Provider"
                            size="sm"
                            selectedKeys={[agentConfigs[agent]?.provider || 'gemini']}
                            onChange={(e) => updateAgentConfig(agent, 'provider', e.target.value)}
                          >
                            <SelectItem key="gemini" value="gemini">Gemini</SelectItem>
                            <SelectItem key="openai" value="openai">OpenAI</SelectItem>
                            <SelectItem key="anthropic" value="anthropic">Anthropic</SelectItem>
                          </Select>
                          
                          <Input
                            label="Model"
                            size="sm"
                            value={agentConfigs[agent]?.model || ''}
                            onValueChange={(v) => updateAgentConfig(agent, 'model', v)}
                          />
                          
                          <Input
                            label="Temperature"
                            size="sm"
                            type="number"
                            step="0.1"
                            value={agentConfigs[agent]?.temperature?.toString() || '0.3'}
                            onValueChange={(v) => updateAgentConfig(agent, 'temperature', parseFloat(v))}
                          />
                        </div>
                        {hasPromptEdit && customPrompts[agent as keyof typeof customPrompts] && (
                          <div className="mt-2">
                            <Chip size="sm" color="success" variant="flat">
                              ✓ Custom prompt set
                            </Chip>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Tab>

            <Tab key="glossary" title="📚 Glossary Builder">
              <div className="space-y-4 pt-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="text-lg font-semibold mb-2">Create Interactive Glossary Project</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Analyze your story with AI-powered extraction of characters, events, locations, and relationships. 
                    Visualize with interactive graphs and export to JSON.
                  </p>
                </div>

                <Input
                  label="Project Name"
                  placeholder="e.g., My Novel - Chapter 1"
                  value={name}
                  onValueChange={setName}
                  isRequired
                  description="Give your glossary project a descriptive name"
                />

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                  <label className="block text-sm font-semibold mb-3 text-gray-900 dark:text-white">
                    📄 Upload Your Story (Korean Text)
                  </label>
                  
                  <div className="mb-3">
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-purple-50 file:text-purple-700
                        hover:file:bg-purple-100
                        dark:file:bg-purple-900/30 dark:file:text-purple-300
                        cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a .txt file containing your Korean novel or story
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-gray-50 dark:bg-gray-800/50 text-gray-500">OR</span>
                    </div>
                  </div>

                  <Textarea
                    placeholder="Paste your Korean text here...&#10;&#10;Example:&#10;김민수는 25살의 용감한 모험가다. 그는 검술의 달인이며, 마법사 이서연과 함께 여행한다..."
                    value={fileContent}
                    onValueChange={setFileContent}
                    minRows={8}
                    isRequired
                    classNames={{
                      input: "text-sm"
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {fileContent.length > 0 
                      ? `${fileContent.length} characters (~ ${Math.round(fileContent.length / 8000)} chunks)`
                      : 'Text will be processed in chunks of ~8000 characters'}
                  </p>
                </div>

                <Select
                  label="Target Language for Translation"
                  selectedKeys={[language]}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'ja')}
                  description="The language you plan to translate this story into"
                >
                  <SelectItem key="ja" value="ja">Japanese (日本語)</SelectItem>
                  <SelectItem key="en" value="en">English</SelectItem>
                </Select>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>💡 Using Gemini 3 Pro Preview</strong> for intelligent analysis. 
                    The AI will extract characters, events, locations, terms, relationships, and story structure.
                  </p>
                  <p className="text-xs text-blue-800 dark:text-blue-300 mt-2">
                    <strong>📊 Background Processing:</strong> Once created, the task will run in the background. 
                    You can monitor progress in the top-right corner and navigate to other pages while it processes.
                  </p>
                </div>
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button 
            variant="light" 
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button 
            color="primary" 
            onPress={handleCreate}
            isDisabled={!name.trim() || !fileContent.trim()}
          >
            Create Project
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {/* Edit Prompt Modal */}
    {editingPrompt && (
      <Modal
        isOpen={!!editingPrompt}
        onClose={() => setEditingPrompt(null)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            Edit {editingPrompt.agent.charAt(0).toUpperCase() + editingPrompt.agent.slice(1)} Prompt
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>💡 Tip:</strong> You can customize the prompt below. Leave it as is to use the default prompt.
                  The prompt will be used during the {editingPrompt.agent} stage of translation.
                </p>
              </div>
              
              <Textarea
                value={editingPrompt.prompt}
                onValueChange={(v) => setEditingPrompt(prev => prev ? { ...prev, prompt: v } : null)}
                minRows={20}
                maxRows={30}
                placeholder="Enter your custom prompt here..."
                classNames={{
                  input: "font-mono text-sm"
                }}
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  color="warning"
                  onPress={() => {
                    if (editingPrompt) {
                      setEditingPrompt({
                        ...editingPrompt,
                        prompt: getDefaultPrompt(editingPrompt.agent, language)
                      });
                    }
                  }}
                >
                  Reset to Default
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => {
                    if (editingPrompt) {
                      setCustomPrompts(prev => {
                        const newPrompts = { ...prev };
                        delete newPrompts[editingPrompt.agent];
                        return newPrompts;
                      });
                      setEditingPrompt(null);
                    }
                  }}
                >
                  Use Default (Remove Custom)
                </Button>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setEditingPrompt(null)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={() => {
                if (editingPrompt) {
                  setCustomPrompts(prev => ({
                    ...prev,
                    [editingPrompt.agent]: editingPrompt.prompt
                  }));
                  setEditingPrompt(null);
                }
              }}
            >
              Save Prompt
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )}
    </>
  );
};

