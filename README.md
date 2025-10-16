# Visual Story Analysis & Glossary Builder

## New Features

This application now features an intelligent glossary builder that analyzes uploaded novels and extracts:

### 📚 Main Features

1. **Text Upload Interface**
   - Upload any .txt file containing your novel
   - Automatic chunked processing for long texts
   - Real-time progress tracking

2. **Character Analysis**
   - Automatic character extraction with descriptions
   - Personality trait identification
   - Relationship mapping between characters
   - Visual character relationship graph

3. **Event Timeline**
   - Extracts major events from each text chunk (up to 5 per chunk)
   - Visual timeline showing event progression
   - Links events to involved characters
   - Importance classification (major/minor)

4. **Interactive Glossary**
   - Searchable character and event database
   - Detailed character profiles with traits and relationships
   - Event descriptions with character involvement
   - Visual representations of story structure

### 🚀 How to Use

1. Open the application
2. Enter your OpenAI API key
3. Upload a .txt file of your novel
4. Click "Build Glossary" to start processing
5. Explore the visual analysis and glossary

### 🎨 Interface Layout

- **Left Panel (60%)**: Visual representations
  - Character Relationships tab: Interactive graph showing connections
  - Event Timeline tab: Chronological event flow

- **Right Panel (40%)**: Glossary panel
  - Character list with details
  - Event list with descriptions
  - Search functionality
  - Click any item for detailed view

### 🔗 Legacy Interface

Access the original Visual Story-Writing interface via the "Access Legacy Interface" link

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