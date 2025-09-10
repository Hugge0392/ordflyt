import React, { useRef } from "react";
import useStickyPanel from "../hooks/useStickyPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Eye,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ReadingLesson } from "@shared/schema";

const COLOR_SCHEMES: Record<string, { bg: string; text: string }> = {
  "black-on-white":        { bg: "#FFFFFF", text: "#000000" }, // Svart på vitt
  "light-gray-on-gray":    { bg: "#595959", text: "#D9D9D9" }, // Ljusgrå på grå
  "white-on-black":        { bg: "#000000", text: "#FFFFFF" }, // Vit på svart
  "black-on-light-yellow": { bg: "#FFFFCC", text: "#000000" }, // Svart på ljusgul
  "black-on-light-blue":   { bg: "#CCFFFF", text: "#000000" }, // Svart på ljusblå
  "light-yellow-on-blue":  { bg: "#003399", text: "#FFFFCC" }, // Ljusgul på blå
  "black-on-light-red":    { bg: "#FFCCCC", text: "#000000" }, // Svart på ljusröd
};

const FONT_MAP: Record<string, string> = {
  standard: "Inter, system-ui, -apple-system, sans-serif",
  "dyslexia-friendly": "'OpenDyslexic', 'Open Dyslexic', system-ui, sans-serif",
};

interface NormalModeProps {
  lesson: ReadingLesson;
  currentPage: number;
  pages: string[];
  activeSettings: {
    fontSize: number;
    lineHeight: number;
    backgroundColor: string;
    fontFamily: string;
  };
  setActiveSettings: (settings: any) => void;
  processContentWithDefinitions: (content: string, definitions: any[]) => string;
  handleContentMouseOver: (e: React.MouseEvent) => void;
  handleContentMouseOut: (e: React.MouseEvent) => void;
  onToggleFocusMode: () => void;
  totalQuestions: number;
  currentQuestionIndex: number;
  currentQuestionData: any;
  currentAnswer: string;
  isCurrentQuestionAnswered: boolean;
  progressPercentage: number;
  handleQuestionsPanel12Change: (index: number, answer: string) => void;
  goToPreviousQuestion: () => void;
  goToNextQuestion: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  showQuestionsPanel12: boolean;
}

