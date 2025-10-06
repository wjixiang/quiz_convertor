# QuizParser Chunking Method

The `QuizParser` class now includes an improved chunking method that synchronously breaks large question and answer texts into smaller, intact, and non-overlapping chunks. This is particularly useful when dealing with large documents that need to be processed in smaller pieces to avoid hitting API limits or to improve processing efficiency.

## Method Signature

```typescript
async chunkInput(chunkNum: number): Promise<QuizParser[]>
```

## Parameters

- `chunkNum`: The number of chunks to split the input text into. Must be a positive integer.

## Returns

- `Promise<QuizParser[]>`: An array of QuizParser instances, each representing a chunk of the original input.

## Usage Example

```typescript
import { QuizParser } from './QuizParser';

// Create a QuizParser with your questions and answers
const parser = new QuizParser(largeQuestionsText, largeAnswersText);

// Split the input into 3 chunks
const chunks = await parser.chunkInput(3);

// Process each chunk separately
for (const chunk of chunks) {
  try {
    const quizzes = await chunk.parse(config);
    // Process the quizzes from this chunk
    console.log(`Processed ${quizzes.length} quizzes from this chunk`);
  } catch (error) {
    console.error('Error processing chunk:', error);
  }
}
```

## Important Notes

1. **Question-Answer Synchronization**: The method ensures that each question and its corresponding answer are kept in the same chunk, maintaining proper alignment.

2. **Question Integrity**: Individual questions are never split across chunks. Each complete question with all its options remains entirely within a single chunk.

3. **Even Distribution**: Questions are distributed as evenly as possible across chunks while respecting question integrity.

4. **Error Handling**: If chunking fails, the method throws an error with details about what went wrong.

5. **Performance**: Chunking involves API calls to the LLM service, so it may take some time to complete for large texts.

## Implementation Details

The optimized chunking method uses the enhanced `SplitPage` function from the BAML client, which:

1. Segments both questions and answers using the `TextSegmenter` class
2. Sends both segmented texts to the LLM with detailed instructions for synchronous splitting
3. Ensures that questions and their corresponding answers are kept together in the same chunk
4. Maintains the original order of questions
5. Returns the start and end indices for each chunk
6. Creates new QuizParser instances with properly aligned question and answer text for each chunk

## Prompt Optimization

The BAML prompt has been optimized with:
- Clear critical requirements for maintaining question-answer correspondence
- Specific instructions to never split individual questions
- Guidance on even distribution of questions across chunks
- Example format to ensure consistent output structure
- Explicit handling of both questions and answers in a single API call

## Testing

The chunking functionality is tested in `src/QuizParser.chunk.test.ts`, which includes tests for:
- Returning the original parser when chunkNum is 1
- Splitting input into the specified number of chunks
- Graceful error handling when chunking fails