ents: "auto",
                      transform: "translateZ(0)" // eget compositing-lager
                    }}
                    dangerouslySetInnerHTML={{
                      __html: processContentWithDefinitions(
                        pages[currentPage] || "",
                        lesson.wordDefinitions,
                      ),
                    }}
                  />

                  {/* Lokala scrims ersätts av global overlay nedan */}
                </div>

                {/* Reading focus UI when active */}
                {readingFocusMode && (
                  <>
                    {/* Progress indicator at bottom */}
                    <div
                      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 px-4 py-2 rounded-lg"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        color: "white",
                      }}
                    >
                      <div className="text-sm text-center">
                        Rad {currentReadingLine + 1} av {lineRects.length}
                      </div>
                      <div className="w-32 bg-gray-600 rounded-full h-1 mt-2">
                        <div
                          className="h-1 bg-white rounded-full transition-all duration-300"
                          style={{
                            width: `${lineRects.length > 0 ? ((currentReadingLine + 1) / lineRects.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => setReadingFocusMode(false)}
                      className="fixed top-4 right-4 focus-close-btn bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-all"
                      title="Avsluta läsfokus (Esc)"
                      style={{ zIndex: 2147483648 }}
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </>
                )}

                {/* Bilder under texten för denna sida */}
                {lesson.pages &&
                  lesson.pages[currentPage]?.imagesBelow &&
                  lesson.pages[currentPage]?.imagesBelow!.length > 0 && (
                    <div className="space-y-4">
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
              </div>

              {/* Page Navigation - Only buttons inside Card */}
              {pages.length > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  {/* Föregående sida-knapp - visas bara om det inte är första sidan */}
                  {currentPage > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentPage(Math.max(0, currentPage - 1))
                      }
                      className="flex items-center gap-2 navigation-button
                                   bg-white text-black border-black
                                   hover:bg-white hover:text-black hover:border-black
                                   focus-visible:ring-0 focus-visible:outline-none
                                   shadow-none hover:shadow-none active:shadow-none"
                      style={{
                        backgroundColor: "#FFFFFF",
                        color: "#000000",
                        borderColor: "#000000",
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Föregående sida
                    </Button>
                  ) : (
                    <div className="w-32"></div>
                  )}

                  {/* Page counter - centered between buttons */}
                  <div
                    className="navigation-page-counter flex items-center justify-center h-10 px-2 py-1 rounded-md text-xs font-medium"
                    style={{
                      backgroundColor: "#FFFFFF !important",
                      color: "#000000 !important",
                      border: "1px solid #000000 !important",
                      fontFamily:
                        "system-ui, -apple-system, sans-serif !important",
                      textAlign: "center",
                      width: "auto",
                      minWidth: "60px",
                      maxWidth: "80px",
                    }}
                  >
                    Sida {currentPage + 1} av {pages.length}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      if (currentPage === pages.length - 1) {
                        // På sista sidan - lämna in
                        alert(
                          "Bra jobbat! Du har läst hela texten och svarat på frågorna.",
                        );
                      } else {
                        // Inte sista sidan - gå till nästa sida
                        setCurrentPage(
                          Math.min(pages.length - 1, currentPage + 1),
                        );
                      }
                    }}
                    disabled={!areAllCurrentPageQuestionsAnswered()}
                    className="flex items-center gap-2 navigation-button
                                 bg-white text-black border-black
                                 hover:bg-white hover:text-black hover:border-black
                                 focus-visible:ring-0 focus-visible:outline-none
                                 shadow-none hover:shadow-none active:shadow-none"
                    style={{
                      backgroundColor: "#FFFFFF",
                      color: "#000000",
                      borderColor: "#000000",
                    }}
                    title={
                      !areAllCurrentPageQuestionsAnswered()
                        ? "Svara på alla frågor innan du går vidare"
                        : ""
                    }
                  >
                    {currentPage === pages.length - 1
                      ? "Lämna in"
                      : "Nästa sida"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Custom tooltip */}
              {hoveredWord && (
                <div
                  className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-xs pointer-events-none"
                  style={{
                    left: `${hoveredWord.x}px`,
                    top: `${hoveredWord.y}px`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <div className="font-semibold">{hoveredWord.word}</div>
                  <div className="text-gray-200">{hoveredWord.definition}</div>
                  {/* Arrow pointing down */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </div>
              )}\n            </CardContent>
          </Card>
        </div>

        {/* Word Definitions */}
        {lesson.wordDefinitions && lesson.wordDefinitions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ordförklaringar</CardTitle>
              <CardDescription>
                Svåra ord från texten förklarade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {lesson.wordDefinitions.map((definition, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-primary">
                      {definition.word}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {definition.definition}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
