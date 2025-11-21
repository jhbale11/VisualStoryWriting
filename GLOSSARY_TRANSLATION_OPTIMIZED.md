# Translation-Optimized Glossary Structure

## 개요

Glossary Builder가 **번역에 최적화된 간결한 구조**로 재설계되었습니다. 기존의 복잡한 구조에서 벗어나 LLM이 중요한 정보를 온전히 추출하고, 번역자가 쉽게 참고할 수 있는 JSON 형태로 개선되었습니다.

## 🆕 최신 개선사항 (2025-11-21)

### ✅ 중복 제거 및 정보 최적화
- **캐릭터 중복 완전 제거**: 같은 캐릭터가 여러 arc에 중복 등장하지 않음
- **빈 필드 제거**: description, personality 등 정보 없는 필드는 JSON에서 제외
- **Arc별 관계 추적**: 각 arc에서 형성/변화하는 관계만 추출

### ✅ 프롬프트 개선
- **Extraction Prompt**: 영어로 변경, 명확한 추출 규칙 제시
  - "NEW characters only" - 이전 chunk에서 등장한 캐릭터 재추출 방지
  - "NEW or CHANGED relationships only" - 중복 관계 방지
  - Required vs Optional 필드 명확히 구분
  
- **Consolidation Prompt**: 통합 로직 강화
  - 캐릭터 정보 완전 병합 (모든 arc의 정보 통합)
  - Arc별 관계 유지 (관계 변화 추적 가능)
  - 빈 필드/배열 자동 제거
  - **Relationship 보존 로직**: LLM이 relationships를 누락하면 원본 arcs에서 자동 복구

### ✅ UI 강화
- **Arc Relationship Graph**: 호칭 정보 명시적 표시
  - 엣지 라벨에 관계 + 호칭 표시
  - 상세 정보 패널에 호칭 강조
  - 디버깅 로그로 관계 추적
  
- **Character Arc Matrix**: 출현 정보 시각화
  - 첫 등장 표시 (⭐)
  - 관계 개수 표시
  - 출현 통계 제공

- **Arc 목록 개선**: 관계 정보 상세 표시
  - 관계 유형, 호칭, 설명 모두 표시
  - 관계 없는 경우 안내 메시지
  - 더 나은 시각적 레이아웃

### ✅ 디버깅 및 로깅 강화
- Consolidation 과정에서 relationships 추적
- Arc별 관계 개수 로깅
- Graph 생성 시 relationships 확인
- 캐릭터 매칭 실패 시 상세 로그

### ✅ Extraction Flow 완전 개편 (2025-11-21 최신)

#### Phase 1: extractFromChunk - 최대한 상세하게
- **철학**: "지금은 다 넣고, 나중에 정리"
- **Characters**: 모든 캐릭터의 완전한 정보 추출
  - 필수: name, korean_name, age, speech_style, physical_appearance, personality, traits
  - 선택: name_variants, occupation, abilities, gender
  - 중복 OK - consolidation에서 처리
- **Relationships**: 모든 상호작용 추출 (addressing 필수)
- **Events**: 5-10개 이벤트 (캐릭터/플롯/관계 관련)
- **Terms**: 모든 번역 관련 용어

#### Phase 2: consolidateArcs - 정리 및 완전성 보장
- **Character Database 구축**:
  - 모든 arc의 character 정보 병합
  - 가장 긴/상세한 필드 선택
  - Traits/name_variants 합집합
  
- **Arc별 Character 완전 배치** ⭐ 핵심:
  - 각 arc.characters에 **완전한 GlossaryCharacter 객체**
  - 같은 character가 여러 arc에 등장 → 각 arc에 완전한 정보 복제
  - LLM 프롬프트에 명시적 지시
  - 코드 레벨에서 3단계 fallback (characterMap → LLM object → minimal)

- **Character 매핑 로직 강화**:
  - English name + Korean name 이중 lookup
  - LLM 제공 complete object 체크
  - 상세한 로깅으로 추적

