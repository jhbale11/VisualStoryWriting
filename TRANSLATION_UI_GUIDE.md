# Translation System UI Guide

## 🏠 Home Screen

The home screen is divided into two main sections with a tabbed interface:

### Statistics Dashboard (Top)

Four cards showing real-time metrics:

1. **Total Projects** (Blue) - All projects combined
2. **Glossary Projects** (Purple) - Number of glossary building projects
3. **Translation Projects** (Green) - Number of translation projects
4. **Active Tasks** (Orange) - Currently running tasks

### Tabbed Interface

#### 📝 Translation Projects Tab

**Purpose**: Full Korean-to-Japanese/English translation with multi-stage AI pipeline

**Features**:
- Complete translation workflow: Translation → Enhancement → Quality Check → Proofreading → Layout
- Chunk-based processing for long texts
- Progress tracking per chunk
- Quality scores and automatic re-enhancement
- Download final translations

**When to use**:
- Complete novel/story translation
- Professional-quality output needed
- Multiple enhancement stages required
- Quality control important

**Creating a Translation Project**:
1. Click "+ New Translation" button
2. Enter project name
3. Upload or paste Korean text
4. Configure chunk size and overlap
5. Select LLM models for each stage:
   - Glossary extraction
   - Translation
   - Enhancement
   - Quality checking
   - Proofreading
   - Layout formatting
6. Click "Create Project"

#### 📚 Glossary Building Tab

**Purpose**: Extract and organize story elements from Korean text

**Features**:
- AI-powered character extraction (name, age, gender, personality, tone)
- Term identification (items, abilities, ranks)
- Location mapping
- Structured JSON output
- Reusable across projects

**When to use**:
- Analyzing story structure before translation
- Building reference materials
- Maintaining consistency across series
- Creating translator notes

**Creating a Glossary Project**:
1. Click "+ New Glossary" button
2. Enter project name
3. Upload or paste Korean text
4. Select target language (for term translations)
5. Click "Create Project"

### Empty States

When a tab has no projects, you'll see:
- Helpful description of what that project type does
- Large "Create First..." button
- Examples of use cases

## 📊 Project Cards

Each project card displays:

### Header
- **Project Name** (large, bold)
- **Type** (Glossary Builder / Translation)
- **Delete Button** (trash icon, right side)

### Body
- **Status Chip** (color-coded):
  - Gray: Setup
  - Yellow: Running (Glossary/Translation)
  - Green: Completed
  - Blue: Under Review
- **Progress Bar** (translation projects only)
- **Project Stats**:
  - Number of chunks
  - Target language
  - Glossary info (if available)

### Footer
- **Last Updated** timestamp

### Actions
- **Click anywhere** on card → Open project detail view
- **Click trash icon** → Delete project (with confirmation)

## 📁 Project Detail View

### Back Button
- Top-left corner
- Returns to home screen

### Header
- Project name
- Type and language chips
- Current status chip

### Tabs

#### Overview Tab
Shows:
1. **Progress Card**
   - Overall progress percentage
   - Progress bar
   - Chunk statistics (total/completed/remaining)

2. **Current Task Card** (when task is running)
   - Task type
   - Status
   - Progress percentage
   - Cancel button

3. **Actions Card**
   - Generate Glossary (if not yet generated)
   - Start Translation (if glossary ready)
   - Download Translation (if progress > 0)

#### Glossary Tab
Three sections:
1. **Characters**
   - Korean name → English/Japanese name
   - Age, gender, personality, tone, honorifics

2. **Terms**
   - Korean term → English/Japanese translation
   - Descriptions

3. **Places**
   - Korean location → English/Japanese name
   - Descriptions

Empty state if glossary not yet generated.

#### Chunks Tab
Accordion list of all chunks:
- **Chunk header**: Chunk number + status chip
- **Expandable content**:
  - Original Korean text
  - Translated text (if completed)
  - Quality score (if available)

