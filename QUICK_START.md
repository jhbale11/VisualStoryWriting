# Quick Start Guide

## 🚀 Getting Started in 3 Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up API Keys (Optional for testing UI)

Create a `.env` file in the project root:

```env
# At least one API key is required to use the translation features
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

**Get API Keys:**
- Gemini: https://ai.google.dev/
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

**Note:** You can explore the UI without API keys, but you'll need them to actually run translations.

### 3. Run the Application

```bash
npm run dev
```

Then open **http://localhost:5173** in your browser.

## 🏠 Home Screen

When you access `localhost:5173`, you'll see the **Translation System Home Screen** with:

### 📊 Statistics Dashboard
Three cards showing:
- **Translation Projects**: Count of active translation projects
- **Active Tasks**: Currently running glossary or translation tasks
- **Glossary Projects**: Count of interactive glossary builder projects (click to switch to Glossary tab)

### 📑 Two Main Tabs

#### 📝 Translation Projects
- Full translation pipeline (Korean → Japanese/English)
- Multi-stage AI processing
- Chunk-based for long texts
- Quality control and proofreading
- **Project list view** with status, progress, and quick actions
- **Click "+ New Project"** to create a new translation project

#### 📚 Glossary Builder
- **Project Management**: Create and manage multiple glossary projects
- **Project List View**: See all your glossary projects with statistics
  - Character count, event count, location count, term count
  - Last updated timestamp
  - Quick delete option
- **Visual Graph Interface**: Interactive character relationships and event flow
- **Real-time Editing**: Click any element to edit details
- **Comprehensive Analysis**: Characters, events, locations, terms, relationships
- **AI-Powered Extraction**: Automatic analysis with Google Gemini
- **JSON Export**: Download complete glossary for translation projects
- **Timeline View**: Chronological event visualization

**In the Glossary tab:**
- **Click "+ New Glossary"** to create a new glossary project
- **Click any project card** to open it in the interactive glossary builder
- **Click 🗑️** on a card to delete a project

## 📝 Creating Your First Project

### Glossary Project (Quick Test)

1. Click the **📚 Glossary Builder** tab
2. Click **"+ New Glossary"** button (top right)
3. Fill in the modal:
   - **Project Name**: "Test Glossary"
   - **Paste Korean text** (or use sample text below)
   - **Target Language**: Japanese
4. Click **"Create Project"**
5. **AI Processing starts automatically!** 
   - Progress bar shows chunk processing (using Gemini 2.5 Pro)
   - Each ~8000 character chunk is analyzed
   - Wait 30 seconds to a few minutes depending on text length
   - Consolidation phase combines and refines results
6. **Automatically redirected** to interactive glossary builder when complete
7. Review extracted characters/terms/events in the **Glossary** tab
8. Edit any elements by clicking on them
9. Click **"Back to Home"** to return to project list

**Sample Korean Text:**
```
김민수는 25살의 용감한 모험가다. 그는 검술의 달인이며, 
마법사 이서연과 함께 여행한다. 그들은 어둠의 숲을 
지나 고대 유적으로 향하고 있다. 김민수의 목표는 잃어버린 
고대의 검을 찾는 것이다. 이서연은 강력한 방어 마법의 
사용자로, 팀의 생명을 지키는 역할을 한다.
```

**Note:** The AI processing happens during project creation, so you don't need to click "Generate Glossary" afterwards - it's already done!

### Translation Project

1. Click the **📝 Translation Projects** tab  
2. Click **"+ New Translation"** button
3. Configure:
   - **Name**: "Chapter 1"
   - **Upload Korean text** file or paste text
   - **Target Language**: Japanese (recommended) or English
   - **Chunk Size**: 4000 (default, works well)
   - **Agent Models**: Use defaults (Gemini Flash) or customize
4. Click **"Create Project"**
5. Follow the workflow:
   - Generate Glossary → Wait for completion
   - Review Glossary (optional)
   - Start Translation → Wait for completion
   - Download Translation

## 🎛️ Configuration

### Agent Models

You can select different models for each stage:

| Stage | Recommended | Alternative |
|-------|-------------|-------------|
| Glossary | gemini-flash | gpt-4o-mini |
| Translation | gpt-4o | claude-sonnet |
| Enhancement | gpt-4o | claude-sonnet |
| Quality | gemini-flash | gpt-4o-mini |
| Proofreader | claude-sonnet | gpt-4o |
| Layout | gemini-flash | gpt-4o-mini |

**Cost Optimization:** Use Gemini Flash for all stages (cheapest)  
**Quality Optimization:** Use GPT-4o or Claude Sonnet for translation/enhancement/proofreading

### Chunk Settings

- **Small texts (<5000 chars)**: Single chunk, size 10000
- **Medium texts (5000-20000)**: Size 4000, overlap 200
- **Large texts (>20000)**: Size 3000, overlap 150

## 🔍 Exploring the UI

### Project Card

Each project card shows:
- Project name and type
- Status (with color coding)
- Progress bar (for translations)
- Chunk count and language
- Last updated timestamp

**Click any card** to open the project detail view.

### Project Detail View

Three tabs:
1. **Overview**: Progress, active tasks, action buttons
2. **Glossary**: View extracted characters/terms/places
3. **Chunks**: See individual chunk translations and quality scores

### Task Management

When a task is running:
- Progress bar updates in real-time
- Current stage and percentage shown
- Cancel button available
- Status updates every second

## 🐛 Troubleshooting

### "Loading Translation System..." hangs
**Solution:** Clear browser cache and reload:
- Chrome/Edge: Ctrl+Shift+Del → Clear cache
- Firefox: Ctrl+Shift+Del → Clear cache
- Safari: Cmd+Option+E → Empty caches

### "Error Loading Translation System"
**Solution:** 
1. Open browser console (F12)
2. Check for JavaScript errors
3. Common fixes:
   - Refresh page
   - Clear local storage: `localStorage.clear()` in console
   - Restart dev server

### No projects showing
**Solution:** 
- Projects are stored in browser localStorage
- Check **Application → Local Storage → localhost:5173** in DevTools
- Look for `translation-storage` key

### API key errors
**Solution:**
- Check `.env` file exists in project root
- Keys must start with `VITE_`
- Restart dev server after adding keys: Stop (Ctrl+C) then `npm run dev`

### Translation fails immediately
**Possible causes:**
1. Invalid API key → Check console for "401" or "403" errors
2. No quota/credits → Check your provider's dashboard
3. Text too long → Try smaller chunk size (2000)

## 📚 Next Steps

Once you're comfortable with the basics:

1. **Read the full guides:**
   - `TRANSLATION_SETUP.md` - Detailed setup and configuration
   - `TRANSLATION_UI_GUIDE.md` - Complete UI walkthrough
   - `SIMPLE_WORKFLOW.md` - Workflow engine architecture
   - `BROWSER_COMPATIBILITY.md` - Technical background

2. **Try advanced features:**
   - Custom prompts for each agent
   - Different models for different stages
   - Multiple projects in parallel
   - Export and reuse glossaries

3. **Optimize your workflow:**
   - Build reusable glossaries for series
   - Find optimal chunk sizes for your texts
   - Test different model combinations
   - Compare translation quality

## 🆘 Need Help?

### Check Browser Console
Press **F12** to open Developer Tools and check the Console tab for errors.

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "API key not found" | Missing or invalid key | Add to `.env` and restart |
| "401 Unauthorized" | Invalid API key | Check key is correct |
| "429 Too Many Requests" | Rate limit exceeded | Wait and retry |
| "Store error" | localStorage issue | Clear storage and refresh |

### Debug Mode

Enable verbose logging:
```javascript
// In browser console
localStorage.setItem('debug', 'translation:*')
```

Then refresh the page to see detailed logs.

## ✅ Quick Checklist

Before creating your first project:

- [ ] Dependencies installed (`npm install`)
- [ ] Dev server running (`npm run dev`)
- [ ] Browser open at `localhost:5173`
- [ ] Home screen loads successfully
- [ ] Can see both tabs (Translation / Glossary)
- [ ] Statistics show "0" for all cards (first time)
- [ ] "+ New Project" button works

For translation features:
- [ ] API key added to `.env`
- [ ] Dev server restarted after adding key
- [ ] Can create a project
- [ ] Can start glossary generation

## 🎉 Success!

If you've completed the checklist, you're ready to start translating!

Try the sample glossary project with the Korean text above to verify everything works.

---

**Next:** Read `TRANSLATION_UI_GUIDE.md` for a complete tour of all features.