#### 결과:
- ✅ Arc.characters에 완전한 정보
- ✅ Relationship Graph 완전 작동
- ✅ Character Arc Matrix 완전 작동
- ✅ 호칭 정보 완전 표시
- ✅ 디버깅 로그 완비

#### Locations 완전 제거:
- Locations 탭 제거 (번역에 불필요)
- Location 관련 import/통계 제거

## 🎯 주요 개선사항

### 1. **Characters (인물) - 최우선 추출**

번역에 필수적인 인물 정보를 우선적으로 추출합니다:

#### 필수 필드
- `name` (영문): 인물의 영문 이름
- `korean_name`: 한글 원문 이름
- `age`: 연령대 (20대, 30대, 청소년 등)
- `speech_style`: **말투 특징** (존댓말 사용, 반말, 거친 말투 등)

#### 중요 필드
- `physical_appearance`: 외형 특징
- `name_variants`: **별명/호칭 변형** (별명, 정식 호칭 등)

#### JSON 예시
```json
{
  "id": "char-1",
  "name": "Kim Min-ho",
  "korean_name": "김민호",
  "age": "20대",
  "speech_style": "존댓말 사용, 공손한 말투",
  "physical_appearance": "키가 크고 검은 머리",
  "name_variants": {
    "nickname": "민호형",
    "formal_address": "김 대리"
  },
  "emoji": "😊",
  "role": "protagonist"
}
```

### 2. **Arc Relationships (관계) - 호칭 정보 포함**

Character 간의 관계에서 **호칭 정보**를 명시적으로 추출합니다:

#### 핵심 필드
- `character_a`: 관계의 주체
- `character_b`: 관계의 대상
- `addressing`: **A가 B를 부르는 호칭** (형, 언니, 선배님 등)
- `relationship_type`: 관계 유형 (friend, family, enemy, romantic)
- `description`: 관계 설명
- `sentiment`: positive/negative/neutral

#### JSON 예시
```json
{
  "character_a": "김민호",
  "character_b": "박지수",
  "relationship_type": "friend",
  "description": "친구 사이이며 김민호가 박지수를 형으로 부름",
  "sentiment": "positive",
  "addressing": "형"
}
```

### 3. **Key Events (주요 사건) - 간결하게**

번역 시 문맥 이해에 필요한 핵심 사건만 3-5개 추출합니다:

```json
{
  "key_events": [
    "주인공이 새로운 능력을 각성함",
    "라이벌과의 첫 대결",
    "숨겨진 진실이 드러남"
  ]
}
```

### 4. **Terms (용어) - 번역 주의 필요**

번역 주의가 필요한 한글 용어만 추출 (문화적/고유명사):

```json
{
  "terms": [
    {
      "original": "수능",
      "translation": "College Scholastic Ability Test (CSAT)",
      "context": "Korean university entrance exam",
      "category": "cultural"
    },
    {
      "original": "선배님",
      "translation": "senior + honorific",
      "context": "Respectful address for upperclassman",
      "category": "cultural"
    }
  ]
}
```

### 5. **Story Features (작품 특징)**

#### Genre & Style
```json
{
  "style_guide": {
    "genre": "fantasy romance",
    "tone": "serious with light moments",
    "narrative_style": {
      "point_of_view": "third-person",
      "tense": "past"
    }
  }
}
```

#### Honorifics (경어 패턴)
```json
{
  "honorifics": {
    "님": "formal honorific suffix",
    "선배": "senior/upperclassman",
    "씨": "neutral honorific suffix"
  }
}
```

#### Recurring Phrases (반복 구문)
```json
{
  "recurring_phrases": {
    "그 순간": "at that moment",
    "몸을 떨었다": "trembled"
  }
}
```

## 🔄 추출 프로세스

### 1. Chunk 단위 추출 (`extractFromChunk`)

각 텍스트 chunk에서 **새로 등장하는** 정보만 추출:

