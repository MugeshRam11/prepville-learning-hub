
export const sampleMathGraphTest = {
  title: "Mathematics - Linear Functions and Graphs",
  subject: "mathematics" as const,
  topic: "Graphs and Linear Equations",
  questions: [
    {
      id: 1,
      question_number: 1,
      question_text: "Study the graph shown below and answer the following questions:",
      question_image_url: "/lovable-uploads/437beea5-5adc-4205-a0fe-6178cda9654e.png",
      has_sub_questions: true,
      marks: 8,
      difficulty: "medium" as const,
      sub_questions: [
        {
          sub_question_label: "a",
          sub_question_text: "What is the equation of the line shown in the graph?",
          marks: 2,
          answer_key: "y = (1/2)x + 4",
          word_limit: 50
        },
        {
          sub_question_label: "b",
          sub_question_text: "What is the y-intercept of this line?",
          marks: 2,
          answer_key: "The y-intercept is 4 (point where the line crosses the y-axis)",
          word_limit: 30
        },
        {
          sub_question_label: "c",
          sub_question_text: "What is the slope of this line?",
          marks: 2,
          answer_key: "The slope is 1/2 or 0.5",
          word_limit: 30
        },
        {
          sub_question_label: "d",
          sub_question_text: "At what point does this line cross the x-axis?",
          marks: 2,
          answer_key: "The line crosses the x-axis at (-8, 0)",
          word_limit: 30
        }
      ]
    },
    {
      id: 2,
      question_number: 2,
      question_text: "Based on the linear equation y = (1/2)x + 4, calculate the value of y when x = 6.",
      has_sub_questions: false,
      marks: 3,
      difficulty: "easy" as const,
      answer_key: "y = (1/2)(6) + 4 = 3 + 4 = 7",
      word_limit: 100
    },
    {
      id: 3,
      question_number: 3,
      question_text: "A line has the same slope as the graph shown but passes through the point (0, -2). Write the equation of this new line.",
      has_sub_questions: false,
      marks: 4,
      difficulty: "medium" as const,
      answer_key: "y = (1/2)x - 2 (same slope of 1/2 but y-intercept is -2)",
      word_limit: 80
    }
  ]
};
