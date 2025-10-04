import { quiz } from "./types/quizData.types";

import { b } from '../baml_client/async_client';
import { TextSegmenter } from "./TextSegmenter";
import type { oid, A1, A2, X, A3, B } from "./types/quizData.types";
import pLimit from 'p-limit';
import * as dotenv from "dotenv";
import * as fs from 'fs';
import * as path from 'path';
dotenv.config()

export type QuizWithoutId = Omit<quiz, '_id'> ;
import { QuestionAnswerPair, BasicQuiz, QuestionAnswerWithExplanationSlice, QuestionAnswerWithExplanationPair } from '../baml_client/types';

export class QuizParser {
  private questionsText: TextSegmenter;
  private answersText: string;
  private static readonly FAILED_QUIZZES_FILE = path.join(process.cwd(), 'failed_quizzes.json');

  constructor(questionsText: string, answersText: string) {
    this.questionsText = new TextSegmenter(questionsText);
    this.answersText = answersText;
  }

  /**
   * Parse the raw questions and answers into structured quiz data
   * @param config Default values for quiz metadata fields
   */
  private readonly CONCURRENCY_LIMIT = 20;

  /**
   * Parse the raw questions and answers into structured quiz data
   * @param config Default values for quiz metadata fields
   */
  async parse(config?: Partial<quiz>, withExplanation: boolean = false): Promise<QuizWithoutId[]> {
    const matchedPairs = withExplanation
      ? await this.matchQuestionsAnswersWithExplanation()
      : await this.matchQuestionsAnswers();
    
    const limit = pLimit(this.CONCURRENCY_LIMIT);
    const transformedQuizzes = await Promise.all(
      matchedPairs.map(basicQuiz => limit(async () => {
        try {
          return await this.processQuiz(basicQuiz, config, withExplanation);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Failed to process quiz: ${message}`);
          return null;
        }
      }))
    );

    const resolvedQuizzes = transformedQuizzes.filter(q => q !== null) as QuizWithoutId[];
    
    if (resolvedQuizzes.length === 0) {
      throw new Error('No valid quizzes could be generated');
    }

    return resolvedQuizzes;
  }

  /**
   * Process individual quiz based on its type
   */
  private async processQuiz(
    basicQuiz: QuestionAnswerPair | QuestionAnswerWithExplanationPair,
    config?: Partial<quiz>,
    withExplanation: boolean = false
  ): Promise<QuizWithoutId | null> {
    switch (basicQuiz.type) {
      case 'multiple':
        return await this.processMultipleChoiceQuiz(basicQuiz, config, withExplanation);
      case 'share_question':
        return await this.processA3Quiz(basicQuiz, config, withExplanation);
      case 'share_option':
        return await this.processBQuiz(basicQuiz, config, withExplanation);
      default:
        return await this.processBasicQuiz(basicQuiz, config, withExplanation);
    }
  }

  /**
   * Process multiple choice quiz (type X)
   */
  private async processMultipleChoiceQuiz(
    basicQuiz: QuestionAnswerPair | QuestionAnswerWithExplanationPair,
    config?: Partial<quiz>,
    withExplanation: boolean = false
  ): Promise<X> {
    const preQuiz = withExplanation && 'explanation' in basicQuiz
      ? await b.ConvertToBasicQuiz(basicQuiz.question, basicQuiz.answer, basicQuiz.explanation)
      : await b.ConvertToBasicQuiz(basicQuiz.question, basicQuiz.answer);
    
    const options = this.createOptions(preQuiz.options);
    const normalizedAnswer = this.normalizeAnswer(preQuiz.answer, options);

    const xQuiz: X = {
      _id: '',
      type: 'X',
      class: config?.class ?? '',
      unit: config?.unit ?? '',
      tags: config?.tags ?? [],
      source: config?.source ?? '',
      question: preQuiz.question,
      options,
      answer: normalizedAnswer as oid[],
      analysis: {
        point: config?.analysis?.point ?? null,
        discuss: withExplanation && 'explanation' in basicQuiz
          ? config?.analysis?.discuss ?? preQuiz.explanation ?? null
          : config?.analysis?.discuss ?? null,
        ai_analysis: config?.analysis?.ai_analysis,
        link: config?.analysis?.link ?? []
      },
      surrealRecordId: undefined
    };

    const { _id, ...withoutId } = xQuiz;
    return withoutId as X;
  }

  /**
   * Process A3 quiz (shared questions)
   */
  private async processA3Quiz(
    basicQuiz: QuestionAnswerPair | QuestionAnswerWithExplanationPair,
    config?: Partial<quiz>,
    withExplanation: boolean = false
  ): Promise<A3> {
    const preQuiz = withExplanation && 'explanation' in basicQuiz
      ? await b.ConvertToA3Quiz(basicQuiz.question, basicQuiz.answer, basicQuiz.explanation)
      : await b.ConvertToA3Quiz(basicQuiz.question, basicQuiz.answer);

    const a3Quiz: A3 = {
      _id: '',
      type: 'A3',
      class: config?.class ?? '',
      unit: config?.unit ?? '',
      tags: config?.tags ?? [],
      source: config?.source ?? '',
      mainQuestion: preQuiz.mainQuestion,
      subQuizs: preQuiz.subQuestion.map((e, index) => ({
        subQuizId: index,
        question: e.question,
        options: e.options,
        answer: e.answer as oid
      })),
      analysis: {
        point: config?.analysis?.point ?? null,
        discuss: withExplanation && 'explanation' in basicQuiz
          ? config?.analysis?.discuss ?? preQuiz.explanation ?? null
          : config?.analysis?.discuss ?? null,
        ai_analysis: config?.analysis?.ai_analysis,
        link: config?.analysis?.link ?? []
      },
      surrealRecordId: undefined
    };

    return a3Quiz;
  }

  /**
   * Process B quiz (shared options)
   */
  private async processBQuiz(
    basicQuiz: QuestionAnswerPair | QuestionAnswerWithExplanationPair,
    config?: Partial<quiz>,
    withExplanation: boolean = false
  ): Promise<B> {
    const preQuiz = withExplanation && 'explanation' in basicQuiz
      ? await b.ConvertToBQuiz(basicQuiz.question, basicQuiz.answer, basicQuiz.explanation)
      : await b.ConvertToBQuiz(basicQuiz.question, basicQuiz.answer);

    const bQuiz: B = {
      _id: '',
      type: 'B',
      class: config?.class ?? '',
      unit: config?.unit ?? '',
      tags: config?.tags ?? [],
      source: config?.source ?? '',
      questions: preQuiz.questions.map((e, index) => ({
        questionId: index,
        questionText: e.question,
        answer: e.answer as oid
      })),
      options: preQuiz.shared_options,
      analysis: {
        point: config?.analysis?.point ?? null,
        discuss: withExplanation && 'explanation' in basicQuiz
          ? config?.analysis?.discuss ?? preQuiz.explanation ?? null
          : config?.analysis?.discuss ?? null,
        ai_analysis: config?.analysis?.ai_analysis,
        link: config?.analysis?.link ?? []
      },
      surrealRecordId: undefined
    };

    return bQuiz;
  }

  /**
   * Process basic quiz (A1 or A2)
   */
  private async processBasicQuiz(
    basicQuiz: QuestionAnswerPair | QuestionAnswerWithExplanationPair,
    config?: Partial<quiz>,
    withExplanation: boolean = false
  ): Promise<A1 | A2> {
    const preQuiz = withExplanation && 'explanation' in basicQuiz
      ? await b.ConvertToBasicQuiz(basicQuiz.question, basicQuiz.answer, basicQuiz.explanation)
      : await b.ConvertToBasicQuiz(basicQuiz.question, basicQuiz.answer);
    
    const options = this.createOptions(preQuiz.options);
    const normalizedAnswer = this.normalizeAnswer(preQuiz.answer, options);

    const aQuiz: A1 | A2 = {
      _id: '',
      type: config?.type === "A2" ? "A2" : 'A1',
      class: config?.class ?? '',
      unit: config?.unit ?? '',
      tags: config?.tags ?? [],
      source: config?.source ?? '',
      question: preQuiz.question,
      options,
      answer: normalizedAnswer as oid,
      analysis: {
        point: config?.analysis?.point ?? null,
        discuss: withExplanation && 'explanation' in basicQuiz
          ? config?.analysis?.discuss ?? preQuiz.explanation ?? null
          : config?.analysis?.discuss ?? null,
        ai_analysis: config?.analysis?.ai_analysis,
        link: config?.analysis?.link ?? []
      },
      surrealRecordId: undefined
    };

    const { _id, ...withoutId } = aQuiz;
    return withoutId as A1 | A2;
  }

  /**
   * Create options array from string array
   */
  private createOptions(optionTexts: string[]): { oid: oid; text: string }[] {
    return optionTexts.map((text: string, i: number) => ({
      oid: String.fromCharCode(65 + i) as oid,
      text
    }));
  }

  /**
   * Normalize answer string to valid oid(s)
   */
  private normalizeAnswer(answer: string, options: { oid: oid }[]): oid | oid[] {
    const validOids = options.map(opt => opt.oid);
    const answerChars = answer.toUpperCase().split('') as oid[];

    if (answerChars.length > 1) {
      const validAnswers = answerChars.filter(char => validOids.includes(char));
      return validAnswers.length > 0 ? validAnswers : ['A'];
    }

    return validOids.includes(answerChars[0])
      ? answerChars[0]
      : 'A';
  }

  /**
   * Split questions text into individual questions using LLM
   */
  async splitQuestions(): Promise<string[]> {
    return b.SplitQuestions(this.questionsText.text)
      .catch(err => {
        console.error(`Failed to split questions: ${err.message}`);
        return [];
      });
  }

  /**
   * Pre-process text to mark split points
   */
  private markSplitPoints(text: string): {text: string, splits: number}[] {
    // Split on common question delimiters
    const splitRegex = /([。？！\n]\s*)/g;
    const segments: {text: string, splits: number}[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = splitRegex.exec(text)) !== null) {
      const segment = text.substring(lastIndex, match.index + match[0].length);
      segments.push({
        text: segment,
        splits: match.index + match[0].length
      });
      lastIndex = match.index + match[0].length;
    }

    // Add final segment if text continues after last delimiter
    if (lastIndex < text.length) {
      segments.push({
        text: text.substring(lastIndex),
        splits: text.length
      });
    }

    return segments;
  }


  /**
   * Match questions with answers using split points
   */
  async matchQuestionsAnswers(): Promise<QuestionAnswerPair[]> {
    
    
    const results = await b.MatchQuestionsAnswers({
      questions: this.questionsText.renderForLLM(),
      answers: this.answersText
    }).catch(err => {
      console.error(`Failed to match questions/answers: ${err.message}`);
      return [];
    });

    return results.map(result => ({
      type: result.type,
      question: this.questionsText.getTextByRange(result.question_range[0],result.question_range[1]),
      answer: result.answer
    }));
  }

  async matchQuestionsAnswersWithExplanation(): Promise<QuestionAnswerWithExplanationPair[]> {
    const answerTextWithMarker = new TextSegmenter(this.answersText)
    
    const results = await b.MatchQuestionsAnswersWithExplanation({
      questions: this.questionsText.renderForLLM(),
      answers: answerTextWithMarker.renderForLLM()
    }).catch(err => {
      console.error(`Failed to match questions/answers: ${err.message}`);
      return [];
    });

    return results.map(result => ({
      type: result.type,
      question: this.questionsText.getTextByRange(result.question_range[0],result.question_range[1]),
      answer: result.answer,
      explanation: answerTextWithMarker.getTextByRange(result.answer_range[0], result.answer_range[1])
    }));
  }

  /**
   * Helper to validate parsed quiz data
   */
  private validateQuiz(quizData: quiz): boolean {
    // Basic validation logic
    
    throw new Error("Not implemented");
    
  }

  /**
   * Send quiz data to the server with retry mechanism
   * @param quizData The quiz data to send
   * @param maxRetries Maximum number of retry attempts (default: 3)
   * @param baseDelay Base delay in milliseconds for exponential backoff (default: 1000)
   * @returns Promise with the server response
   * @throws Error if all retry attempts fail
   */
  async sendQuizToServer(
    quizData: QuizWithoutId,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<any> {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${apiUrl}/api/addQuiz`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quizData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.log(`failed quiz: ${JSON.stringify(quizData)}`)
          throw new Error(errorData.message || 'Failed to add quiz');
        }

        // Success - return the response
        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Attempt ${attempt + 1}/${maxRetries + 1} failed:`, lastError.message);
        
        // If this is the last attempt, don't wait anymore
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate exponential backoff delay with jitter
        const jitter = Math.random() * 0.1; // Add 0-10% jitter
        const delay = baseDelay * Math.pow(2, attempt) * (1 + jitter);
        
        console.log(`Retrying in ${Math.round(delay)}ms...`);
        await this.sleep(delay);
      }
    }
    
    // All attempts failed - save to local storage
    console.error(`Failed to send quiz after ${maxRetries + 1} attempts. Saving to local storage.`);
    await this.saveFailedQuiz(quizData, lastError?.message || 'Unknown error');
    
    throw lastError || new Error('Failed to send quiz to server after multiple attempts');
  }

  /**
   * Save failed quiz to local JSON file
   * @param quizData The quiz data that failed to send
   * @param errorMessage The error message
   */
  private async saveFailedQuiz(quizData: QuizWithoutId, errorMessage: string): Promise<void> {
    try {
      let failedQuizzes: Array<{quiz: QuizWithoutId, error: string, timestamp: string}> = [];
      
      // Load existing failed quizzes if file exists
      if (fs.existsSync(QuizParser.FAILED_QUIZZES_FILE)) {
        const data = fs.readFileSync(QuizParser.FAILED_QUIZZES_FILE, 'utf8');
        failedQuizzes = JSON.parse(data);
      }
      
      // Add new failed quiz
      failedQuizzes.push({
        quiz: quizData,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      // Save to file
      fs.writeFileSync(QuizParser.FAILED_QUIZZES_FILE, JSON.stringify(failedQuizzes, null, 2));
      console.log(`Saved failed quiz to ${QuizParser.FAILED_QUIZZES_FILE}`);
    } catch (error) {
      console.error('Failed to save quiz to local storage:', error);
    }
  }

  /**
   * Retry sending all failed quizzes from local storage
   * @param maxRetries Maximum number of retry attempts per quiz (default: 3)
   * @param baseDelay Base delay in milliseconds for exponential backoff (default: 1000)
   * @returns Promise with the count of successfully retried quizzes
   */
  static async retryFailedQuizzes(maxRetries: number = 3, baseDelay: number = 1000): Promise<number> {
    if (!fs.existsSync(QuizParser.FAILED_QUIZZES_FILE)) {
      console.log('No failed quizzes file found.');
      return 0;
    }
    
    try {
      const data = fs.readFileSync(QuizParser.FAILED_QUIZZES_FILE, 'utf8');
      const failedQuizzes: Array<{quiz: QuizWithoutId, error: string, timestamp: string}> = JSON.parse(data);
      
      if (failedQuizzes.length === 0) {
        console.log('No failed quizzes to retry.');
        return 0;
      }
      
      console.log(`Found ${failedQuizzes.length} failed quizzes. Retrying...`);
      
      const successfulRetries: number[] = [];
      const remainingFailedQuizzes: Array<{quiz: QuizWithoutId, error: string, timestamp: string}> = [];
      
      // Create a temporary QuizParser instance to use the sendQuizToServer method
      const tempParser = new QuizParser('', '');
      
      for (let i = 0; i < failedQuizzes.length; i++) {
        const failedQuiz = failedQuizzes[i];
        try {
          await tempParser.sendQuizToServer(failedQuiz.quiz, maxRetries, baseDelay);
          successfulRetries.push(i);
          console.log(`Successfully retried quiz ${i + 1}/${failedQuizzes.length}`);
        } catch (error) {
          console.error(`Failed to retry quiz ${i + 1}/${failedQuizzes.length}:`, error);
          remainingFailedQuizzes.push(failedQuiz);
        }
      }
      
      // Update the failed quizzes file with only the ones that still failed
      if (remainingFailedQuizzes.length > 0) {
        fs.writeFileSync(QuizParser.FAILED_QUIZZES_FILE, JSON.stringify(remainingFailedQuizzes, null, 2));
        console.log(`Updated failed quizzes file with ${remainingFailedQuizzes.length} remaining items.`);
      } else {
        // All quizzes were successfully retried, remove the file
        fs.unlinkSync(QuizParser.FAILED_QUIZZES_FILE);
        console.log('All failed quizzes were successfully retried. Removed failed quizzes file.');
      }
      
      return successfulRetries.length;
    } catch (error) {
      console.error('Error while retrying failed quizzes:', error);
      return 0;
    }
  }

  /**
   * Get the count of failed quizzes in local storage
   * @returns Number of failed quizzes
   */
  static getFailedQuizzesCount(): number {
    if (!fs.existsSync(QuizParser.FAILED_QUIZZES_FILE)) {
      return 0;
    }
    
    try {
      const data = fs.readFileSync(QuizParser.FAILED_QUIZZES_FILE, 'utf8');
      const failedQuizzes: Array<{quiz: QuizWithoutId, error: string, timestamp: string}> = JSON.parse(data);
      return failedQuizzes.length;
    } catch (error) {
      console.error('Error reading failed quizzes file:', error);
      return 0;
    }
  }

  /**
   * Helper method to sleep for a specified duration
   * @param ms Duration in milliseconds
   * @returns Promise that resolves after the specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
