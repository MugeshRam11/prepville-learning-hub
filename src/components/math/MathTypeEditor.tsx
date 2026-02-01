import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import { ClassicEditor, Essentials, Paragraph } from 'ckeditor5';
import MathType from '@wiris/mathtype-ckeditor5/dist/index.js';
import 'ckeditor5/ckeditor5.css';
import '@wiris/mathtype-ckeditor5/dist/index.css';

interface MathTypeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onMathMLInsert?: (mathml: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hideToolbar?: boolean;
}

// MathType Editor - Used as rendering engine only
// The default MathType toolbar is hidden, formulas are inserted programmatically
const MathTypeEditor: React.FC<MathTypeEditorProps> = ({
  value,
  onChange,
  onMathMLInsert,
  placeholder = 'Enter your answer...',
  disabled = false,
  hideToolbar = true
}) => {
  const editorRef = useRef<ClassicEditor | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Insert MathML programmatically into the editor
  const insertMathML = useCallback((mathml: string) => {
    if (editorRef.current && isReady) {
      try {
        // MathType command to insert formula
        editorRef.current.execute('insertMathType', { mathml });
      } catch (error) {
        console.error('Failed to insert MathML:', error);
        // Fallback: insert as text
        editorRef.current.model.change(writer => {
          const insertPosition = editorRef.current!.model.document.selection.getFirstPosition();
          if (insertPosition) {
            writer.insertText(mathml, insertPosition);
          }
        });
      }
    }
  }, [isReady]);

  // Expose insertMathML to parent
  useEffect(() => {
    if (onMathMLInsert) {
      // Create a custom event or callback mechanism
      (window as any).__mathTypeInsert = insertMathML;
    }
    return () => {
      delete (window as any).__mathTypeInsert;
    };
  }, [insertMathML, onMathMLInsert]);

  const editorConfig = {
    plugins: [Essentials, Paragraph, MathType],
    toolbar: hideToolbar ? [] : ['MathType', 'ChemType'],
    placeholder,
    // MathType specific configuration
    mathTypeParameters: {
      editorParameters: {
        fontFamily: 'Arial',
        fontSize: '16px'
      }
    }
  };

  return (
    <div className={`mathtype-editor-wrapper ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <CKEditor
        editor={ClassicEditor}
        config={editorConfig}
        data={value}
        onReady={(editor) => {
          editorRef.current = editor;
          setIsReady(true);
        }}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
        disabled={disabled}
      />
      
      <style>{`
        .mathtype-editor-wrapper .ck-editor__editable {
          min-height: 120px;
          font-size: 16px;
          padding: 12px;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
        }
        
        .mathtype-editor-wrapper .ck-editor__editable:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
        }
        
        .mathtype-editor-wrapper .ck-toolbar {
          display: ${hideToolbar ? 'none' : 'flex'};
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          border-radius: 8px 8px 0 0;
        }
        
        /* Hide MathType default button when using custom keyboard */
        .mathtype-editor-wrapper .ck-button[data-cke-tooltip-text*="MathType"],
        .mathtype-editor-wrapper .ck-button[data-cke-tooltip-text*="ChemType"] {
          display: ${hideToolbar ? 'none' : 'flex'};
        }
      `}</style>
    </div>
  );
};

export default MathTypeEditor;
