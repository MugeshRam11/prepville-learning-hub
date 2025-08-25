
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface AvatarCustomizerProps {
  onClose: () => void;
  currentAvatar: string;
}

const AvatarCustomizer = ({ onClose, currentAvatar }: AvatarCustomizerProps) => {
  const [selectedAvatarId, setSelectedAvatarId] = useState<number>(1); // Use ID instead of src

  const avatarOptions = [
    { id: 1, src: "/placeholder.svg", name: "Cool Cat", category: "Animals", unlocked: true },
    { id: 2, src: "/placeholder.svg", name: "Space Explorer", category: "Sci-Fi", unlocked: true },
    { id: 3, src: "/placeholder.svg", name: "Math Wizard", category: "Fantasy", unlocked: true },
    { id: 4, src: "/placeholder.svg", name: "Robot Friend", category: "Sci-Fi", unlocked: false, requiredLevel: 10 },
    { id: 5, src: "/placeholder.svg", name: "Dragon Tamer", category: "Fantasy", unlocked: false, requiredLevel: 15 },
    { id: 6, src: "/placeholder.svg", name: "Ocean Explorer", category: "Nature", unlocked: true },
    // Logo avatars
    { id: 7, src: "/placeholder.svg", name: "Python Pro", category: "Logos", unlocked: true, emoji: "🐍" },
    { id: 8, src: "/placeholder.svg", name: "React Master", category: "Logos", unlocked: true, emoji: "⚛️" },
    { id: 9, src: "/placeholder.svg", name: "Math Symbol", category: "Logos", unlocked: true, emoji: "∑" },
    { id: 10, src: "/placeholder.svg", name: "Code Warrior", category: "Logos", unlocked: true, emoji: "💻" },
    { id: 11, src: "/placeholder.svg", name: "Study Hub", category: "Logos", unlocked: false, requiredLevel: 5, emoji: "📚" },
    { id: 12, src: "/placeholder.svg", name: "Brain Power", category: "Logos", unlocked: true, emoji: "🧠" },
    { id: 13, src: "/placeholder.svg", name: "Lightning Code", category: "Logos", unlocked: false, requiredLevel: 12, emoji: "⚡" },
    { id: 14, src: "/placeholder.svg", name: "Gear Head", category: "Logos", unlocked: true, emoji: "⚙️" },
  ];

  const categories = ["All", "Animals", "Sci-Fi", "Fantasy", "Nature", "Logos"];
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredAvatars = avatarOptions.filter(avatar => 
    selectedCategory === "All" || avatar.category === selectedCategory
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Customize Your Avatar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Avatar Grid */}
          <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
            {filteredAvatars.length === 0 && (
              <div className="col-span-3 text-center py-8 text-gray-500">
                No avatars found in this category
              </div>
            )}
            {filteredAvatars.map(avatar => (
              <div 
                key={avatar.id}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedAvatarId === avatar.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${!avatar.unlocked ? 'opacity-50' : ''}`}
                onClick={() => avatar.unlocked && setSelectedAvatarId(avatar.id)}
              >
                <Avatar className="w-16 h-16 mx-auto mb-2">
                  {avatar.emoji ? (
                    <div className={`w-full h-full flex items-center justify-center text-2xl ${
                      avatar.category === 'Logos' ? 'bg-gradient-to-br from-blue-500 to-purple-500 rounded-full text-white' : 'bg-gray-100 rounded-full'
                    }`}>
                      <span className="drop-shadow-sm">{avatar.emoji}</span>
                    </div>
                  ) : (
                    <>
                      <AvatarImage src={avatar.src} />
                      <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-gray-100 to-gray-200">
                        {avatar.name[0]}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                
                <div className="text-center">
                  <div className="font-medium text-sm">{avatar.name}</div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {avatar.category}
                  </Badge>
                </div>

                {!avatar.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                    <div className="text-white text-center">
                      <div className="text-2xl">🔒</div>
                      <div className="text-xs">Level {avatar.requiredLevel}</div>
                    </div>
                  </div>
                )}

                {selectedAvatarId === avatar.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose} className="bg-gradient-to-r from-blue-600 to-purple-600">
              Save Avatar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarCustomizer;
