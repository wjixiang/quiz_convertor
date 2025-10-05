import { QuizParser } from './QuizParser';
import * as readline from 'readline';
import { quesiton } from './varible';
import { answer } from './varible_answer';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});



async function runTest() {
  // Check if command line argument for retrying failed quizzes is provided
  const args = process.argv.slice(2);
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
  
  try {
    let result = await parser.parse({
      // class: '外科学',
      // unit: '急性中毒专项测试',
      source: '研D万人模考一2026',
      tags: ["2026"],
      extractedYear: "2026"
      // type: "A1"
      },
      false // 当为true时会进行解析数据提取
    );
    
    console.log('Parsed quiz data:');
    // console.log(JSON.stringify(result.map(e=>e.type), null, 2));

    console.log('Sending quiz elements to server...');
    for await (const element of result) {
      try {
        const serverResponse = await parser.sendQuizToServer(element);
        console.log('Server response:', serverResponse);
      } catch (error) {
        console.error('Error sending to server:', error);
      }
    }
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