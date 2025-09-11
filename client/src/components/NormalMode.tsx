import React, { useRef, useEffect } from "react";
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
  Volume2,
} from "lucide-react";
import { TextToSpeechControls } from "./TextToSpeechControls";
import type { ReadingLesson } from "@shared/schema";
import { COLOR_SCHEMES, FONT_MAPS } from "@/lib/accessibility-constants";

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
  const scheme = COLOR_SCHEMES[activeSettings.backgroundColor as keyof typeof COLOR_SCHEMES] ?? COLOR_SCHEMES["black-on-white"];
  const fontFamilyResolved = FONT_MAPS[activeSettings.fontFamily as keyof typeof FONT_MAPS] ?? FONT_MAPS["standard"];

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

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in a text input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          if (currentPage > 0) {
            e.preventDefault();
            // Add smooth transition animation
            const container = document.querySelector('.reading-text-container');
            if (container) {
              (container as HTMLElement).style.transition = 'transform 0.3s ease-in-out';
              (container as HTMLElement).style.transform = 'translateX(-10px)';
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('changePage', { detail: currentPage - 1 }));
                (container as HTMLElement).style.transform = 'translateX(10px)';
                setTimeout(() => {
                  (container as HTMLElement).style.transform = 'translateX(0)';
                }, 50);
              }, 150);
            }
          }
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          if (currentPage < pages.length - 1) {
            e.preventDefault();
            // Add smooth transition animation
            const container = document.querySelector('.reading-text-container');
            if (container) {
              (container as HTMLElement).style.transition = 'transform 0.3s ease-in-out';
              (container as HTMLElement).style.transform = 'translateX(10px)';
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('changePage', { detail: currentPage + 1 }));
                (container as HTMLElement).style.transform = 'translateX(-10px)';
                setTimeout(() => {
                  (container as HTMLElement).style.transform = 'translateX(0)';
                }, 50);
              }, 150);
            }
          }
          break;
        case 'f':
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onToggleFocusMode();
          }
          break;
        case 'Escape':
          // Focus management - return focus to main content
          readingContainerRef.current?.focus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pages.length, onToggleFocusMode]);

  return (
    <div className="reading-main-grid grid grid-cols-1 lg:grid-cols-[2.3fr_1fr] gap-3 items-start mb-4 overflow-x-hidden">
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
            className="questions-panel-container bg-white dark:bg-gray-900 rounded-lg p-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
              style={
                {
                  ...styleVars,
                  backgroundColor: "var(--accessibility-bg-color)",
                  border: "2px solid",
                  borderColor: "color-mix(in srgb, var(--accessibility-text-color) 25%, transparent)",
                  maxWidth: "720px",
                  fontFamily: "var(--normal-font-family)",
                } as React.CSSProperties
              }
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--accessibility-text-color) 10%, transparent)",
                  } as React.CSSProperties}
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="var(--accessibility-text-color)"
                    style={{ opacity: 0.7 } as React.CSSProperties}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 
                    className="text-lg font-bold"
                    style={{ color: "var(--accessibility-text-color)" } as React.CSSProperties}
                  >
                    Frågor
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ 
                      color: "color-mix(in srgb, var(--accessibility-text-color) 70%, transparent)" 
                    } as React.CSSProperties}
                  >
                    Svara medan du läser
                  </p>
                </div>
              </div>

              {/* Progress indicator */}
              <div 
                className="questions-progress-section mb-4 p-3 rounded-lg"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accessibility-text-color) 5%, transparent)",
                } as React.CSSProperties}
              >
                <div className="questions-progress-header flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-lg font-bold"
                      style={{ color: "var(--accessibility-text-color)" } as React.CSSProperties}
                    >
                      {currentQuestionIndex + 1}
                    </span>
                    <span 
                      className="text-sm"
                      style={{ 
                        color: "color-mix(in srgb, var(--accessibility-text-color) 60%, transparent)" 
                      } as React.CSSProperties}
                    >
                      av
                    </span>
                    <span 
                      className="text-sm font-medium"
                      style={{ color: "var(--accessibility-text-color)" } as React.CSSProperties}
                    >
                      {totalQuestions}
                    </span>
                  </div>
                  {isCurrentQuestionAnswered ? (
                    <span 
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--accessibility-text-color) 15%, transparent)",
                        color: "var(--accessibility-text-color)",
                        borderColor: "color-mix(in srgb, var(--accessibility-text-color) 30%, transparent)",
                      } as React.CSSProperties}
                    >
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Besvarad
                    </span>
                  ) : (
                    <span 
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--accessibility-text-color) 8%, transparent)",
                        color: "color-mix(in srgb, var(--accessibility-text-color) 80%, transparent)",
                        borderColor: "color-mix(in srgb, var(--accessibility-text-color) 20%, transparent)",
                      } as React.CSSProperties}
                    >
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      Väntar
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div
                    className="questions-progress-bar-track w-full rounded-full h-3"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--accessibility-text-color) 15%, transparent)",
                    } as React.CSSProperties}
                  >
                    <div
                      className="questions-progress-bar-fill h-3 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${progressPercentage}%`,
                        backgroundColor: "var(--accessibility-text-color)",
                        opacity: 0.8,
                      } as React.CSSProperties}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span 
                      style={{ 
                        color: "color-mix(in srgb, var(--accessibility-text-color) 70%, transparent)" 
                      } as React.CSSProperties}
                    >
                      Start
                    </span>
                    <span 
                      className="font-medium"
                      style={{ color: "var(--accessibility-text-color)" } as React.CSSProperties}
                    >
                      {Math.round(progressPercentage)}% klar
                    </span>
                    <span 
                      style={{ 
                        color: "color-mix(in srgb, var(--accessibility-text-color) 70%, transparent)" 
                      } as React.CSSProperties}
                    >
                      Slut
                    </span>
                  </div>
                </div>
              </div>

              {/* Current question */}
              {currentQuestionData && (
                <div className="questions-content-wrapper">
                  <div className="question-card rounded-lg p-4 mb-4 shadow-sm" style={{ backgroundColor: "var(--accessibility-bg-color)", border: "2px solid", borderColor: "color-mix(in srgb, var(--accessibility-text-color) 25%, transparent)" } as React.CSSProperties}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 rounded-full flex-shrink-0 mt-1 min-w-[32px] h-8 flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--accessibility-text-color) 80%, transparent)", color: "var(--accessibility-bg-color)" } as React.CSSProperties}>
                        <span className="text-sm font-bold">
                          {currentQuestionIndex + 1}
                        </span>
                      </div>
                      <label 
                        className="block text-lg font-semibold leading-relaxed text-gray-900 dark:text-white"
                        style={{ fontFamily: "var(--normal-font-family)", fontSize: "18px" }}
                      >
                        {currentQuestionData.question.question}
                      </label>
                    </div>

                    {/* Multiple choice questions */}
                    {(currentQuestionData.question.type === "multiple_choice" ||
                      currentQuestionData.question.type ===
                        "multiple-choice") &&
                      (currentQuestionData.question.alternatives ||
                        currentQuestionData.question.options) && (
                        <div className="questions-multiple-choice-options space-y-2">
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
                                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                    isSelected 
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 shadow-md' 
                                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                                  }`}
                                >
                                  <div className="relative">
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
                                      className="w-5 h-5"
                                      style={{
                                        color: "var(--accessibility-text-color)",
                                        accentColor: isSelected ? "var(--accessibility-text-color)" : "color-mix(in srgb, var(--accessibility-text-color) 50%, transparent)",
                                      } as React.CSSProperties}
                                    />
                                    {isSelected && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 flex-1">
                                    <span 
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                      style={{
                                        backgroundColor: isSelected 
                                          ? "color-mix(in srgb, var(--accessibility-text-color) 80%, transparent)"
                                          : "color-mix(in srgb, var(--accessibility-text-color) 15%, transparent)",
                                        color: isSelected 
                                          ? "var(--accessibility-bg-color)"
                                          : "color-mix(in srgb, var(--accessibility-text-color) 70%, transparent)"
                                      } as React.CSSProperties}
                                    >
                                      {optionValue}
                                    </span>
                                    <span 
                                      className="flex-1 text-base font-medium text-gray-900 dark:text-white leading-relaxed"
                                      style={{ fontFamily: "var(--normal-font-family)", fontSize: "16px" }}
                                    >
                                      {option}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: "color-mix(in srgb, var(--accessibility-text-color) 80%, transparent)" } as React.CSSProperties}>
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </label>
                              );
                            },
                          )}
                        </div>
                      )}

                    {/* True/False questions */}
                    {(currentQuestionData.question.type === "true_false" ||
                      currentQuestionData.question.type === "true-false") && (
                      <div className="questions-true-false-options grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[{label: "Sant", icon: "✓", color: "green"}, {label: "Falskt", icon: "✗", color: "red"}].map((option) => {
                          const isSelected = currentAnswer === option.label;

                          return (
                            <label
                              key={option.label}
                              className="flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md"
                              style={{
                                borderColor: isSelected 
                                  ? "color-mix(in srgb, var(--accessibility-text-color) 60%, transparent)"
                                  : "color-mix(in srgb, var(--accessibility-text-color) 25%, transparent)",
                                backgroundColor: isSelected 
                                  ? "color-mix(in srgb, var(--accessibility-text-color) 10%, transparent)"
                                  : "transparent"
                              } as React.CSSProperties}
                            >
                              <div className="relative">
                                <input
                                  type="radio"
                                  name={'question-' + currentQuestionIndex}
                                  value={option.label}
                                  checked={isSelected}
                                  onChange={() =>
                                    handleQuestionsPanel12Change(
                                      currentQuestionIndex,
                                      option.label,
                                    )
                                  }
                                  className="w-5 h-5"
                                  style={{
                                    accentColor: isSelected ? "color-mix(in srgb, var(--accessibility-text-color) 80%, transparent)" : "color-mix(in srgb, var(--accessibility-text-color) 50%, transparent)",
                                  } as React.CSSProperties}
                                />
                              </div>
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors"
                                style={{
                                  backgroundColor: isSelected 
                                    ? "color-mix(in srgb, var(--accessibility-text-color) 80%, transparent)"
                                    : "color-mix(in srgb, var(--accessibility-text-color) 15%, transparent)",
                                  color: isSelected 
                                    ? "var(--accessibility-bg-color)"
                                    : "color-mix(in srgb, var(--accessibility-text-color) 70%, transparent)"
                                } as React.CSSProperties}
                              >
                                {option.icon}
                              </div>
                              <span 
                                className="flex-1 text-base font-medium text-gray-900 dark:text-white"
                                style={{ fontFamily: "var(--normal-font-family)" }}
                              >
                                {option.label}
                              </span>
                              {isSelected && (
                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: "color-mix(in srgb, var(--accessibility-text-color) 80%, transparent)" } as React.CSSProperties}>
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Open-ended questions */}
                    {(currentQuestionData.question.type === "open_ended" ||
                      currentQuestionData.question.type === "open") && (
                      <div className="questions-open-ended-wrapper">
                        <div className="relative">
                          <textarea
                            id={'question-' + currentQuestionIndex}
                            value={currentAnswer}
                            onChange={(e) =>
                              handleQuestionsPanel12Change(
                                currentQuestionIndex,
                                e.target.value,
                              )
                            }
                            placeholder="Skriv ditt svar här..."
                            className="w-full min-h-[120px] p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical transition-all duration-200 bg-white dark:bg-gray-800"
                            style={{
                              fontSize: "16px",
                              lineHeight: "1.6",
                              fontFamily: "var(--normal-font-family)",
                            }}
                            rows={5}
                          />
                          <div className="absolute top-2 right-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-sm">
                          {currentAnswer ? (
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1 font-medium" style={{ color: currentAnswer.length > 0 ? "color-mix(in srgb, var(--accessibility-text-color) 80%, green)" : "color-mix(in srgb, var(--accessibility-text-color) 50%, transparent)" } as React.CSSProperties}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                                {currentAnswer.length} tecken
                              </span>
                              <span 
                                className="flex items-center gap-1"
                                style={{
                                  color: currentAnswer.split(' ').filter(word => word.trim().length > 0).length > 0 
                                    ? "var(--accessibility-text-color)" 
                                    : "color-mix(in srgb, var(--accessibility-text-color) 50%, transparent)"
                                } as React.CSSProperties}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                {currentAnswer.split(' ').filter(word => word.trim().length > 0).length} ord
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Börja skriva ditt svar...
                            </span>
                          )}
                          <span 
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: currentAnswer && currentAnswer.trim().length > 10 
                                ? "color-mix(in srgb, var(--accessibility-text-color) 15%, transparent)"
                                : "color-mix(in srgb, var(--accessibility-text-color) 8%, transparent)",
                              color: "var(--accessibility-text-color)",
                              border: "1px solid",
                              borderColor: "color-mix(in srgb, var(--accessibility-text-color) 20%, transparent)"
                            } as React.CSSProperties}
                          >
                            {currentAnswer && currentAnswer.trim().length > 10 ? 'Bra längd' : 'Kort svar'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="questions-navigation-container mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={goToPreviousQuestion}
                    disabled={isFirstQuestion}
                    className="group flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 focus:outline-none text-sm"
                    style={{
                      backgroundColor: isFirstQuestion 
                        ? "color-mix(in srgb, var(--accessibility-text-color) 8%, transparent)"
                        : "color-mix(in srgb, var(--accessibility-text-color) 15%, transparent)",
                      color: isFirstQuestion 
                        ? "color-mix(in srgb, var(--accessibility-text-color) 40%, transparent)"
                        : "var(--accessibility-text-color)",
                      cursor: isFirstQuestion ? "not-allowed" : "pointer",
                      border: "1px solid",
                      borderColor: "color-mix(in srgb, var(--accessibility-text-color) 20%, transparent)"
                    } as React.CSSProperties}
                  >
                    <ChevronLeft 
                      className="w-4 h-4 transition-transform duration-200"
                      style={{
                        transform: !isFirstQuestion ? 'translateX(-2px)' : 'none'
                      } as React.CSSProperties}
                    />
                    <span>Föregående</span>
                  </button>

                  <button
                    onClick={
                      isLastQuestion
                        ? () =>
                            alert("🎉 Fantastiskt! Du har svarat på alla frågor!")
                        : goToNextQuestion
                    }
                    className="group flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 focus:outline-none shadow-sm hover:shadow-md hover:scale-105 active:scale-95 text-sm"
                    style={{
                      backgroundColor: isLastQuestion 
                        ? "color-mix(in srgb, var(--accessibility-text-color) 70%, green)"
                        : "color-mix(in srgb, var(--accessibility-text-color) 80%, transparent)",
                      color: "var(--accessibility-bg-color)"
                    } as React.CSSProperties}
                  >
                    <span>{isLastQuestion ? "🎯 Slutför" : "Nästa"}</span>
                    {isLastQuestion ? (
                      <svg className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    ) : (
                      <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    )}
                  </button>
                </div>
              </div>
            </div>
        </div>
      )}

      {/* Main Content - Left Column (takes 2/3 of space) */}
      <Card
        className="reading-content-card mb-4 lg:mb-0 order-1 lg:order-1 bg-white dark:bg-gray-900 rounded-lg overflow-hidden"
        style={
          {
            ...styleVars,
            backgroundColor: "var(--accessibility-bg-color)",
            border: "2px solid",
            borderColor: "color-mix(in srgb, var(--accessibility-text-color) 25%, transparent)",
          } as React.CSSProperties
        }
      >
        <CardHeader 
          className="relative border-b-2 bg-white dark:bg-gray-900"
          style={{
            backgroundColor: "var(--accessibility-bg-color)",
            borderBottomColor: "color-mix(in srgb, var(--accessibility-text-color) 20%, transparent)",
          } as React.CSSProperties}
        >
          <div className="reading-header-container flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accessibility-text-color) 10%, transparent)",
                } as React.CSSProperties}
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="var(--accessibility-text-color)"
                  style={{ opacity: 0.7 } as React.CSSProperties}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <CardTitle 
                  className="text-xl font-bold"
                  style={{ color: "var(--accessibility-text-color)" } as React.CSSProperties}
                >
                  Läs texten
                </CardTitle>
                <p 
                  className="text-sm mt-1"
                  style={{ 
                    color: "color-mix(in srgb, var(--accessibility-text-color) 70%, transparent)" 
                  } as React.CSSProperties}
                >
                  Fokusera på innehållet och förståelsen
                </p>
              </div>
            </div>
            <div className="reading-controls-container flex gap-2">
              {/* Text-to-Speech Controls */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    style={{
                      backgroundColor: "var(--accessibility-bg-color)",
                      borderColor: "color-mix(in srgb, var(--accessibility-text-color) 30%, transparent)",
                      color: "var(--accessibility-text-color)",
                    } as React.CSSProperties}
                  >
                    <Volume2 className="w-4 h-4 mr-1" />
                    Uppläsning
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4" align="end">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Uppläsning av text</h4>
                    <TextToSpeechControls
                      text={pages[currentPage] || ""}
                      variant="default"
                      accessibilityStyles={{
                        backgroundColor: "var(--accessibility-bg-color)",
                        color: "var(--accessibility-text-color)",
                        fontFamily: "var(--normal-font-family)",
                      } as React.CSSProperties}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* Focus Mode Toggle Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleFocusMode}
                style={{
                  backgroundColor: "var(--accessibility-bg-color)",
                  borderColor: "color-mix(in srgb, var(--accessibility-text-color) 30%, transparent)",
                  color: "var(--accessibility-text-color)",
                } as React.CSSProperties}
              >
                <Eye className="w-4 h-4 mr-1" />
                Fokusläge
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Inställningar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">
                        Textstorlek: {activeSettings.fontSize}px
                      </Label>
                      <Slider
                        value={[activeSettings.fontSize]}
                        onValueChange={([value]) =>
                          setActiveSettings((prev: any) => ({
                            ...prev,
                            fontSize: value,
                          }))
                        }
                        min={16}
                        max={60}
                        step={2}
                        className="mt-2"
                        data-testid="slider-normal-font-size"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Liten</span>
                        <span>Normal</span>
                        <span>Stor</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        Radavstånd: {activeSettings.lineHeight.toFixed(1)}
                      </Label>
                      <Slider
                        value={[activeSettings.lineHeight]}
                        onValueChange={([value]) =>
                          setActiveSettings((prev: any) => ({
                            ...prev,
                            lineHeight: value,
                          }))
                        }
                        min={1.0}
                        max={3.0}
                        step={0.1}
                        className="mt-2"
                        data-testid="slider-normal-line-height"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Tätt</span>
                        <span>Normal</span>
                        <span>Luftigt</span>
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
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <CardDescription className="text-amber-800 dark:text-amber-200 font-medium">
                  Ord med prickad understrykning har förklaringar - håll musen över dem för att se definitionen
                </CardDescription>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="relative p-4 lg:p-6">
          <div className="reading-content-wrapper space-y-8">
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
                        alt={"Bild ovanför texten " + (index + 1)}
                        className="w-full max-w-3xl h-auto rounded-lg mx-auto"
                      />
                    ),
                  )}
                </div>
              )}

            <div
              ref={readingContainerRef}
              className="reading-text-container max-w-none min-h-[400px] reading-content accessibility-enhanced relative rounded-lg p-4 lg:p-6"
              style={{
                ...styleVars,
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                backgroundColor: "var(--accessibility-bg-color)",
                color: "var(--accessibility-text-color)",
                display: "flow-root",
                fontFamily: "var(--accessibility-font-family)",
                textRendering: "optimizeLegibility",
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
                border: "1px solid",
                borderColor: "color-mix(in srgb, var(--accessibility-text-color) 15%, transparent)",
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
                
                /* Förbättrad paragrafstiling */
                .reading-content [data-reading-text] p {
                  font-size: var(--accessibility-font-size) !important;
                  line-height: var(--accessibility-line-height) !important;
                  font-family: var(--accessibility-font-family) !important;
                  margin: 0 0 1.2em 0 !important;
                  text-align: justify !important;
                  hyphens: auto !important;
                  word-spacing: 0.1em !important;
                }
                
                /* Förbättrad ordfrkingsmarkeringar styling */
                .defined-word {
                  text-decoration: none !important;
                  background: linear-gradient(120deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%) !important;
                  border-bottom: 2px dotted rgba(59, 130, 246, 0.6) !important;
                  padding: 0.1em 0.2em !important;
                  border-radius: 3px !important;
                  cursor: help !important;
                  transition: all 0.2s ease !important;
                  position: relative !important;
                }
                .defined-word:hover {
                  background: linear-gradient(120deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%) !important;
                  border-bottom-color: rgba(59, 130, 246, 0.8) !important;
                  transform: translateY(-1px) !important;
                  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2) !important;
                }
                
                /* Listor styling */
                .reading-content [data-reading-text] ul,
                .reading-content [data-reading-text] ol {
                  margin: 0 0 1.2em 0 !important;
                  padding-left: 1.5em !important;
                }
                .reading-content [data-reading-text] li {
                  font-size: var(--accessibility-font-size) !important;
                  line-height: var(--accessibility-line-height) !important;
                  margin: 0 0 0.4em 0 !important;
                }
                
                /* Blockquotes styling */
                .reading-content [data-reading-text] blockquote {
                  border-left: 4px solid rgba(59, 130, 246, 0.5) !important;
                  margin: 1.2em 0 !important;
                  padding: 1em 1.2em !important;
                  background: rgba(59, 130, 246, 0.05) !important;
                  border-radius: 0 8px 8px 0 !important;
                  font-style: italic !important;
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
                        alt={"Bild under texten " + (index + 1)}
                        className="w-full max-w-3xl h-auto rounded-lg mx-auto"
                      />
                    ),
                  )}
                </div>
              )}

            {/* Page navigation */}
            {pages.length > 1 && (
              <div className="reading-page-navigation flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <button
                  onClick={() => {
                    if (currentPage > 0) {
                      window.dispatchEvent(new CustomEvent('changePage', { detail: currentPage - 1 }));
                    }
                  }}
                  disabled={currentPage === 0}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    currentPage === 0 
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                      : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-700'
                  }`}
                  data-testid="button-previous-page"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Föregående
                </button>
                
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {currentPage + 1} av {pages.length}
                </span>
                
                <button
                  onClick={() => {
                    if (currentPage < pages.length - 1) {
                      window.dispatchEvent(new CustomEvent('changePage', { detail: currentPage + 1 }));
                    }
                  }}
                  disabled={currentPage === pages.length - 1}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    currentPage === pages.length - 1
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                      : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-700'
                  }`}
                  data-testid="button-next-page"
                >
                  Nästa
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}