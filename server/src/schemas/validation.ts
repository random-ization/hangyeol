export const SaveTopikExamSchema = z.object({
  id: z.string().min(1, 'Exam ID is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['READING', 'LISTENING']),
  round: z.number().int(),
  timeLimit: z.number().int().min(1),
  
  // [新增] 添加音频字段，允许字符串、null 或 undefined
  audioUrl: z.string().optional().nullable(),
  
  isPaid: z.boolean().optional(),
  
  questions: z.array(
    z.object({
      number: z.number().int(),
      passage: z.string().optional().nullable(), // 允许 null
      audioUrl: z.string().optional().nullable(), // 允许 null
      question: z.string(),
      
      // [修改] 将 questionImage 改为 image，与前端 ExamEditor.tsx 保持一致
      // 同时允许 null 或空字符串
      image: z.string().optional().nullable(),
      
      options: z.array(z.string()),
      optionImages: z.array(z.string()).optional().nullable(),
      correctAnswer: z.number().int().min(0),
      explanation: z.string().optional().nullable(),
    })
  ),
});
