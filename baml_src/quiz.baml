// Quiz conversion using LLM
class QuestionAnswerPair {
  question string
  answer string
  type "single" | "multiple" | "share_question" | "share_option"
}

class QuestionAnswerSlice {
  type "single" | "multiple" | "share_question" | "share_option"
  question_range int[]
  /// The correct answer(s) as option letters:
  /// - Single choice: "A", "B", etc.
  /// - Multiple choice: "AB", "ACD", etc. (any combination of A-E)
  answer string
}

class QuestionAnswerWithAnalysisSlice {
  type "single" | "multiple" | "share_question" | "share_option"
  question_range int[]
  answer_range string
  answer string @description(#"
    The correct answer(s) as option letters:
    - Single choice: "A", "B", etc.
    - Multiple choice: "AB", "ACD", etc. (any combination of A-E)
  "#)
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
  type "single" | "multiple" | "share_question" | "share_option"
  question string
  options string[]
  answer string
}

class QAunit {
  question string
  options QuizOptions[]
  answer string @description(#"
    Must be one of "A" | "B" | "C" | "D" | "E"
  "#)
}

class QAunitForB {
  question string
  answer string @description(#"
    Must be one of "A" | "B" | "C" | "D" | "E"
  "#)
}

class A3PreQuiz {
  mainQuestion string
  subQuestion QAunit[]
}

class BPreQuiz {
  shared_options QuizOptions[]
  questions QAunitForB[]
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

function ConvertToA3Quiz(question: string, answer: string) -> A3PreQuiz {
  client GLM4Plus
  prompt #"
    {{_.role("user")}}
    Convert the following question and answer into a quiz group including multiple questions:
    
    Question:
    {{ question }}
    
    Answer:
    {{ answer }}
    
    Requirements:
    - Specify type as "single" or "multiple" based on answer format
    - Return only the JSON object, nothing else
    - 答案必须是选项对应的大写字母标号

    {{ ctx.output_format }}
  "#
}

function ConvertToBQuiz(question: string, answer: string) -> BPreQuiz {
  client GLM4Plus
  prompt #"
    {{_.role("user")}}
    Convert the following question and answer into a group of quizzes shared shared same options:
    
    Question:
    {{ question }}
    
    Answer:
    {{ answer }}
    
    Requirements:
    - Specify type as "single" or "multiple" based on answer format
    - Return only the JSON object, nothing else
    - 答案必须是选项对应的大写字母标号

    {{ ctx.output_format }}
  "#
}

class SplitText {
  questions string
  answers string
}

function MatchQuestionsAnswers(input: SplitText) -> QuestionAnswerSlice[] {
  client GeminiFlashOpenrouter
  prompt #"
    {{_.role("user")}}
    Match the following questions and answers using the split point markers.

    ---INSTRUCTION---
    Return a JSON array where each element is an object with:
    - type: the type of quiz, must be one of the "single" | "multiple" | "share_question" | "share_option"
    - question_range: [start_index, end_index] of the question
    - answer: The correct option letter(s) (A/B/C/D/E) for this question
      - For single-choice questions: "A", "B", etc. (one letter)
      - For multiple-choice questions: "AB", "ACD", etc. (any combination of letters)
      - For share_question questions: 
        - question_range have to cover the whole group of questions. This kind of questions always with indications such as "A3", "A3型题", "共用题干".
        - show answers for each subquestion with proper index: "1.A 2.B 3.C etc."
      - For share_option questions:
        - question_range have to cover the whole group of questions. This kind of questions always with indications such as "B", "B型题", "共用选项"
        - show answers for each subquestion with proper index: "1.A 2.B 3.C etc."
      - Ensure all letters are uppercase and in alphabetical order (e.g. "ABD" not "BAD")
    
    ---EXAMPLE: share_question question---
    (78~80题共用题干)男性，62岁。近3个月消瘦、乏力，有上腹胀痛，近1个月出现巩膜及周身黄染，进行性加重，1周前出现大便灰白，尿色深，周身瘙痒，轻度贫血。
    78.病史中哪项对考虑梗阻性黄疸最有意义
    A.贫血 B.尿色深 C.瘙痒
    D.灰白便 E.腹胀痛
    79.以下查体所见哪项对梗阻性黄疸更有意义
    A.体温37.5℃ B.肝肋下2cm C.胆囊大无触痛
    D.有上腹部深压痛 E.肝区有叩痛
    80.B超示：肝内胆管轻度扩张，胆囊8cm×10cm×6cm,胆总管上段直径为1.5cm,胆总管
    中下段因肠积气看不清，胰头3cm×4cm,胰管0.2cm,为了解胆总管中下段情况选哪项检查
    最合适
    A. CT B. PTC C. PTCD
    D. ERCP E.十二指肠低张造影

    ---EXAMPLE: share_option question---
    A.良性肿瘤 B.恶性肿瘤 C.潜在恶性肿瘤
    D.瘤样病损 E.转移性骨肿瘤
    72.骨样骨瘤属于
    73.骨巨细胞瘤属于
    74.脊索瘤属于

    ---rules---
    Match questions to answers by their position in the split points arrays.
    Convert answer text to corresponding option letters.
    Only return the array, nothing else.
    Only return complete quiz that question and answer both existed.
    Must ensure content of question/option/answer same with input text.

    ---TASK---
    Questions (with split markers):
    {{ input.questions }}
    
    Answers (with split markers):
    {{ input.answers }}
  "#
}

test sample_quiz {
  functions [ConvertToA1]
  args {
    question "What is the capital of France?"
    answer "Paris"
  }
}