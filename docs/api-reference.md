# API Reference

This document provides comprehensive documentation for the Interview App's backend APIs.

## Table of Contents

- [API Overview](#api-overview)
- [Questions API](#questions-api)
- [Interview History API](#interview-history-api)
- [Evaluator API](#evaluator-api)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## API Overview

The Interview App consists of two main API services:

### API Service (Port 3000)
- **Base URL**: `http://localhost:3000/api`
- **Purpose**: Question management, interview history, database operations
- **Technology**: NestJS with TypeORM and SQLite

### Evaluator Service (Port 3001)
- **Base URL**: `http://localhost:3001/api`
- **Purpose**: AI-powered answer evaluation using OpenAI
- **Technology**: NestJS with OpenAI integration

## Questions API

Base URL: `http://localhost:3000/api/questions`

### Get All Technologies

Retrieve all available technologies with question statistics.

```http
GET /questions/technologies
```

#### Response
```json
[
  {
    "name": "JavaScript",
    "totalQuestions": 284,
    "fundamental": 95,
    "advanced": 142,
    "extensive": 47
  },
  {
    "name": "Python",
    "totalQuestions": 195,
    "fundamental": 78,
    "advanced": 89,
    "extensive": 28
  }
]
```

### Get Database Statistics

Retrieve overall database statistics and summary information.

```http
GET /questions/stats
```

#### Response
```json
{
  "totalQuestions": 3844,
  "totalTechnologies": 15,
  "questionsByDifficulty": {
    "fundamental": 1538,
    "advanced": 1730,
    "extensive": 576
  },
  "questionsByTechnology": {
    "JavaScript": 284,
    "Python": 195,
    "React": 247,
    "Angular": 189
  }
}
```

### Get Questions by Technology

Retrieve questions filtered by technology and other criteria.

```http
GET /questions?tech={technology}&difficulty={difficulty}&limit={limit}&offset={offset}
```

#### Parameters
- `tech` (string, required): Technology name (e.g., "JavaScript", "Python")
- `difficulty` (string, optional): Question difficulty ("Fundamental", "Advanced", "Extensive")
- `limit` (number, optional): Number of questions to return (default: 10, max: 50)
- `offset` (number, optional): Number of questions to skip (default: 0)

#### Example Request
```http
GET /questions?tech=JavaScript&difficulty=Advanced&limit=5
```

#### Response
```json
{
  "questions": [
    {
      "id": 1,
      "question": "Explain the concept of closures in JavaScript.",
      "answer": "A closure is a function that has access to variables in its outer scope even after the outer function returns...",
      "difficulty": "Advanced",
      "example": "function outer() { let count = 0; return function inner() { count++; return count; }; }",
      "technology": "JavaScript"
    }
  ],
  "total": 142,
  "page": 1,
  "totalPages": 29
}
```

### Get Random Questions

Retrieve random questions based on criteria.

```http
POST /questions/random
```

#### Request Body
```json
{
  "technologies": ["JavaScript", "React"],
  "difficulties": ["Advanced", "Extensive"],
  "count": 5,
  "excludeIds": [1, 5, 10]
}
```

#### Parameters
- `technologies` (string[], required): Array of technology names
- `difficulties` (string[], optional): Array of difficulty levels
- `count` (number, required): Number of random questions to return (max: 20)
- `excludeIds` (number[], optional): Question IDs to exclude from results

#### Response
```json
{
  "questions": [
    {
      "id": 42,
      "question": "What is the difference between let, const, and var?",
      "answer": "let and const are block-scoped while var is function-scoped...",
      "difficulty": "Advanced",
      "example": "if (true) { let a = 1; const b = 2; var c = 3; }",
      "technology": "JavaScript"
    }
  ],
  "requestedCount": 5,
  "returnedCount": 5,
  "availableCount": 89
}
```

### Get Single Question

Retrieve a specific question by ID.

```http
GET /questions/{id}
```

#### Parameters
- `id` (number, required): Question ID

#### Response
```json
{
  "id": 1,
  "question": "Explain the concept of closures in JavaScript.",
  "answer": "A closure is a function that has access to variables in its outer scope...",
  "difficulty": "Advanced",
  "example": "function outer() { ... }",
  "technology": "JavaScript",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Interview History API

Base URL: `http://localhost:3000/api/history`

### Get Interview Sessions

Retrieve all interview sessions for the user.

```http
GET /history/sessions?page={page}&limit={limit}&technology={tech}
```

#### Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 50)
- `technology` (string, optional): Filter by technology name

#### Response
```json
{
  "sessions": [
    {
      "id": 1,
      "sessionName": "JavaScript Practice - Round 1",
      "createdAt": "2024-01-15T14:30:00Z",
      "completedAt": "2024-01-15T15:15:00Z",
      "totalQuestions": 5,
      "totalScore": 37.5,
      "percentage": 62.5,
      "duration": 45,
      "technology": "JavaScript"
    }
  ],
  "total": 15,
  "page": 1,
  "totalPages": 2
}
```

### Get Session Details

Retrieve detailed information for a specific interview session.

```http
GET /history/sessions/{sessionId}
```

#### Parameters
- `sessionId` (number, required): Session ID

#### Response
```json
{
  "id": 1,
  "sessionName": "JavaScript Practice - Round 1",
  "createdAt": "2024-01-15T14:30:00Z",
  "completedAt": "2024-01-15T15:15:00Z",
  "totalQuestions": 5,
  "totalScore": 37.5,
  "responses": [
    {
      "id": 1,
      "questionId": 42,
      "question": "What is the difference between let, const, and var?",
      "userAnswer": "let and const are block scoped while var is function scoped...",
      "audioUrl": "/audio/session1_q1.wav",
      "evaluationScore": 8.5,
      "evaluationFeedback": "Good explanation of scoping differences...",
      "createdAt": "2024-01-15T14:32:00Z"
    }
  ]
}
```

### Create Interview Session

Start a new interview session.

```http
POST /history/sessions
```

#### Request Body
```json
{
  "sessionName": "React Practice Session",
  "technology": "React",
  "difficulty": "Advanced",
  "questionCount": 5
}
```

#### Response
```json
{
  "id": 2,
  "sessionName": "React Practice Session",
  "createdAt": "2024-01-15T16:00:00Z",
  "status": "in_progress"
}
```

### Save Interview Response

Save a response to a question in an interview session.

```http
POST /history/sessions/{sessionId}/responses
```

#### Request Body
```json
{
  "questionId": 15,
  "userAnswer": "React hooks are functions that let you use state...",
  "audioUrl": "/audio/session2_q1.wav",
  "evaluationScore": 7.5,
  "evaluationFeedback": "Good understanding of hooks concept..."
}
```

#### Response
```json
{
  "id": 5,
  "sessionId": 2,
  "questionId": 15,
  "createdAt": "2024-01-15T16:05:00Z",
  "status": "saved"
}
```

### Complete Interview Session

Mark an interview session as completed.

```http
PUT /history/sessions/{sessionId}/complete
```

#### Request Body
```json
{
  "totalScore": 35.5,
  "completedAt": "2024-01-15T16:30:00Z"
}
```

#### Response
```json
{
  "id": 2,
  "status": "completed",
  "totalScore": 35.5,
  "percentage": 71.0,
  "completedAt": "2024-01-15T16:30:00Z"
}
```

## Evaluator API

Base URL: `http://localhost:3001/api/evaluator`

### Health Check

Check if the evaluator service is running.

```http
GET /evaluator/health
```

#### Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T16:00:00Z"
}
```

### Evaluate Text Answer

Evaluate a text-based interview answer using AI.

```http
POST /evaluator/evaluate
```

#### Headers
```http
X-OpenAI-API-Key: sk-your-openai-api-key-here
Content-Type: application/json
```

#### Request Body
```json
{
  "question": "Explain the concept of closures in JavaScript.",
  "answer": "A closure is a function that has access to variables from an outer scope even after the outer function returns.",
  "technology": "JavaScript",
  "difficulty": "Advanced",
  "context": {
    "experienceLevel": "intermediate",
    "interviewType": "technical",
    "jobRole": "frontend-developer"
  }
}
```

#### Parameters
- `question` (string, required): The interview question
- `answer` (string, required): The user's answer
- `technology` (string, required): Technology being evaluated
- `difficulty` (string, required): Question difficulty level
- `context` (object, optional): Additional context for evaluation

#### Response
```json
{
  "overallScore": 42,
  "maxScore": 60,
  "percentage": 70,
  "criteria": {
    "technicalAccuracy": 8,
    "clarity": 7,
    "completeness": 6,
    "codeQuality": 0,
    "problemSolving": 8,
    "experience": 7
  },
  "feedback": {
    "strengths": [
      "Correctly identified that closures involve function scope",
      "Good understanding of lexical scoping"
    ],
    "improvements": [
      "Could provide a practical example",
      "Mention use cases for closures"
    ],
    "overall": "Good foundational understanding of closures. The explanation covers the core concept but could benefit from practical examples."
  },
  "suggestions": [
    "Practice explaining with code examples",
    "Study common closure patterns and use cases"
  ]
}
```

### Evaluate Audio Answer

Evaluate an audio-based interview answer (with transcription).

```http
POST /evaluator/evaluate-audio
```

#### Headers
```http
X-OpenAI-API-Key: sk-your-openai-api-key-here
Content-Type: multipart/form-data
```

#### Request Body (Form Data)
- `audio` (file, required): Audio file (WAV, MP3, or M4A)
- `question` (string, required): The interview question
- `technology` (string, required): Technology being evaluated
- `difficulty` (string, required): Question difficulty level
- `context` (string, optional): JSON string of additional context

#### Response
```json
{
  "transcription": "A closure is a function that has access to variables from an outer scope even after the outer function returns.",
  "evaluation": {
    "overallScore": 42,
    "maxScore": 60,
    "percentage": 70,
    "criteria": {
      "technicalAccuracy": 8,
      "clarity": 7,
      "completeness": 6,
      "codeQuality": 0,
      "problemSolving": 8,
      "experience": 7
    },
    "feedback": {
      "strengths": ["Clear pronunciation", "Good technical explanation"],
      "improvements": ["Could speak more slowly", "Add concrete examples"],
      "overall": "Well articulated answer with good technical content."
    }
  },
  "audioAnalysis": {
    "duration": 45,
    "clarity": "good",
    "pace": "normal",
    "confidence": "high"
  }
}
```

## Error Handling

### Standard Error Response

All APIs return errors in a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "technology",
      "message": "technology must be a valid technology name"
    }
  ],
  "timestamp": "2024-01-15T16:00:00Z",
  "path": "/api/questions"
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid API key (Evaluator only)
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Specific Error Codes

#### Questions API Errors
- `TECH_NOT_FOUND`: Technology not found in database
- `INVALID_DIFFICULTY`: Invalid difficulty level specified
- `QUESTION_NOT_FOUND`: Question ID not found

#### History API Errors
- `SESSION_NOT_FOUND`: Interview session not found
- `SESSION_ALREADY_COMPLETED`: Cannot modify completed session
- `INVALID_SESSION_STATE`: Invalid session state for operation

#### Evaluator API Errors
- `OPENAI_API_KEY_MISSING`: No OpenAI API key provided
- `OPENAI_API_KEY_INVALID`: Invalid OpenAI API key
- `EVALUATION_FAILED`: AI evaluation service failed
- `TRANSCRIPTION_FAILED`: Audio transcription failed
- `AUDIO_FORMAT_UNSUPPORTED`: Audio format not supported

## Authentication

### API Service (Port 3000)
No authentication required for local development. All endpoints are publicly accessible.

### Evaluator Service (Port 3001)
Requires OpenAI API key for evaluation endpoints.

#### API Key Header
```http
X-OpenAI-API-Key: sk-your-openai-api-key-here
```

#### Error Response for Missing Key
```json
{
  "statusCode": 401,
  "message": "OpenAI API key is required",
  "error": "Unauthorized"
}
```

## Rate Limiting

### Questions API
- **Rate Limit**: 100 requests per minute per IP
- **Burst Limit**: 10 requests per second

### Evaluator API
- **Rate Limit**: 30 requests per minute per API key
- **Burst Limit**: 5 requests per second
- **Note**: Subject to OpenAI API rate limits

#### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

#### Rate Limit Exceeded Response
```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "error": "Too Many Requests",
  "retryAfter": 60
}
```

## Examples

### Complete Interview Flow Example

#### 1. Start Interview Session
```bash
curl -X POST http://localhost:3000/api/history/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionName": "JavaScript Practice",
    "technology": "JavaScript",
    "difficulty": "Advanced",
    "questionCount": 3
  }'
```

#### 2. Get Random Questions
```bash
curl -X POST http://localhost:3000/api/questions/random \
  -H "Content-Type: application/json" \
  -d '{
    "technologies": ["JavaScript"],
    "difficulties": ["Advanced"],
    "count": 3
  }'
