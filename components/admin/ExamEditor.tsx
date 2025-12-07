const createNewExam = (type: TopikType) => {
    const structure = type === 'READING' ? TOPIK_READING_STRUCTURE : TOPIK_LISTENING_STRUCTURE;
    const questions: TopikQuestion[] = [];

    // 先生成问题数组
    for (let i = 1; i <= 50; i++) {
      questions.push({
        number: i,
        passage: '',
        question: `Question ${i}`,
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctAnswer: 0,
        image: '',
        explanation: '',
        optionImages: type === 'LISTENING' ? ['', '', '', ''] : undefined,
      });
    }

    // 然后创建考试对象 (确保这里只定义一次)
    const newExam: TopikExam = {
      id: `exam-${Date.now()}`,
      type,
      title: `TOPIK II ${type === 'READING' ? t.reading : t.listening} - New`,
      description: '',
      round: 0, // 关键修复：初始化届数
      timeLimit: type === 'READING' ? 70 : 60,
      isPaid: false,
      questions,
    };

    onAddTopikExam(newExam);
    setSelectedExam(newExam);
    setEditingQuestion(1);
  };
