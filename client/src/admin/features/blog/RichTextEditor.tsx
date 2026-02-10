import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { cn } from '@/lib/utils';
import { Button } from '../../shared/components/Button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Code,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[300px] max-w-none p-4',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className={cn('border border-gray-300 rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        <Button
          size="sm"
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBold().run()}
          type="button"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          type="button"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('code') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleCode().run()}
          type="button"
        >
          <Code className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <Button
          size="sm"
          variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          type="button"
        >
          H2
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          type="button"
        >
          H3
        </Button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <Button
          size="sm"
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          type="button"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          type="button"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          type="button"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        <Button
          size="sm"
          variant={editor.isActive('link') ? 'secondary' : 'ghost'}
          onClick={setLink}
          type="button"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          type="button"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          type="button"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
