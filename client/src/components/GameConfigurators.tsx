import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface GameConfiguratorProps {
  moment: any;
  updateMomentConfig: (id: string, config: any) => void;
}

export function OrdracetConfigurator({ moment, updateMomentConfig }: GameConfiguratorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Ord som ska falla (ett per rad)</Label>
        <Textarea
          value={(moment.config.words || []).join('\n')}
          onChange={(e) => {
            const words = e.target.value.split('\n').map(w => w.trim()).filter(w => w);
            updateMomentConfig(moment.id, { ...moment.config, words });
          }}
          placeholder="hund\nkatt\nbil\nhus"
          className="min-h-[100px]"
        />
      </div>
      <div>
        <Label>Hastighet</Label>
        <Select
          value={moment.config.speed || 'medium'}
          onValueChange={(value) => updateMomentConfig(moment.id, { ...moment.config, speed: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="slow">Långsam</SelectItem>
            <SelectItem value="medium">Medel</SelectItem>
            <SelectItem value="fast">Snabb</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Speltid (sekunder)</Label>
        <Input
          type="number"
          value={moment.config.duration || 60}
          onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, duration: parseInt(e.target.value) })}
        />
      </div>
    </div>
  );
}

export function MeningPusselConfigurator({ moment, updateMomentConfig }: GameConfiguratorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Meningar att pussa ihop (en per rad)</Label>
        <Textarea
          value={(moment.config.sentences || []).join('\n')}
          onChange={(e) => {
            const sentences = e.target.value.split('\n').map(s => s.trim()).filter(s => s);
            updateMomentConfig(moment.id, { ...moment.config, sentences });
          }}
          placeholder="Katten sitter på mattan\nHunden springer i parken\nFågeln flyger i luften"
          className="min-h-[100px]"
        />
        <div className="text-xs text-gray-500 mt-1">
          Meningarna delas automatiskt upp i delar som eleven ska sätta ihop
        </div>
      </div>
      <div>
        <Label>Svårighetsgrad</Label>
        <Select
          value={moment.config.difficulty || 'easy'}
          onValueChange={(value) => updateMomentConfig(moment.id, { ...moment.config, difficulty: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Lätt (3-4 delar)</SelectItem>
            <SelectItem value="medium">Medel (5-6 delar)</SelectItem>
            <SelectItem value="hard">Svår (7+ delar)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function GissaOrdetConfigurator({ moment, updateMomentConfig }: GameConfiguratorProps) {
  const addWordClue = () => {
    const words = moment.config.words || [];
    const clues = moment.config.clues || [];
    words.push('');
    clues.push('');
    updateMomentConfig(moment.id, { ...moment.config, words, clues });
  };

  const updateWordClue = (index: number, word: string, clue: string) => {
    const words = [...(moment.config.words || [])];
    const clues = [...(moment.config.clues || [])];
    words[index] = word;
    clues[index] = clue;
    updateMomentConfig(moment.id, { ...moment.config, words, clues });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Maximalt antal gissningar</Label>
        <Input
          type="number"
          value={moment.config.maxGuesses || 3}
          onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, maxGuesses: parseInt(e.target.value) })}
        />
      </div>
      
      <div>
        <Label>Ord och ledtrådar</Label>
        <div className="space-y-3">
          {(moment.config.words || []).map((word: string, index: number) => (
            <Card key={index} className="p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Ord</Label>
                  <Input
                    value={word}
                    onChange={(e) => updateWordClue(index, e.target.value, moment.config.clues?.[index] || '')}
                    placeholder="hund"
                  />
                </div>
                <div>
                  <Label className="text-xs">Ledtråd</Label>
                  <Input
                    value={moment.config.clues?.[index] || ''}
                    onChange={(e) => updateWordClue(index, word, e.target.value)}
                    placeholder="Ett djur som säger vov"
                  />
                </div>
              </div>
            </Card>
          ))}
          <Button onClick={addWordClue} variant="outline" className="w-full">
            + Lägg till ord
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RimSpelConfigurator({ moment, updateMomentConfig }: GameConfiguratorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Instruktion</Label>
        <Input
          value={moment.config.instruction || 'Hitta ord som rimmar'}
          onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, instruction: e.target.value })}
          placeholder="Hitta ord som rimmar med..."
        />
      </div>
      <div>
        <Label>Ord för rimspelet (ett per rad)</Label>
        <Textarea
          value={(moment.config.words || []).join('\n')}
          onChange={(e) => {
            const words = e.target.value.split('\n').map(w => w.trim()).filter(w => w);
            updateMomentConfig(moment.id, { ...moment.config, words });
          }}
          placeholder="katt\nhatt\nmatt\nbil\nstil\nmil"
          className="min-h-[100px]"
        />
        <div className="text-xs text-gray-500 mt-1">
          Ord som rimmar grupperas automatiskt
        </div>
      </div>
    </div>
  );
}

