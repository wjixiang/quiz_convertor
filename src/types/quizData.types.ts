import { RecordId } from "surrealdb";

export type oid = "A"|"B"|"C"|"D"|"E"

export interface analysis {
    point: string | null;
    discuss: string | null;
    ai_analysis?: string;
    link: string[];
}

export interface A1 {
    _id: string;
    type: "A1";
    class: string;
    unit: string;
    tags: string[];
    question: string;
    options: {oid: oid, text: string}[];
    answer: oid;
    analysis: analysis;
    source: string;
    surrealRecordId?: RecordId;
}

export interface A2 {
    _id: string;
    type: "A2";
    class: string;
    unit: string;
    tags: string[];
    question: string;
    options: {oid: oid, text: string}[];
    answer: oid;
    analysis: analysis;
    source: string;
    surrealRecordId?: RecordId;
}
export interface A3 {
    _id: string;
    type: "A3";
    class: string;
    unit: string;
    tags: string[];
    mainQuestion: string;
    subQuizs: {
        subQuizId: number;
        question: string;
        options: {oid: oid, text: string}[];
        answer: oid
    }[]
    analysis: analysis;
    source: string;
    surrealRecordId?: RecordId;
}

export interface X {
    _id: string;
    type: "X";
    class: string;
    unit: string;
    tags: string[];
    question: string;
    options: {oid: oid, text: string}[];
    answer: oid[];
    analysis: analysis;
    source: string;
    surrealRecordId?: RecordId;
}

export interface B {
    _id: string;
    type: "B";
    class: string;
    unit: string;
    tags: string[];
    questions: {
        questionId: number;
        questionText: string;
        answer: oid
    }[];
    options: {oid: oid, text: string}[];
    analysis: analysis;
    source: string;
    surrealRecordId?: RecordId;
    extractedYear?: string;
}

export type quiz = A1|A2|A3|B|X
export type quizTypeID = 'A1' | 'A2' | 'A3' | 'B' | 'X';
export type answerType = string | string[];

export type QuizWithUserAnswer = quiz & {
  userAnswer?: answerType;
};

/**
 * Synchronize quiz id between mongodb and surrealdb
 */
export interface SurrealQuizRecord {
    id: RecordId;
    mongoId: string;
}