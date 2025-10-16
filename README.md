# Visual Story Analysis & Glossary Builder

## New Features

This application features an intelligent glossary builder that analyzes uploaded novels and provides a visual, interactive interface for managing story elements.

### 📚 Main Features

1. **Text Upload & Processing**
   - Upload .txt files containing your novel
   - Automatic AI-powered extraction using GPT-4o-mini
   - Chunk-based processing (3000 characters per chunk)
   - Processes up to 5 major events per chunk

2. **Visual Interface (Based on Original Visual Story-Writing)**
   - **Characters & Events View**: Interactive node-based graph showing character relationships and actions
   - **Locations View**: Circular location nodes showing spatial relationships
   - **Event Timeline**: Horizontal timeline at the bottom showing chronological event flow
   - Drag-and-drop node positioning
   - Force-directed layout optimization

3. **Glossary Management**
   - **Right Panel**: Complete glossary with search functionality
   - Three tabs: Characters, Events, Locations
   - Click any item to edit
   - Real-time updates to visual interface

4. **Edit Functionality**
   - Edit character details (name, emoji, traits, relationships)
   - Modify events (description, locations, importance)
   - Update locations (name, emoji, description)
   - Delete unwanted items
   - Add custom traits with +/- buttons

5. **Import/Export**
   - Export entire glossary as JSON
   - Import previously saved glossaries
   - Download JSON files for backup
   - Compatible data format

### 🚀 How to Use

1. **Initial Setup**
   - Open the application
   - Enter your OpenAI API key
   - Upload a .txt file of your novel

2. **Processing**
   - Click "Build Glossary"
   - Wait for AI processing (progress bar shows status)
   - System extracts characters, events, and locations

3. **Visual Exploration**
   - **Left Side (60%)**: Visual representations
     - Characters & Events tab: See character nodes connected by event edges
     - Locations tab: View spatial relationships
     - Timeline (bottom): Scroll through events chronologically
   - **Right Side (40%)**: Glossary panel
     - Browse all extracted elements
     - Search by name
     - Click to edit details

4. **Editing**
   - Click any glossary item to open edit panel
   - Modify fields as needed
   - Save changes to update visual interface
   - Delete items if necessary

5. **Save Your Work**
   - Click "Export" to save glossary as JSON
   - Download file for later use
   - Use "Import" to reload saved glossaries

### 🎨 Interface Details

**Main Visual Area**:
- Character nodes: Circular nodes with emoji and name
- Action edges: Arrows connecting characters showing events
- Location nodes: Large circular nodes with location names
- Timeline: Horizontal bar with event markers

**Glossary Panel**:
- Search bar for quick filtering
- Tab-based navigation
- Card-based item display
- Click to edit any item

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
After entering your OpenAI API key, you can test Visual Story-Writing using the shortcuts or you can run the studies.
Note that the system was tested and developped for recent versions of **Google Chrome** or **Mozilla Firefox**.


## How to get an OpenAI API key?
Because Visual Story-Writing relies on the OpenAI API, you will need a key to make it work. You will need an account properly configured, see [here](https://platform.openai.com/account/api-keys) for more info.
Your key is never stored and the application runs locally and sends requests to the OpenAI API only.


## Can I try without an API key?
The systen depends on the OpenAI API to work. If you enter an incorrect key, you will still be able to go through the study but executing prompts will yield an error.


## Where are the video tutorials?
From the launcher, you can start the studies to see the exact ordering and video tutorials participants went through.
Alternatively, you can go in the ``public/videos`` to review all the video tutorials.

## Publication
Coming soon!

You can also find the paper on [arXiv](https://arxiv.org/abs/2410.07486)