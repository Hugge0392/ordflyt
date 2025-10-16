// Test script to check if there are published reading lessons

async function testReadingLessons() {
  try {
    console.log('Fetching published reading lessons...');
    const response = await fetch('http://localhost:5000/api/reading-lessons/published', {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('Response not OK:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response body:', text);
      return;
    }

    const lessons = await response.json();
    console.log('\n=== Published Reading Lessons ===');
    console.log('Total count:', lessons.length);

    if (lessons.length > 0) {
      console.log('\nLessons found:');
      lessons.forEach((lesson, index) => {
        console.log(`\n${index + 1}. ${lesson.title}`);
        console.log(`   ID: ${lesson.id}`);
        console.log(`   Published: ${lesson.isPublished === 1 ? 'Yes' : 'No'}`);
        console.log(`   Description: ${lesson.description || 'No description'}`);
      });
    } else {
      console.log('No published reading lessons found in database.');
      console.log('\nPossible reasons:');
      console.log('1. No lessons have been marked as published (isPublished = 1)');
      console.log('2. Database is empty');
      console.log('3. There might be an issue with the database query');
    }

    // Also check all reading lessons
    console.log('\n\n=== Checking ALL Reading Lessons ===');
    const allResponse = await fetch('http://localhost:5000/api/reading-lessons');
    if (allResponse.ok) {
      const allLessons = await allResponse.json();
      console.log('Total lessons in database:', allLessons.length);

      const publishedCount = allLessons.filter(l => l.isPublished === 1).length;
      const unpublishedCount = allLessons.filter(l => l.isPublished !== 1).length;

      console.log('Published:', publishedCount);
      console.log('Unpublished:', unpublishedCount);

      if (allLessons.length > 0) {
        console.log('\nAll lessons:');
        allLessons.forEach((lesson, index) => {
          console.log(`${index + 1}. ${lesson.title} (Published: ${lesson.isPublished === 1 ? 'Yes' : 'No'})`);
        });
      }
    }

  } catch (error) {
    console.error('Error fetching reading lessons:', error);
  }
}

testReadingLessons();