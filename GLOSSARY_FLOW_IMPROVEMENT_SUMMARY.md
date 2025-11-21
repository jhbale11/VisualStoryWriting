# Glossary Extraction Flow 완전 개선 요약

## 🎯 문제

사용자 보고:
> "인터페이스 상의 arc 별 관계도와 등장인물 출현 매트릭스 부분이 여전히 제대로 보여지고 있지 않아..!"

**근본 원인**:
- Chunk 추출 시 정보가 불완전
- Consolidation 시 character 정보 손실
- Arc.characters에 incomplete object만 저장됨

## 🔧 해결책: 2단계 Flow 완전 개편

### Phase 1: extractFromChunk
**변경 전**: "Only extract NEW characters"
**변경 후**: "Extract EVERY character with COMPLETE information"

```typescript
// 프롬프트 개선
1. **CHARACTERS** - 모든 등장인물 완전 추출
   ✅ ALWAYS 추출:
   - name, korean_name, age, gender, role, emoji
   - speech_style (상세 + 구체적 예시)
   - physical_appearance (모든 특징)
   - personality (2-3 문장)
   - traits (모든 특성)
   
   💡 중복 OK - Better too much than too little

2. **RELATIONSHIPS** - 모든 상호작용 추출
   ✅ addressing (정확한 호칭) 필수
   ✅ 2-3 문장 상세 설명

3. **EVENTS** - 5-10개 이벤트
4. **TERMS** - 모든 번역 관련 용어
```

### Phase 2: consolidateArcs
**핵심**: 각 arc.characters에 완전한 GlossaryCharacter 객체 보장

#### Step 1: Character Database 구축
```typescript
// 새로운 로직 추가
const characterMap = new Map<string, GlossaryCharacter>();
const characterByKoreanName = new Map<string, GlossaryCharacter>();

arcs.forEach(arc => {
  arc.characters.forEach(char => {
    // 정보 병합
    const existing = characterMap.get(char.name.toLowerCase());
    if (existing) {
      // 가장 긴/상세한 필드 선택
      characterMap.set(key, {
        ...existing,
        speech_style: longer(char.speech_style, existing.speech_style),
        physical_appearance: longer(...),
        personality: longer(...),
        traits: [...union of all traits],
        name_variants: {...merge}
      });
    } else {
      characterMap.set(key, char);
    }
  });
});

// Result: 완전한 character database
```

#### Step 2: LLM 프롬프트 강화
```typescript
**2. COMPLETE CHARACTERS IN EACH ARC ⭐ CRITICAL ⭐**
   
   **Step A: Build character database**
   - Merge all information from different arcs
   - Take longest/most detailed fields
   
   **Step B: Populate EACH arc's characters array**
   - For EACH character in that arc, include COMPLETE merged character object
   - Same character appears in multiple arcs → Include COMPLETE info in EACH arc
   - NO SHORTCUTS: Every arc.characters must have full GlossaryCharacter objects
   
   Example: [complete character object with all fields]
   
   💡 KEY POINT: Same character in multiple arcs → COMPLETE info in EACH
```

#### Step 3: Character 매핑 로직 강화
```typescript
characters: (arc.characters || []).map((char: any) => {
  // 1차: English name lookup
  let fullChar = characterMap.get(char.name.toLowerCase());
  
  // 2차: Korean name lookup
  if (!fullChar && char.korean_name) {
    fullChar = characterByKoreanName.get(char.korean_name.toLowerCase());
  }
  
  if (fullChar) {
    console.log(`✅ Found full character: ${fullChar.name}`);
    return {
      ...fullChar,  // 완전한 character 정보
      role_in_arc: char.role_in_arc || fullChar.role,
      first_appearance: char.first_appearance
    };
  }
  
  // 3차: LLM이 제공한 complete object 체크
  if (char.name && char.korean_name && char.speech_style) {
    console.log(`ℹ️ Using LLM-provided character data: ${char.name}`);
    return { ...char, /* complete object */ };
  }
  
  // 마지막: Minimal fallback (with warning)
  console.warn(`⚠️ Creating minimal character for: ${char.name}`);
  return minimalCharacter;
})
```

## 📊 결과 비교

### Before (문제):
```typescript
// Arc.characters에 불완전한 정보
arc.characters = [
  {
    id: "char-simon",
    name: "Simon Polentia",
    korean_name: "시몬 폴렌티아",
    // 나머지 필드 대부분 비어있음
  }
]

// 결과
❌ Relationship Graph: 노드 없음
❌ Character Arc Matrix: 비어있음
❌ Characters 탭: 정보 부족
```