export function SynonymerConfigurator({ moment, updateMomentConfig }: GameConfiguratorProps) {
  const addWordPair = () => {
    const pairs = [...(moment.config.wordPairs || []), { word1: '', word2: '' }];
    updateMomentConfig(moment.id, { ...moment.config, wordPairs: pairs });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Instruktion</Label>
        <Input
          value={moment.config.instruction || 'Matcha ord med samma betydelse'}
          onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, instruction: e.target.value })}
        />
      </div>
      
      <div>
        <Label>Synonympar</Label>
        <div className="space-y-2">
          {(moment.config.wordPairs || []).map((pair: any, index: number) => (
            <Card key={index} className="p-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={pair.word1 || ''}
                  onChange={(e) => {
                    const pairs = [...(moment.config.wordPairs || [])];
                    pairs[index] = { ...pairs[index], word1: e.target.value };
                    updateMomentConfig(moment.id, { ...moment.config, wordPairs: pairs });
                  }}
                  placeholder="stor"
                />
                <Input
                  value={pair.word2 || ''}
                  onChange={(e) => {
                    const pairs = [...(moment.config.wordPairs || [])];
                    pairs[index] = { ...pairs[index], word2: e.target.value };
                    updateMomentConfig(moment.id, { ...moment.config, wordPairs: pairs });
                  }}
                  placeholder="väldig"
                />
              </div>
            </Card>
          ))}
          <Button onClick={addWordPair} variant="outline" className="w-full">
            + Lägg till synonympar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QuizConfigurator({ moment, updateMomentConfig }: GameConfiguratorProps) {
  const addQuestion = () => {
    const questions = [...(moment.config.questions || []), {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    }];
    updateMomentConfig(moment.id, { ...moment.config, questions });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tidsgräns (sekunder, 0 = ingen gräns)</Label>
          <Input
            type="number"
            value={moment.config.timeLimit || 0}
            onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, timeLimit: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label>Slumpmässig ordning</Label>
          <Select
            value={moment.config.randomOrder ? 'true' : 'false'}
            onValueChange={(value) => updateMomentConfig(moment.id, { ...moment.config, randomOrder: value === 'true' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Ja</SelectItem>
              <SelectItem value="false">Nej</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Frågor</Label>
        <div className="space-y-4">
          {(moment.config.questions || []).map((question: any, index: number) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Fråga {index + 1}</Label>
                  <Input
                    value={question.question || ''}
                    onChange={(e) => {
                      const questions = [...(moment.config.questions || [])];
                      questions[index] = { ...questions[index], question: e.target.value };
                      updateMomentConfig(moment.id, { ...moment.config, questions });
                    }}
                    placeholder="Vad är ett substantiv?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {question.options?.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name={`correct-${index}`}
                        checked={question.correctAnswer === optIndex}
                        onChange={() => {
                          const questions = [...(moment.config.questions || [])];
                          questions[index] = { ...questions[index], correctAnswer: optIndex };
                          updateMomentConfig(moment.id, { ...moment.config, questions });
                        }}
                      />
                      <Input
                        value={option}
                        onChange={(e) => {
                          const questions = [...(moment.config.questions || [])];
                          questions[index].options[optIndex] = e.target.value;
                          updateMomentConfig(moment.id, { ...moment.config, questions });
                        }}
                        placeholder={`Alternativ ${optIndex + 1}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
          <Button onClick={addQuestion} variant="outline" className="w-full">
            + Lägg till fråga
          </Button>
        </div>
      </div>
    </div>
  );
}