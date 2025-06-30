import { QuizParser } from '../QuizParser';
import * as readline from 'readline';
import { quesiton } from './varible';
import { answer } from './varible_answer';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});



async function runTest() {
  console.log('Running QuizParser CLI test...');
  
  const parser = new QuizParser(quesiton, answer);
  
  try {
    const result = await parser.parse({
      // class: '外科学',
      // unit: '急性中毒专项测试',
      source: '2025医考帮外科单科模考2',
      // type: "A1"
    }, false);
    
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

runTest();