-- SQL script för att ta bort duplikatmeningar
-- Detta script behåller den första versionen av varje dubblett

-- Visa alla dubbletter först
SELECT content, word_class_type, COUNT(*) as duplicates 
FROM sentences 
GROUP BY content, word_class_type 
HAVING COUNT(*) > 1 
ORDER BY duplicates DESC;

-- Ta bort dubbletter (behåller den med lägsta ID)
DELETE FROM sentences 
WHERE id NOT IN (
    SELECT id 
    FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY content, word_class_type ORDER BY id) as rn
        FROM sentences
    ) t 
    WHERE rn = 1
);

-- Lägg till UNIQUE constraint för att förhindra framtida dubbletter
-- OBS: Kör bara detta om du är säker på att inga fler dubbletter finns
-- ALTER TABLE sentences ADD CONSTRAINT unique_sentence_wordclass UNIQUE (content, word_class_type);