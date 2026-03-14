# QuickQuiz Web App

QuickQuiz is a lightweight browser-based quiz game focused on topics about **our Earth and world** – including science, religion, history, chemistry, geography, and a mixed “Earth & World” set.

The app runs entirely in the browser. Just open `index.html` in any modern browser and start playing.

## Features

- **Category-based play**: Science, Chemistry, History, Geography, Religion, and a mixed Earth & World category.
- **10 questions per round**: Each game randomly picks 10 questions from the chosen category.
- **Different questions on retry**: When you replay a category, the app tries to give you a different set of questions (as long as the bank has enough questions).
- **Immediate feedback**: See right away whether you got each question correct and what the right answer was.
- **Score and breakdown**: At the end of the quiz you see your total score, percentage, time taken, and a short breakdown for each question.
- **Modern UI**: Glassmorphism-inspired card layout that works nicely on desktop and mobile.

## Getting started

### Quick start (no tooling)

1. Locate the project folder where these files live.
2. Double-click `index.html` or open it with your browser.
3. Pick a category and play!

### Local static server (optional)

If you have Node.js installed and want to serve the app over `http://localhost`:

```bash
cd path/to/project
npm install
npm run start
```

Then open the printed local URL in your browser.

## File overview

- **index.html** – main HTML structure and three screens: category selection, quiz, and results.
- **styles.css** – visual styling and layout.
- **questions.js** – question bank for all categories, plus category metadata.
- **app.js** – quiz engine and UI logic (category selection, randomization, scoring, breakdown).
- **package.json** – optional convenience scripts for running a small local static server.

You can expand the app by adding more categories or questions to `questions.js`, or by customizing the theme in `styles.css`.

