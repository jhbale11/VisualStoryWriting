# Visual Story Writing Interface Guide

이 문서는 Visual Story Writing 플랫폼의 세 가지 주요 기능인 **Translation Projects**, **Glossary Builder**, **Publish Project**의 사용법을 설명합니다. 각 프로젝트의 생성 방법, 메인 화면 구성, 그리고 각 버튼의 기능을 구체적으로 다룹니다.

---

## 1. Translation Projects (번역 프로젝트)

AI를 활용하여 소설을 번역하고, 용어집(Glossary)을 기반으로 일관성 있는 번역을 수행하는 프로젝트입니다.

### 1.1 프로젝트 생성 (Creation)

메인 화면에서 **+ New Project** 버튼을 클릭하고 **Translation Project** 탭을 선택하여 생성합니다.

*   **Project Name**: 프로젝트의 이름을 입력합니다.
*   **Target Language**: 번역할 목표 언어를 선택합니다 (English / Japanese).
*   **Source Text (Korean)**: 번역할 한국어 원문을 텍스트 파일(.txt)로 업로드하거나 직접 붙여넣습니다.
*   **Chunk Size**: 텍스트를 나눌 단위(글자 수)를 설정합니다 (기본값: 8000).
*   **Overlap**: 청크 간 중복되는 글자 수를 설정하여 문맥 연결을 돕습니다.
*   **Enable Proofreader**: 교정(Proofreading) 단계를 활성화할지 선택합니다.
*   **Glossary (Optional)**: 기존 용어집 파일(.json, .txt)이 있다면 업로드합니다.
*   **Agent Configuration**: 번역, 윤문(Enhancement), 교정(Proofreader) 등 각 단계별 AI 모델과 프롬프트를 설정할 수 있습니다.

### 1.2 메인 화면 (Main Screen)

프로젝트에 진입하면 상단에 프로젝트 정보와 상태가 표시되며, 아래 4개의 탭으로 구성됩니다.

#### 1. Overview (개요)
번역 진행 상황을 한눈에 파악하고 주요 작업을 실행하는 곳입니다.

*   **Translation Progress**: 전체 번역 진행률과 완료된 청크 수를 보여줍니다.
*   **Current Task**: 현재 실행 중인 작업(번역, 용어집 생성 등)의 상태와 진행률을 표시합니다.
    *   **Cancel Task**: 실행 중인 작업을 중단합니다.
*   **Actions**:
    *   **Generate Glossary**: 용어집이 없을 때, AI가 원문을 분석하여 용어집을 자동 생성합니다.
    *   **Start Translation**: 용어집이 준비되면 번역을 시작합니다.
    *   **Download Translation**: 번역이 진행된 결과물을 텍스트 파일로 다운로드합니다.

#### 2. Glossary (용어집)
프로젝트에 적용된 용어집을 확인하고 관리합니다.

*   **화면 구성**: 등장인물(Characters), 용어(Terms), 장소(Places), 스타일 가이드(Style Guide) 등이 카드 형태로 표시됩니다.
*   **버튼 기능**:
    *   **Download Glossary**: 현재 용어집을 JSON 파일로 다운로드합니다.
    *   **Edit Glossary**: 용어집 내용을 직접 수정할 수 있는 편집 창을 엽니다.
    *   **Replace/Upload Glossary**: 새로운 용어집 파일로 교체하거나 업로드합니다.

#### 3. Chunks (청크)
원문이 분할된 청크별로 번역 결과를 상세히 확인합니다.

*   **Accordion List**: 각 청크를 클릭하여 펼치면 원문(Korean)과 번역문(Translation)을 대조해 볼 수 있습니다.
*   **Quality Score**: AI가 평가한 번역 품질 점수가 표시됩니다.

#### 4. Review & Edit (검토 및 편집)
번역이 완료된 후 전체 내용을 검토하고 수정하는 전용 인터페이스입니다.

*   **Open Full Screen Editor**: 전체 화면 편집기를 엽니다. 원문과 번역문을 나란히 놓고 문장 단위로 수정할 수 있습니다.

---

## 2. Glossary Builder (용어집 빌더)

소설의 설정을 심층적으로 분석하여 캐릭터, 관계도, 스토리 아크 등을 시각화하고 정교한 용어집을 만드는 도구입니다.

### 2.1 프로젝트 생성 (Creation)

