import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InteractivePreview } from "@/components/InteractivePreview";
import { ArrowLeft, Clock, Target, BookOpen } from "lucide-react";
import { Link } from "wouter";
import FocusMode from "@/components/FocusMode";
import NormalMode from "@/components/NormalMode";

interface Assignment {
  id: string;
  teacherId: string;
  studentId?: string;
  classId?: string;
  assignmentType: string;
  lessonId?: string;
  wordClass?: string;
  title: string;
  description?: string;
  instructions?: string;
  availableFrom?: string;
  dueDate?: string;
  estimatedDuration?: number;
  allowRetries: boolean;
  showCorrectAnswers: boolean;
  requireCompletion: boolean;
  settings?: {
    showProgress: boolean;
    requireCompletion: boolean;
    allowLateSubmission: boolean;
    immediateCorrection: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LessonMoment {
  id: string;
  type: string;
  title: string;
  order: number;
  config: any;
}

interface PublishedLesson {
  id: string;
  title: string;
  description: string;
  wordClass: string;
  difficulty: string;
  content: {
    title: string;
    moments: LessonMoment[];
    wordClass: string;
  };
  fileName: string;
  filePath?: string;
}

// Mock student data - denna kommer senare från auth context
const mockStudent = {
  id: "a78c06fe-815a-4feb-adeb-1177699f4913", // Real student ID from database
  name: "Test Elev",
};

// Advanced reading lesson component using existing sophisticated reading tools
function ReadingLessonContent({ lesson }: { lesson: any }) {
  console.log('ReadingLessonContent rendering with lesson:', lesson);

  // Use the same state structure as the main reading lesson viewer
  const [currentPage, setCurrentPage] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Settings for accessibility (same structure as the main viewer)
  const [activeSettings, setActiveSettings] = useState({
    fontSize: 18,
    lineHeight: 1.6,
    backgroundColor: "black-on-white",
    fontFamily: "standard",
  });

  const [focusSettings, setFocusSettings] = useState({
    fontSize: 20,
    lineHeight: 1.8,
    backgroundColor: "#242424",
    fontFamily: "standard",
  });

  // Reading focus states for focus mode
  const [readingFocusLines, setReadingFocusLines] = useState(3);
  const [currentReadingLine, setCurrentReadingLine] = useState(0);
  const [focusAnimationState, setFocusAnimationState] = useState("active");

  // Question handling states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [generalAnswers, setGeneralAnswers] = useState<Record<number, string>>({});
  const [questionsPanel12Answers, setQuestionsPanel12Answers] = useState<Record<number, string>>({});
  const [showFocusQuestionsPopup, setShowFocusQuestionsPopup] = useState(false);

  // Process the lesson data to work with existing components
  const pages = lesson?.pages || lesson?.richPages || [];

  // Debug logging
  console.log('ReadingLessonContent received lesson:', lesson);
  console.log('Pages found:', pages);
  console.log('Pages length:', pages.length);
  console.log('Lesson questions:', lesson?.questions);
  console.log('Page questions:', pages.map((p: any) => p?.questions));

  // Fallback content handling
  if (!pages.length) {
    if (lesson?.content) {
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Innehåll</h3>
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
          </div>
        </div>
      );
    }
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Ingen läslektion hittades</p>
        <p className="text-xs text-gray-400 mt-2">Debug: {lesson ? Object.keys(lesson).join(', ') : 'no lesson'}</p>
      </div>
    );
  }

  // Helper functions for the reading components
  const processContentWithDefinitions = (content: string, definitions: any[]) => {
    if (!definitions || !definitions.length) return content;
    let processedContent = content;
    definitions.forEach((def) => {
      const regex = new RegExp(`\\b${def.word}\\b`, 'gi');
      processedContent = processedContent.replace(regex,
        `<span class="defined-word" title="${def.definition}">${def.word}</span>`
      );
    });
    return processedContent;
  };

  const processRichDocWithDefinitions = (richDoc: any, definitions: any[]) => {
    return richDoc; // For now, return as-is
  };

