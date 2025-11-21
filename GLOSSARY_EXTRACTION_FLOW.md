# Glossary Extraction Flow - Complete Overhaul

## 🎯 목표

**Arc별 등장인물 정보가 완전하게 추출되고 인터페이스에 표시되도록 flow 개선**

## 📊 새로운 2단계 Flow

### Phase 1: extractFromChunk - 최대한 상세하게 추출
**철학: "지금은 다 넣고, 나중에 정리하자"**

```
Chunk 텍스트 → LLM 분석 → 최대한 상세한 정보 추출
```

#### 주요 개선사항:

1. **CHARACTERS - 모든 등장인물 완전 추출**
   ```typescript
   ✅ ALWAYS 추출:
   - name, korean_name (필수)
   - age, gender, role, emoji
   - speech_style (상세: 형식 + 구체적 예시)
   - physical_appearance (모든 외형 특징)
   - personality (2-3 문장)
   - traits (모든 특성 배열)
   
   ✅ 언급되면 추출:
   - name_variants (모든 호칭/별명)
   - occupation, abilities
   - description
   
   💡 철학:
   - 보조 캐릭터도 상세히 추출
   - 중복 OK (consolidation에서 정리)
   - 정보 부족보다 과잉이 낫다
   ```

2. **RELATIONSHIPS - 모든 상호작용 추출**
   ```typescript
   ✅ 모든 관계에 포함:
   - character_a, character_b (정확한 이름)
   - addressing (A가 B를 부르는 정확한 호칭)
   - relationship_type (세부 분류)
   - description (2-3 문장)
   - sentiment (감정)
   
   💡 철학:
   - 사소한 상호작용도 추출
   - 필터링은 consolidation에서
   ```

3. **KEY EVENTS - 모든 중요 사건 추출**
   ```typescript
   ✅ 5-10개 이벤트
   - 캐릭터 성격 드러내는 사건
   - 플롯 진행 사건
   - 관계 형성/변화 사건
   ```

4. **TERMS - 번역 관련 모든 용어**
   ```typescript
   ✅ 추출 대상:
   - 문화 용어, 마법 체계, 칭호, 고유명사
   - 관용구, 은어
   - category + context 포함
   ```

#### 프롬프트 핵심 변경:
```typescript
// Before: "Only extract NEW characters"
// After: "Extract EVERY character with COMPLETE information"

// Before: "3-5 major plot points"
// After: "5-10 events that happen in this chunk"

// Before: "Translation-critical vocabulary ONLY"
// After: "ALL potentially translation-relevant vocabulary"
```

### Phase 2: consolidateArcs - 정리하고 완전성 보장
**철학: "정리하되, 각 arc에 완전한 정보 유지"**

```
여러 chunk 추출 결과 → Character DB 구축 → Arc별 완전한 character 배치
```

#### 주요 개선사항:

**1. Character Database 구축 (NEW)**
```typescript
// 모든 arc의 character를 순회하며 완전한 DB 구축
characterMap: Map<string, GlossaryCharacter>

// 각 character에 대해:
- 여러 arc에서 나온 정보 병합
- speech_style: 가장 긴/상세한 것 선택
- physical_appearance: 가장 긴/상세한 것 선택
- personality: 가장 긴/상세한 것 선택
- traits: 모든 arc의 traits 합집합
- name_variants: 모든 arc의 variants 병합
```

**2. Arc별 Character 완전 배치 ⭐ 핵심 ⭐**
```typescript
LLM 프롬프트 강조:
"**Step B: Populate EACH arc's characters array**
 - For EACH arc, look at who appears in that arc
 - For EACH character in that arc, include COMPLETE merged character object
 - Same character appears in multiple arcs → Include COMPLETE info in EACH arc
 - NO SHORTCUTS: Every arc.characters must have full GlossaryCharacter objects"

코드 레벨 보장:
1. LLM 응답에서 character 파싱
2. Character name으로 characterMap에서 full character 찾기
3. Full character + arc-specific metadata 반환
4. Fallback: LLM이 제공한 complete object 사용
5. Last resort: Minimal object (with warning)
```

