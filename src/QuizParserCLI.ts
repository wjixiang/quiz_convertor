import { QuizParser } from './QuizParser';
import { ExamPaperService } from './services/ExamPaperService';
import { QuizProcessingService } from './services/QuizProcessingService';
import * as readline from 'readline';
import { quesiton } from './varible';
import { answer } from './varible_answer';

// Unified configuration for quiz parsing
const QUIZ_CONFIG = {
  source: '2026ljy模考一',
  tags: ["2026"],
  // class: '生理学',
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
  --use-service        Use the new service layer for processing
  --help, -h           Show this help message

Examples:
  npm run quiz:cli                           # Run without chunking (legacy mode)
  npm run quiz:cli -- --chunks 3             # Split into 3 chunks (legacy mode)
  npm run quiz:cli -- --retry-failed         # Retry failed quizzes (legacy mode)
  npm run quiz:cli -- --check-failed         # Check failed quizzes count (legacy mode)
  npm run quiz:cli -- --use-service          # Use new service layer
  npm run quiz:cli -- --use-service --chunks 3  # Use service layer with chunking
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
  
  const useService = args.includes('--use-service');
  
  if (args.includes('--retry-failed')) {
    await retryFailedQuizzes(useService);
    rl.close();
    return;
  }
  
  if (args.includes('--check-failed')) {
    checkFailedQuizzes(useService);
    rl.close();
    return;
  }
  
  console.log(`Running QuizParser CLI test... (${useService ? 'Service Layer Mode' : 'Legacy Mode'})`);
  
  try {
    if (useService) {
      await runWithServiceLayer(args);
    } else {
      await runLegacyMode(args);
    }
  } catch (error) {
    console.error('Error running quiz parser:', error);
  } finally {
    rl.close();
  }
}

/**
 * 使用新的服务层运行
 */
async function runWithServiceLayer(args: string[]) {
  // 创建服务实例
  const examPaperService = new ExamPaperService();
  const processingService = new QuizProcessingService();
  
  // 创建试卷
  console.log('Creating exam paper...');
  const examPaper = await examPaperService.createExamPaperFromText(
    '2026ljy模考一',
    quesiton,
    answer,
    '2026ljy模考一',
    {
      year: '2026',
      tags: ['2026'],
      subject: '综合'
    }
  );
  
  console.log(`Created exam paper with ID: ${examPaper.id}`);
  
  // 处理试卷
  console.log('Processing exam paper...');
  const processResult = await examPaperService.processExamPaper(examPaper.id, QUIZ_CONFIG);
  
  console.log(`Processed ${processResult.quizzes.length} quizzes`);
  
  if (processResult.errors && processResult.errors.length > 0) {
    console.log('Processing errors:');
    processResult.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // 发送到服务器
  console.log('Sending quiz elements to server...');
  const sendResult = await processingService.processAndSendQuizzes(
    processResult.quizzes,
    {
      onProgress: (processed, total, current) => {
        console.log(`Progress: ${processed}/${total} (${current.successCount} successful, ${current.failureCount} failed)`);
      }
    }
  );
  
  console.log(`Processing complete: ${sendResult.successCount} successful, ${sendResult.failureCount} failed`);
}

/**
 * 使用传统模式运行
 */
async function runLegacyMode(args: string[]) {
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
  
  // 使用处理服务发送数据
  const processingService = new QuizProcessingService();
  const sendResult = await processingService.processAndSendQuizzes(result);
  
  console.log(`Processing complete: ${sendResult.successCount} successful, ${sendResult.failureCount} failed`);
}

async function retryFailedQuizzes(useService: boolean = false) {
  console.log('Retrying failed quizzes...');
  
  try {
    const processingService = new QuizProcessingService();
    const successCount = await processingService.retryFailedQuizzes();
    console.log(`Successfully retried ${successCount} quizzes.`);
  } catch (error) {
    console.error('Error retrying failed quizzes:', error);
  }
}

function checkFailedQuizzes(useService: boolean = false) {
  const processingService = new QuizProcessingService();
  const count = processingService.getFailedQuizzesCount();
  if (count === 0) {
    console.log('No failed quizzes found.');
  } else {
    console.log(`Found ${count} failed quizzes. Run with --retry-failed to retry them.`);
  }
}

runTest();