#### Review & Edit Tab ✨ NEW!
**Full-featured translation review and editing interface** (enabled after translation completes)

This tab integrates the powerful Textoshop editing tools directly into the translation workflow, allowing you to review and refine translations with advanced AI-powered editing features.

**Model Used**: All AI tools in Review & Edit use `gpt-5-mini-2025-08-07` with temperature=1 (required by this model) for fast and cost-effective processing.

**Features**:
1. **Side-by-Side View**
   - Korean original text (left panel, read-only)
   - English translation (right panel, editable)
   - Synchronized scrolling between panels
   - Review notes panel (right side)

2. **Navigation Controls** (top bar)
   - Chunk counter showing current/total
   - Previous/Next chunk buttons
   - Run Review button (AI-powered quality check)
   - Save Changes button

3. **AI-Powered Review**
   - Click "Run Review" to analyze translation quality
   - Categorizes issues: Accuracy, Fluency, Terminology, Consistency, Style, Localization
   - Each issue includes:
     - Severity level (high/medium/low)
     - Specific text excerpt
     - Detailed explanation
     - Suggested improvement
   - Color-coded issue highlighting
   - Click any issue to jump to that location in the text

4. **Advanced Editing Tools** (left toolbar, fixed position)
   - **Selection Tool**: Basic text selection and editing
   - **Draw Tool**: Freehand highlighting and annotations
   - **Tone Picker**: Adjust formality, sentiment, and complexity
   - **Synonym Tool**: Find alternative word choices
   - **Tense Changers**: Convert between past/present/future tense
   - **Bold/Italic**: Text formatting
   - **Repair Tool**: Fix grammar and style issues
   - **Eraser Tool**: Remove unwanted text
   - **Prompter Tool**: Custom AI instructions
   - Keyboard shortcuts (1-9) to quickly switch between tools
   - Undo/Redo buttons at the bottom

5. **Smart Prompt Input**
   - When using the Prompter Tool, select text first
   - The prompt input box appears **directly below the selected text**
   - Fixed positioning ensures it stays visible even when scrolling
   - Type custom instructions and press Enter to apply
   - Example: "Make this more dramatic" or "Translate this idiom naturally"

6. **Context Menu Features** (right-click)
   - Cut/Copy/Paste
   - Break into sentences
   - Merge into one sentence
   - Text manipulation shortcuts

7. **Find & Replace** (Enhanced)
   - Search across translation with live highlighting
   - Navigate between matches (↑/↓ buttons)
   - Case-sensitive/insensitive search
   - Whole word matching
   - Regular expression support (with error handling)
   - Replace current match or Replace All
   - Match counter (e.g., "3 / 15 matches found")
   - Uses SlateUtils for reliable text manipulation

8. **Right Panel Tools** (fixed position, scrollable)
   - **Tone Picker**: Adjust three dimensions
     - Informal ↔ Formal
     - Negative ↔ Positive
     - Complicated ↔ Simple
     - Real-time AI-powered tone adjustment
   - **Find & Replace**: Enhanced search with regex support
   - All panels stay fixed while the main editing area scrolls freely

9. **Keyboard Shortcuts**
   - Undo: Cmd/Ctrl + Z
   - Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
   - Escape: Clear selection
   - Backspace: Delete empty text fields

**Workflow**:
1. Click "Open Full Screen Editor" button in the Review & Edit tab
2. Navigate to a chunk using Prev/Next buttons
3. Run AI review to identify potential issues
4. Click on review notes to jump to problem areas
5. Select text to edit using any of the editing tools
6. Apply AI-powered transformations or manual edits
7. Use Find & Replace for bulk edits (supports regex)
8. Save changes to update the translation (auto-saved to project)
9. Move to next chunk and repeat
10. Click "Download All" to export the complete reviewed translation

**Review Notes Panel**:
- Fixed position on the right side
- Scrollable list of all issues
- Click any issue card to:
  - Highlight the problematic text
  - Scroll the editor to that location
  - See the full context
