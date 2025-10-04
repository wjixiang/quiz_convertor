#!/usr/bin/env tsx

import { QuizParser } from './QuizParser';

/**
 * Script to retry failed quizzes from local storage
 * Usage: npx tsx src/retryFailedQuizzes.ts [--check]
 */

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--check')) {
    const count = QuizParser.getFailedQuizzesCount();
    if (count === 0) {
      console.log('✅ No failed quizzes found.');
    } else {
      console.log(`⚠️ Found ${count} failed quizzes.`);
      console.log('Run "npx tsx src/retryFailedQuizzes.ts" to retry them.');
    }
    return;
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npx tsx src/retryFailedQuizzes.ts [options]

Options:
  --check     Check how many failed quizzes exist
  --help, -h  Show this help message

Description:
  This script retries all failed quizzes that were saved to local storage
  when the server was unavailable. Successfully retried quizzes will be
  removed from the failed quizzes file.
    `);
    return;
  }
  
  console.log('🔄 Retrying failed quizzes...');
  
  try {
    const successCount = await QuizParser.retryFailedQuizzes();
    if (successCount > 0) {
      console.log(`✅ Successfully retried ${successCount} quizzes.`);
    } else {
      console.log('ℹ️ No quizzes were successfully retried.');
    }
    
    const remainingCount = QuizParser.getFailedQuizzesCount();
    if (remainingCount > 0) {
      console.log(`⚠️ ${remainingCount} quizzes still failed. They will be retried next time.`);
    }
  } catch (error) {
    console.error('❌ Error retrying failed quizzes:', error);
    process.exit(1);
  }
}

main();