**3. Character 매핑 로직 강화**
```typescript
// Before: 간단한 name lookup
const fullChar = characterMap.get(charName);

// After: 다중 lookup + 병합 로직
1. English name으로 lookup
2. Korean name으로 lookup  
3. LLM이 제공한 complete character 체크
4. 모든 경로에서 실패 시에만 minimal object

// 로깅 강화
console.log('✅ Found full character: ${fullChar.name}');
console.warn('⚠️ Creating minimal character for: ${char.name}');
```

## 🔍 디버깅 & 로깅

### extractFromChunk
```typescript
✅ Chunk ${chunkIndex}: Extracted ${arcs.length} arcs
   Arc 0: ${arc.name} - ${arc.characters.length} chars, ${arc.events.length} events
```

### consolidateArcs
```typescript
🗂️ Building character database from original arcs...
   Arc 0: Admission to Kizen - 3 characters
     ✅ Added: Simon Polentia (시몬 폴렌티아)
     ✅ Added: Nephthys Archbold (네프티스 아크볼드)

📊 Character database: 10 unique characters
   - simon polentia: 시몬 폴렌티아 [protagonist]
   - nephthys archbold: 네프티스 아크볼드 [major]

🔍 Processing consolidated arc 0: Admission to Kizen
   - Relationships in parsed arc: 2
     Character 0: {"name":"Simon Polentia","korean_name":"시몬 폴렌티아"...
       ✅ Found full character: Simon Polentia
     Character 1: {"name":"Nephthys Archbold"...
       ✅ Found full character: Nephthys Archbold

✅ Arc consolidation complete
📊 Arc 0: Admission to Kizen
   - Characters: 3
   - Relationships: 2
   - Events: 5
   - Terms: 4
     Rel 0: Simon Polentia → Nephthys Archbold [Nephthys-nim]
```

## 📋 결과 구조

### Arc 구조 예시:
```json
{
  "id": "admission-arc",
  "name": "Admission to Kizen",
  "description": "Simon's journey...",
  "theme": "New beginnings",
  "start_chunk": 0,
  "end_chunk": 5,
  "characters": [
    {
      "id": "char-simon",
      "name": "Simon Polentia",
      "korean_name": "시몬 폴렌티아",
      "age": "teenager",
      "gender": "male",
      "speech_style": "Polite and formal with elders using 입니다/습니다 endings, casual with peers",
      "physical_appearance": "Young boy with distinctive mixed heritage features, fit build, dark hair",
      "personality": "Curious, determined, adaptable. Respectful of authority but confident among peers.",
      "traits": ["genius", "mixed heritage", "necromancer", "adaptable"],
      "name_variants": {"title": "Special Admission No.1"},
      "emoji": "👦",
      "role": "protagonist",
      "first_appearance_arc": "Admission to Kizen",
      "role_in_arc": "protagonist",
      "first_appearance": true
    },
    {
      "id": "char-nephthys",
      "name": "Nephthys Archbold",
      "korean_name": "네프티스 아크볼드",
      "age": "30s",
      "speech_style": "Mature and confident, formal but warm",
      "physical_appearance": "Elegant woman with long silver hair",
      "personality": "Protective mentor figure, perceptive",
      "traits": ["mentor", "powerful", "caring"],
      "emoji": "👩‍🏫",
      "role": "major",
      "first_appearance_arc": "Admission to Kizen",
      "role_in_arc": "mentor",
      "first_appearance": true
    }
  ],
  "relationships": [
    {
      "character_a": "Simon Polentia",
      "character_b": "Nephthys Archbold",
      "relationship_type": "mentor/student",
      "description": "Nephthys scouts Simon and acts as his mentor and protector.",
      "sentiment": "positive",
      "addressing": "Nephthys-nim"
    }
  ],
  "key_events": [
    "Simon is discovered on Earth by Nephthys",
    "Simon enters Kizen Academy",
    "Simon learns necromancy basics"
  ],
  "terms": [
    {
      "id": "term-chilheuk",
      "original": "칠흑",
      "translation": "Jet-Black",
      "context": "Dark mana source for necromancers",
      "category": "magic"
    }
  ]
}
```