```

#### 3. Evaluate Answer
```bash
curl -X POST http://localhost:3001/api/evaluator/evaluate \
  -H "Content-Type: application/json" \
  -H "X-OpenAI-API-Key: sk-your-key-here" \
  -d '{
    "question": "Explain closures in JavaScript",
    "answer": "A closure is a function with access to outer scope",
    "technology": "JavaScript",
    "difficulty": "Advanced"
  }'
```

#### 4. Save Response
```bash
curl -X POST http://localhost:3000/api/history/sessions/1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": 42,
    "userAnswer": "A closure is a function with access to outer scope",
    "evaluationScore": 8.5,
    "evaluationFeedback": "Good understanding, could use examples"
  }'
```

#### 5. Complete Session
```bash
curl -X PUT http://localhost:3000/api/history/sessions/1/complete \
  -H "Content-Type: application/json" \
  -d '{
    "totalScore": 25.5,
    "completedAt": "2024-01-15T16:30:00Z"
  }'
```

### Batch Operations Example

#### Get Multiple Technologies Stats
```bash
curl -X GET "http://localhost:3000/api/questions/technologies" \
  | jq '.[] | select(.totalQuestions > 100)'
```

#### Filter Questions by Criteria
```bash
curl -X GET "http://localhost:3000/api/questions?tech=React&difficulty=Advanced&limit=20" \
  | jq '.questions[] | {id, question: .question[0:100]}'
