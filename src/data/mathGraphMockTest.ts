
export const mathGraphMockTest = {
  title: "Mathematics Mock Test - Graph Analysis",
  subject: "mathematics",
  topic: "Graph Theory and Analysis",
  questions: [
    {
      id: 1,
      question_number: 1,
      question_text: "Based on the graph shown in the image, analyze the relationship between the variables and answer the following sub-questions:",
      question_image_url: "/lovable-uploads/437beea5-5adc-4205-a0fe-6178cda9654e.png",
      has_sub_questions: true,
      marks: 10,
      answer_key: "See individual sub-question answers",
      word_limit: "",
      difficulty: "medium",
      sub_questions: [
        {
          id: 1,
          sub_question_label: "a",
          sub_question_text: "What type of relationship does the graph represent? Explain your reasoning.",
          sub_question_image_url: "",
          marks: 3,
          answer_key: "The graph represents a linear relationship. The points appear to form a straight line, indicating a constant rate of change between the variables.",
          word_limit: "50"
        },
        {
          id: 2,
          sub_question_label: "b",
          sub_question_text: "Estimate the slope of the line from the graph.",
          sub_question_image_url: "",
          marks: 3,
          answer_key: "The slope appears to be approximately 2. This can be estimated by calculating rise over run between any two clear points on the line.",
          word_limit: "30"
        },
        {
          id: 3,
          sub_question_label: "c",
          sub_question_text: "What would be the approximate y-intercept of this line?",
          sub_question_image_url: "",
          marks: 2,
          answer_key: "The y-intercept appears to be approximately 1, where the line crosses the y-axis.",
          word_limit: "25"
        },
        {
          id: 4,
          sub_question_label: "d",
          sub_question_text: "Write the equation of the line in slope-intercept form (y = mx + b).",
          sub_question_image_url: "",
          marks: 2,
          answer_key: "Based on the estimated slope (m = 2) and y-intercept (b = 1), the equation would be y = 2x + 1.",
          word_limit: "20"
        }
      ]
    },
    {
      id: 2,
      question_number: 2,
      question_text: "A student claims that the graph shown represents a quadratic function. Evaluate this claim and provide mathematical evidence to support or refute it.",
      question_image_url: "/lovable-uploads/437beea5-5adc-4205-a0fe-6178cda9654e.png",
      has_sub_questions: false,
      marks: 8,
      answer_key: "The student's claim is incorrect. The graph represents a linear function, not a quadratic function. Evidence: 1) The points form a straight line, not a parabola. 2) The rate of change is constant (linear), not variable (quadratic). 3) A quadratic function would show curvature, which is not present in this graph.",
      word_limit: "100",
      difficulty: "medium",
      sub_questions: []
    },
    {
      id: 3,
      question_number: 3,
      question_text: "Using the graph provided, predict the value of y when x = 6. Show your working and explain your method.",
      question_image_url: "/lovable-uploads/437beea5-5adc-4205-a0fe-6178cda9654e.png",
      has_sub_questions: false,
      marks: 6,
      answer_key: "Using the linear equation y = 2x + 1 derived from the graph: When x = 6, y = 2(6) + 1 = 12 + 1 = 13. Method: I extended the linear pattern shown in the graph using the consistent slope of 2.",
      word_limit: "80",
      difficulty: "easy",
      sub_questions: []
    },
    {
      id: 4,
      question_number: 4,
      question_text: "Compare and contrast the advantages and disadvantages of representing data in graphical form versus tabular form, using the given graph as an example.",
      question_image_url: "/lovable-uploads/437beea5-5adc-4205-a0fe-6178cda9654e.png",
      has_sub_questions: true,
      marks: 12,
      answer_key: "See individual sub-question answers",
      word_limit: "",
      difficulty: "hard",
      sub_questions: [
        {
          id: 1,
          sub_question_label: "a",
          sub_question_text: "List three advantages of graphical representation.",
          sub_question_image_url: "",
          marks: 4,
          answer_key: "1) Visual clarity - easy to see patterns and trends at a glance. 2) Quick identification of relationships between variables. 3) Easy to interpolate and extrapolate values.",
          word_limit: "60"
        },
        {
          id: 2,
          sub_question_label: "b",
          sub_question_text: "List three advantages of tabular representation.",
          sub_question_image_url: "",
          marks: 4,
          answer_key: "1) Precise numerical values are clearly stated. 2) Easy to perform calculations with exact data. 3) Better for storing and organizing large datasets systematically.",
          word_limit: "60"
        },
        {
          id: 3,
          sub_question_label: "c",
          sub_question_text: "In what situations would you prefer graphical over tabular representation?",
          sub_question_image_url: "",
          marks: 4,
          answer_key: "Graphical representation is preferred when: 1) Presenting to audiences who need quick visual understanding. 2) Identifying trends and patterns. 3) Making predictions or estimates. 4) Comparing multiple datasets visually.",
          word_limit: "80"
        }
      ]
    }
  ]
};
