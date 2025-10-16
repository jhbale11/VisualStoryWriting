# Visual Story Analysis & Glossary Builder

## New Features

This application features an intelligent glossary builder that analyzes uploaded novels and provides a visual, interactive interface for managing story elements with comprehensive character and event information.

### 📚 Main Features

1. **Text Upload & Processing**
   - Upload .txt files containing your novel
   - **Powered by Google Gemini 2.0 Flash** for advanced AI analysis
   - Chunk-based processing (8000 characters per chunk for comprehensive context)
   - Processes **entire novel** automatically (all chunks, not just the first)
   - Up to 5 major events extracted per chunk
   - Real-time progress tracking with chunk counter

2. **Visual Interface (Based on Original Visual Story-Writing)**
   - **Characters & Events View**: Interactive node-based graph showing character relationships and actions
   - **Locations View**: Circular location nodes showing spatial relationships
   - **Terms Dictionary View**: NEW! Dedicated interface for translation glossary
   - **Event Timeline**: Horizontal timeline at the bottom showing chronological event flow
   - Drag-and-drop node positioning
   - Force-directed layout optimization

3. **Detailed Character Analysis**
   - **Comprehensive Information Extraction**:
     - Korean and English names
     - Physical appearance (height, build, hair color, eye color, skin tone, distinctive features)
     - Detailed personality description
     - 3-5+ personality traits
     - Age, gender, occupation
     - Relationships with other characters (detailed descriptions)
   - All information is editable through the glossary panel
   - Character merging across chunks for consistent tracking

4. **Glossary Management**
   - **Right Panel**: Complete glossary with search functionality
   - **Four tabs**: Characters, Events, Locations, Terms
   - Click any item to edit
   - Real-time updates to visual interface
   - Search across all glossary types

5. **Translation Terms Dictionary**
   - **NEW Feature**: Dedicated terms glossary
   - Automatically extracts terms requiring translation attention
   - Categories: Name, Place, Item, Concept, Other
   - Context explanations for each term
   - Searchable by original term or translation

6. **Edit Functionality**
   - **Enhanced Character Editing**:
     - Names (Korean, English)
     - Physical appearance details
     - Personality description
     - Multiple traits with add/remove
     - Age, gender, occupation
     - Emoji representation
   - **Event Editing**: Description, locations, importance, involved characters
   - **Location Editing**: Name, emoji, description
   - **Term Editing**: Original, translation, context, category
   - Delete unwanted items
   - All changes immediately reflected in visual interface

7. **Import/Export**
   - Export entire glossary as JSON (includes all characters, events, locations, terms)
   - Import previously saved glossaries
   - Download JSON files for backup
   - Compatible data format with full text preservation

### 🚀 How to Use

1. **Initial Setup**
   - Open the application
   - Enter your **Google Gemini API key** (get from [Google AI Studio](https://aistudio.google.com/app/apikey))
   - Upload a .txt file of your novel

2. **Processing**
   - Click "Build Glossary"
   - Wait for AI processing (shows "Processing chunk X of Y")
   - **Processes entire novel automatically** (may take several minutes for long texts)
   - System extracts:
     - Characters with detailed physical and personality descriptions
     - Major events with character involvement
     - Locations mentioned in the text
     - Translation terms requiring attention

3. **Visual Exploration**
   - **Left Side (60%)**: Visual representations
     - **Characters & Events tab**: See character nodes connected by event edges
     - **Locations tab**: View spatial relationships
     - **Terms Dictionary tab**: Browse translation glossary
     - **Timeline (bottom)**: Scroll through events chronologically
   - **Right Side (40%)**: Glossary panel
     - **Four tabs**: Characters, Events, Locations, Terms
     - Browse all extracted elements
     - Search by name, term, or translation
     - Click to edit details

4. **Editing Character Details**
   - Click any character to open detailed edit panel
   - Edit fields:
     - Names (Korean, English)
     - Physical appearance (detailed description)
     - Personality (comprehensive description)
     - Traits (add/remove multiple)
     - Age, gender, occupation
     - Emoji
   - Save changes to update visual interface
   - Delete if necessary

5. **Managing Terms**
   - Switch to Terms tab in glossary
   - Browse all translation-sensitive terms
   - Click to edit original, translation, context
   - Categorize by type (Name, Place, Item, Concept, Other)

6. **Save Your Work**
   - Click "Export" to save complete glossary as JSON
   - Includes all characters, events, locations, terms, and full text
   - Download file for later use
   - Use "Import" to reload saved glossaries

### 🎨 Interface Details

**Main Visual Area** (Left 60%):
- Character nodes: Circular nodes with emoji and name
- Action edges: Arrows connecting characters showing events
- Location nodes: Large circular nodes with location names
- Terms view: NEW! Dictionary interface for translation glossary
- Timeline: Horizontal bar with event markers at bottom

**Glossary Panel** (Right 40%):
- Search bar for quick filtering across all types
- **Four-tab navigation**: Characters, Events, Locations, Terms
- Card-based item display with detailed previews
- Click to edit any item with full detail panel

**Character Information Displayed**:
- Name (Korean and English)
- Physical appearance details
- Personality description
- Traits (3-5+)
- Age, gender, occupation
- Relationships with other characters

**Terms Dictionary**:
- Original term and translation
- Context explanation
- Category classification
- Searchable by original or translation

**Timeline Controls**:
- Zoom slider
- Previous/Next buttons
- Drag to select event ranges
- Shows filtered event count

### 🔗 Access Modes

- **Main Interface**: Glossary Builder (new)
- **Legacy Interface**: Original Visual Story-Writing tools (via "Access Legacy Interface" link)

---

# Visual Story-Writing (Legacy): Writing by Manipulating Visual Representations
<img src="demo.gif">

## [Online Demo](https://damienmasson.com/VisualStoryWriting) / [How to build](#how-to-build-and-run) / [Publication](#publication)

This system automatically **visualizes** a story (chronological events, character and their actions and movements) and allows users to **edit** the story by manipulating these visual representations. For example:
- Hover over the timeline allows reviewing the chronology of events and visualizing the movements of the characters
- Connecting two characters suggests edits to the text to reflect the new interaction
- Moving a character suggests edits to the text to reflect the new position
- Reordering the events in the timeline suggests edits to the text to reflect the new chronology

The system relies on a GPT-4o to extract the information from the text and suggest edits.


## How to build and run
The code is written in TypeScript and uses React and Vite. To build and run the code, you will need to have Node.js installed on your machine. You can download it [here](https://nodejs.org/en/download/).
First install the dependencies:
```bash
npm install
```
Then build the code:
```bash
npm run dev
```


## How to use?
After entering your Gemini API key, upload a .txt file to build a comprehensive glossary with visual representations.
Note that the system was tested and developped for recent versions of **Google Chrome** or **Mozilla Firefox**.


## How to get a Gemini API key?
The new glossary builder uses Google Gemini 2.0 Flash for AI-powered extraction. You will need a key to make it work. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
Your key is never stored and the application runs locally and sends requests to the Gemini API only.


## Where are the video tutorials?
From the launcher, you can start the studies to see the exact ordering and video tutorials participants went through.
Alternatively, you can go in the ``public/videos`` to review all the video tutorials.

## Publication
Coming soon!

You can also find the paper on [arXiv](https://arxiv.org/abs/2410.07486)
