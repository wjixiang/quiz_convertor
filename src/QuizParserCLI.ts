import { QuizParser } from './QuizParser';
import * as readline from 'readline';
import { quesiton } from './varible';
import { answer } from './varible_answer';

// Unified configuration for quiz parsing
const QUIZ_CONFIG = {
  source: '2026混合模拟卷二',
  tags: ["2026"],
  extractedYear: "2026"
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showHelp() {
  console.log(`
QuizParser CLI - Usage:

Options:
  --chunks <number>    Split the input into specified number of chunks for processing
  --retry-failed       Retry sending failed quizzes from local storage
  --check-failed       Check how many failed quizzes are stored locally
  --help, -h           Show this help message

Examples:
  npm run quiz:cli                           # Run without chunking
  npm run quiz:cli -- --chunks 3             # Split into 3 chunks
  npm run quiz:cli -- --retry-failed         # Retry failed quizzes
  npm run quiz:cli -- --check-failed         # Check failed quizzes count
`);
}

async function runTest() {
  // Check if command line argument for retrying failed quizzes is provided
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    rl.close();
    return;
  }
  
  if (args.includes('--retry-failed')) {
    await retryFailedQuizzes();
    rl.close();
    return;
  }
  
  if (args.includes('--check-failed')) {
    checkFailedQuizzes();
    rl.close();
    return;
  }
  
  console.log('Running QuizParser CLI test...');
  
  const parser = new QuizParser(quesiton, answer);
  
  // Check if chunking is enabled
  const chunkIndex = args.indexOf('--chunks');
  let chunkNum = 1; // Default to no chunking
  
  if (chunkIndex !== -1 && args[chunkIndex + 1]) {
    chunkNum = parseInt(args[chunkIndex + 1], 10);
    if (isNaN(chunkNum) || chunkNum < 1) {
      console.error('Invalid chunk number. Using default (no chunking).');
      chunkNum = 1;
    }
  }
  
  try {
    let result;
    
    if (chunkNum > 1) {
      console.log(`Splitting input into ${chunkNum} chunks...`);
      const chunks = await parser.chunkInput(chunkNum);
      console.log(`Successfully created ${chunks.length} chunks.`);
      
      result = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
        try {
          const chunkResult = await chunks[i].parse(QUIZ_CONFIG, false);
          
          result.push(...chunkResult);
          console.log(`Chunk ${i + 1} processed: ${chunkResult.length} quizzes`);
        } catch (error) {
          console.error(`Error processing chunk ${i + 1}:`, error);
        }
      }
    } else {
      console.log('Processing without chunking...');
      result = await parser.parse(QUIZ_CONFIG, false);
    }
    
    console.log(`Total quizzes parsed: ${result.length}`);
    
    console.log('Sending quiz elements to server...');
    let successCount = 0;
    let failureCount = 0;
    
    for await (const element of result) {
      try {
        const serverResponse = await parser.sendQuizToServer(element);
        console.log('Server response:', serverResponse);
        successCount++;
      } catch (error) {
        console.error('Error sending to server:', error);
        failureCount++;
      }
    }
    
    console.log(`Processing complete: ${successCount} successful, ${failureCount} failed`);
  } catch (error) {
    console.error('Error parsing quiz:', error);
  } finally {
    rl.close();
  }
}

async function retryFailedQuizzes() {
  console.log('Retrying failed quizzes...');
  
  try {
    const successCount = await QuizParser.retryFailedQuizzes();
    console.log(`Successfully retried ${successCount} quizzes.`);
  } catch (error) {
    console.error('Error retrying failed quizzes:', error);
  }
}

function checkFailedQuizzes() {
  const count = QuizParser.getFailedQuizzesCount();
  if (count === 0) {
    console.log('No failed quizzes found.');
  } else {
    console.log(`Found ${count} failed quizzes. Run with --retry-failed to retry them.`);
  }
}

runTest();