  const getPageContentForDefinitions = (page: any) => {
    return page?.content || '';
  };

  const handleContentMouseOver = (e: React.MouseEvent) => {
    // Handle word definition hover
  };

  const handleContentMouseOut = (e: React.MouseEvent) => {
    // Handle word definition hover end
  };

  // Question handling - collect all questions from lesson and pages
  const allQuestions = useMemo(() => {
    const questions: any[] = [];

    // Add general lesson questions
    if (lesson?.questions?.length) {
      lesson.questions.forEach((q: any, index: number) => {
        questions.push({
          question: q,
          source: 'general',
          originalIndex: index,
          globalIndex: questions.length
        });
      });
    }

    // Add page-specific questions
    pages.forEach((page: any, pageIndex: number) => {
      if (page?.questions?.length) {
        page.questions.forEach((q: any, questionIndex: number) => {
          questions.push({
            question: q,
            source: 'page',
            pageIndex: pageIndex,
            originalIndex: questionIndex,
            globalIndex: questions.length
          });
        });
      }
    });

    return questions;
  }, [lesson, pages]);

  const totalQuestions = allQuestions.length;
  const currentQuestionData = allQuestions[currentQuestionIndex] || null;
  const currentAnswer = questionsPanel12Answers[currentQuestionIndex] || '';
  const isCurrentQuestionAnswered = !!currentAnswer;
  const progressPercentage = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const isRichContent = pages.length > 0 && 'doc' in pages[0];

  console.log('All questions found:', allQuestions);
  console.log('Current question index:', currentQuestionIndex);
  console.log('Current question data:', currentQuestionData);

  // Navigation handlers
  const hasNextPage = () => currentPage < pages.length - 1;
  const hasPreviousPage = () => currentPage > 0;

  const goToNextPageFromFocus = () => {
    if (hasNextPage()) {
      setCurrentPage(currentPage + 1);
      setCurrentReadingLine(0);
    }
  };

  const goToPreviousPageFromFocus = () => {
    if (hasPreviousPage()) {
      setCurrentPage(currentPage - 1);
      setCurrentReadingLine(0);
    }
  };

  // Question navigation functions
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleQuestionsPanel12Change = (index: number, answer: string) => {
    setQuestionsPanel12Answers(prev => ({ ...prev, [index]: answer }));
  };

  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const getTotalQuestionsCount = () => totalQuestions;
  const getShowFocusQuestionsButton = () => totalQuestions > 0;

  // Render with the sophisticated reading components
  console.log('About to render, isFocusMode:', isFocusMode);
  console.log('totalQuestions:', totalQuestions);
  console.log('currentQuestionData:', currentQuestionData);

