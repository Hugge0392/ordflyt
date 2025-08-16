import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LessonMoment {
  id: string;
  type: string;
  title: string;
  config: any;
}

interface Lesson {
  title: string;
  wordClass: string;
  moments: LessonMoment[];
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  moment?: string;
  message: string;
}

interface LessonValidatorProps {
  lesson: Lesson;
}

export function LessonValidator({ lesson }: LessonValidatorProps) {
  const validateLesson = (): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // Grundläggande validering
    if (!lesson.title.trim()) {
      issues.push({
        type: 'error',
        message: 'Lektionen saknar titel'
      });
    }

    if (!lesson.wordClass) {
      issues.push({
        type: 'error',
        message: 'Ingen ordklass vald för lektionen'
      });
    }

    if (lesson.moments.length === 0) {
      issues.push({
        type: 'error',
        message: 'Lektionen har inga moment'
      });
    }

    if (lesson.moments.length < 3) {
      issues.push({
        type: 'warning',
        message: 'Lektionen är kort - överväg att lägga till fler moment'
      });
    }

    // Validera varje moment
    lesson.moments.forEach((moment, index) => {
      const momentName = `Moment ${index + 1}: ${moment.title}`;

      switch (moment.type) {
        case 'textruta':
          if (!moment.config.text?.trim()) {
            issues.push({
              type: 'error',
              moment: momentName,
              message: 'Textrutan saknar innehåll'
            });
          }
          break;

        case 'pratbubbla':
          if (!moment.config.text?.trim()) {
            issues.push({
              type: 'error',
              moment: momentName,
              message: 'Pratbubblan saknar text'
            });
          }
          if (!moment.config.characterImage) {
            issues.push({
              type: 'warning',
              moment: momentName,
              message: 'Ingen figur vald för pratbubblan'
            });
          }
          break;

        case 'memory':
          if (!moment.config.wordPairs?.length) {
            issues.push({
              type: 'error',
              moment: momentName,
              message: 'Inga ordpar skapade för memory-spelet'
            });
          } else if (moment.config.wordPairs.length < 3) {
            issues.push({
              type: 'warning',
              moment: momentName,
              message: 'Få ordpar - överväg att lägga till fler för bättre spelupplevelse'
            });
          }
          break;

        case 'finns-ordklass':
          if (!moment.config.text?.trim()) {
            issues.push({
              type: 'error',
              moment: momentName,
              message: 'Ingen text att söka ord i'
            });
          }
          if (!moment.config.targetWords?.length) {
            issues.push({
              type: 'error',
              moment: momentName,
              message: 'Inga målord angivna'
            });
          }
          if (!moment.config.instruction?.trim()) {
            issues.push({
              type: 'warning',
              moment: momentName,
              message: 'Ingen instruktion för eleven'
            });
          }
          break;

        case 'korsord':
          if (!moment.config.clues?.length) {
            issues.push({
              type: 'error',
              moment: momentName,
              message: 'Inga ledtrådar för korsordet'
            });
          } else if (moment.config.clues.length < 4) {
            issues.push({
              type: 'warning',
              moment: momentName,
              message: 'Få ledtrådar - korsordet kan bli för lätt'
            });
          }
          break;

        case 'sortera-korgar':
          if (!moment.config.words?.length) {
            issues.push({
              type: 'error',
              moment: momentName,
              message: 'Inga ord att sortera'
            });
          }
          if (!moment.config.categories?.length) {
            issues.push({
              type: 'error',
              moment: momentName,
              message: 'Inga kategorier/korgar definierade'
            });
          }
          break;

        case 'ordmoln':
          if (!moment.config.words?.length) {
            issues.push({
              type: 'error',
              moment: momentName,
              message: 'Inga ord för ordmolnet'
            });
          } else if (moment.config.words.length < 5) {
            issues.push({
              type: 'warning',
              moment: momentName,
              message: 'Få ord - ordmolnet kan bli glest'
            });
          }
          break;

        case 'fyll-mening':
          if (!moment.config.sentence?.trim()) {
            issues.push({
              type: 'error',
              moment: momentName,
              message: 'Ingen mening att fylla i'
            });
          }
          if (!moment.config.blanks?.length) {
            issues.push({
              type: 'error',
              moment: momentName,
              message: 'Inga rätta svar angivna'
            });
          }
          break;
      }
    });

    // Kontrollera pedagogisk progression
    const firstMoment = lesson.moments[0];
    if (firstMoment && firstMoment.type !== 'textruta' && firstMoment.type !== 'pratbubbla') {
      issues.push({
        type: 'info',
        message: 'Överväg att börja med introduktion (textruta eller pratbubbla)'
      });
    }

    // Kontrollera variation
    const momentTypes = lesson.moments.map(m => m.type);
    const uniqueTypes = new Set(momentTypes);
    if (uniqueTypes.size < Math.min(3, lesson.moments.length)) {
      issues.push({
        type: 'info',
        message: 'Mer variation av momenttyper skulle göra lektionen mer engagerande'
      });
    }

    return issues;
  };

  const issues = validateLesson();
  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');
  const infos = issues.filter(i => i.type === 'info');

  if (issues.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <AlertDescription className="text-green-800">
          ✅ Lektionen ser bra ut! Inga problem hittades.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Lektionsvalidering
          <div className="flex gap-2">
            {errors.length > 0 && <Badge variant="destructive">{errors.length} fel</Badge>}
            {warnings.length > 0 && <Badge className="bg-yellow-100 text-yellow-800">{warnings.length} varningar</Badge>}
            {infos.length > 0 && <Badge variant="secondary">{infos.length} tips</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {errors.map((issue, i) => (
          <Alert key={`error-${i}`} variant="destructive">
            <AlertDescription>
              <strong>Fel:</strong> {issue.moment && `${issue.moment} - `}{issue.message}
            </AlertDescription>
          </Alert>
        ))}
        
        {warnings.map((issue, i) => (
          <Alert key={`warning-${i}`} className="border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              <strong>Varning:</strong> {issue.moment && `${issue.moment} - `}{issue.message}
            </AlertDescription>
          </Alert>
        ))}
        
        {infos.map((issue, i) => (
          <Alert key={`info-${i}`} className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              <strong>Tips:</strong> {issue.moment && `${issue.moment} - `}{issue.message}
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}