**🎯 핵심 원칙:**
- ✅ NEW characters only (중복 방지)
- ✅ NEW or CHANGED relationships only
- ✅ Required fields만 채움 (빈 필드 제거)
- ✅ 명확한 정보만 추출

**추출 우선순위:**
1. **CHARACTERS** - 처음 등장하는 인물만 상세 추출
   - name, korean_name, age, speech_style (필수)
   - physical_appearance, personality, traits, name_variants (중요)
   - ❌ 반복 등장 캐릭터는 추출 안 함

2. **RELATIONSHIPS** - Arc에서 새로 형성되거나 변화하는 관계만
   - addressing (호칭) 필수 포함
   - description: 관계의 특징 1문장
   - ❌ 이전 arc와 동일한 관계는 추출 안 함

3. **KEY EVENTS** - 번역 문맥 필수 사건만 3-5개

4. **TERMS** - 번역 주의 용어만 (일반 단어 제외)

5. **STORY FEATURES** - genre, tone, narrative style

### 2. Consolidation (`consolidateArcs`)

여러 chunk의 결과를 통합하고 정리:

**🎯 통합 원칙:**
- **NO duplicates**: 같은 캐릭터/용어 중복 완전 제거
- **Arc-specific relationships**: 각 arc의 관계 유지
- **Clean output**: 빈 필드/배열 모두 제거

**통합 작업:**
1. **Arc 통합**: 5-8개로 병합, 시간순 정렬
2. **Character 통합**: 
   - 같은 캐릭터를 하나로 통합
   - 모든 arc의 정보 병합 (traits, name_variants 등)
   - first_appearance_arc 추가
3. **Relationship 정리**: 
   - Arc별로 유지 (관계 변화 추적)
   - addressing 정보 보존
4. **Terms 통합**: 중복 제거, 20-30개로 제한

## 📊 UI 개선사항

### 1. Character 카드 (개별 인물 정보) ✅
- **Arc에서 추출된 모든 캐릭터 표시**
- **연령** 명확히 표시
- **말투 특징** 강조 (파란색 박스로 구분)
- **호칭/별명** 태그로 표시 (name_variants)
- **외형** 정보 별도 섹션
- **빈 필드 숨김** (정보 없으면 표시 안 함)
- **중복 제거**: 같은 캐릭터는 한 번만 표시

### 2. Arc Relationship Graph (관계 시각화) ✅ 개선됨
- **Arc.characters 직접 사용**: 완전한 캐릭터 객체
- **노드**: 캐릭터별 이모지 + 이름 + 한글명
- **엣지**: 관계 유형 + 호칭 표시
  - 라벨에 호칭 표시: `friend\n[형]`
  - 색상: 긍정적(녹색), 부정적(빨강), 중립(회색)
- **상세 정보 패널**:
  - 💬 호칭 전용 섹션
  - "Simon → Nephthys: '네프티스님'"
  - 관계 설명 전체 표시
- **디버깅 로그**: 캐릭터/관계 추적

### 3. Character Arc Matrix (출현 매트릭스) ✅
- **캐릭터 × Arc** 교차 표시
- **Arc.characters에서 직접 매칭**
- **셀 색상**:
  - 진한 파랑: 관계가 있는 주요 등장
  - 연한 파랑: 등장만
  - 회색: 미등장
- **⭐ 첫 등장** 표시
- **관계 개수** 표시 (우측 하단)
- **출현 횟수** 집계
- **출현 통계** 요약

### 4. Arc 목록 (Arcs 탭) ✅ 개선됨
- **Characters** 역할과 함께 표시
- **Relationships** 상세 정보:
  ```
  Kim Min-ho ↔️ Park Ji-su
  유형: friend
  호칭: "형"
  친구 사이이며...
  ```
- **Key Events** 리스트
- **Terms** 상세 정보 (category 포함)
- **관계 없으면** 안내 메시지 표시

### 5. Terms 목록 ✅
- **Category** 표시 (cultural/magic/title 등)
- **한글 → 영문** 명확히 구분
- **Context** 설명 추가
- 중복 완전 제거

