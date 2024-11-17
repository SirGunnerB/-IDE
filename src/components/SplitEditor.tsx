import * as React from 'react';
import { Editor } from './Editor';
import { ResizableBox } from 'react-resizable';

interface SplitEditorProps {
  files: string[];
}

export const SplitEditor: React.FC<SplitEditorProps> = ({ files }) => {
  const [splits, setSplits] = React.useState<'horizontal' | 'vertical'>('horizontal');
  const [splitSizes, setSplitSizes] = React.useState<number[]>([]);

  return (
    <div className={`split-editor-container ${splits}`}>
      {files.map((file, index) => (
        <ResizableBox
          key={file}
          width={splits === 'horizontal' ? Infinity : splitSizes[index]}
          height={splits === 'vertical' ? Infinity : splitSizes[index]}
          onResize={(e, { size }) => {
            const newSizes = [...splitSizes];
            newSizes[index] = size.width;
            setSplitSizes(newSizes);
          }}
        >
          <Editor filePath={file} />
        </ResizableBox>
      ))}
    </div>
  );
}; 