  // Temporary fallback to test basic rendering
  if (!lesson || !pages.length) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="text-yellow-800 font-semibold">Testar grundläggande rendering</h3>
        <p>Lektion: {lesson ? 'Finns' : 'Saknas'}</p>
        <p>Sidor: {pages.length}</p>
        <p>Totala frågor: {totalQuestions}</p>
        {lesson?.content && (
          <div className="mt-4 p-2 bg-white rounded">
            <h4>Direktinnehåll:</h4>
            <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
          </div>
        )}
      </div>
    );
  }

  if (isFocusMode) {
    console.log('Rendering FocusMode');
    return (
      <FocusMode
        lesson={lesson}
        currentPage={currentPage}
        pages={pages}
        focusSettings={focusSettings}
        setFocusSettings={setFocusSettings}
        processContentWithDefinitions={processContentWithDefinitions}
        processRichDocWithDefinitions={processRichDocWithDefinitions}
        isRichContent={isRichContent}
        getPageContentForDefinitions={getPageContentForDefinitions}
        readingFocusLines={readingFocusLines}
        setReadingFocusLines={setReadingFocusLines}
        currentReadingLine={currentReadingLine}
        setCurrentReadingLine={setCurrentReadingLine}
        focusAnimationState={focusAnimationState}
        setFocusAnimationState={setFocusAnimationState}
        onExitFocusMode={() => setIsFocusMode(false)}
        showFocusQuestionsPopup={showFocusQuestionsPopup}
        setShowFocusQuestionsPopup={setShowFocusQuestionsPopup}
        getTotalQuestionsCount={getTotalQuestionsCount}
        getShowFocusQuestionsButton={getShowFocusQuestionsButton}
        generalAnswers={generalAnswers}
        setGeneralAnswers={setGeneralAnswers}
        questionsPanel12Answers={questionsPanel12Answers}
        setQuestionsPanel12Answers={setQuestionsPanel12Answers}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        goToNextPageFromFocus={goToNextPageFromFocus}
        goToPreviousPageFromFocus={goToPreviousPageFromFocus}
      />
    );
  }

  console.log('Rendering NormalMode');
  return (
    <NormalMode
      lesson={lesson}
      currentPage={currentPage}
      pages={pages}
      activeSettings={activeSettings}
      setActiveSettings={setActiveSettings}
      processContentWithDefinitions={processContentWithDefinitions}
      processRichDocWithDefinitions={processRichDocWithDefinitions}
      isRichContent={isRichContent}
      getPageContentForDefinitions={getPageContentForDefinitions}
      handleContentMouseOver={handleContentMouseOver}
      handleContentMouseOut={handleContentMouseOut}
      onToggleFocusMode={() => setIsFocusMode(true)}
      totalQuestions={totalQuestions}
      currentQuestionIndex={currentQuestionIndex}
      currentQuestionData={currentQuestionData}
      currentAnswer={currentAnswer}
      isCurrentQuestionAnswered={isCurrentQuestionAnswered}
      progressPercentage={progressPercentage}
      handleQuestionsPanel12Change={handleQuestionsPanel12Change}
      goToPreviousQuestion={goToPreviousQuestion}
      goToNextQuestion={goToNextQuestion}
      isFirstQuestion={isFirstQuestion}
      isLastQuestion={isLastQuestion}
      showQuestionsPanel12={totalQuestions > 0}
    />
  );
}

