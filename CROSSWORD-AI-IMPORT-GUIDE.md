# Guide: AI-Import för Korsord

## Översikt
CrosswordBuilder har nu en enkel import-funktion som låter dig använda ChatGPT eller annan AI för att skapa korsord automatiskt.

## Hur man använder

### Steg 1: Öppna Import-dialogen
1. Navigera till Lektionsbyggaren och skapa ett nytt "Korsord"-moment
2. Klicka på den lila "Importera från AI (ChatGPT)"-rutan
3. Klicka på "Öppna Import-guide"

### Steg 2: Kopiera Prompt
1. I dialog-rutan, gå till fliken "1. Kopiera Prompt"
2. Klicka på "Kopiera Prompt"-knappen
3. Prompten kopieras nu till ditt urklipp

### Steg 3: Använd AI
1. Öppna [ChatGPT](https://chatgpt.com) eller annan AI
2. Klistra in prompten
3. Ändra `[ANGE TEMA/ÄMNESOMRÅDE HÄR]` till ditt önskade tema (t.ex. "djur", "mat", "geografi")
4. Skicka meddelandet
5. AI:n genererar ett JSON-svar med korsordets struktur
6. Kopiera JSON-svaret (från `{` till `}`)

### Steg 4: Importera
1. Gå tillbaka till Import-dialogen
2. Gå till fliken "3. Importera"
3. Klistra in JSON-svaret i textfältet
4. Klicka på "Importera Korsord"
5. Korsordet läggs automatiskt till i redigeraren!

## JSON-format

AI:n förväntas generera JSON i följande format:

```json
{
  "gridSize": 10,
  "words": [
    {
      "word": "KATT",
      "clue": "Djur som säger mjau",
      "startX": 2,
      "startY": 0,
      "direction": "down"
    },
    {
      "word": "HUND",
      "clue": "Djur som skäller",
      "startX": 0,
      "startY": 2,
      "direction": "across"
    }
  ]
}
```

### Fält-beskrivning
- `gridSize` (valfritt): Storlek på gridet (standard: 10)
- `words`: Array med ord-objekt
  - `word`: Ordet som ska placeras (3-8 bokstäver)
  - `clue`: Ledtråden för ordet
  - `startX`: X-position där ordet börjar (0-baserad)
  - `startY`: Y-position där ordet börjar (0-baserad)
  - `direction`: "across" (vågrätt) eller "down" (lodrätt)

## Exempel

### Exempel 1: Djur-tema
```json
{
  "gridSize": 10,
  "words": [
    {
      "word": "HUND",
      "clue": "Människans bästa vän",
      "startX": 0,
      "startY": 0,
      "direction": "across"
    },
    {
      "word": "KATT",
      "clue": "Djur som spinner",
      "startX": 2,
      "startY": 0,
      "direction": "down"
    },
    {
      "word": "MUS",
      "clue": "Litet gnagare",
      "startX": 2,
      "startY": 3,
      "direction": "across"
    },
    {
      "word": "FISK",
      "clue": "Lever i vatten",
      "startX": 4,
      "startY": 1,
      "direction": "down"
    }
  ]
}
```

### Exempel 2: Mat-tema
```json
{
  "gridSize": 10,
  "words": [
    {
      "word": "BRÖD",
      "clue": "Bakas av mjöl",
      "startX": 0,
      "startY": 0,
      "direction": "across"
    },
    {
      "word": "OST",
      "clue": "Görs av mjölk",
      "startX": 2,
      "startY": 0,
      "direction": "down"
    },
    {
      "word": "ÄPPLE",
      "clue": "Röd frukt",
      "startX": 0,
      "startY": 2,
      "direction": "across"
    },
    {
      "word": "MJÖLK",
      "clue": "Vit dryck",
      "startX": 4,
      "startY": 0,
      "direction": "down"
    }
  ]
}
```

## Tips

1. **Korsningar**: Be AI:n att korsa ord för ett mer intressant korsord
2. **Ordlängd**: 3-8 bokstäver fungerar bäst
3. **Antal ord**: 6-8 ord är lagom för ett enkelt korsord
4. **Svenska tecken**: Å, Ä, Ö normaliseras automatiskt till A, A, O
5. **Markdown**: Om AI:n returnerar JSON i markdown code block (```json ... ```) hanteras det automatiskt

## Felmeddelanden

### "JSON måste innehålla en 'words' array"
- Kontrollera att JSON har ett `words`-fält som är en array

### "Minst ett ord måste finnas i 'words' arrayen"
- `words`-arrayen är tom, lägg till minst ett ord

### "Ord X: 'word' saknas eller är inte en sträng"
- Ett ord-objekt saknar `word`-fältet eller det är inte en text-sträng

### "Ord X: 'direction' måste vara 'across' eller 'down'"
- `direction` har ett ogiltigt värde, använd endast "across" eller "down"

### "Ogiltig JSON-format"
- JSON-syntaxen är felaktig, kontrollera att alla klamrar, citattecken etc. stämmer

## Troubleshooting

**Problem**: AI:n ger text före/efter JSON
- **Lösning**: Kopiera bara JSON-delen (från `{` till `}`)

**Problem**: AI:n skapar ord som inte korsar varandra
- **Lösning**: Be specifikt om "korsa minst 2-3 ord med varandra" i din prompt

**Problem**: Ord går utanför gridet
- **Lösning**: Kontrollera att `startX + ordlängd` och `startY + ordlängd` inte överstiger `gridSize`

## Support

Om du har problem med import-funktionen, kontrollera:
1. Att JSON är korrekt formaterad (validera på jsonlint.com)
2. Att alla obligatoriska fält finns
3. Att koordinater är inom gridet
4. Att direction är "across" eller "down"

Vid återkommande problem, använd den manuella metoden: "Lägg till ord och ledtråd" + "Auto-placera".


