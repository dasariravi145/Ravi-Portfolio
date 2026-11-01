import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { FontSize, LineHeight } from './richTextExtensions';
import { RichTextViewer } from './RichTextViewer';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link2,
  Unlink,
  Undo2,
  Redo2,
  RemoveFormatting,
  Palette,
  Monitor,
  Smartphone,
  Edit3,
  Save,
  RotateCcw,
  Check,
} from 'lucide-react';

export interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  minHeight?: string;
  initialValue?: string;
  enablePreviews?: boolean;
  className?: string;
}

const BRAND_COLORS = [
  { name: 'Dark Slate', value: '#0F172A', preview: 'bg-slate-900' },
  { name: 'Muted Slate', value: '#475569', preview: 'bg-slate-600' },
  { name: 'Royal Blue (Brand)', value: '#2563EB', preview: 'bg-blue-600' },
  { name: 'Sky Blue', value: '#0284C7', preview: 'bg-sky-600' },
  { name: 'Emerald Teal', value: '#0D9488', preview: 'bg-teal-600' },
  { name: 'Amber', value: '#D97706', preview: 'bg-amber-600' },
  { name: 'Rose', value: '#E11D48', preview: 'bg-rose-600' },
];

const FONT_SIZES = [
  { label: 'Small (12px)', value: '12px' },
  { label: 'Compact (14px)', value: '14px' },
  { label: 'Normal (16px)', value: '16px' },
  { label: 'Medium (18px)', value: '18px' },
  { label: 'Large (20px)', value: '20px' },
  { label: 'XL (24px)', value: '24px' },
];