```

### Error Handling Example

```javascript
// Frontend service example
async evaluateAnswer(question, answer, technology) {
  try {
    const response = await fetch('http://localhost:3001/api/evaluator/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OpenAI-API-Key': this.apiKey
      },
      body: JSON.stringify({ question, answer, technology, difficulty: 'Advanced' })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Evaluation failed: ${error.message}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Evaluation error:', error);
    throw error;
  }
}
```

## OpenAPI/Swagger Documentation

Both services provide interactive API documentation:

- **Questions API**: http://localhost:3000/api (Swagger UI)
- **Evaluator API**: http://localhost:3001/api (Swagger UI)

The Swagger interface provides:
- Interactive API testing
- Request/response examples
- Schema definitions
- Parameter descriptions

## SDK and Client Libraries

### TypeScript Client Example

```typescript
// questions-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Question {
  id: number;
  question: string;
  answer?: string;
  difficulty: 'Fundamental' | 'Advanced' | 'Extensive';
  technology: string;
}

@Injectable()
export class QuestionsApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getRandomQuestions(params: {
    technologies: string[];
    difficulties?: string[];
    count: number;
  }): Observable<{ questions: Question[] }> {
    return this.http.post<{ questions: Question[] }>(
      `${this.baseUrl}/questions/random`,
      params
    );
  }

  getTechnologies(): Observable<TechnologyStats[]> {
    return this.http.get<TechnologyStats[]>(`${this.baseUrl}/questions/technologies`);
  }
}
```