// Quiz conversion using LLM
class QuestionAnswerPair {
  question string
  answer string
}

class QuestionAnswerSlice {
  question_range int[]
  /// The correct answer(s) as option letters:
  /// - Single choice: "A", "B", etc.
  /// - Multiple choice: "AB", "ACD", etc. (any combination of A-E)
  answer string
}

class ContentSlice {
  start int
  end int
}

class QuizOptions {
  oid "A"|"B"|"C"|"D"|"E"
  text string
}

class QuizAnalysis {
  point string?
  discuss string?
  ai_analysis string?
  link string[]
}

class BasicQuiz {
  type "single" | "multiple"
  question string
  options string[]
  answer string
}

class A1Quiz {
  type "A1"
  class string
  unit string
  tags string[]
  question string
  options QuizOptions[]
  answer "A"|"B"|"C"|"D"|"E"
  analysis QuizAnalysis
  source string
}

class A2Quiz {
  type "A2"
  class string
  unit string
  tags string[]
  question string
  options QuizOptions[]
  answer "A"|"B"|"C"|"D"|"E"
  analysis QuizAnalysis
  source string
}

function SplitQuestions(questions_text: string) -> string[] {
  client GLM4Plus
  prompt #"
    {{_.role("user")}}
    Split the following text into individual questions. The text may contain:
    - Numbered questions (1., 2., etc)
    - Bullet points
    - Blank lines between questions
    - Other separators
    
    Text to split:
    {{ questions_text }}
    
    Return a JSON array where each element is a complete question text.
    Only return the array, nothing else.
  "#
}

function ConvertToA1(question: string, answer: string) -> A1Quiz {
  client GLM4Plus
  prompt #"
    {{_.role("user")}}
    Convert the following question and answer into a structured multiple choice quiz (A1 type):
    
    Question:
    {{ question }}
    
    Answer:
    {{ answer }}
    
    Requirements:
    - Include analysis with key points and discussion
    - Format as valid JSON matching this schema: {{ ctx.output_format }}
  "#
}

function ConvertToBasicQuiz(question: string, answer: string) -> BasicQuiz {
  client GLM4Plus
  prompt #"
    {{_.role("user")}}
    Convert the following question and answer into a simple multiple choice quiz (BasicQuiz type):
    
    Question:
    {{ question }}
    
    Answer:
    {{ answer }}
    
    Requirements:
    - Specify type as "single" or "multiple" based on answer format
    - Format as valid JSON matching this schema: {{ ctx.output_format }}
    - Return only the JSON object, nothing else
    - 答案必须是选项对应的大写字母标号
  "#
}

class SplitText {
  questions string
  answers string
}

function MatchQuestionsAnswers(input: SplitText) -> QuestionAnswerSlice[] {
  client QiniuDeepseekV3
  prompt #"
    {{_.role("user")}}
    Match the following questions and answers using the split point markers:
    
    Questions (with split markers):
    {{ input.questions }}
    
    Answers (with split markers):
    {{ input.answers }}
    
    Return a JSON array where each element is an object with:
    - question_range: [start_index, end_index] of the question
    - answer: The correct option letter(s) (A/B/C/D/E) for this question
      - For single-choice questions: "A", "B", etc. (one letter)
      - For multiple-choice questions: "AB", "ACD", etc. (any combination of letters)
      - Ensure all letters are uppercase and in alphabetical order (e.g. "ABD" not "BAD")
    
    Match questions to answers by their position in the split points arrays.
    Convert answer text to corresponding option letters.
    Only return the array, nothing else.
    Only return complete quiz that question and answer both existed.
    Must ensure content of question/option/answer same with input text.
  "#
}

test sample_quiz {
  functions [ConvertToA1]
  args {
    question "What is the capital of France?"
    answer "Paris"
  }
}