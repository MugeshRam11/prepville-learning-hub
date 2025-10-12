import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SymbolPicker } from "@/components/admin/SymbolPicker";
import { Plus, Eye, Edit, Download, Upload, X } from "lucide-react";
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

export default function QuestionBuilder() {
  const [title, setTitle] = useState("Based on the graph shown in the image, analyze the relationship between the variables and answer the following sub-questions:");
  const [totalMarks, setTotalMarks] = useState(10);
  const [image, setImage] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("Refer to the image above. Scroll down if the question continues...");
  const [subQuestions, setSubQuestions] = useState<SubQuestion[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        toast.success("Image uploaded");
      };
      reader.readAsDataURL(file);
    }
  };

  const insertSymbol = (symbol: string) => {
    if (!activeField) return;
    
    const [type, id, field] = activeField.split("-");
    
    if (type === "title") {
      setTitle(prev => prev + symbol);
    } else if (type === "instructions") {
      setInstructions(prev => prev + symbol);
    } else if (type === "sub" && id) {
      setSubQuestions(prev => prev.map(sq => 
        sq.id === id ? { ...sq, [field]: sq[field as keyof SubQuestion] + symbol } : sq
      ));
    }
  };

  const addSubQuestion = () => {
    const newSub: SubQuestion = {
      id: Date.now().toString(),
      text: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
      marks: 1,
    };
    setSubQuestions([...subQuestions, newSub]);
  };

  const updateSubQuestion = (id: string, field: keyof SubQuestion, value: string | number) => {
    setSubQuestions(prev => prev.map(sq => 
      sq.id === id ? { ...sq, [field]: value } : sq
    ));
  };

  const removeSubQuestion = (id: string) => {
    setSubQuestions(prev => prev.filter(sq => sq.id !== id));
  };

  const exportCSV = () => {
    const rows = [["subject", "topic", "question", "image", "answer", "a", "b", "c", "d", "marks"]];
    subQuestions.forEach(sq => {
      rows.push([
        "Math",
        "Graph Analysis",
        `"${title} - ${sq.text}"`,
        image || "",
        sq.correctAnswer,
        `"${sq.optionA}"`,
        `"${sq.optionB}"`,
        `"${sq.optionC}"`,
        `"${sq.optionD}"`,
        sq.marks.toString(),
      ]);
    });
    const csv = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "questions.csv";
    link.click();
    toast.success("CSV exported");
  };

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Question Builder</h1>
            <p className="text-muted-foreground">Create graph-based questions with Unicode</p>
          </div>
          <div className="flex gap-2">
            <Button variant={isPreview ? "outline" : "default"} onClick={() => setIsPreview(!isPreview)}>
              {isPreview ? <><Edit className="mr-2 h-4 w-4" />Edit</> : <><Eye className="mr-2 h-4 w-4" />Preview</>}
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Symbol Picker */}
          {!isPreview && (
            <div className="lg:col-span-1">
              <SymbolPicker onSelect={insertSymbol} />
            </div>
          )}

          {/* Main Content */}
          <div className={isPreview ? "lg:col-span-4" : "lg:col-span-3"}>
            {!isPreview ? (
              /* Edit Mode */
              <Card className="p-6">
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <Label>Question Title</Label>
                    <Textarea
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onFocus={() => setActiveField("title")}
                      className="mt-2"
                    />
                  </div>

                  {/* Marks */}
                  <div>
                    <Label>Total Marks</Label>
                    <Input
                      type="number"
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(parseInt(e.target.value) || 0)}
                      className="mt-2 max-w-[200px]"
                    />
                  </div>

                  {/* Image */}
                  <div>
                    <Label>Graph/Image</Label>
                    <div className="mt-2">
                      {image ? (
                        <div className="relative inline-block">
                          <img src={image} alt="Graph" className="max-w-[300px] rounded-lg" />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => setImage(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Click to upload image</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <Label>Instructions</Label>
                    <Textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      onFocus={() => setActiveField("instructions")}
                      className="mt-2"
                    />
                  </div>

                  {/* Sub-Questions */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label>Sub-Questions</Label>
                      <Button onClick={addSubQuestion} size="sm">
                        <Plus className="mr-2 h-4 w-4" />Add
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {subQuestions.map((sq, idx) => (
                        <Card key={sq.id} className="p-4 bg-muted/30">
                          <div className="flex justify-between mb-3">
                            <Label>Sub-Question {idx + 1}</Label>
                            <Button variant="ghost" size="icon" onClick={() => removeSubQuestion(sq.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-3">
                            <Textarea
                              value={sq.text}
                              onChange={(e) => updateSubQuestion(sq.id, "text", e.target.value)}
                              onFocus={() => setActiveField(`sub-${sq.id}-text`)}
                              placeholder="Question text..."
                            />

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Option A</Label>
                                <Input
                                  value={sq.optionA}
                                  onChange={(e) => updateSubQuestion(sq.id, "optionA", e.target.value)}
                                  onFocus={() => setActiveField(`sub-${sq.id}-optionA`)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Option B</Label>
                                <Input
                                  value={sq.optionB}
                                  onChange={(e) => updateSubQuestion(sq.id, "optionB", e.target.value)}
                                  onFocus={() => setActiveField(`sub-${sq.id}-optionB`)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Option C</Label>
                                <Input
                                  value={sq.optionC}
                                  onChange={(e) => updateSubQuestion(sq.id, "optionC", e.target.value)}
                                  onFocus={() => setActiveField(`sub-${sq.id}-optionC`)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Option D</Label>
                                <Input
                                  value={sq.optionD}
                                  onChange={(e) => updateSubQuestion(sq.id, "optionD", e.target.value)}
                                  onFocus={() => setActiveField(`sub-${sq.id}-optionD`)}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Correct Answer</Label>
                                <select
                                  value={sq.correctAnswer}
                                  onChange={(e) => updateSubQuestion(sq.id, "correctAnswer", e.target.value)}
                                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                                >
                                  <option value="A">A</option>
                                  <option value="B">B</option>
                                  <option value="C">C</option>
                                  <option value="D">D</option>
                                </select>
                              </div>
                              <div>
                                <Label className="text-xs">Marks</Label>
                                <Input
                                  type="number"
                                  value={sq.marks}
                                  onChange={(e) => updateSubQuestion(sq.id, "marks", parseInt(e.target.value) || 1)}
                                />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              /* Preview Mode */
              <Card className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <p className="text-lg font-medium flex-1">{title}</p>
                  <Badge className="ml-4">{totalMarks} marks</Badge>
                </div>

                {image && (
                  <div className="my-6 text-center">
                    <img src={image} alt="Graph" className="max-w-[300px] mx-auto rounded-xl" />
                    <p className="text-sm text-muted-foreground mt-2">Click to view in full size</p>
                  </div>
                )}

                {instructions && (
                  <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">{instructions}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {subQuestions.map((sq, idx) => (
                    <Card key={sq.id} className="p-6 border-2">
                      <div className="flex justify-between items-start mb-4">
                        <p className="font-semibold">{idx + 1}. {sq.text}</p>
                        <Badge variant="outline">{sq.marks} marks</Badge>
                      </div>

                      <div className="space-y-2 ml-4">
                        {["A", "B", "C", "D"].map((opt) => (
                          <div
                            key={opt}
                            className={`p-3 rounded-lg border-2 ${
                              sq.correctAnswer === opt ? "border-primary bg-primary/5" : "border-border"
                            }`}
                          >
                            <span className="font-semibold mr-2">{opt}.</span>
                            <span>{sq[`option${opt}` as keyof SubQuestion]}</span>
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
  );
}
