
import type { Question } from '@/pages/MockExamStart';

export const mockQuestions: Question[] = [
  {
    id: "q1",
    text: "Solve the quadratic equation and explain your method",
    marks: 8,
    passage: "Consider the equation x² - 5x + 6 = 0. This is a standard quadratic equation that can be solved using multiple methods including factoring, completing the square, or the quadratic formula.",
    subQuestions: [
      {
        id: "q1a",
        text: "Factor the quadratic expression x² - 5x + 6",
        marks: 3
      },
      {
        id: "q1b", 
        text: "Find the roots of the equation",
        marks: 3
      },
      {
        id: "q1c",
        text: "Verify your solution by substitution",
        marks: 2
      }
    ]
  },
  {
    id: "q2",
    text: "Analyze the motion of a projectile launched at 45° with initial velocity 20 m/s",
    marks: 12,
    image: "/api/placeholder/400/300",
    subQuestions: [
      {
        id: "q2a",
        text: "Calculate the maximum height reached",
        marks: 4
      },
      {
        id: "q2b",
        text: "Determine the time of flight",
        marks: 4
      },
      {
        id: "q2c",
        text: "Find the horizontal range",
        marks: 4
      }
    ]
  },
  {
    id: "q3",
    text: "Discuss the impact of climate change on ocean currents and marine ecosystems",
    marks: 15,
    passage: "Global warming has led to significant changes in ocean temperatures and circulation patterns. The melting of polar ice caps affects salinity levels, which in turn influences thermohaline circulation. These changes have cascading effects on marine life, from phytoplankton to large marine mammals."
  },
  {
    id: "q4",
    text: "Analyze the literary techniques used in the given passage",
    marks: 10,
    passage: "'The old lighthouse stood sentinel against the storm, its beacon cutting through the darkness like a sword through silk. Waves crashed against the rocky shore with the fury of a thousand drums, while above, the sky wept tears of silver rain.' - From 'Coastal Memories' by J. Maritime",
    subQuestions: [
      {
        id: "q4a",
        text: "Identify and explain three examples of figurative language",
        marks: 6
      },
      {
        id: "q4b",
        text: "Discuss the mood and atmosphere created by the author",
        marks: 4
      }
    ]
  },
  {
    id: "q5",
    text: "Design and implement a simple sorting algorithm",
    marks: 20,
    subQuestions: [
      {
        id: "q5a",
        text: "Write pseudocode for bubble sort algorithm",
        marks: 5
      },
      {
        id: "q5b",
        text: "Implement the algorithm in a programming language of your choice",
        marks: 8
      },
      {
        id: "q5c",
        text: "Analyze the time and space complexity",
        marks: 4
      },
      {
        id: "q5d",
        text: "Suggest improvements or alternative approaches",
        marks: 3
      }
    ]
  },
  {
    id: "q6",
    text: "Evaluate the economic impact of automation on employment",
    marks: 18,
    passage: "The rapid advancement of artificial intelligence and robotics has transformed various industries, from manufacturing to service sectors. While automation increases efficiency and reduces costs, it also raises concerns about job displacement and the need for workforce reskilling.",
    subQuestions: [
      {
        id: "q6a",
        text: "Analyze the short-term effects of automation on employment",
        marks: 6
      },
      {
        id: "q6b",
        text: "Discuss potential long-term societal changes",
        marks: 6
      },
      {
        id: "q6c",
        text: "Propose policy solutions to address challenges",
        marks: 6
      }
    ]
  },
  {
    id: "q7",
    text: "Investigate the chemical properties of transition metals",
    marks: 16,
    image: "/api/placeholder/500/350",
    subQuestions: [
      {
        id: "q7a",
        text: "Explain the electronic configuration of Iron (Fe)",
        marks: 3
      },
      {
        id: "q7b",
        text: "Describe the formation of colored compounds",
        marks: 4
      },
      {
        id: "q7c",
        text: "Compare catalytic properties with main group elements",
        marks: 4
      },
      {
        id: "q7d",
        text: "Give examples of industrial applications",
        marks: 3
      },
      {
        id: "q7e",
        text: "Explain variable oxidation states",
        marks: 2
      }
    ]
  },
  {
    id: "q8",
    text: "Critical analysis of democratic institutions in the 21st century",
    marks: 25,
    passage: "Democratic governments worldwide face unprecedented challenges including political polarization, the influence of social media on public opinion, economic inequality, and the rise of populist movements. These factors test the resilience and adaptability of democratic institutions established in previous centuries."
  }
];
