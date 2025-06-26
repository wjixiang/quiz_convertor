import { quiz } from "./types/quizData.types";

import { b } from '../baml_client/async_client';
import { TextSegmenter } from "./TextSegmenter";
import type { oid, A1, A2, X } from "./types/quizData.types";
import pLimit from 'p-limit';
import * as dotenv from "dotenv";
dotenv.config()

export type QuizWithoutId = Omit<quiz, '_id'> ;
import { QuestionAnswerPair, BasicQuiz } from '../baml_client/types';

export class QuizParser {
  private questionsText: TextSegmenter;
  private answersText: string;

  constructor(questionsText: string, answersText: string) {
    this.questionsText = new TextSegmenter(questionsText);
    this.answersText = answersText;
  }

  /**
   * Parse the raw questions and answers into structured quiz data
   * @param config Default values for quiz metadata fields
   */
  async parse(config?: Partial<quiz>): Promise<QuizWithoutId[]> {
    const matchedPairs = await this.matchQuestionsAnswers();
    
    // Limit concurrency to 5 at a time
    const limit = pLimit(5);
    const basicQuizzes = await Promise.all(
      matchedPairs.map(pair =>
        limit(() => b.ConvertToBasicQuiz(pair.question, pair.answer)
          .catch(err => {
            console.error(`Failed to convert quiz: ${err.message}`);
            return null;
          }))
      )
    );

    const transformedQuizzes: QuizWithoutId[] = basicQuizzes
      .filter((basicQuiz): basicQuiz is BasicQuiz => basicQuiz !== null)
      .map(basicQuiz => {
        const options = basicQuiz.options.map((text: string, i: number) => ({
          oid: String.fromCharCode(65 + i) as oid,
          text
        }));

        const normalizedAnswer = this.normalizeAnswer(basicQuiz.answer, options);
        const isMultiQuestion = basicQuiz.type === 'multiple';

        // Create A1 or X quiz object based on question type
        if (isMultiQuestion) {
          const xQuiz: X = {
            _id: '', // Will be omitted in final return
            type: 'X',
            class: config?.class ?? '',
            unit: config?.unit ?? '',
            tags: config?.tags ?? [],
            source: config?.source ?? '',
            question: basicQuiz.question, // X question is a string
            options,
            answer: normalizedAnswer as oid[],
            analysis: {
              point: config?.analysis?.point ?? null,
              discuss: config?.analysis?.discuss ?? null,
              ai_analysis: config?.analysis?.ai_analysis,
              link: config?.analysis?.link ?? []
            },
            surrealRecordId: undefined
          };
          const { _id, ...withoutId } = xQuiz;
          return withoutId;
        } else {
          const a1Quiz: A1 = {
            _id: '', // Will be omitted in final return
            type: 'A1',
            class: config?.class ?? '',
            unit: config?.unit ?? '',
            tags: config?.tags ?? [],
            source: config?.source ?? '',
            question: basicQuiz.question, // A1 question is a string
            options,
            answer: normalizedAnswer as oid,
            analysis: {
              point: config?.analysis?.point ?? null,
              discuss: config?.analysis?.discuss ?? null,
              ai_analysis: config?.analysis?.ai_analysis,
              link: config?.analysis?.link ?? []
            },
            surrealRecordId: undefined
          };
          const { _id, ...withoutId } = a1Quiz;
          return withoutId;
        }
      });

    if (transformedQuizzes.length === 0) {
      throw new Error('No valid quizzes could be generated');
    }

    return transformedQuizzes;
  }

  /**
   * Normalize answer string to valid oid(s)
   */
  private normalizeAnswer(answer: string, options: { oid: oid }[]): oid | oid[] {
    const validOids = options.map(opt => opt.oid);
    const answerChars = answer.toUpperCase().split('');

    if (answerChars.length > 1) {
      return answerChars
        .filter(char => validOids.includes(char as oid))
        .map(char => char as oid);
    }

    return validOids.includes(answerChars[0] as oid)
      ? answerChars[0] as oid
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
    const questionSegments = this.questionsText.getSegments()
    const answerSegments = this.markSplitPoints(this.answersText);
    
    const results = await b.MatchQuestionsAnswers({
      questions: this.questionsText.renderForLLM(),
      answers: this.answersText
    }).catch(err => {
      console.error(`Failed to match questions/answers: ${err.message}`);
      return [];
    });

    return results.map(result => ({
      question: this.questionsText.getTextByRange(result.question_range[0],result.question_range[1]),
      answer: result.answer
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
   * Send quiz data to the server
   * @param quizData The quiz data to send
   * @returns Promise with the server response
   * @throws Error if request fails or server returns error status
   */
  async sendQuizToServer(quizData: QuizWithoutId): Promise<any> {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    
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
        throw new Error(errorData.message || 'Failed to add quiz');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending quiz to server:', error);
      throw error;
    }
  }
}