export default function NormalMode({
  lesson,
  currentPage,
  pages,
  activeSettings,
  setActiveSettings,
  processContentWithDefinitions,
  handleContentMouseOver,
  handleContentMouseOut,
  onToggleFocusMode,
  totalQuestions,
  currentQuestionIndex,
  currentQuestionData,
  currentAnswer,
  isCurrentQuestionAnswered,
  progressPercentage,
  handleQuestionsPanel12Change,
  goToPreviousQuestion,
  goToNextQuestion,
  isFirstQuestion,
  isLastQuestion,
  showQuestionsPanel12,
}: NormalModeProps) {
  // Refs för sticky panel
  const readingContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Beräkna färg- och font-variabler
  const scheme = COLOR_SCHEMES[activeSettings.backgroundColor] ?? COLOR_SCHEMES["black-on-white"];
  const fontFamilyResolved = FONT_MAP[activeSettings.fontFamily] ?? FONT_MAP["standard"];

  const styleVars: React.CSSProperties = {
    // skriv CSS-variablerna som resten av din CSS redan använder
    ["--accessibility-bg-color" as any]: scheme.bg,
    ["--accessibility-text-color" as any]: scheme.text,
    ["--accessibility-border-color" as any]: scheme.text,
    ["--accessibility-font-family" as any]: fontFamilyResolved,
    ["--accessibility-font-size" as any]: `${activeSettings.fontSize}px`,
    ["--accessibility-line-height" as any]: String(activeSettings.lineHeight),
    ["--reading-font-size" as any]: `${activeSettings.fontSize}px`,
    ["--reading-line-height" as any]: String(activeSettings.lineHeight),
    ["--normal-font-family" as any]: fontFamilyResolved,
  };
  
  // Använd hooken för sticky-funktionalitet
  const { isSticky, panelHeight } = useStickyPanel(readingContainerRef, panelRef);

  return (
    <div className="reading-main-grid grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-8 items-start mb-6">
      {/* Questions Panel - One Question at a Time */}
      {showQuestionsPanel12 && lesson && totalQuestions > 0 && (
        <div className="questions-panel-wrapper order-2 lg:order-2">
          {/* Spacer-element för att undvika layoutskutt när panelen blir fixed */}
          <div 
            className={`panel-spacer ${isSticky ? 'sticky-space' : ''}`} 
            style={{ height: isSticky ? `${panelHeight}px` : 0 }}
          />
          <div
            ref={panelRef}
            className="questions-panel-container border rounded-lg p-6 max-h-[calc(100vh-2rem)] overflow-y-auto"
              style={
                {
                  ...styleVars,
                  backgroundColor: "var(--accessibility-bg-color)",
                  color: "var(--accessibility-text-color)",
                  borderColor: "var(--accessibility-text-color)",
                  borderWidth: "0.5px",
                  maxWidth: "720px",
                  fontFamily: "var(--normal-font-family)",
                } as React.CSSProperties
              }
            >
              <h3 className="text-lg font-semibold mb-4">Frågor</h3>

              {/* Progress indicator */}
              <div className="questions-progress-section mb-6">
                <div className="questions-progress-header flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    Fråga {currentQuestionIndex + 1} av {totalQuestions}
                  </p>
                  {isCurrentQuestionAnswered && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Besvarad
                    </span>
                  )}
                </div>
                <div
                  className="questions-progress-bar-track w-full bg-gray-200 rounded-full h-2"
                  style={{
                    backgroundColor: "var(--accessibility-text-color)",
                    opacity: 0.2,
                  }}
                >
                  <div
                    className="questions-progress-bar-fill h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${progressPercentage}%`,
                      backgroundColor: "var(--accessibility-text-color)",
                      opacity: 0.8,
                    }}
                  />
                </div>
              </div>

              {/* Current question */}
              {currentQuestionData && (
                <div className="questions-content-wrapper space-y-4">
                  <label 
                    className="block text-lg font-medium leading-relaxed"
                    style={{ fontFamily: "var(--normal-font-family)" }}
                  >
                    {currentQuestionData.question.question}
                  </label>

                  {/* Multiple choice questions */}
                  {(currentQuestionData.question.type === "multiple_choice" ||
                    currentQuestionData.question.type ===
                      "multiple-choice") &&
                    (currentQuestionData.question.alternatives ||
                      currentQuestionData.question.options) && (
                      <div className="questions-multiple-choice-options space-y-3">
                        {(currentQuestionData.question.alternatives ||
                          currentQuestionData.question.options)!.map(
                          (option: string, optionIndex: number) => {
                            const optionValue = String.fromCharCode(
                              65 + optionIndex,
                            );
                            const isSelected = currentAnswer === optionValue;

                            return (
                              <label
                                key={optionIndex}
                                className="flex items-center gap-3 cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  name={`question-${currentQuestionIndex}`}
                                  value={optionValue}
                                  checked={isSelected}
                                  onChange={() =>
                                    handleQuestionsPanel12Change(
                                      currentQuestionIndex,
                                      optionValue,
                                    )
                                  }
                                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                  style={{
                                    accentColor:
                                      "var(--accessibility-text-color)",
                                  }}
                                />
                                <span 
                                  className="flex-1 text-base"
                                  style={{ fontFamily: "var(--normal-font-family)" }}
                                >
                                  {option}
                                </span>
                              </label>
                            );
                          },
                        )}
                      </div>
                    )}

                  {/* True/False questions */}
                  {(currentQuestionData.question.type === "true_false" ||
                    currentQuestionData.question.type === "true-false") && (
                    <div className="questions-true-false-options space-y-3">
                      {["Sant", "Falskt"].map((option) => {
                        const isSelected = currentAnswer === option;

                        return (
                          <label
                            key={option}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestionIndex}`}
                              value={option}
                              checked={isSelected}
                              onChange={() =>
                                handleQuestionsPanel12Change(
                                  currentQuestionIndex,
                                  option,
                                )
                              }
                              className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                              style={{
                                accentColor:
                                  "var(--accessibility-text-color)",
                              }}
                            />
                            <span 
                              className="flex-1 text-base"
                              style={{ fontFamily: "var(--normal-font-family)" }}
                            >
                              {option}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Open-ended questions */}
                  {(currentQuestionData.question.type === "open_ended" ||
                    currentQuestionData.question.type === "open") && (
                    <div className="questions-open-ended-wrapper space-y-2">
                      <textarea
                        id={`question-${currentQuestionIndex}`}
                        value={currentAnswer}
                        onChange={(e) =>
                          handleQuestionsPanel12Change(
                            currentQuestionIndex,
                            e.target.value,
                          )
                        }
                        placeholder="Skriv ditt svar här..."
                        className="w-full min-h-[100px] p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                        style={{
                          backgroundColor: "var(--accessibility-bg-color)",
                          color: "var(--accessibility-text-color)",
                          borderColor: "var(--accessibility-text-color)",
                          borderWidth: "0.5px",
                          fontSize: "16px",
                          lineHeight: "1.5",
                          fontFamily: "var(--normal-font-family)",
                        }}
                        rows={4}
                      />
                      {currentAnswer && (
                        <p className="text-sm text-gray-600">
                          {currentAnswer.length} tecken
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation buttons */}
              <div
                className="questions-navigation-container flex items-center justify-between mt-8 pt-4 border-t"
                style={{
                  borderColor: "var(--accessibility-text-color)",
                  borderTopWidth: "0.5px",
                }}
              >
                <button
                  onClick={goToPreviousQuestion}
                  disabled={isFirstQuestion}
                  className="unique-prev-question-btn"
                  style={{
                    background: "#ffffff !important",
                    color: "#000000 !important",
                    border: "1px solid #000000 !important",
                    padding: "10px 16px !important",
                    borderRadius: "8px !important",
                    cursor: isFirstQuestion ? "not-allowed" : "pointer",
                    fontSize: "14px !important",
                    fontWeight: "500 !important",
                    display: "flex !important",
                    alignItems: "center !important",
                    gap: "8px !important",
                    fontFamily: "system-ui, sans-serif !important",
                    opacity: "1 !important",
                    filter: "none !important",
                    boxShadow: "none !important",
                    outline: "none !important",
                    position: "relative",
                    zIndex: 999,
                  }}
                >
                  <ChevronLeft style={{ width: "16px", height: "16px" }} />
                  Tillbaka
                </button>

                <button
                  onClick={
                    isLastQuestion
                      ? () =>
                          alert("Bra jobbat! Du har svarat på alla frågor.")
                      : goToNextQuestion
                  }
                  className="unique-next-question-btn"
                  style={{
                    background: "#ffffff !important",
                    color: "#000000 !important",
                    border: "1px solid #000000 !important",
                    padding: "10px 16px !important",
                    borderRadius: "8px !important",
                    cursor: "pointer",
                    fontSize: "14px !important",
                    fontWeight: "500 !important",
                    display: "flex !important",
                    alignItems: "center !important",
                    gap: "8px !important",
                    fontFamily: "system-ui, sans-serif !important",
                    opacity: "1 !important",
                    filter: "none !important",
                    boxShadow: "none !important",
                    outline: "none !important",
                    position: "relative",
                    zIndex: 999,
                  }}
                >
                  {isLastQuestion ? "Skicka in" : "Nästa"}
                  <ChevronRight style={{ width: "16px", height: "16px" }} />
                </button>
              </div>
            </div>
        </div>
      )}

      {/* Main Content - Left Column (takes 2/3 of space) */}
      <Card
        className="reading-content-card mb-6 lg:mb-0 order-1 lg:order-1"
        style={
          {
            ...styleVars,
            backgroundColor: "var(--accessibility-bg-color)",
            color: "var(--accessibility-text-color)",
            borderColor: "var(--accessibility-text-color)",
            borderWidth: "0.5px",
            "--card-text-color": "var(--accessibility-text-color)",
          } as React.CSSProperties
        }
      >
        <CardHeader className="relative">
          <div className="reading-header-container flex items-center justify-between">
            <CardTitle className="text-lg mt-2">
              <span>Läs texten</span>
            </CardTitle>
            <div className="reading-controls-container flex gap-2">
              {/* Focus Mode Toggle Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleFocusMode}
                style={{
                  backgroundColor: "#FFFFFF !important",
                  color: "#000000 !important",
                  borderColor: "#000000 !important",
                  borderWidth: "1px !important"
                }}
                className="!bg-white !text-black !border-black hover:!bg-white hover:!text-black hover:!border-black"
              >
                <Eye className="w-4 h-4 mr-1" style={{ color: "#000000 !important" }} />
                Fokusläge
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    style={{
                      backgroundColor: "#FFFFFF !important",
                      color: "#000000 !important",
                      borderColor: "#000000 !important",
                      borderWidth: "1px !important"
                    }}
                    className="!bg-white !text-black !border-black hover:!bg-white hover:!text-black hover:!border-black"
                  >
                    <Settings className="w-4 h-4 mr-1" style={{ color: "#000000 !important" }} />
                    Inställningar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">
                        Textstorlek
                      </Label>
                      <Slider
                        value={[activeSettings.fontSize]}
                        onValueChange={(value) =>
                          setActiveSettings((prev: any) => ({
                            ...prev,
                            fontSize: value[0],
                          }))
                        }
                        min={16}
                        max={60}
                        step={2}
                        className="mt-2"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {activeSettings.fontSize}px
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        Radavstånd
                      </Label>
                      <Slider
                        value={[activeSettings.lineHeight]}
                        onValueChange={(value) =>
                          setActiveSettings((prev: any) => ({
                            ...prev,
                            lineHeight: value[0],
                          }))
                        }
                        min={1.0}
                        max={3.0}
                        step={0.1}
                        className="mt-2"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {activeSettings.lineHeight.toFixed(1)}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        Bakgrundsfärg
                      </Label>
                      <Select
                        value={activeSettings.backgroundColor}
                        onValueChange={(value) =>
                          setActiveSettings((prev: any) => ({
                            ...prev,
                            backgroundColor: value,
                          }))
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="black-on-white">
                            Svart på vitt
                          </SelectItem>
                          <SelectItem value="light-gray-on-gray">
                            Ljusgrå på grå
                          </SelectItem>
                          <SelectItem value="white-on-black">
                            Vit på svart
                          </SelectItem>
                          <SelectItem value="black-on-light-yellow">
                            Svart på ljusgul
                          </SelectItem>
                          <SelectItem value="black-on-light-blue">
                            Svart på ljusblå
                          </SelectItem>
                          <SelectItem value="light-yellow-on-blue">
                            Ljusgul på blå
                          </SelectItem>
                          <SelectItem value="black-on-light-red">
                            Svart på ljusröd
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        Teckensnitt
                      </Label>
                      <Select
                        value={activeSettings.fontFamily}
                        onValueChange={(value) =>
                          setActiveSettings((prev: any) => ({
                            ...prev,
                            fontFamily: value,
                          }))
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="dyslexia-friendly">
                            Dyslexi-vänligt
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {lesson.wordDefinitions && lesson.wordDefinitions.length > 0 && (
            <CardDescription>
              💡 Ord med prickad understrykning har förklaringar - håll
              musen över dem
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="relative">
          <div className="reading-content-wrapper space-y-6">
            {/* Bilder ovanför texten för denna sida */}
            {lesson.pages &&
              lesson.pages[currentPage]?.imagesAbove &&
              lesson.pages[currentPage]?.imagesAbove!.length > 0 && (
                <div className="reading-images-container space-y-4">
                  {lesson.pages[currentPage]?.imagesAbove!.map(
                    (imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={`Bild ovanför texten ${index + 1}`}
                        className="w-full max-w-3xl h-auto rounded-lg mx-auto"
                      />
                    ),
                  )}
                </div>
              )}

            <div
              ref={readingContainerRef}
              className="reading-text-container max-w-none min-h-[400px] reading-content accessibility-enhanced relative"
              style={{
                ...styleVars,
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                backgroundColor: "var(--accessibility-bg-color)",
                color: "var(--accessibility-text-color)",
                display: "flow-root",
                fontFamily: "var(--accessibility-font-family)",
              } as React.CSSProperties}
              onMouseOver={handleContentMouseOver}
              onMouseOut={handleContentMouseOut}
            >
              <style>{`
                /* Dölj bara divider/HR */
                .reading-content hr,
                .reading-content [role="separator"],
                .reading-content .ql-divider,
                .reading-content .divider {
                  display: none !important;
                }

                /* Låt textfärgen vinna, men rör inte bakgrunder generellt */
                .reading-content {
                  background-color: var(--accessibility-bg-color) !important;
                  color: var(--accessibility-text-color) !important;
                }
                .reading-content * {
                  color: var(--accessibility-text-color) !important;
                }
                
                /* Specifik styling för rubriker - proportionell mot bastextstorlek */
                .reading-content [data-reading-text] h1 {
                  font-size: calc(var(--accessibility-font-size) * 1.8) !important;
                  line-height: 1.2 !important;
                  font-weight: bold !important;
                  margin: 0 0 0.2em 0 !important;
                }
                .reading-content [data-reading-text] h2 {
                  font-size: calc(var(--accessibility-font-size) * 1.5) !important;
                  line-height: 1.3 !important;
                  font-weight: bold !important;
                  margin: 0 0 0.15em 0 !important;
                }
                .reading-content [data-reading-text] h3 {
                  font-size: calc(var(--accessibility-font-size) * 1.3) !important;
                  line-height: 1.3 !important;
                  font-weight: bold !important;
                  margin: 0 0 0.15em 0 !important;
                }
                
                /* Ordförklaringar styling */
                .defined-word {
                  text-decoration: underline dotted;
                  text-underline-offset: 2px;
                  cursor: help;
                }
              `}</style>

              <div
                data-reading-text
                dangerouslySetInnerHTML={{
                  __html: processContentWithDefinitions(
                    pages[currentPage] || "",
                    lesson.wordDefinitions,
                  ),
                }}
              />
            </div>

            {/* Bilder under texten för denna sida */}
            {lesson.pages &&
              lesson.pages[currentPage]?.imagesBelow &&
              lesson.pages[currentPage]?.imagesBelow!.length > 0 && (
                <div className="reading-images-below-container space-y-4">
                  {lesson.pages[currentPage]?.imagesBelow!.map(
                    (imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={`Bild under texten ${index + 1}`}
                        className="w-full max-w-3xl h-auto rounded-lg mx-auto"
                      />
                    ),
                  )}
                </div>
              )}

            {/* Page navigation */}
            {pages.length > 1 && (
              <div className="reading-page-navigation flex items-center justify-between pt-6">
                <div className="reading-page-indicators flex gap-2">
                  {pages.map((_, index) => (
                    <Badge
                      key={index}
                      variant={index === currentPage ? "default" : "outline"}
                      className="cursor-pointer"
                    >
                      Sida {index + 1}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}