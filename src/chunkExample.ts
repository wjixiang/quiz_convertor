import { QuizParser } from './QuizParser';

// Example questions and answers
const sampleQuestions = `1. What is the capital of France?
A. London
B. Berlin
C. Paris
D. Madrid

2. Which planet is known as the Red Planet?
A. Venus
B. Mars
C. Jupiter
D. Saturn

3. What is the largest mammal in the world?
A. Elephant
B. Blue Whale
C. Giraffe
D. Hippopotamus

4. Who painted the Mona Lisa?
A. Vincent van Gogh
B. Pablo Picasso
C. Leonardo da Vinci
D. Michelangelo

5. What is the smallest prime number?
A. 0
B. 1
C. 2
D. 3

6. What is the chemical symbol for gold?
A. Go
B. Gd
C. Au
D. Ag

7. In which year did World War II end?
A. 1943
B. 1944
C. 1945
D. 1946

8. What is the largest ocean on Earth?
A. Atlantic Ocean
B. Indian Ocean
C. Arctic Ocean
D. Pacific Ocean

9. Who wrote Romeo and Juliet?
A. Charles Dickens
B. William Shakespeare
C. Jane Austen
D. Mark Twain

10. What is the speed of light in vacuum?
A. 299,792 km/s
B. 199,792 km/s
C. 399,792 km/s
D. 99,792 km/s`;

const sampleAnswers = `1. C
2. B
3. B
4. C
5. C
6. C
7. C
8. D
9. B
10. A`;

async function demonstrateChunking() {
  console.log("Creating QuizParser with sample data...");
  const parser = new QuizParser(sampleQuestions, sampleAnswers);
  
  console.log("\nSplitting into 3 chunks...");
  try {
    const chunks = await parser.chunkInput(3);
    
    console.log(`Successfully created ${chunks.length} chunks:`);
    
    chunks.forEach((chunk, index) => {
      console.log(`\n--- Chunk ${index + 1} ---`);
      // Just show the first 100 characters of each chunk's questions for brevity
      const questionsPreview = chunk['questionsText'].text.substring(0, 100) + '...';
      console.log(`Questions preview: ${questionsPreview}`);
      console.log(`Answers length: ${chunk['answersText'].length} characters`);
    });
    
    console.log("\nChunking demonstration completed successfully!");
  } catch (error) {
    console.error("Error during chunking:", error);
  }
}

// Run the demonstration
demonstrateChunking();