export default function AssignmentPlayer() {
  const [match, params] = useRoute("/assignment/:id");
  const [currentMoment, setCurrentMoment] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const assignmentId = params?.id;

  // Fetch the specific assignment
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: [`/api/students/${mockStudent.id}/assignments`],
    enabled: true,
  });

  // Fetch published lessons for assignment content
  const { data: publishedLessons = [] } = useQuery<PublishedLesson[]>({
    queryKey: ['/api/lessons/published'],
  });

  // Fetch reading lessons for reading assignment content
  const { data: readingLessons = [], isLoading: readingLessonsLoading, error: readingLessonsError } = useQuery<any[]>({
    queryKey: ['/api/reading-lessons/published'],
    enabled: true,
  });

  const assignment = assignments.find(a => a.id === assignmentId);

  // Get the lessons associated with this assignment
  // Handle different assignment types
  let assignmentContent = null;

  if (assignment?.assignmentType === 'reading_lesson') {
    // For reading lessons, find by title
    assignmentContent = readingLessons.find(lesson => lesson.title === assignment.title);
  } else if (assignment?.lessonId) {
    // For published lessons, find by ID
    assignmentContent = publishedLessons.find(lesson => lesson.id === assignment.lessonId);
  }

  const assignmentLessons = assignmentContent ? [assignmentContent] : [];

  const currentLesson = assignmentLessons[currentLessonIndex];

  // Debug log to verify this component is being used
  console.log('AssignmentPlayer loaded with ID:', assignmentId);
  console.log('Assignments loading:', assignmentsLoading);
  console.log('Reading lessons loading:', readingLessonsLoading);
  console.log('Reading lessons error:', readingLessonsError);
  console.log('Found assignment:', assignment);
  console.log('Assignment type:', assignment?.assignmentType);
  console.log('Reading lessons from API:', readingLessons.map(l => ({ id: l.id, title: l.title })));
  console.log('Assignment content:', assignmentContent);
  console.log('Assignment lessons:', assignmentLessons);
  console.log('Current lesson:', currentLesson);

  if (assignmentsLoading || readingLessonsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">📚</div>
          <div className="text-lg text-gray-600">Laddar uppdraget...</div>
          <div className="text-sm text-gray-500 mt-2">
            {assignmentsLoading && "Hämtar uppgifter..."}
            {readingLessonsLoading && "Hämtar läslektioner..."}
          </div>
        </div>
      </div>
    );
  }

  if (!match || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Uppdraget hittades inte</h1>
          <p className="text-gray-600 mb-6">Det uppdraget du försöker komma åt finns inte eller är inte tillgängligt.</p>
          <Link href="/elev">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till hemsidan
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (assignmentLessons.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Inget innehåll tillgängligt</h1>
          <p className="text-gray-600 mb-6">Det här uppdraget har inga lektioner kopplade till sig än.</p>

          {/* Debug information */}
          <div className="bg-gray-100 p-4 rounded mb-6 text-left">
            <h3 className="font-semibold mb-2">Debug Information:</h3>
            <p><strong>Assignment ID:</strong> {assignmentId}</p>
            <p><strong>Assignment Type:</strong> {assignment?.assignmentType}</p>
            <p><strong>Assignment Title:</strong> {assignment?.title}</p>
            <p><strong>Reading Lessons Found:</strong> {readingLessons.length}</p>
            <p><strong>Reading Lessons Titles:</strong> {readingLessons.map(l => l.title).join(', ')}</p>
            <p><strong>Assignment Content Found:</strong> {assignmentContent ? 'Yes' : 'No'}</p>
            {readingLessonsError && <p><strong>Error:</strong> {readingLessonsError.message}</p>}
          </div>

          <Link href="/elev">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till hemsidan
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getAssignmentTypeText = (type: string) => {
    switch (type) {
      case 'reading_lesson': return 'Läslektion';
      case 'word_class_practice': return 'Ordklassövning';
      case 'published_lesson': return 'Interaktiv lektion';
      default: return 'Uppgift';
    }
  };

  const moments = currentLesson?.content?.moments || [];
  const isReadingLesson = assignment?.assignmentType === 'reading_lesson';

  const nextMoment = () => {
    if (isReadingLesson) {
      // For reading lessons, we don't need moment navigation
      return;
    }
    if (currentMoment < moments.length - 1) {
      setCurrentMoment(currentMoment + 1);
    } else if (currentLessonIndex < assignmentLessons.length - 1) {
      // Move to next lesson
      setCurrentLessonIndex(currentLessonIndex + 1);
      setCurrentMoment(0);
    }
  };

  const prevMoment = () => {
    if (isReadingLesson) {
      // For reading lessons, we don't need moment navigation
      return;
    }
    if (currentMoment > 0) {
      setCurrentMoment(currentMoment - 1);
    } else if (currentLessonIndex > 0) {
      // Move to previous lesson
      setCurrentLessonIndex(currentLessonIndex - 1);
      const prevLesson = assignmentLessons[currentLessonIndex - 1];
      setCurrentMoment((prevLesson?.content?.moments?.length || 1) - 1);
    }
  };

  const isFirstMoment = currentLessonIndex === 0 && currentMoment === 0;
  const isLastMoment = isReadingLesson ||
                       (currentLessonIndex === assignmentLessons.length - 1 &&
                        currentMoment === moments.length - 1);

  // Track start time for time spent calculation
  const [startTime] = useState(Date.now());

  // Function to submit assignment with answers
  const submitAssignment = async () => {
    if (!assignment || !params?.id) return;

    try {
      console.log('📝 Submitting assignment:', params.id);

      // Collect all answers from reading lesson or other assignment types
      const answers: Record<string, any> = {};

      // Get answers from reading lesson if it exists
      if (assignmentContent && isReadingLesson) {
        // Try to access answers from reading lesson component
        // This would be better implemented with proper state management
        console.log('Collecting answers from reading lesson...');
        answers.readingLessonAnswers = {
          questionsPanel12Answers: {}, // Would be passed from ReadingLessonContent
          generalAnswers: {}, // Would be passed from ReadingLessonContent
        };
      }

      const submissionData = {
        assignmentId: params.id,
        studentId: mockStudent.id, // In real app, get from auth context
        assignmentType: assignment.assignmentType,
        answers: answers,
        completedAt: new Date().toISOString(),
        timeSpent: Date.now() - startTime, // Time spent in milliseconds
        lessonId: currentLesson?.id,
        lessonTitle: currentLesson?.title,
      };

      // Check for dev bypass mode
      const isDevBypass = !import.meta.env.PROD && localStorage.getItem('devBypass') === 'true';

      if (isDevBypass) {
        console.log('🔄 Dev bypass active - simulating assignment submission');
        console.log('Submission data:', submissionData);

        // Show success message
        alert('✅ Uppgift skickad! (Dev mode - ingen riktig inlämning)');

        // Navigate back to student home
        window.location.href = '/elev';
        return;
      }

      // Real submission to API
      const response = await fetch(`/api/assignments/${params.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit assignment: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Assignment submitted successfully:', result);

      // Show success message and navigate
      alert('✅ Uppgift skickad!');
      window.location.href = '/elev';

    } catch (error) {
      console.error('❌ Error submitting assignment:', error);
      alert('❌ Fel vid inlämning av uppgift. Försök igen.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/elev">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tillbaka
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{assignment.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <Badge variant="outline">
                    {getAssignmentTypeText(assignment.assignmentType)}
                  </Badge>
                  {assignment.estimatedDuration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {assignment.estimatedDuration} min
                    </span>
                  )}
                  {assignmentLessons.length > 1 && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {assignmentLessons.length} lektioner
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {assignmentLessons.length > 1 && (
                <span>Lektion {currentLessonIndex + 1} av {assignmentLessons.length}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {assignment.description && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Instruktioner</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{assignment.description}</p>
            </CardContent>
          </Card>
        )}

        {currentLesson && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                {currentLesson.title}
                {assignmentLessons.length > 1 && (
                  <Badge variant="secondary" className="ml-2">
                    {currentLessonIndex + 1}/{assignmentLessons.length}
                  </Badge>
                )}
              </CardTitle>
              {currentLesson.description && (
                <p className="text-gray-600 mt-2">{currentLesson.description}</p>
              )}
            </CardHeader>
            <CardContent>
              {moments.length > 0 || (assignment?.assignmentType === 'reading_lesson' && assignmentContent) ? (
                <>
                  {moments.length > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">
                          Moment {currentMoment + 1} av {moments.length}: {moments[currentMoment]?.title}
                        </h3>
                        <div className="text-sm text-gray-500">
                          {Math.round(((currentMoment + 1) / moments.length) * 100)}% klart
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((currentMoment + 1) / moments.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    {assignment?.assignmentType === 'reading_lesson' && assignmentContent ? (
                      <ReadingLessonContent lesson={assignmentContent} />
                    ) : moments[currentMoment] ? (
                      <InteractivePreview
                        moment={moments[currentMoment]}
                        onComplete={nextMoment}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Innehållet laddas...</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={prevMoment}
                      disabled={isFirstMoment}
                    >
                      Föregående
                    </Button>

                    {isLastMoment ? (
                      <Button
                        onClick={submitAssignment}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        Slutför uppdraget
                      </Button>
                    ) : (
                      <Button onClick={nextMoment}>
                        Nästa
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Den här lektionen har inget innehåll än.</p>
                  {!isLastMoment ? (
                    <Button onClick={nextMoment}>
                      Nästa lektion
                    </Button>
                  ) : (
                    <Link href="/elev">
                      <Button className="bg-green-500 hover:bg-green-600 text-white">
                        Slutför uppdraget
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}