- Color-coded borders match issue categories
- Shows severity, category, message, and suggestions

**Full Screen Mode**:
- Click "Open Full Screen Editor" to enter dedicated review mode
- Full screen interface with close button (X) in top-right
- "Download All" button to export complete translation
- All edits are automatically saved to the project store
- Close button returns to project detail view
- **Fixed UI elements**: Left toolbar and right panel stay in place while content scrolls
- **Responsive tooltips**: Prompt input appears directly below selected text, follows viewport

**Saving Changes**:
- Click "Save Changes" button in header to persist current chunk edits
- Changes are saved to Zustand store and persist across sessions
- All modifications (edits, Find/Replace, AI tools) are tracked
- "Download All" exports the complete reviewed translation as `.txt`
- File name: `{project_name}_reviewed_translation.txt`

## 🎨 Color Coding

### Status Colors
- **Gray** (Default): Setup, pending
- **Yellow** (Warning): Running, in progress
- **Green** (Success): Completed
- **Blue** (Primary): Ready, under review
- **Red** (Danger): Failed, error

### Project Type Colors
- **Green**: Translation projects
- **Purple**: Glossary projects

### Statistics Cards
- **Blue**: Total counts
- **Purple**: Glossary-related
- **Green**: Translation-related
- **Orange**: Active/running items

## 🔄 Workflow Examples

### Example 1: Quick Glossary

1. Go to **📚 Glossary Building** tab
2. Click "+ New Glossary"
3. Name: "My Novel Characters"
4. Paste Korean text
5. Create project
6. Click "Generate Glossary"
7. Wait for completion
8. Review extracted data in Glossary tab
9. Download JSON if needed

### Example 2: Full Translation

1. Go to **📝 Translation Projects** tab
2. Click "+ New Translation"
3. Name: "Chapter 1 Translation"
4. Upload text file
5. Configure settings:
   - Chunk size: 4000
   - Overlap: 200
   - Enable proofreader: Yes
6. Select models (e.g., gemini-2.0-flash)
7. Create project
8. Click "Generate Glossary" → Wait
9. Review/edit glossary if needed
10. Click "Start Translation" → Wait
11. Monitor progress in Overview tab
12. Check quality scores in Chunks tab
13. Download final translation

### Example 3: Multiple Projects

1. Create glossary project for character reference
2. Wait for completion
3. Create translation project for actual translation
4. Both projects appear in their respective tabs
5. Switch between tabs to manage each
6. Statistics dashboard shows combined metrics

## 💡 Tips

### Navigation
- Use tabs to organize projects by type
- Cards update in real-time during tasks
- Status chips provide quick status overview

### Performance
- Smaller chunks = more API calls but better reliability
- Larger chunks = fewer calls but may timeout
- Default 4000 characters works for most cases

### Best Practices
- Build glossary first for series/franchises
- Review glossary before starting translation
- Monitor quality scores and re-translate if needed
- Download translations incrementally for long texts

### Keyboard Shortcuts
- Click project card = Open details
- ESC in modal = Close modal
- Browser back button = Not recommended (use Back button)

## 🐛 Troubleshooting

### "No projects yet" showing incorrectly?
- Check if you're on the correct tab (Translation vs Glossary)
- Refresh the page to reload from storage

### Project cards not updating?
- Task progress updates every 1 second
- Refresh page if status seems stuck

### Can't find a project?
- Check both tabs (might be wrong type)
- Use browser DevTools → Application → Local Storage to debug

### Empty glossary?
- Glossary generation might have failed
- Check browser console for errors
- Try regenerating glossary

## 📱 Responsive Design

The UI adapts to screen size:

- **Desktop** (≥1024px): 3 columns of project cards
- **Tablet** (≥768px): 2 columns of project cards
- **Mobile** (<768px): 1 column, stacked layout

Statistics cards also stack on smaller screens.

