// Generator för att skapa kompletta, fristående HTML-filer för lektioner
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface LessonMoment {
  id: string;
  type: string;
  title: string;
  order: number;
  config: any;
}

interface LessonContent {
  title: string;
  moments: LessonMoment[];
  wordClass: string;
}

export class LessonGenerator {
  private generateHTMLTemplate(lessonContent: LessonContent): string {
    const sanitizedTitle = lessonContent.title.replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, '');
    
    return `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lessonContent.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: ${this.getBackgroundStyle(lessonContent.background)};
            min-height: 100vh;
            padding: 20px;
        }

        .lesson-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .lesson-header {
            background: linear-gradient(45deg, #4f46e5, #7c3aed);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .lesson-title {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .lesson-subtitle {
            opacity: 0.9;
            font-size: 1.2rem;
        }

        .progress-bar {
            background: rgba(255,255,255,0.2);
            height: 8px;
            border-radius: 4px;
            margin: 20px 0;
            overflow: hidden;
        }

        .progress-fill {
            background: #10b981;
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .moment-container {
            display: none;
        }

        .moment-container.active {
            display: block;
            width: 100%;
            height: 100vh;
        }
        
        /* Layout for non-pratbubbla moments */
        .standard-moment {
            padding: 40px;
            min-height: 400px;
        }

        .moment-title {
            font-size: 1.8rem;
            color: #1f2937;
            margin-bottom: 20px;
            text-align: center;
        }

        .moment-content {
            font-size: 1.1rem;
            line-height: 1.6;
            color: #374151;
            text-align: center;
        }

        .controls {
            padding: 20px 40px;
            background: #f9fafb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-primary {
            background: #4f46e5;
            color: white;
        }

        .btn-primary:hover {
            background: #4338ca;
            transform: translateY(-2px);
        }

        .btn-secondary {
            background: #e5e7eb;
            color: #374151;
        }

        .btn-secondary:hover {
            background: #d1d5db;
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .character-bubble {
            display: flex;
            gap: 20px;
            align-items: flex-start;
            margin: 20px 0;
        }

        .character-image {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            object-fit: cover;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .speech-bubble {
            flex: 1;
            background: #f0f9ff;
            border: 2px solid #0ea5e9;
            border-radius: 20px;
            padding: 20px;
            position: relative;
            font-size: 1.1rem;
        }

        .speech-bubble::before {
            content: '';
            position: absolute;
            left: -10px;
            top: 20px;
            width: 0;
            height: 0;
            border-top: 10px solid transparent;
            border-bottom: 10px solid transparent;
            border-right: 10px solid #0ea5e9;
        }

        .memory-game {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            max-width: 500px;
            margin: 0 auto;
        }

        .memory-card {
            aspect-ratio: 1;
            background: #f3f4f6;
            border: 2px solid #d1d5db;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 1.2rem;
            font-weight: 600;
            transition: all 0.2s;
        }

        .memory-card:hover {
            border-color: #4f46e5;
            transform: scale(1.05);
        }

        .memory-card.flipped {
            background: #4f46e5;
            color: white;
        }

        .completion-screen {
            text-align: center;
            padding: 60px 40px;
            display: none;
        }

        .completion-screen.active {
            display: block;
        }

        .completion-icon {
            font-size: 5rem;
            margin-bottom: 20px;
        }

        .completion-title {
            font-size: 2.5rem;
            color: #059669;
            margin-bottom: 15px;
        }

        .completion-message {
            font-size: 1.2rem;
            color: #374151;
            margin-bottom: 30px;
        }

        .word-cloud {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            margin: 20px 0;
        }

        .word-cloud-item {
            background: #ede9fe;
            color: #6b21a8;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .word-cloud-item:hover {
            background: #6b21a8;
            color: white;
            transform: scale(1.1);
        }

        .interactive-text {
            font-size: 1.3rem;
            line-height: 1.8;
            margin: 20px 0;
        }

        .clickable-word {
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 4px;
            transition: all 0.2s;
        }

        .clickable-word:hover {
            background: #fef3c7;
        }

        .clickable-word.correct {
            background: #d1fae5;
            color: #065f46;
        }

        .clickable-word.incorrect {
            background: #fee2e2;
            color: #991b1b;
        }

        .content-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 25px;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .content-card h3 {
            color: #374151;
            margin-bottom: 15px;
            font-size: 1.25rem;
        }

        .content-card p {
            color: #6b7280;
            line-height: 1.6;
            margin-bottom: 10px;
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .moment-container.active {
            animation: slideIn 0.5s ease-out;
        }
    </style>
</head>
<body>
    <div class="lesson-container">
        <div class="lesson-header">
            <h1 class="lesson-title">${lessonContent.title}</h1>
            <p class="lesson-subtitle">Ordklass: ${lessonContent.wordClass}</p>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <p id="progressText">Moment 1 av ${lessonContent.moments.length}</p>
        </div>

        ${this.generateMomentsHTML(lessonContent.moments)}

        <div class="completion-screen" id="completionScreen">
            <div class="completion-icon">🎉</div>
            <h2 class="completion-title">Grattis!</h2>
            <p class="completion-message">Du har slutfört lektionen "${lessonContent.title}"</p>
            <button class="btn btn-primary" onclick="restartLesson()">Börja om</button>
        </div>

        <div class="controls">
            <button class="btn btn-secondary" id="prevBtn" onclick="previousMoment()" disabled>⬅ Föregående</button>
            <span id="momentCounter">1 / ${lessonContent.moments.length}</span>
            <button class="btn btn-primary" id="nextBtn" onclick="nextMoment()">Nästa ➡</button>
        </div>
    </div>

    <script>
        ${this.generateJavaScript(lessonContent)}
    </script>
</body>
</html>`;
  }

  private generateMomentsHTML(moments: LessonMoment[]): string {
    return moments.map((moment, index) => {
      return `
        <div class="moment-container${index === 0 ? ' active' : ''}" id="moment${index}">
          ${this.generateMomentContent(moment, index)}
        </div>
      `;
    }).join('');
  }

  private generateMomentContent(moment: LessonMoment, index: number): string {
    switch (moment.type) {
      case 'textruta':
        return `
          <div class="standard-moment">
            <h2 class="moment-title">${moment.title}</h2>
            <div class="moment-content">
              <div class="content-card">
                <p>${moment.config.text || 'Ingen text angiven.'}</p>
              </div>
            </div>
          </div>
        `;

      case 'pratbubbla':
        const items = moment.config.items || [];
        const simpleText = moment.config.text;
        
        return `
          <div style="display: flex; width: 100%; height: 100vh; min-height: 600px;">
            <!-- Text area - 3/4 of screen -->
            <div style="width: 75%; display: flex; align-items: flex-start; justify-content: center; padding-top: 64px; padding: 32px;">
              <div style="background: white; border-radius: 16px; border: 4px solid #93c5fd; padding: 32px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); max-width: 768px; width: 100%;">
                <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; position: relative;">
                  <div style="position: absolute; right: -8px; top: 24px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-left: 8px solid #f3f4f6;"></div>
                  
                  <div style="font-size: 1.5rem; line-height: 1.6; white-space: pre-wrap;">
                    ${simpleText ? `<p style="font-size: 1.5rem; line-height: 1.6; margin: 0;">${simpleText}</p>` : ''}
                    
                    ${items.map((item: any, index: number) => {
                      if (item.type === 'text') {
                        return `<p style="font-size: 1.5rem; line-height: 1.6; margin: ${index > 0 || simpleText ? '24px 0 0 0' : '0'};">${item.content || ''}</p>`;
                      } else if (item.type === 'question') {
                        return `
                          <div style="margin-top: 24px;">
                            <div style="margin-bottom: 12px;">
                              ${(item.alternatives || []).map((alt: any) => `
                                <button style="width: 100%; text-align: left; justify-content: flex-start; padding: 16px; height: auto; margin-bottom: 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; ${alt.correct ? 'border-color: #10b981; background-color: #f0fdf4;' : ''}">
                                  ${alt.text}
                                </button>
                              `).join('')}
                            </div>
                          </div>
                        `;
                      }
                      return '';
                    }).join('')}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Character area - 1/4 of screen -->
            <div style="width: 25%; display: flex; align-items: center; justify-content: center; padding: 32px;">
              <div style="text-align: center;">
                <div style="font-size: 8rem; margin-bottom: 16px;">
                  ${this.getCharacterDisplay(moment.config.characterImage)}
                </div>
                <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <p style="font-weight: bold; color: #374151; margin: 0;">${moment.config.characterName || 'Kapten Matilda'}</p>
                </div>
              </div>
            </div>
          </div>
        `;

      case 'memory':
        const wordPairs = moment.config.wordPairs || [];
        return `
          <h2 class="moment-title">${moment.title}</h2>
          <div class="moment-content">
            <div class="content-card">
              <h3>Memory-spel: ${moment.config.difficulty || 'Medel'}</h3>
              <p>Ordpar som ska matchas:</p>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                ${wordPairs.map((pair: string) => `
                  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; border: 2px solid #e5e7eb;">
                    <strong>${pair}</strong>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;

      case 'finns-ordklass':
        return `
          <h2 class="moment-title">${moment.title}</h2>
          <div class="moment-content">
            <div class="content-card">
              <p><strong>Uppgift:</strong> ${moment.config.instruction || 'Hitta orden som tillhör målordklassen'}</p>
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 15px 0; line-height: 1.8; font-size: 1.1rem;">
                ${moment.config.text || 'Ingen text angiven'}
              </div>
              <p><strong>Målord:</strong> ${(moment.config.targetWords || []).join(', ')}</p>
            </div>
          </div>
        `;

      case 'ordmoln':
        return `
          <h2 class="moment-title">${moment.title}</h2>
          <div class="moment-content">
            <div class="content-card">
              <h3>Ordmoln: ${moment.config.theme || 'Allmänt'}</h3>
              <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 20px;">
                ${(moment.config.words || []).map(word => `
                  <span style="background: #ede9fe; color: #6b21a8; padding: 8px 16px; border-radius: 20px; font-weight: 600;">
                    ${word}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>
        `;

      case 'slutdiplom':
        return `
          <h2 class="moment-title">${moment.title}</h2>
          <div class="moment-content">
            <div class="content-card">
              <div style="text-align: center; padding: 20px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">🏆</div>
                <h3 style="font-size: 2rem; color: #92400e; margin-bottom: 15px;">
                  ${moment.config.diplomaTitle || 'Grattis!'}
                </h3>
                <h4 style="font-size: 1.5rem; margin-bottom: 10px;">
                  ${moment.config.courseName || 'Kursen'}
                </h4>
                <p style="font-size: 1.1rem; margin: 20px 0;">
                  ${moment.config.message || 'Du har slutfört kursen med framgång!'}
                </p>
              </div>
            </div>
          </div>
        `;

      case 'piratgrav':
        return `
          <h2 class="moment-title">${moment.title}</h2>
          <div class="moment-content">
            <div class="content-card">
              <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 20px;">🏴‍☠️</div>
                <h3>Piratgräv</h3>
                <p><strong>Fråga:</strong> ${moment.config.question || 'Är det ett substantiv?'}</p>
                <p style="margin-top: 15px; color: #6b7280;">Detta är ett interaktivt spel som fungerar bäst i huvudapplikationen.</p>
              </div>
            </div>
          </div>
        `;

      case 'slutprov':
        return `
          <h2 class="moment-title">${moment.title}</h2>
          <div class="moment-content">
            <div class="content-card">
              <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 20px;">📝</div>
                <h3>Slutprov</h3>
                <p>Tidsbegränsat test för att visa vad du har lärt dig.</p>
                <p style="margin-top: 15px; color: #6b7280;">Fullt funktionell version finns i huvudapplikationen.</p>
              </div>
            </div>
          </div>
        `;

      case 'quiz':
        const questions = moment.config.questions || [];
        return `
          <h2 class="moment-title">${moment.title}</h2>
          <div class="moment-content">
            <div class="content-card">
              <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 3rem; margin-bottom: 10px;">❓</div>
                <h3>Quiz</h3>
              </div>
              ${questions.slice(0, 3).map((q: any, i: number) => `
                <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;">
                  <p style="font-weight: bold; margin-bottom: 10px;">${q.question || 'Fråga'}</p>
                  <ul style="list-style-type: none; padding: 0;">
                    ${(q.alternatives || []).map((alt: any, j: number) => `
                      <li style="margin: 5px 0; padding: 8px; background: white; border-radius: 4px; ${alt.correct ? 'border-left: 4px solid #10b981;' : ''}">
                        ${alt.text || 'Alternativ'} ${alt.correct ? '✓' : ''}
                      </li>
                    `).join('')}
                  </ul>
                </div>
              `).join('')}
              ${questions.length > 3 ? `<p style="text-align: center; color: #6b7280;">...och ${questions.length - 3} frågor till</p>` : ''}
            </div>
          </div>
        `;

      // Förenkla alla andra spel-typer
      case 'ordracet':
      case 'mening-pussel':
      case 'gissa-ordet':
      case 'rim-spel':
      case 'synonymer':
      case 'motsatser':
      case 'stavning':
      case 'berattelse':
      case 'korsord':
      case 'fyll-mening':
      case 'dra-ord':
      case 'sortera-korgar':
      case 'ordkedja':
      case 'bokstavs-jakt':
      case 'ordlangd':
      case 'bild-ord':
      case 'ordbok':
      case 'ljudspel':
      case 'ordform':
        return `
          <h2 class="moment-title">${moment.title}</h2>
          <div class="moment-content">
            <div class="content-card">
              <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 20px;">🎮</div>
                <h3>${moment.title}</h3>
                <p>${moment.config.instruction || 'Interaktivt språkspel'}</p>
                <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
                  <p style="color: #6b7280;">Detta är ett interaktivt spel som fungerar bäst i huvudapplikationen med full funktionalitet.</p>
                </div>
              </div>
            </div>
          </div>
        `;

      default:
        return `
          <h2 class="moment-title">${moment.title}</h2>
          <div class="moment-content">
            <p>Detta momenttyp (${moment.type}) stöds inte än i den genererade versionen.</p>
          </div>
        `;
    }
  }

  // Removed complex interactive functions for simplified export

  private getCharacterDisplay(characterImage?: string): string {
    if (!characterImage) return '👨‍🏫';
    
    // Om det är en emoji (kort sträng utan fil-extension), returnera den direkt
    if (characterImage.length <= 4 && !characterImage.includes('.') && !characterImage.includes('/')) {
      return characterImage;
    }
    
    // Om det är en bildlänk, konvertera till passande emoji
    if (characterImage.includes('Pirat') || characterImage.includes('pirat')) {
      return '🏴‍☠️';
    }
    
    // Standard emoji för andra bilder
    return '👨‍🏫';
  }

  private getBackgroundStyle(background?: string): string {
    switch (background) {
      case 'beach':
        return 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #f59e0b 100%)';
      case 'forest':
        return 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #10b981 100%)';
      case 'castle':
        return 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #6366f1 100%)';
      case 'library':
        return 'linear-gradient(135deg, #fef7cd 0%, #fde68a 50%, #f59e0b 100%)';
      case 'space':
        return 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #6366f1 100%)';
      default:
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  }

  private generateReactPlayerApp(lessonContent: LessonContent): string {
    return `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lessonContent.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: ${this.getBackgroundStyle(lessonContent.background)};
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .pratbubbla-container {
            width: 100%;
            height: 100vh;
            display: flex;
        }
        
        .text-area {
            width: 75%;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 4rem;
            padding: 2rem;
        }
        
        .speech-bubble-wrapper {
            background: white;
            border-radius: 1rem;
            padding: 2rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            max-width: 48rem;
            width: 100%;
            border: 4px solid #93c5fd;
        }
        
        .speech-bubble {
            position: relative;
            background: #f3f4f6;
            border-radius: 0.5rem;
            padding: 1.5rem;
            margin-bottom: 1rem;
        }
        
        .speech-bubble::after {
            content: '';
            position: absolute;
            right: -8px;
            top: 24px;
            width: 0;
            height: 0;
            border-top: 8px solid transparent;
            border-bottom: 8px solid transparent;
            border-left: 8px solid #f3f4f6;
        }
        
        .character-area {
            width: 25%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        
        .character-info {
            text-align: center;
        }
        
        .character-emoji {
            font-size: 8rem;
            margin-bottom: 1rem;
        }
        
        .character-name {
            background: white;
            border-radius: 0.5rem;
            padding: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            font-weight: bold;
            color: #374151;
        }
        
        .text-display {
            font-size: 1.5rem;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        
        .typing-cursor {
            animation: blink 1s infinite;
        }
        
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
        
        .alternative-button {
            width: 100%;
            text-align: left;
            padding: 1rem;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            margin-bottom: 0.75rem;
            cursor: pointer;
        }
        
        .alternative-button:hover {
            background: #f9fafb;
        }
        
        .action-button {
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            cursor: pointer;
            margin-right: 0.75rem;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb;
        }
        
        .btn-secondary {
            background: white;
            color: #374151;
            border: 1px solid #d1d5db;
        }
        
        .btn-secondary:hover {
            background: #f9fafb;
        }
        
        .btn-success {
            background: #10b981;
            color: white;
        }
        
        .btn-success:hover {
            background: #059669;
        }
    </style>
</head>
<body>
    <div id="lesson-container"></div>
    
    <script>
        // Lesson data embedded
        const lessonData = ${JSON.stringify(lessonContent, null, 2)};
        
        class LessonPlayer {
            constructor() {
                this.currentMomentIndex = 0;
                this.currentText = "";
                this.textIndex = 0;
                this.currentItemIndex = 0;
                this.itemCompleted = false;
                this.showFeedback = false;
                this.feedbackText = '';
                this.selectedAnswer = null;
                this.typewriterInterval = null;
                
                this.container = document.getElementById('lesson-container');
                this.render();
                this.startTypewriter();
            }
            
            getCurrentMoment() {
                return lessonData.moments[this.currentMomentIndex];
            }
            
            getCurrentItem() {
                const moment = this.getCurrentMoment();
                if (moment?.type === 'pratbubbla' && moment.config.items && moment.config.items.length > 0) {
                    const sortedItems = [...moment.config.items].sort((a, b) => a.order - b.order);
                    return sortedItems[this.currentItemIndex] || null;
                }
                return null;
            }
            
            startTypewriter() {
                this.clearTypewriter();
                const moment = this.getCurrentMoment();
                if (moment?.type === 'pratbubbla') {
                    const currentItem = this.getCurrentItem();
                    let text = '';
                    
                    if (currentItem && (currentItem.type === 'text' || currentItem.type === 'question')) {
                        text = currentItem.content || '';
                    } else if (!moment.config.items) {
                        text = moment.config.text || '';
                    }
                    
                    if (text) {
                        this.textIndex = 0;
                        this.currentText = '';
                        this.itemCompleted = false;
                        const speed = moment.config.animationSpeed || 50;
                        
                        this.typewriterInterval = setInterval(() => {
                            if (this.textIndex < text.length) {
                                this.currentText = text.slice(0, this.textIndex + 1);
                                this.textIndex++;
                                this.updateTextDisplay();
                            } else {
                                this.itemCompleted = true;
                                this.clearTypewriter();
                                this.render();
                            }
                        }, speed);
                    }
                }
            }
            
            clearTypewriter() {
                if (this.typewriterInterval) {
                    clearInterval(this.typewriterInterval);
                    this.typewriterInterval = null;
                }
            }
            
            updateTextDisplay() {
                const textElement = document.getElementById('text-display');
                if (textElement) {
                    textElement.innerHTML = this.currentText + (this.itemCompleted ? '' : '<span class="typing-cursor">|</span>');
                }
            }
            
            handleAnswerSelect(answer, isCorrect) {
                this.selectedAnswer = answer;
                this.showFeedback = true;
                
                const currentItem = this.getCurrentItem();
                if (isCorrect) {
                    this.feedbackText = currentItem?.correctFeedback || 'Rätt! Bra jobbat!';
                } else {
                    this.feedbackText = currentItem?.incorrectFeedback || 'Fel svar. Försök igen!';
                }
                this.render();
            }
            
            resetQuestion() {
                this.selectedAnswer = null;
                this.showFeedback = false;
                this.feedbackText = '';
                this.render();
            }
            
            goToNextItem() {
                const moment = this.getCurrentMoment();
                if (moment.config.items && moment.config.items.length > 0) {
                    const sortedItems = [...moment.config.items].sort((a, b) => a.order - b.order);
                    if (this.currentItemIndex < sortedItems.length - 1) {
                        this.currentItemIndex++;
                        this.render();
                        this.startTypewriter();
                    } else {
                        this.goToNextMoment();
                    }
                } else {
                    this.goToNextMoment();
                }
            }
            
            goToNextMoment() {
                if (this.currentMomentIndex < lessonData.moments.length - 1) {
                    this.currentMomentIndex++;
                    this.currentItemIndex = 0;
                    this.showFeedback = false;
                    this.selectedAnswer = null;
                    this.render();
                    this.startTypewriter();
                }
            }
            
            isLastItem() {
                const moment = this.getCurrentMoment();
                if (moment?.type === 'pratbubbla' && moment.config.items && moment.config.items.length > 0) {
                    const sortedItems = [...moment.config.items].sort((a, b) => a.order - b.order);
                    return this.currentItemIndex === sortedItems.length - 1;
                }
                return false;
            }
            
            render() {
                const moment = this.getCurrentMoment();
                
                if (!moment) {
                    this.container.innerHTML = \`
                        <div class="flex items-center justify-center h-screen text-2xl">
                            Lektion slutförd! 🎉
                        </div>
                    \`;
                    return;
                }
                
                if (moment.type === 'pratbubbla') {
                    const currentItem = this.getCurrentItem();
                    const isCurrentItemQuestion = currentItem?.type === 'question';
                    const isCurrentItemText = currentItem?.type === 'text';
                    
                    let hasQuestion = false;
                    let currentAlternatives = [];
                    
                    if (isCurrentItemQuestion) {
                        hasQuestion = true;
                        currentAlternatives = currentItem?.alternatives || [];
                    } else if (!moment.config.items && moment.config.question && moment.config.alternatives) {
                        hasQuestion = true;
                        currentAlternatives = moment.config.alternatives || [];
                    }
                    
                    const textComplete = (isCurrentItemText || isCurrentItemQuestion) ? this.itemCompleted : true;
                    
                    this.container.innerHTML = \`
                        <div class="pratbubbla-container">
                            <div class="text-area">
                                <div class="speech-bubble-wrapper">
                                    <div class="speech-bubble">
                                        <div id="text-display" class="text-display">
                                            \${this.showFeedback ? this.feedbackText : this.currentText}\${!this.showFeedback && !this.itemCompleted ? '<span class="typing-cursor">|</span>' : ''}
                                        </div>
                                        
                                        \${hasQuestion && isCurrentItemQuestion && textComplete && !this.showFeedback ? \`
                                            <div style="margin-top: 1.5rem;">
                                                \${currentAlternatives.map((alt, index) => \`
                                                    <button class="alternative-button" onclick="player.handleAnswerSelect('\${alt.text}', \${alt.correct})">
                                                        \${alt.text}
                                                    </button>
                                                \`).join('')}
                                            </div>
                                        \` : ''}
                                        
                                        \${this.showFeedback ? \`
                                            <div style="margin-top: 1rem;">
                                                \${!currentAlternatives.find(alt => alt.text === this.selectedAnswer)?.correct ? \`
                                                    <button class="action-button btn-secondary" onclick="player.resetQuestion()">Försök igen</button>
                                                \` : \`
                                                    <button class="action-button btn-primary" onclick="player.\${this.isLastItem() ? 'goToNextMoment' : 'goToNextItem'}()">
                                                        \${this.isLastItem() ? 'Slutför momentet' : 'Nästa'}
                                                    </button>
                                                \`}
                                            </div>
                                        \` : ''}
                                        
                                        \${!hasQuestion && this.itemCompleted && !this.isLastItem() ? \`
                                            <div style="margin-top: 1rem;">
                                                <button class="action-button btn-primary" onclick="player.goToNextItem()">Fortsätt</button>
                                            </div>
                                        \` : ''}
                                        
                                        \${!hasQuestion && this.itemCompleted && this.isLastItem() ? \`
                                            <div style="margin-top: 1rem;">
                                                <button class="action-button btn-success" onclick="player.goToNextMoment()">Slutför momentet</button>
                                            </div>
                                        \` : ''}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="character-area">
                                <div class="character-info">
                                    <div class="character-emoji">🏴‍☠️</div>
                                    <div class="character-name">
                                        \${moment.config.characterName || 'Kapten Matilda'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`;
                } else {
                    this.container.innerHTML = \`
                        <div style="padding: 2rem;">
                            <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">\${moment.title}</h2>
                            <p>Moment typ: \${moment.type}</p>
                            <button class="action-button btn-primary" onclick="player.goToNextMoment()" style="margin-top: 1rem;">Nästa moment</button>
                        </div>
                    \`;
                }
            }
        }
        
        // Start the lesson player
        const player = new LessonPlayer();
    </script>
</body>
</html>`;
  }

  private generateJavaScript(lessonContent: LessonContent): string {
    return `
      let currentMoment = 0;
      const totalMoments = ${lessonContent.moments.length};
      let completedMoments = new Set();

      function updateProgress() {
        const progress = ((currentMoment + 1) / totalMoments) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('progressText').textContent = \`Moment \${currentMoment + 1} av \${totalMoments}\`;
        document.getElementById('momentCounter').textContent = \`\${currentMoment + 1} / \${totalMoments}\`;
        
        document.getElementById('prevBtn').disabled = currentMoment === 0;
        document.getElementById('nextBtn').disabled = currentMoment === totalMoments - 1;
      }

      function showMoment(index) {
        // Göm alla moment
        document.querySelectorAll('.moment-container').forEach(moment => {
          moment.classList.remove('active');
        });
        
        // Visa valt moment
        document.getElementById('moment' + index).classList.add('active');
        currentMoment = index;
        updateProgress();
      }

      function nextMoment() {
        if (currentMoment < totalMoments - 1) {
          completedMoments.add(currentMoment);
          showMoment(currentMoment + 1);
        } else {
          // Visa slutskärm
          document.querySelectorAll('.moment-container').forEach(moment => {
            moment.classList.remove('active');
          });
          document.getElementById('completionScreen').classList.add('active');
          document.querySelector('.controls').style.display = 'none';
        }
      }

      function previousMoment() {
        if (currentMoment > 0) {
          showMoment(currentMoment - 1);
        }
      }

      function restartLesson() {
        currentMoment = 0;
        completedMoments.clear();
        document.getElementById('completionScreen').classList.remove('active');
        document.querySelector('.controls').style.display = 'flex';
        showMoment(0);
      }

      // Initialisera
      updateProgress();
    `;
  }

  public generateLessonFile(lessonContent: LessonContent, fileName: string): string {
    // Skapa output-mapp om den inte finns
    const outputDir = join(process.cwd(), 'generated-lessons');
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (error) {
      // Mappen finns redan
    }

    const htmlContent = this.generateReactPlayerApp(lessonContent);
    const filePath = join(outputDir, fileName);
    
    try {
      writeFileSync(filePath, htmlContent, 'utf8');
      return filePath;
    } catch (error) {
      console.error('Error writing lesson file:', error);
      throw error;
    }
  }

  public generateFileName(title: string, wordClass: string): string {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[åäö]/g, (char) => {
        switch (char) {
          case 'å': return 'a';
          case 'ä': return 'a'; 
          case 'ö': return 'o';
          default: return char;
        }
      })
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${wordClass}-${cleanTitle}-${timestamp}.html`;
  }
}