## ✅ 해결되는 문제들

### Before (문제):
❌ Arc에서 character가 추출되지만 불완전한 정보
❌ Consolidation 후 character 정보 손실
❌ Arc.characters에 name만 있거나 minimal object만
❌ Relationship Graph에 노드 표시 안 됨
❌ Character Arc Matrix 비어있음

### After (해결):
✅ Chunk에서 모든 character 완전 추출
✅ Character DB에서 정보 병합
✅ 각 arc.characters에 완전한 GlossaryCharacter 객체
✅ Relationship Graph에 모든 캐릭터 + 관계 표시
✅ Character Arc Matrix 완전 작동
✅ 호칭 정보 모두 포함
✅ 디버깅 로그로 전 과정 추적 가능

## 🧪 테스트 방법

### 1. Console 로그 확인:
```typescript
// Chunk 추출 시
✅ "Extracted 1 arcs"
✅ "Arc 0: ... - 3 chars, 5 events"

// Consolidation 시
✅ "Building character database..."
✅ "Added: Simon Polentia"
✅ "Character database: 10 unique characters"
✅ "Found full character: Simon Polentia"
✅ "Characters: 3" (각 arc마다)
```

### 2. Characters 탭 확인:
- [ ] 모든 추출된 캐릭터 표시
- [ ] 각 캐릭터의 상세 정보 (말투, 외형, 성격)
- [ ] Name variants, traits 표시
- [ ] 중복 없음

### 3. Arc Relationship Graph 확인:
- [ ] 모든 캐릭터 노드 표시
- [ ] 관계 엣지 표시
- [ ] 엣지에 호칭 표시
- [ ] 클릭 시 상세 정보

### 4. Character Arc Matrix 확인:
- [ ] 캐릭터 × Arc 매트릭스
- [ ] 출현 정보 표시
- [ ] ⭐ 첫 등장 표시
- [ ] 관계 개수 표시

### 5. Arcs 탭 확인:
- [ ] 각 arc의 characters 리스트
- [ ] 각 arc의 relationships (호칭 포함)
- [ ] Key events 표시

## 🎯 핵심 원칙

1. **Phase 1 (Extract): 더 많이, 더 상세하게**
   - 중복 걱정 말고 모든 정보 추출
   - 사소해 보여도 추출
   - Better too much than too little

2. **Phase 2 (Consolidate): 병합하되, 복제는 유지**
   - Character 정보는 병합 (중복 제거)
   - 각 arc에는 완전한 character 복제
   - Arc-specific 정보는 분리 (role_in_arc, first_appearance)

3. **데이터 완전성 최우선**
   - Minimal fallback은 마지막 수단
   - 모든 단계에서 완전한 객체 유지
   - 로그로 문제 조기 발견

4. **Translation-focused**
   - 번역에 필요한 정보 우선
   - 호칭, 말투, 관계 상세히
   - Locations는 제거 (불필요)

## 🚀 기대 효과

### 인터페이스 개선:
1. ✅ Characters 탭: 완전한 캐릭터 정보
2. ✅ Arc Relationship Graph: 모든 노드 + 엣지 + 호칭
3. ✅ Character Arc Matrix: 완전한 출현 정보
4. ✅ Arcs 탭: 상세한 관계 정보

### 번역 작업 개선:
1. ✅ 각 arc의 캐릭터 관계 명확히 파악
2. ✅ 호칭 변화 추적 가능
3. ✅ 말투 특징 참고 가능
4. ✅ 캐릭터 성격/외형 일관성 유지

### 개발 경험 개선:
1. ✅ 상세한 로그로 디버깅 용이
2. ✅ 각 단계 결과 추적 가능
3. ✅ 문제 발생 시 조기 발견

이제 glossary extraction이 완전하게 작동합니다! 🎉

