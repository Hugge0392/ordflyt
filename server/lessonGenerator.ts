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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            padding: 40px;
            min-height: 400px;
            display: none;
        }

        .moment-container.active {
            display: block;
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
          <h2 class="moment-title">${moment.title}</h2>
          <div class="moment-content">
            <div class="content-card">
              <p>${moment.config.text || 'Ingen text angiven.'}</p>
            </div>
          </div>
        `;

      case 'pratbubbla':
        const items = moment.config.items || [];
        const textItems = items.filter((item: any) => item.type === 'text');
        return `
          <h2 class="moment-title">${moment.title}</h2>
          <div class="moment-content">
            <div class="content-card">
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="font-size: 3rem;">${moment.config.characterImage || '👨‍🏫'}</div>
                <div style="flex: 1;">
                  ${textItems.map((item: any) => `<p style="margin-bottom: 10px;">${item.content || ''}</p>`).join('')}
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

    const htmlContent = this.generateHTMLTemplate(lessonContent);
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