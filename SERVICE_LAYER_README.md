# 试题数字化工具 - 服务层架构

本文档介绍了新增的服务层架构，它提供了更好的试卷管理和数据处理功能。

## 概述

新的服务层架构包含以下组件：

1. **试卷管理服务** (`ExamPaperService`) - 负责试卷的创建、存储、查询和处理
2. **试卷处理服务** (`QuizProcessingService`) - 负责将解析后的题目发送到服务器并处理失败重试
3. **试卷存储** (`FileExamPaperStorage`) - 基于文件系统的试卷数据持久化

## 主要改进

### 1. 数据解耦
- 原来的问题和答案分别存储在两个独立的文件中
- 现在统一存储在试卷对象中，支持更丰富的元数据

### 2. 更好的抽象
- 提供了清晰的服务接口，便于扩展和测试
- 分离了数据管理和数据处理逻辑

### 3. 增强的功能
- 支持试卷搜索和过滤
- 支持批量处理和进度跟踪
- 改进的错误处理和重试机制

## 使用方法

### 基本用法

#### 1. 使用服务层模式（推荐）

```bash
# 使用服务层处理试卷
npm run quiz:service

# 使用服务层并分块处理
npm run quiz:service:chunks

# 或者直接使用CLI
npm run quiz:cli -- --use-service
npm run quiz:cli -- --use-service --chunks 3
```

#### 2. 使用传统模式（向后兼容）

```bash
# 传统模式
npm run quiz:legacy

# 或者直接使用CLI
npm run quiz:cli
npm run quiz:cli -- --chunks 3
```

### 高级用法

#### 1. 创建和管理试卷

```typescript
import { ExamPaperService } from './services/ExamPaperService';

const examPaperService = new ExamPaperService();

// 创建试卷
const examPaper = await examPaperService.createExamPaperFromText(
  '试卷标题',
  questionsText,
  answersText,
  '来源',
  {
    year: '2026',
    tags: ['2026', '模考'],
    subject: '综合'
  }
);

// 处理试卷
const result = await examPaperService.processExamPaper(examPaper.id, {
  source: '2026ljy模考一',
  tags: ['2026'],
  class: '综合'
});

// 搜索试卷
const papers = await examPaperService.searchExamPapers({
  source: '2026ljy模考一',
  tags: ['2026']
});
```

#### 2. 处理和发送题目

```typescript
import { QuizProcessingService } from './services/QuizProcessingService';

const processingService = new QuizProcessingService();

// 处理并发送题目
const result = await processingService.processAndSendQuizzes(quizzes, {
  maxRetries: 3,
  concurrency: 5,
  onProgress: (processed, total, current) => {
    console.log(`进度: ${processed}/${total}`);
  }
});

// 重试失败的题目
const retryCount = await processingService.retryFailedQuizzes();
```

## API 参考

### ExamPaperService

#### 方法

- `createExamPaper(data)` - 创建新试卷
- `createExamPaperFromText(title, questionsText, answersText, source, options)` - 从文本创建试卷
- `loadExamPaper(id)` - 加载试卷
- `processExamPaper(id, config)` - 处理试卷
- `listExamPapers()` - 列出所有试卷
- `updateExamPaper(id, updates)` - 更新试卷
- `deleteExamPaper(id)` - 删除试卷
- `searchExamPapers(query)` - 搜索试卷
- `batchProcessExamPapers(ids, config)` - 批量处理试卷

### QuizProcessingService

#### 方法

- `processSingleQuiz(quizData, maxRetries, baseDelay)` - 处理单个题目
- `processBatchQuizzes(quizzes, maxRetries, baseDelay, concurrency)` - 批量处理题目
- `processAndSendQuizzes(quizzes, options)` - 处理并发送题目
- `retryFailedQuizzes(maxRetries, baseDelay)` - 重试失败的题目
- `getFailedQuizzesCount()` - 获取失败题目数量

## 数据结构

### ExamPaper

```typescript
interface ExamPaper {
  id: string;
  title: string;
  source: string;
  year?: string;
  subject?: string;
  tags: string[];
  questionsText: string;
  answersText: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### ExamPaperProcessResult

```typescript
interface ExamPaperProcessResult {
  examPaperId: string;
  quizzes: QuizWithoutId[];
  successCount: number;
  failureCount: number;
  processedAt: Date;
  errors?: string[];
}
```

## 存储结构

试卷数据存储在 `./data/examPapers` 目录下：

- `index.json` - 试卷索引文件
- `{id}.json` - 各个试卷的详细数据

失败的题目存储在项目根目录的 `failed_quizzes.json` 文件中。

## 配置

### 环境变量

- `API_BASE_URL` - 服务器API地址（默认: `http://localhost:3000`）

### 处理配置

```typescript
const config = {
  source: '试卷来源',
  tags: ['标签1', '标签2'],
  class: '科目',
  unit: '单元',
  analysis: {
    point: '知识点',
    discuss: '讨论',
    ai_analysis: 'AI分析',
    link: ['相关链接']
  }
};
```

## 迁移指南

### 从传统模式迁移到服务层

1. **创建试卷对象**
   ```typescript
   // 旧方式
   const parser = new QuizParser(questionsText, answersText);
   
   // 新方式
   const examPaper = await examPaperService.createExamPaperFromText(
     '试卷标题',
     questionsText,
     answersText,
     '来源'
   );
   ```

2. **处理试卷**
   ```typescript
   // 旧方式
   const quizzes = await parser.parse(config);
   
   // 新方式
   const result = await examPaperService.processExamPaper(examPaper.id, config);
   const quizzes = result.quizzes;
   ```

3. **发送数据**
   ```typescript
   // 旧方式
   await parser.sendQuizToServer(quiz);
   
   // 新方式
   await processingService.processAndSendQuizzes(quizzes);
   ```

## 故障排除

### 常见问题

1. **试卷创建失败**
   - 检查问题和答案文本格式是否正确
   - 确保有足够的磁盘空间

2. **处理失败**
   - 检查BAML服务是否正常运行
   - 查看错误日志了解具体问题

3. **发送失败**
   - 检查服务器地址配置
   - 使用 `--retry-failed` 重试失败的题目

### 调试

启用详细日志：
```bash
DEBUG=* npm run quiz:service
```

## 示例

运行示例代码：
```bash
npm run quiz:service
```

这将演示服务层的所有主要功能，包括：
- 创建试卷
- 处理试卷
- 搜索试卷
- 发送题目
- 重试失败的题目

## 贡献

如果您想为服务层架构做出贡献，请：

1. 遵循现有的代码风格
2. 添加适当的类型定义
3. 编写测试用例
4. 更新文档

## 许可证

本项目采用 ISC 许可证。