### ❌ 제거된 기능
- **Locations 탭**: 번역에 불필요하여 제거
- Locations 통계 제거
- Location 관련 UI 완전 제거

## 🎨 데이터 구조

### 전체 Glossary JSON 구조

```json
{
  "arcs": [
    {
      "id": "arc-1",
      "name": "Arc Name",
      "description": "Brief description",
      "theme": "main theme",
      "start_chunk": 0,
      "end_chunk": 5,
      "characters": [ /* full character objects */ ],
      "relationships": [ /* with addressing field */ ],
      "key_events": [ /* brief event strings */ ],
      "background_changes": [ /* setting changes */ ],
      "terms": [ /* translation terms */ ]
    }
  ],
  "story_summary": {
    "logline": "One-sentence summary",
    "blurb": "Short paragraph summary"
  },
  "honorifics": {
    "한글경어": "English explanation"
  },
  "recurring_phrases": {
    "한글구문": "English translation"
  },
  "style_guide": {
    "genre": "genre",
    "tone": "tone",
    "narrative_style": {
      "point_of_view": "first/third-person",
      "tense": "past/present"
    }
  }
}
```

## ✅ 번역 시 활용 방법

### 1. Character 참조
- 인물 등장 시 `name`, `korean_name` 확인
- `speech_style`을 참고하여 대사 톤 조절
- `name_variants`로 호칭 일관성 유지

### 2. Relationship 참조
- `addressing` 필드로 호칭 번역
- `sentiment`로 관계 톤 파악

### 3. Terms 참조
- `category`별로 번역 전략 수립
- `context`로 용어 사용 맥락 이해

### 4. Style Guide 참조
- `narrative_style`에 맞춰 전체 톤 조정
- `honorifics`로 경어 번역 패턴 결정
- `recurring_phrases`로 반복 표현 일관성 유지

## 🚀 사용 예시

### Glossary 추출
1. Translation 프로젝트에서 Glossary Builder 진입
2. 텍스트 입력 후 "Extract Glossary" 실행
3. 자동으로 번역 최적화 구조로 추출

### 번역 적용
1. 추출된 glossary를 번역 워크플로우에 입력
2. LLM이 glossary 참조하여 일관성 있는 번역 생성
3. Character 말투, 호칭, 용어 자동 반영

## 📝 주의사항

### 추출 제외 대상
- ❌ 과도한 설명
- ❌ 사소한 사건
- ❌ 일반적인 단어
- ❌ 번역 불필요한 용어

### 최적화 목표
- ✅ 간결함: 각 항목 1-2문장
- ✅ 핵심만: 번역 필수 정보만
- ✅ 일관성: 명확한 JSON 구조
- ✅ 실용성: LLM이 쉽게 파싱

## 🤖 AI 모델

Glossary Builder는 **Google Gemini 3 Pro Preview** 모델을 사용합니다:
- 모델: `gemini-3-pro-preview`
- 용도: Chunk 단위 정보 추출 및 Arc 통합
- 장점: 향상된 이해력과 정확한 JSON 생성

## 🔧 기술 상세

### Interface 변경사항

```typescript
// GlossaryArc relationship에 addressing 필드 추가
relationships: Array<{
  character_a: string;
  character_b: string;
  relationship_type: string;
  description: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  addressing?: string; // 🆕 호칭 정보
}>;

// Terms에 category 필드 명시
terms: Array<{
  original: string;
  translation: string;
  context: string;
  category?: string; // 🆕 용어 분류
}>;
```

### Prompt 최적화
- Chunk 추출: 우선순위 기반 간결한 지시
- Consolidation: 번역자 중심 정리 지시
- JSON 형식: 명확한 예시 제공

## 📖 참고 문서

- `src/model/GlossaryModel.tsx`: Core glossary extraction logic
- `src/view/GlossaryBuilder.tsx`: UI and display logic
- Translation workflow에서 glossary 활용 방법은 `TRANSLATION_README.md` 참조