const LINE_HEIGHTS = [
  { label: 'Tight (1.3)', value: '1.3' },
  { label: 'Normal (1.5)', value: '1.5' },
  { label: 'Relaxed (1.7)', value: '1.7' },
  { label: 'Loose (2.0)', value: '2.0' },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = 'Write content here...',
  helperText,
  required = false,
  minHeight = '140px',
  initialValue: customInitialValue,
  enablePreviews = true,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'desktop' | 'mobile'>('editor');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Store initial content to track dirty/unsaved state
  const initialContentRef = useRef(customInitialValue !== undefined ? customInitialValue : value);
  const isDirty = value !== initialContentRef.current;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      FontSize,
      Color,
      LineHeight,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none p-3.5 text-slate-800 text-sm leading-relaxed',
        style: `min-height: ${minHeight};`,
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      // If empty paragraph, treat as empty string
      const sanitized = html === '<p></p>' ? '' : html;
      onChange(sanitized);
    },
  });

  // Sync external value changes into editor
  useEffect(() => {
    if (editor && value !== editor.getHTML() && (value || editor.getHTML() !== '<p></p>')) {
      if (value === '' && editor.getHTML() === '<p></p>') return;
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const handleOpenLinkModal = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkModal(true);
  };

  const handleSetLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setShowLinkModal(false);
      return;
    }

    let validUrl = linkUrl.trim();
    if (
      !validUrl.startsWith('http://') &&
      !validUrl.startsWith('https://') &&
      !validUrl.startsWith('mailto:') &&
      !validUrl.startsWith('#')
    ) {
      validUrl = `https://${validUrl}`;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: validUrl }).run();
    setShowLinkModal(false);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave();
      initialContentRef.current = value;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    editor.commands.setContent(initialContentRef.current || '', { emitUpdate: false });
    onChange(initialContentRef.current);
    if (onCancel) onCancel();
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header bar: Label, Status, and View Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Unsaved indicator */}
          {isDirty && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
              ● Unsaved changes
            </span>
          )}

          {/* Mode Switcher Tabs */}
          {enablePreviews && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${activeTab === 'editor'
                    ? 'bg-white text-brand-primary shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Interactive Visual Editor"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${activeTab === 'desktop'
                    ? 'bg-white text-brand-primary shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Desktop Preview"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mobile')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${activeTab === 'mobile'
                    ? 'bg-white text-brand-primary shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Mobile Preview (390px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden synced textarea for accessible form inspection & testing compatibility */}
      <textarea
        tabIndex={-1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const newVal = e.target.value;
          onChange(newVal);
          if (editor) {
            editor.commands.setContent(newVal, { emitUpdate: false });
          }
        }}
        className="sr-only"
        aria-label={label ? `${label} raw content` : 'rich text content'}
      />

      {/* Main Container */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all">
        {/* Editor Mode: Full Visual Toolbar */}
        {activeTab === 'editor' && (
          <>
            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50/80 border-b border-slate-200 text-slate-700">
              {/* History: Undo / Redo */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                <button
                  type="button"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                  className="p-1.5 rounded hover:bg-slate-200/80 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                  className="p-1.5 rounded hover:bg-slate-200/80 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Headings / Style */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setParagraph().run()}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${editor.isActive('paragraph') && !editor.isActive('heading')
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Normal Paragraph"
                >
                  P
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 1 })
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Heading 1"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 })
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Heading 2"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 3 })
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Heading 3"
                >
                  <Heading3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Basic Formatting: Bold, Italic, Underline */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded transition-colors ${editor.isActive('bold')
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded transition-colors ${editor.isActive('italic')
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={`p-1.5 rounded transition-colors ${editor.isActive('underline')
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Underline (Ctrl+U)"
                >
                  <UnderlineIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Font Size Selector */}
              <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200">
                <select
                  aria-label="Font Size"
                  className="text-xs bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none focus:border-brand-primary"
                  value={editor.getAttributes('textStyle').fontSize || '16px'}
                  onChange={(e) => {
                    const size = e.target.value;
                    if (size === '16px') {
                      editor.chain().focus().setMark('textStyle', { fontSize: null }).run();
                    } else {
                      editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
                    }
                  }}
                >
                  {FONT_SIZES.map((sz) => (
                    <option key={sz.value} value={sz.value}>
                      {sz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand Color Selector */}
              <div className="relative flex items-center pr-1.5 border-r border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs ${showColorPicker ? 'bg-white text-brand-primary shadow-2xs border border-slate-200' : 'hover:bg-slate-200/80'
                    }`}
                  title="Select Brand Text Color"
                >
                  <Palette className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="hidden sm:inline font-medium">Color</span>
                </button>

                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg border border-slate-200 shadow-floating z-30 min-w-[180px] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Approved Brand Palette
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      {BRAND_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => {
                            editor.chain().focus().setColor(c.value).run();
                            setShowColorPicker(false);
                          }}
                          className="flex items-center gap-2 w-full px-2 py-1 rounded text-left text-xs hover:bg-slate-50 transition-colors"
                        >
                          <span className={`w-3.5 h-3.5 rounded-full border border-slate-300 ${c.preview}`} />
                          <span className="text-slate-800">{c.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().unsetColor().run();
                          setShowColorPicker(false);
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-800 w-full text-left px-2 py-0.5"
                      >
                        Reset to default color
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Alignment: Left / Center / Right */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'left' })
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'center' })
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'right' })
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Line Height Selector */}
              <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200">
                <select
                  aria-label="Line Spacing"
                  className="text-xs bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none focus:border-brand-primary"
                  value={editor.getAttributes('paragraph').lineHeight || '1.5'}
                  onChange={(e) => {
                    const lh = e.target.value;
                    editor.chain().focus().setMark('lineHeight', { lineHeight: lh }).run();
                  }}
                >
                  {LINE_HEIGHTS.map((lh) => (
                    <option key={lh.value} value={lh.value}>
                      {lh.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lists: Bullet / Numbered */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList')
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList')
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Numbered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Links: Add / Remove */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                <button
                  type="button"
                  onClick={handleOpenLinkModal}
                  className={`p-1.5 rounded transition-colors ${editor.isActive('link')
                      ? 'bg-white text-brand-primary font-bold shadow-2xs border border-slate-200'
                      : 'hover:bg-slate-200/80'
                    }`}
                  title="Add or Edit Link"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
                {editor.isActive('link') && (
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetLink().run()}
                    className="p-1.5 rounded hover:bg-slate-200/80 text-rose-600"
                    title="Remove Link"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Clear Formatting */}
              <button
                type="button"
                onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                className="p-1.5 rounded hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 transition-colors"
                title="Clear All Formatting"
              >
                <RemoveFormatting className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Editable Content Canvas */}
            <div className="bg-white">
              <EditorContent editor={editor} />
            </div>
          </>
        )}

        {/* Desktop Preview Mode */}
        {activeTab === 'desktop' && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 min-h-[160px]">
            <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3 border-b border-slate-100 pb-2">
                Public Desktop Preview Simulation
              </span>
              <RichTextViewer content={value} />
            </div>
          </div>
        )}

        {/* Mobile Preview Mode (390px iPhone/Pixel width) */}
        {activeTab === 'mobile' && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 min-h-[160px] flex justify-center">
            <div className="w-full max-w-[390px] p-5 bg-white rounded-2xl border-2 border-slate-300 shadow-floating">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Mobile Screen (390px)
                </span>
                <span className="text-[10px] font-mono text-slate-400">AA Accessible</span>
              </div>
              <RichTextViewer content={value} />
            </div>
          </div>
        )}

        {/* Bottom Action Footer (Word Count, Reset, Save) */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>{value ? value.replace(/<[^>]*>/g, '').length : 0} characters</span>
            <span>•</span>
            <span>
              {value
                ? value
                  .replace(/<[^>]*>/g, '')
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean).length
                : 0}{' '}
              words
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                title="Discard uncommitted changes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert</span>
              </button>
            )}

            {onSave && (
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-semibold transition-colors disabled:opacity-40 disabled:hover:bg-brand-primary shadow-xs"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Field'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Helper text or description */}
      {helperText && <p className="text-xs text-slate-500 leading-normal">{helperText}</p>}

      {/* Link Dialog Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-md w-full shadow-floating space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-brand-primary" />
              <span>Insert or Update Hyperlink</span>
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination URL
              </label>
              <input
                type="text"
                placeholder="https://example.com or mailto:user@company.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-brand-primary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSetLink();
                  } else if (e.key === 'Escape') {
                    setShowLinkModal(false);
                  }
                }}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                External links automatically open in new tabs with rel=&quot;noopener noreferrer&quot;.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSetLink}
                className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover"
              >
                Apply Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