### After (해결):
```typescript
// Arc.characters에 완전한 정보
arc.characters = [
  {
    id: "char-simon",
    name: "Simon Polentia",
    korean_name: "시몬 폴렌티아",
    age: "teenager",
    gender: "male",
    speech_style: "Polite and formal with elders using 입니다/습니다...",
    physical_appearance: "Young boy with distinctive mixed heritage...",
    personality: "Curious, determined, and adaptable...",
    traits: ["genius", "mixed heritage", "necromancer", "adaptable"],
    name_variants: {"title": "Special Admission No.1"},
    emoji: "👦",
    role: "protagonist",
    // ... 모든 필드 완전
  }
]

// 결과
✅ Relationship Graph: 모든 캐릭터 노드 + 관계 엣지 표시
✅ Character Arc Matrix: 완전한 출현 정보
✅ Characters 탭: 상세한 캐릭터 정보
✅ Arcs 탭: 관계 정보 (호칭 포함)
```

## 🔍 디버깅 로그 예시

### Extraction (Phase 1):
```
🔄 Processing chunk 0...
✅ Chunk 0: Extracted 1 arcs
   Arc 0: Admission to Kizen - 3 chars, 5 events, 2 locations, 4 terms
```

### Consolidation (Phase 2):
```
🗂️ Building character database from original arcs...
   Arc 0: Admission to Kizen - 3 characters
     ✅ Added: Simon Polentia (시몬 폴렌티아)
     ✅ Added: Nephthys Archbold (네프티스 아크볼드)
     ✅ Added: Lorain Archbold (로레인 아크볼드)

📊 Character database: 10 unique characters
   - simon polentia: 시몬 폴렌티아 [protagonist]
   - nephthys archbold: 네프티스 아크볼드 [major]
   - ...

🔍 Processing consolidated arc 0: Admission to Kizen
   - Relationships in parsed arc: 2
     Character 0: {"name":"Simon Polentia","korean_name":"시몬 폴렌티아"...
       ✅ Found full character: Simon Polentia
     Character 1: {"name":"Nephthys Archbold"...
       ✅ Found full character: Nephthys Archbold
     Character 2: {"name":"Lorain Archbold"...
       ✅ Found full character: Lorain Archbold

✅ Arc consolidation complete
📊 Arc 0: Admission to Kizen
   - Characters: 3
   - Relationships: 2
   - Events: 5
   - Terms: 4
     Rel 0: Simon Polentia → Nephthys Archbold [Nephthys-nim]
     Rel 1: Simon Polentia → Lorain Archbold [Lorain]
```

## ✅ 체크리스트

### 코드 변경:
- [x] extractFromChunk 프롬프트 개선 (더 상세하게)
- [x] consolidateArcs 프롬프트 개선 (arc별 character 복제)
- [x] Character Database 구축 로직 추가
- [x] Character 매핑 로직 3단계 fallback
- [x] 디버깅 로그 추가

### 인터페이스 확인:
- [ ] Characters 탭: 모든 캐릭터 + 상세 정보
- [ ] Arc Relationship Graph: 노드 + 엣지 + 호칭
- [ ] Character Arc Matrix: 출현 정보 + 첫 등장 + 관계 개수
- [ ] Arcs 탭: Characters 리스트 + Relationships (호칭)

### Console 로그 확인:
- [ ] "Building character database..."
- [ ] "Added: [character name]"
- [ ] "Character database: N unique characters"
- [ ] "Found full character: [name]"
- [ ] "Characters: N" (각 arc마다)
- [ ] "Rel 0: A → B [addressing]"

## 🎯 핵심 원칙

1. **Phase 1 (Extract)**: 더 많이, 더 상세하게
   - 중복 걱정 없이 모든 정보 추출
   - Better too much than too little

2. **Phase 2 (Consolidate)**: 병합하되, 복제는 유지
   - Character 정보 병합 (중복 제거)
   - 각 arc에 완전한 character 복제
   - Arc-specific 메타데이터 분리

3. **데이터 완전성 최우선**
   - Minimal fallback은 마지막 수단
   - 모든 단계에서 완전한 객체 유지
   - 로그로 조기 문제 발견

## 🚀 기대 효과

### 번역 작업:
- ✅ Arc별 캐릭터 관계 명확히 파악
- ✅ 호칭 변화 추적
- ✅ 말투 특징 참고
- ✅ 캐릭터 일관성 유지

### 개발 경험:
- ✅ 상세한 로그로 디버깅 용이
- ✅ 각 단계 결과 추적
- ✅ 문제 조기 발견

---

**다음 단계**: 실제 텍스트로 테스트하고 Console 로그 확인 🧪