메인 화면에서 **+ New Project** 버튼을 클릭하고 **Glossary Builder** 탭을 선택합니다.

*   **Project Name**: 프로젝트 이름을 입력합니다.
*   **Upload Your Story**: 분석할 한국어 소설 원문을 업로드하거나 붙여넣습니다.
*   **Target Language**: 번역 목표 언어를 선택합니다 (분석 결과의 언어 설정).
*   **생성 후**: 백그라운드에서 AI가 소설 내용을 분석하여 캐릭터, 사건, 관계 등을 추출합니다.

### 2.2 메인 화면 (Main Screen)

분석된 데이터는 다음 4개의 탭에서 관리됩니다.

#### 1. Characters (캐릭터)
추출된 등장인물의 목록과 상세 정보를 보여줍니다.

*   **캐릭터 카드**: 이름, 역할(Role), 성격, 외모 묘사 등이 표시됩니다.
*   **편집**: 각 캐릭터를 클릭하여 상세 정보를 수정할 수 있습니다.

#### 2. Terms (용어)
소설 속 고유 명사, 아이템, 스킬 등의 용어를 관리합니다.

*   **용어 목록**: 원어, 번역어, 카테고리, 설명이 표시됩니다.
*   **편집**: 용어를 추가하거나 수정, 삭제할 수 있습니다.

#### 3. Features (스토리 설정)
소설의 전반적인 설정과 스타일을 정의합니다.

*   **Story Summary**: 로그라인(한 줄 요약)과 뒷표지 소개글(Blurb)을 작성합니다.
*   **Story Arcs Overview**: 주요 스토리 아크와 핵심 사건을 정리합니다.
*   **Style & Genre**: 장르, 등급, 테마, 톤, 문체 등을 설정합니다.
*   **Translation Guidelines**: 이름 표기법, 경어 사용 규칙 등을 정의합니다.
*   **Honorifics (경어)**: 한국어 호칭(형, 누나, 선배 등)을 어떻게 번역할지 규칙을 정합니다.
*   **Recurring Phrases**: 자주 나오는 관용구의 번역을 고정합니다.

#### 4. Arcs (아크 및 관계도)
스토리 구조와 캐릭터 관계를 시각적으로 보여줍니다.

*   **Arc Relationship Graph**: 캐릭터 간의 관계를 그래프로 시각화합니다.
*   **Character Arc Matrix**: 스토리 진행에 따른 캐릭터의 변화나 등장을 매트릭스 형태로 보여줍니다.

### 2.3 주요 기능 (Key Features)

*   **Export JSON**: 완성된 용어집을 JSON 파일로 내보내어 Translation Project에서 사용할 수 있습니다.

---

## 3. Publish Project (출판 프로젝트)

번역된 영문 소설을 웹소설 플랫폼(Webnovel 등)의 형식에 맞춰 포맷팅하는 도구입니다.

### 3.1 프로젝트 생성 (Creation)

메인 화면에서 **+ New Project** 버튼을 클릭하고 **Publish Project** 탭을 선택합니다.

*   **Project Name**: 프로젝트 이름을 입력합니다.
*   **Source Text**: 포맷팅할 영문 텍스트(Markdown 등)를 업로드하거나 붙여넣습니다.
*   **Agent Configuration**: 포맷팅을 담당할 AI 모델과 프롬프트를 설정할 수 있습니다.

### 3.2 메인 화면 (Main Screen)

#### 1. Header (상단)
*   **Run Agent**: 포맷팅 작업을 시작합니다.
*   **Download**: 포맷팅이 완료된 텍스트를 다운로드합니다.

#### 2. Prompt & Settings (설정)
*   **Agent Prompt**: 포맷팅 규칙(문단 간격, 특수기호 처리 등)을 정의한 프롬프트를 수정할 수 있습니다.
*   **Source Preview**: 원본 텍스트를 미리 확인합니다.

#### 3. Result (Diff View) (결과 확인)
작업 실행 후 원본과 결과물의 차이를 비교합니다.

*   **Diff Viewer**: 왼쪽에는 원본, 오른쪽에는 포맷팅된 결과가 표시됩니다. 변경된 부분은 색상으로 강조됩니다.
*   **Diffs Only / Show All**: 변경된 부분만 모아보거나 전체 텍스트를 보는 모드를 전환합니다.
