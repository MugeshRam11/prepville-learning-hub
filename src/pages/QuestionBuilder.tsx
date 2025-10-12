import { useState, useRef } from "react";
import { MathJaxContext, MathJax } from "better-react-mathjax";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UnicodeSymbolPad } from "@/components/admin/UnicodeSymbolPad";
import { Plus, Eye, Edit, Download, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface SubQuestion {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  marks: number;
}

interface Question {
  title: string;
  image: string | null;
  totalMarks: number;
  instructions: string;
  subQuestions: SubQuestion[];
}

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["\\(", "\\)"], ["$", "$"]],
    displayMath: [["\\[", "\\]"], ["$$", "$$"]],
  },
};

export default function QuestionBuilder() {
  const [question, setQuestion] = useState<Question>({
    title: "Based on the graph shown in the image, analyze the relationship between the variables and answer the following sub-questions:",
    image: null,
    totalMarks: 10,
    instructions: "Refer to the image above. Scroll down if the question continues...",
    subQuestions: [],
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activeTextarea, setActiveTextarea] = useState<string | null>(null);
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | HTMLInputElement | null }>({});

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setQuestion({ ...question, image: reader.result as string });
        toast.success("Image uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".svg"] },
    maxFiles: 1,
  });

  const insertSymbol = (symbol: string) => {
    if (!activeTextarea) return;

    const textarea = textareaRefs.current[activeTextarea];
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value;
    const newText = text.substring(0, start) + symbol + text.substring(end);

    // Update the corresponding field
    const [type, id, field] = activeTextarea.split("-");
    
    if (type === "title") {
      setQuestion({ ...question, title: newText });
    } else if (type === "instructions") {
      setQuestion({ ...question, instructions: newText });
    } else if (type === "subquestion") {
      const updatedSubQuestions = question.subQuestions.map((sq) =>
        sq.id === id ? { ...sq, [field]: newText } : sq
      );
      setQuestion({ ...question, subQuestions: updatedSubQuestions });
    }

    // Set cursor position after symbol
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  const addSubQuestion = () => {
    const newSubQuestion: SubQuestion = {
      id: Date.now().toString(),
      text: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
      marks: 1,
    };
    setQuestion({
      ...question,
      subQuestions: [...question.subQuestions, newSubQuestion],
    });
  };

  const updateSubQuestion = (id: string, field: keyof SubQuestion, value: string | number) => {
    const updatedSubQuestions = question.subQuestions.map((sq) =>
      sq.id === id ? { ...sq, [field]: value } : sq
    );
    setQuestion({ ...question, subQuestions: updatedSubQuestions });
  };

  const removeSubQuestion = (id: string) => {
    setQuestion({
      ...question,
      subQuestions: question.subQuestions.filter((sq) => sq.id !== id),
    });
  };

  const exportToCSV = () => {
    const csvRows = [
      ["subject", "topic", "question", "image", "answer", "a", "b", "c", "d", "marks"].join(","),
    ];

    question.subQuestions.forEach((sq) => {
      const row = [
        "Math",
        "Graph Analysis",
        `"${question.title} - ${sq.text}"`,
        question.image || "",
        sq.correctAnswer,
        `"${sq.optionA}"`,
        `"${sq.optionB}"`,
        `"${sq.optionC}"`,
        `"${sq.optionD}"`,
        sq.marks,
      ].join(",");
      csvRows.push(row);
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "questions.csv";
    link.click();
    toast.success("CSV exported successfully");
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Question Builder</h1>
              <p className="text-muted-foreground mt-1">Create graph-based questions with Unicode support</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={isPreviewMode ? "outline" : "default"}
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              >
                {isPreviewMode ? <Edit className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {isPreviewMode ? "Edit" : "Preview"}
              </Button>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Unicode Symbol Pad - Left Sidebar */}
            {!isPreviewMode && (
              <div className="lg:col-span-1">
                <UnicodeSymbolPad onSymbolClick={insertSymbol} />
              </div>
            )}

            {/* Main Content */}
            <div className={isPreviewMode ? "lg:col-span-4" : "lg:col-span-3"}>
              {!isPreviewMode ? (
                /* Edit Mode */
                <Card className="p-6 bg-white shadow-lg rounded-2xl">
                  {/* Question Header */}
                  <div className="mb-6">
                    <Label htmlFor="title">Question Title</Label>
                    <Textarea
                      id="title"
                      ref={(el) => (textareaRefs.current["title"] = el)}
                      value={question.title}
                      onChange={(e) => setQuestion({ ...question, title: e.target.value })}
                      onFocus={() => setActiveTextarea("title")}
                      className="mt-2 min-h-[100px]"
                      placeholder="Enter main question text..."
                    />
                  </div>

                  {/* Total Marks */}
                  <div className="mb-6">
                    <Label htmlFor="marks">Total Marks</Label>
                    <Input
                      id="marks"
                      type="number"
                      value={question.totalMarks}
                      onChange={(e) => setQuestion({ ...question, totalMarks: parseInt(e.target.value) || 0 })}
                      className="mt-2 max-w-[200px]"
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="mb-6">
                    <Label>Graph/Image</Label>
                    <div
                      {...getRootProps()}
                      className={`mt-2 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary"
                      }`}
                    >
                      <input {...getInputProps()} />
                      {question.image ? (
                        <div className="relative inline-block">
                          <img
                            src={question.image}
                            alt="Question graph"
                            className="max-w-[300px] mx-auto rounded-lg shadow-md"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuestion({ ...question, image: null });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="py-8">
                          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">
                            {isDragActive ? "Drop image here..." : "Drag & drop an image, or click to select"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="mb-6">
                    <Label htmlFor="instructions">Instructions</Label>
                    <Textarea
                      id="instructions"
                      ref={(el) => (textareaRefs.current["instructions"] = el)}
                      value={question.instructions}
                      onChange={(e) => setQuestion({ ...question, instructions: e.target.value })}
                      onFocus={() => setActiveTextarea("instructions")}
                      className="mt-2"
                      placeholder="Additional instructions..."
                    />
                  </div>

                  {/* Sub-Questions */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <Label>Sub-Questions</Label>
                      <Button onClick={addSubQuestion} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Sub-Question
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {question.subQuestions.map((sq, index) => (
                        <Card key={sq.id} className="p-4 bg-muted/30 border-2">
                          <div className="flex justify-between items-start mb-3">
                            <Label className="text-base font-semibold">Sub-Question {index + 1}</Label>
                            <Button variant="ghost" size="icon" onClick={() => removeSubQuestion(sq.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <Label>Question Text</Label>
                              <Textarea
                                ref={(el) => (textareaRefs.current[`subquestion-${sq.id}-text`] = el)}
                                value={sq.text}
                                onChange={(e) => updateSubQuestion(sq.id, "text", e.target.value)}
                                onFocus={() => setActiveTextarea(`subquestion-${sq.id}-text`)}
                                className="mt-1"
                                placeholder="Enter sub-question..."
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Option A</Label>
                                <Input
                                  ref={(el) => (textareaRefs.current[`subquestion-${sq.id}-optionA`] = el)}
                                  value={sq.optionA}
                                  onChange={(e) => updateSubQuestion(sq.id, "optionA", e.target.value)}
                                  onFocus={() => setActiveTextarea(`subquestion-${sq.id}-optionA`)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Option B</Label>
                                <Input
                                  ref={(el) => (textareaRefs.current[`subquestion-${sq.id}-optionB`] = el)}
                                  value={sq.optionB}
                                  onChange={(e) => updateSubQuestion(sq.id, "optionB", e.target.value)}
                                  onFocus={() => setActiveTextarea(`subquestion-${sq.id}-optionB`)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Option C</Label>
                                <Input
                                  ref={(el) => (textareaRefs.current[`subquestion-${sq.id}-optionC`] = el)}
                                  value={sq.optionC}
                                  onChange={(e) => updateSubQuestion(sq.id, "optionC", e.target.value)}
                                  onFocus={() => setActiveTextarea(`subquestion-${sq.id}-optionC`)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Option D</Label>
                                <Input
                                  ref={(el) => (textareaRefs.current[`subquestion-${sq.id}-optionD`] = el)}
                                  value={sq.optionD}
                                  onChange={(e) => updateSubQuestion(sq.id, "optionD", e.target.value)}
                                  onFocus={() => setActiveTextarea(`subquestion-${sq.id}-optionD`)}
                                  className="mt-1"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Correct Answer</Label>
                                <select
                                  value={sq.correctAnswer}
                                  onChange={(e) => updateSubQuestion(sq.id, "correctAnswer", e.target.value)}
                                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                                >
                                  <option value="A">A</option>
                                  <option value="B">B</option>
                                  <option value="C">C</option>
                                  <option value="D">D</option>
                                </select>
                              </div>
                              <div>
                                <Label>Marks</Label>
                                <Input
                                  type="number"
                                  value={sq.marks}
                                  onChange={(e) => updateSubQuestion(sq.id, "marks", parseInt(e.target.value) || 1)}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </Card>
              ) : (
                /* Preview Mode */
                <Card className="p-8 bg-white shadow-lg rounded-2xl">
                  {/* Question Header */}
                  <div className="flex justify-between items-start mb-6">
                    <MathJax className="text-lg font-medium flex-1">{question.title}</MathJax>
                    <Badge className="ml-4 text-base px-4 py-1">{question.totalMarks} marks</Badge>
                  </div>

                  {/* Image */}
                  {question.image && (
                    <div className="my-6 text-center">
                      <img
                        src={question.image}
                        alt="Question graph"
                        className="max-w-[300px] mx-auto rounded-xl shadow-md border hover:shadow-lg transition"
                      />
                      <p className="text-sm text-muted-foreground mt-2">Click to view in full size</p>
                    </div>
                  )}

                  {/* Instructions */}
                  {question.instructions && (
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                      <MathJax className="text-muted-foreground">{question.instructions}</MathJax>
                    </div>
                  )}

                  {/* Sub-Questions */}
                  <div className="space-y-6">
                    {question.subQuestions.map((sq, index) => (
                      <Card key={sq.id} className="p-6 bg-gradient-to-br from-background to-muted/10 border-2">
                        <div className="flex justify-between items-start mb-4">
                          <MathJax className="font-semibold text-base">
                            {index + 1}. {sq.text}
                          </MathJax>
                          <Badge variant="outline">{sq.marks} marks</Badge>
                        </div>

                        <div className="space-y-2 ml-4">
                          {["A", "B", "C", "D"].map((option) => (
                            <div
                              key={option}
                              className={`p-3 rounded-lg border-2 transition ${
                                sq.correctAnswer === option
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-background"
                              }`}
                            >
                              <MathJax className="flex items-start">
                                <span className="font-semibold mr-2">{option}.</span>
                                <span>{sq[`option${option}` as keyof SubQuestion]}</span>
                              </MathJax>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </MathJaxContext>
  );
}
