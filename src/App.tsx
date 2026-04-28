import { useState, useMemo, useRef, useCallback, useEffect, useDeferredValue } from 'react';
import { Search, ChevronRight, Gavel, BookOpen, AlertCircle, Info, Menu, X, ArrowLeft, Filter, ChevronDown, Scale, ScrollText, Snowflake, Download, Bookmark, MessageCircleHeart, Pencil, Target, FolderOpen, ClipboardCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { DOCUMENTS, allLawArticles } from './data/lawData';
import { nghiDinh214Data, allNd214Articles } from './data/nd214';
import { thongTu79Data, allTt79Articles } from './data/tt79';
import { Chapter, Article, DocumentData, UserNote } from './types';
import { logoBase64 } from './logoData';

function DocumentPane({
  docData,
  allArticles,
  selectedIds,
  expandedArticleId,
  searchQuery,
  onSelect,
  onToggleArticle,
  onClearSearch,
  isSidebarOpen,
  bookmarkedIds,
  onToggleBookmark,
  userNotes,
  onNoteClick
}: {
  docData: DocumentData;
  allArticles: Article[];
  selectedIds: string[];
  expandedArticleId: string | null;
  searchQuery: string;
  onSelect: (ids: string | string[], articleId?: string) => void;
  onToggleArticle: (id: string) => void;
  onClearSearch: () => void;
  isSidebarOpen: boolean;
  bookmarkedIds: string[];
  onToggleBookmark: (id: string, title: string) => void;
  userNotes: UserNote[];
  onNoteClick: (text: string, articleId: string, noteId?: string) => void;
}) {
  const isLuat = docData.id === 'luat';
  const contentRef = useRef<HTMLDivElement>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredArticles = useMemo(() => {
    if (!deferredSearchQuery.trim()) return [];
    const query = deferredSearchQuery.toLowerCase();
    return allArticles.filter(art => 
      art.title.toLowerCase().includes(query) || 
      art.content.toLowerCase().includes(query)
    );
  }, [allArticles, deferredSearchQuery]);

  const currentArticles = useMemo(() => {
    if (selectedIds.length === 0) return allArticles;
    
    const list: Article[] = [];
    selectedIds.forEach(id => {
      const chapter = docData.chapters.find(ch => ch.id === id);
      if (chapter) {
        if (chapter.articles) list.push(...chapter.articles);
        if (chapter.sections) {
          chapter.sections.forEach(s => list.push(...(s.articles || [])));
        }
      } else {
        // Check sections
        for (const ch of docData.chapters) {
          const section = ch.sections?.find(s => s.id === id);
          if (section && section.articles) {
            list.push(...section.articles);
            break;
          }
        }
      }
    });

    // Remove duplicates if any (though IDs should be unique)
    return Array.from(new Set(list.map(a => a.id)))
      .map(id => list.find(a => a.id === id)!);
  }, [selectedIds, docData, allArticles]);

  const handleToggle = (id: string) => {
    onToggleArticle(id);
    if (expandedArticleId !== id) {
      setTimeout(() => {
        const articleElement = document.getElementById(`${docData.id}-art-${id}`);
        if (articleElement) {
          const contentMatch = articleElement.querySelector('p mark');
          if (contentMatch) {
            contentMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            articleElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 150);
    }
  };

  const colorStyles: Record<string, string> = {
    yellow: "bg-[#fef08a] border-[#eab308]",
    green: "bg-[#bbf7d0] border-[#22c55e]",
    blue: "bg-[#bfdbfe] border-[#3b82f6]",
    pink: "bg-[#fbcfe8] border-[#ec4899]",
    purple: "bg-[#e9d5ff] border-[#a855f7]",
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span className="whitespace-pre-wrap">
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} className="bg-amber-400/40 text-ink-900 border-b-2 border-amber-500 px-0.5 rounded-sm font-black shadow-[0_0_15px_rgba(251,191,36,0.3)]">{part}</mark> 
            : <span key={i}>{part}</span>
        )}
      </span>
    );
  };

  const renderContent = (text: string, articleId: string) => {
    const artNotes = userNotes.filter(n => n.articleId === articleId);

    if (artNotes.length === 0 && !deferredSearchQuery.trim()) {
      return <span data-article-id={articleId}>{text}</span>;
    }

    type Token = { type: 'text' | 'note' | 'search', extText: string, note?: UserNote };
    let tokens: Token[] = [{ type: 'text', extText: text }];

    artNotes.forEach(note => {
       if (!note.text.trim()) return;
       const escapeContent = note.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       const regex = new RegExp(`(${escapeContent})`, 'g');
       
       tokens = tokens.flatMap(el => {
          if (el.type !== 'text') return el;
          const parts = el.extText.split(regex);
          return parts.map((part): Token => {
             if (part === note.text) return { type: 'note', extText: part, note };
             return { type: 'text', extText: part };
          });
       });
    });

    if (deferredSearchQuery.trim()) {
       const escapeQuery = deferredSearchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       const queryRegex = new RegExp(`(${escapeQuery})`, 'gi');
       
       tokens = tokens.flatMap(el => {
          if (el.type !== 'text') return el;
          const parts = el.extText.split(queryRegex);
          return parts.map((part): Token => {
             if (part.toLowerCase() === deferredSearchQuery.trim().toLowerCase()) return { type: 'search', extText: part };
             return { type: 'text', extText: part };
          });
       });
    }

    return (
      <span data-article-id={articleId}>
        {tokens.map((el, i) => {
           if (el.type === 'note' && el.note) {
              return (
                <mark 
                  id={`note-${el.note.id}`}
                  key={i} 
                  className={`relative cursor-pointer group ${colorStyles[el.note.color || 'yellow']} text-ink-900 border-l-[3px] rounded-r-sm pr-1 shadow-sm inline my-0.5 leading-relaxed decoration-clone`}
                  onClick={(e) => { e.stopPropagation(); onNoteClick(el.note!.text, articleId, el.note!.id); }}
                  data-note-tooltip={el.note.note || ''}
                >
                  <span className="italic px-0.5 pointer-events-none">{el.extText}</span>
                  <span className="inline-flex relative -top-3 -left-1.5 align-top z-10 p-0.5 rounded-full bg-pink-500 text-white shadow-sm ring-2 ring-white hover:scale-110 transition-transform cursor-pointer pointer-events-none">
                    <MessageCircleHeart size={14} />
                  </span>
                </mark>
              );
           }
           if (el.type === 'search') {
              return <mark key={i} className="bg-amber-400/40 text-ink-900 border-b-2 border-amber-500 px-0.5 rounded-sm font-black shadow-[0_0_15px_rgba(251,191,36,0.3)]">{el.extText}</mark>;
           }
           return <span key={i}>{el.extText}</span>;
        })}
      </span>
    );
  };

  return (
    <div ref={contentRef} className="flex-1 overflow-y-auto p-4 lg:px-6 lg:pt-0 lg:pb-12 scroll-smooth h-full bg-transparent flex justify-center">
      <div className={`w-full max-w-4xl h-full pt-0 pb-20 mt-4 flex flex-col transition-all duration-500 ease-in-out`}>
        <div className="w-full">
        {searchQuery.trim() ? (
          /* Search Results */
          <div className="space-y-0">
            {filteredArticles.length > 0 ? (
              <div className="space-y-0">
                {filteredArticles.map(art => {
                  // Find where this article belongs
                  let parentId = "";
                  docData.chapters.forEach(ch => {
                    if (ch.articles?.find(a => a.id === art.id)) parentId = ch.id;
                    ch.sections?.forEach(s => {
                      if (s.articles.find(a => a.id === art.id)) parentId = s.id;
                    });
                  });

                  return (
                    <div
                      key={art.id}
                      id={`${docData.id}-art-${art.id}`}
                      className="bg-white rounded-xl border border-ink-900/5 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible mb-4 last:mb-0 scroll-mt-0"
                    >
                      <div 
                        onClick={() => handleToggle(art.id)}
                        className={`w-full text-left cursor-pointer p-3 lg:p-4 flex items-center justify-between gap-4 transition-colors ${expandedArticleId === art.id ? 'bg-yellow-400 text-slate-900 sticky top-0 z-20 shadow-md shadow-yellow-400/20 rounded-t-xl rounded-b-none' : 'hover:bg-cream-50 rounded-xl'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`font-bold px-2 py-0.5 border rounded-md transition-all shrink-0 whitespace-nowrap ${expandedArticleId === art.id ? 'border-slate-900/50 bg-yellow-400 text-slate-900 shadow-sm' : 'border-slate-200 text-ink-800'} text-xs lg:text-sm tracking-tight`}>
                            Điều {art.id.split('D')[1]}
                          </div>
                          <h2 className={`font-bold text-xs lg:text-sm tracking-tight ${expandedArticleId === art.id ? 'text-slate-900' : 'text-ink-900'} leading-snug line-clamp-2`}>
                            {highlightMatch(art.title.split('.')[1]?.trim() || art.title, searchQuery)}
                          </h2>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleBookmark(art.id, art.title);
                            }}
                            className={`p-1.5 rounded-full hover:bg-black/10 transition-colors ${bookmarkedIds.includes(art.id) ? (expandedArticleId === art.id ? 'text-rose-600' : 'text-rose-500') : (expandedArticleId === art.id ? 'text-slate-900/60 hover:text-slate-900' : 'text-slate-300 hover:text-slate-500')}`}
                          >
                            <Bookmark size={16} fill={bookmarkedIds.includes(art.id) ? 'currentColor' : 'none'} />
                          </button>
                          <ChevronDown size={20} className={`transition-transform duration-300 shrink-0 ${expandedArticleId === art.id ? 'rotate-180 text-slate-900' : 'text-slate-300'}`} />
                        </div>
                      </div>

                      {expandedArticleId === art.id ? (
                        <div className="overflow-hidden">
                          <div className="px-5 lg:px-6 pb-6 pt-3 border-t border-ink-900/5">
                            <div className="pr-2">
                              <p className="text-ink-800 leading-relaxed text-[12px] lg:text-[13px] whitespace-pre-wrap font-sans selection:bg-deep-yellow/30 text-justify">
                                {renderContent(art.content, art.id)}
                              </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-ink-900/5 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-deep-yellow-dark/60 text-[9px] font-black uppercase tracking-[0.2em]">
                                <Info size={12} />
                                TRÍCH {docData.title.toUpperCase()}
                              </div>
                              <button 
                                onClick={() => { onSelect(parentId, art.id); onClearSearch(); }}
                                className="text-amber-700 hover:text-amber-900 text-[10px] font-bold underline decoration-dotted underline-offset-4"
                              >
                                Xem trong chương mục gốc
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="px-5 lg:px-8 pb-6 pt-0">
                           <div className="text-slate-500 text-xs leading-relaxed line-clamp-2 italic border-l-2 border-slate-100 pl-4 py-1 text-justify">
                              {(() => {
                                const content = art.content;
                                const query = deferredSearchQuery.toLowerCase();
                                const index = content.toLowerCase().indexOf(query);
                                if (index === -1) return renderContent(content.substring(0, 250) + (content.length > 250 ? '...' : ''), art.id);
                                const start = Math.max(0, index - 80);
                                const end = Math.min(content.length, index + 150);
                                let snippet = content.substring(start, end);
                                if (start > 0) snippet = '...' + snippet;
                                if (end < content.length) snippet = snippet + '...';
                                return renderContent(snippet, art.id);
                              })()}
                           </div>
                           <button 
                             onClick={() => handleToggle(art.id)}
                             className="mt-3 text-[10px] font-bold text-deep-yellow-dark flex items-center gap-1 hover:gap-2 transition-all uppercase tracking-widest"
                           >
                             Xem toàn bộ nội dung <ChevronRight size={12} />
                           </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Search size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Không tìm thấy kết quả</h3>
                <p className="text-slate-500 mt-1">Hãy thử từ khóa khác.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-0">
            {currentArticles.length > 0 ? (
              <div className="space-y-6">
                {docData.chapters.map(chapter => {
                  const hasMatchingArticles = currentArticles.some(ca => chapter.articles?.some(a => a.id === ca.id) || chapter.sections?.some(s => s.articles.some(sa => sa.id === ca.id)));
                  if (!hasMatchingArticles) return null;

                  return (
                    <div key={chapter.id} className="relative">
                      <div id={`${docData.id}-chapter-${chapter.id}`} className="scroll-mt-0 sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md h-[34px] mb-3 rounded-lg px-3 border border-slate-200/40 flex items-center justify-between">
                         <h3 className="font-semibold text-slate-500 text-[11px] lg:text-xs uppercase tracking-wider leading-snug line-clamp-1" title={chapter.title}>
                            {chapter.title}
                         </h3>
                      </div>

                      {/* Render direct articles of the chapter first */}
                      {chapter.articles?.some(a => currentArticles.some(ca => ca.id === a.id)) && (
                        <div className="space-y-4 mb-6 px-1 lg:px-2">
                          {chapter.articles.filter(a => currentArticles.some(ca => ca.id === a.id)).map((art) => (
                            <div key={art.id} id={`${docData.id}-art-${art.id}`} className="scroll-mt-[34px] bg-white rounded-xl border border-ink-900/5 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible mb-4 last:mb-0">
                              <div 
                                onClick={() => handleToggle(art.id)}
                                className={`w-full text-left cursor-pointer p-2.5 lg:py-3 lg:px-4 flex items-center justify-between gap-3 transition-colors ${expandedArticleId === art.id ? 'bg-yellow-400 text-slate-900 sticky top-[34px] z-20 shadow-md shadow-yellow-400/20 rounded-t-xl rounded-b-none' : 'hover:bg-cream-50 rounded-xl'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`font-bold px-2 py-0.5 border rounded-md transition-all shrink-0 whitespace-nowrap ${expandedArticleId === art.id ? 'border-slate-900/50 bg-yellow-400 text-slate-900 shadow-sm' : 'border-slate-200 text-ink-800'} text-xs lg:text-sm tracking-tight`}>
                                    Điều {art.id.split('D')[1]}
                                  </div>
                                  <h2 className={`font-bold text-xs lg:text-sm tracking-tight ${expandedArticleId === art.id ? 'text-slate-900' : 'text-ink-900'} line-clamp-2 leading-snug`}>
                                    {art.title.split('.')[1]?.trim() || art.title}
                                  </h2>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleBookmark(art.id, art.title);
                                    }}
                                    className={`p-1.5 rounded-full hover:bg-black/10 transition-colors ${bookmarkedIds.includes(art.id) ? (expandedArticleId === art.id ? 'text-rose-600' : 'text-rose-500') : (expandedArticleId === art.id ? 'text-slate-900/60 hover:text-slate-900' : 'text-slate-300 hover:text-slate-500')}`}
                                  >
                                    <Bookmark size={16} fill={bookmarkedIds.includes(art.id) ? 'currentColor' : 'none'} />
                                  </button>
                                  <ChevronDown size={18} className={`transition-transform duration-300 shrink-0 ${expandedArticleId === art.id ? 'rotate-180 text-slate-900' : 'text-slate-400'}`} />
                                </div>
                              </div>

                              <AnimatePresence>
                                {expandedArticleId === art.id && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 lg:px-5 pb-5 pt-3 border-t border-ink-900/5">
                                      <div className="pr-2">
                                        <p className="text-ink-800 leading-relaxed text-[12px] lg:text-[13px] whitespace-pre-wrap font-sans selection:bg-deep-yellow/30 text-justify">
                                          {renderContent(art.content, art.id)}
                                        </p>
                                      </div>
                                      <div className="mt-6 pt-5 border-t border-ink-900/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-deep-yellow-dark/60 text-[9px] font-black uppercase tracking-[0.2em]">
                                          <Info size={14} />
                                          TRÍCH {docData.title.toUpperCase()}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Render Sections */}
                      {chapter.sections?.map(section => {
                         const hasMatchingSectionArticles = section.articles.some(a => currentArticles.some(ca => ca.id === a.id));
                         if (!hasMatchingSectionArticles) return null;

                         return (
                           <div key={section.id} id={`${docData.id}-section-${section.id}`} className="scroll-mt-[34px] mb-6 px-1 lg:px-3">
                             <div className="flex flex-col gap-1 mb-3 pl-2.5 border-l-[1.5px] border-deep-yellow/70 sticky top-[34px] z-20 bg-slate-900 py-2">
                               <h4 className="font-semibold text-slate-500 text-[10px] lg:text-[11px] uppercase tracking-wider line-clamp-1" title={section.title}>
                                 {section.title}
                               </h4>
                             </div>
                             
                             <div className="space-y-4 pl-0 lg:pl-2">
                               {section.articles.filter(a => currentArticles.some(ca => ca.id === a.id)).map((art) => (
                                <div key={art.id} id={`${docData.id}-art-${art.id}`} className="scroll-mt-[64px] bg-white rounded-xl border border-ink-900/5 shadow-sm hover:shadow-md transition-all duration-300 overflow-visible mb-4 last:mb-0">
                                  <div 
                                    onClick={() => handleToggle(art.id)}
                                    className={`w-full text-left cursor-pointer p-2.5 lg:py-3 lg:px-4 flex items-center justify-between gap-3 transition-colors ${expandedArticleId === art.id ? 'bg-yellow-400 text-slate-900 sticky top-[64px] z-20 shadow-md shadow-yellow-400/20 rounded-t-xl rounded-b-none' : 'hover:bg-cream-50 rounded-xl'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`font-bold px-2 py-0.5 border rounded-md transition-all shrink-0 whitespace-nowrap ${expandedArticleId === art.id ? 'border-slate-900/50 bg-yellow-400 text-slate-900 shadow-sm' : 'border-slate-200 text-ink-800'} text-xs lg:text-sm tracking-tight`}>
                                        Điều {art.id.split('D')[1]}
                                      </div>
                                      <h2 className={`font-bold text-xs lg:text-sm tracking-tight ${expandedArticleId === art.id ? 'text-slate-900' : 'text-ink-900'} line-clamp-2 leading-snug`}>
                                        {art.title.split('.')[1]?.trim() || art.title}
                                      </h2>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onToggleBookmark(art.id, art.title);
                                        }}
                                        className={`p-1.5 rounded-full hover:bg-black/10 transition-colors ${bookmarkedIds.includes(art.id) ? (expandedArticleId === art.id ? 'text-rose-600' : 'text-rose-500') : (expandedArticleId === art.id ? 'text-slate-900/60 hover:text-slate-900' : 'text-slate-300 hover:text-slate-500')}`}
                                      >
                                        <Bookmark size={16} fill={bookmarkedIds.includes(art.id) ? 'currentColor' : 'none'} />
                                      </button>
                                      <ChevronDown size={18} className={`transition-transform duration-300 shrink-0 ${expandedArticleId === art.id ? 'rotate-180 text-slate-900' : 'text-slate-400'}`} />
                                    </div>
                                  </div>

                                  <AnimatePresence>
                                    {expandedArticleId === art.id && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-4 lg:px-5 pb-5 pt-3 border-t border-ink-900/5">
                                          <div className="pr-2">
                                            <p className="text-ink-800 leading-relaxed text-[12px] lg:text-[13px] whitespace-pre-wrap font-sans selection:bg-deep-yellow/30 text-justify">
                                              {renderContent(art.content, art.id)}
                                            </p>
                                          </div>
                                          <div className="mt-6 pt-5 border-t border-ink-900/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-deep-yellow-dark/60 text-[9px] font-black uppercase tracking-[0.2em]">
                                              <Info size={14} />
                                              TRÍCH {docData.title.toUpperCase()}
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                               ))}
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <h3 className="text-lg font-bold text-slate-400">Không có dữ liệu điều luật</h3>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);
}

function NoteModal({
  isOpen,
  onClose,
  initialData,
  onSave,
  onDelete
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData: { articleId: string, text: string, noteId?: string, noteContent?: string, color?: string } | null;
  onSave: (note: UserNote) => void;
  onDelete?: (noteId: string) => void;
}) {
  const [content, setContent] = useState('');
  const [color, setColor] = useState('yellow');

  useEffect(() => {
    if (isOpen && initialData) {
      setContent(initialData.noteContent || '');
      setColor(initialData.color || 'yellow');
    }
  }, [isOpen, initialData]);

  if (!isOpen || !initialData) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden selection-menu-ignore"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
            <MessageCircleHeart className="text-pink-500" size={20} />
            Ghi chú đoạn văn
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5 space-y-5">
          <div className="pl-4 border-l-[3px] border-slate-900 bg-[#fef08a] py-3 pr-4 rounded-r-lg text-slate-800 text-sm italic">
            "{initialData.text.length > 100 ? initialData.text.substring(0, 100) + '...' : initialData.text}"
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
              Nội dung ghi chú
            </label>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSave({
                    id: initialData.noteId || Date.now().toString(),
                    articleId: initialData.articleId,
                    text: initialData.text,
                    note: content,
                    color
                  });
                  onClose();
                }
              }}
              placeholder="Bạn thắc mắc hay cần lưu ý gì ở đoạn này?"
              className="w-full border-2 border-yellow-400 outline-none rounded-xl p-3 text-sm min-h-[120px] resize-none focus:ring-4 focus:ring-yellow-400/20 transition-all font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide shrink-0">
              Màu sắc:
            </label>
            <div className="flex items-center gap-2.5">
              {[
                { id: 'yellow', hex: '#fef08a' },
                { id: 'green', hex: '#bbf7d0' },
                { id: 'blue', hex: '#bfdbfe' },
                { id: 'pink', hex: '#fbcfe8' },
                { id: 'purple', hex: '#e9d5ff' }
              ].map(c => (
                <button 
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c.id ? 'border-2 border-slate-900 scale-110' : 'hover:scale-110 border border-slate-200 shadow-sm'}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-3">
          {initialData.noteId && (
            <button 
              onClick={() => {
                if (onDelete && initialData.noteId) onDelete(initialData.noteId);
                onClose();
              }}
              className="px-6 py-3 text-red-600 bg-red-50 hover:bg-red-100 font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Xóa
            </button>
          )}
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors flex justify-center items-center"
          >
            Đóng
          </button>
          <button 
            onClick={() => {
              onSave({
                id: initialData.noteId || Date.now().toString(),
                articleId: initialData.articleId,
                text: initialData.text,
                note: content,
                color
              });
              onClose();
            }}
            className="flex-1 py-3 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors flex justify-center items-center"
          >
            Lưu lại
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const KEYWORD_SUGGESTIONS: string[] = [];

// Helper to extract relevant phrases dynamically
function extractPhrases(query: string): string[] {
  const dynamicSet = new Set<string>();
  const lowerQ = query.trim().toLowerCase();
  
  if (lowerQ.length < 2) return [];

  // Split text by common clause-ending punctuation
  const splitTextToClauses = (text: string) => {
    return text.split(/[.,;:()!?\n\r"“”\[\]]/);
  };

  const processText = (text: string, isTitle: boolean = false) => {
    if (!text) return;

    if (isTitle && text.toLowerCase().includes(lowerQ)) {
       let cleanTitle = text.trim().replace(/\s+/g, ' ');
       if (cleanTitle.length <= 150) {
           // It's a title, we can trust it makes grammatical sense
           dynamicSet.add(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
       }
    }

    const clauses = splitTextToClauses(text);
    for (let clause of clauses) {
       // Normalize whitespace
       clause = clause.trim().replace(/\s+/g, ' ');
       
       // Remove common bullet points or numbering to make it a generic phrase
       clause = clause.replace(/^([a-zđ]\)|[-+*]|\d+\.)\s+/i, '');
       
       if (clause.length <= query.length) continue;
       
       if (clause.toLowerCase().includes(lowerQ)) {
          // Only extract whole clauses that are reasonably short to ensure they have perfect grammar
          // and don't overwhelm the UI. Punctuation boundaries naturally create meaningful phrases.
          if (clause.length <= 100) {
             clause = clause.charAt(0).toUpperCase() + clause.slice(1);
             dynamicSet.add(clause);
          }
       }
    }
  };

  try {
    const arraysToScan = [allLawArticles, allNd214Articles, allTt79Articles];
    for (const articles of arraysToScan) {
      for (const art of articles) {
         if (art.title) processText(art.title, true);
         if (art.content) processText(art.content, false);
         if (dynamicSet.size >= 15) return Array.from(dynamicSet).slice(0, 10);
      }
    }
  } catch (e) {
    console.error(e);
  }
  
  return Array.from(dynamicSet).slice(0, 10);
}

function AutocompleteInput({
  value,
  onChange,
  placeholder,
  className,
  containerClassName,
  iconSize = 14,
  dark = false,
  showClear = true
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
  containerClassName?: string;
  iconSize?: number;
  dark?: boolean;
  showClear?: boolean;
}) {
  const [show, setShow] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!value.trim()) return [];
    
    const q = value.toLowerCase();
    const staticMatches = KEYWORD_SUGGESTIONS.filter(k => k.toLowerCase().includes(q));
    const dynamicMatches = extractPhrases(value.trim());
    
    // Combine and remove duplicates (case-insensitive)
    const combined = [...staticMatches, ...dynamicMatches];
    const uniqueCombined: string[] = [];
    const seen = new Set<string>();
    
    for (const item of combined) {
        const lower = item.toLowerCase();
        if (!seen.has(lower)) {
            uniqueCombined.push(item);
            seen.add(lower);
        }
    }

    return uniqueCombined.slice(0, 8);
  }, [value]);

  return (
    <div className={`relative ${containerClassName}`} ref={wrapperRef}>
      <Search className={`absolute ${dark ? 'left-3' : 'left-5'} top-1/2 -translate-y-1/2 transition-colors z-10 ${dark ? 'text-slate-400 group-focus-within:text-amber-400' : 'text-slate-500 group-focus-within:text-deep-yellow'}`} size={iconSize} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
           onChange(e.target.value);
           setShow(true);
        }}
        onFocus={() => setShow(true)}
        onKeyDown={(e) => {
           if (e.key === 'Enter') {
              setShow(false);
           }
        }}
        className={className}
      />
      {value && showClear && (
         <button onClick={() => {onChange(""); setShow(false);}} className={`absolute right-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'} transition-colors z-10`}>
           <X size={iconSize} />
         </button>
      )}
      
      <AnimatePresence>
        {show && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full left-0 right-0 mt-1.5 rounded-xl border shadow-xl z-50 overflow-hidden ${dark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            {filtered.map(s => (
               <div
                 key={s}
                 onClick={() => {
                   onChange(s);
                   setShow(false);
                 }}
                 className={`px-4 py-2 text-sm cursor-pointer transition-colors ${dark ? 'hover:bg-amber-500/20 hover:text-white' : 'hover:bg-slate-50 hover:text-deep-yellow-dark'}`}
               >
                 <div className="flex items-center gap-2">
                   <Search size={12} className={dark ? 'text-slate-500' : 'text-slate-400'} />
                   <span>{s}</span>
                 </div>
               </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [selectedLuatIds, setSelectedLuatIds] = useState<string[]>([]);
  const [expandedLuatArticleId, setExpandedLuatArticleId] = useState<string | null>(null);

  const [selectedNdIds, setSelectedNdIds] = useState<string[]>([]);
  const [expandedNdArticleId, setExpandedNdArticleId] = useState<string | null>(null);

  const [selectedTtIds, setSelectedTtIds] = useState<string[]>([]);
  const [expandedTtArticleId, setExpandedTtArticleId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchQueryLuat, setSearchQueryLuat] = useState("");
  const [searchQueryNd, setSearchQueryNd] = useState("");
  const [searchQueryTt, setSearchQueryTt] = useState("");
  const [activePanes, setActivePanes] = useState<('luat' | 'nd214' | 'tt79')[]>(['luat']);

  const togglePane = (paneId: 'luat' | 'nd214' | 'tt79') => {
    setActivePanes(prev => {
      if (prev.includes(paneId)) {
        return prev.filter(id => id !== paneId);
      } else {
        // Maintain a specific order when adding: luat, nd214, tt79
        const newPanes = [...prev, paneId];
        const order = ['luat', 'nd214', 'tt79'];
        return newPanes.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      }
    });
  };

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredSearchQueryLuat = useDeferredValue(searchQueryLuat);
  const deferredSearchQueryNd = useDeferredValue(searchQueryNd);
  const deferredSearchQueryTt = useDeferredValue(searchQueryTt);

  const effectiveLuatSearch = deferredSearchQueryLuat.trim() || deferredSearchQuery.trim();
  const effectiveNdSearch = deferredSearchQueryNd.trim() || deferredSearchQuery.trim();
  const effectiveTtSearch = deferredSearchQueryTt.trim() || deferredSearchQuery.trim();

  useEffect(() => {
    const query = deferredSearchQuery.trim();
    if (query) {
      const q = query.toLowerCase();
      const hasMatch = (docData: any) => docData.chapters.some((ch: any) => 
        ch.title.toLowerCase().includes(q) ||
        (ch.sections?.some((s: any) => s.title.toLowerCase().includes(q) || s.articles.some((a: any) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)))) ||
        (ch.articles?.some((a: any) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)))
      );

      const matchLuat = hasMatch(DOCUMENTS[0]);
      const matchNd = hasMatch(nghiDinh214Data);
      const matchTt = hasMatch(thongTu79Data);

      setActivePanes(prev => {
         const newPanes = new Set(prev);
         let changed = false;
         
         if (matchLuat && !newPanes.has('luat')) { newPanes.add('luat'); changed = true; }
         if (!matchLuat && newPanes.has('luat')) { newPanes.delete('luat'); changed = true; }
         
         if (matchNd && !newPanes.has('nd214')) { newPanes.add('nd214'); changed = true; }
         if (!matchNd && newPanes.has('nd214')) { newPanes.delete('nd214'); changed = true; }
         
         if (matchTt && !newPanes.has('tt79')) { newPanes.add('tt79'); changed = true; }
         if (!matchTt && newPanes.has('tt79')) { newPanes.delete('tt79'); changed = true; }
         
         if (changed) {
            const order = ['luat', 'nd214', 'tt79'];
            return Array.from(newPanes).sort((a: any, b: any) => order.indexOf(a) - order.indexOf(b)) as ('luat' | 'nd214' | 'tt79')[];
         }
         return prev;
      });
    }
  }, [deferredSearchQuery]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showLegalBasis, setShowLegalBasis] = useState(false);

  interface BookmarkItem {
    articleId: string;
    docId: string;
    title: string;
  }

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem('legal_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('legal_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const handleToggleBookmark = (articleId: string, docId: string, title: string) => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.articleId === articleId);
      if (exists) {
        return prev.filter(b => b.articleId !== articleId);
      }
      return [...prev, { articleId, docId, title }];
    });
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Chapters with expanded sections in sidebar
  const [expandedSidebarChapters, setExpandedSidebarChapters] = useState<string[]>([]);

  // Document sections expansion in sidebar
  const [isLuatSidebarExpanded, setIsLuatSidebarExpanded] = useState(false);
  const [isNdSidebarExpanded, setIsNdSidebarExpanded] = useState(false);
  const [isTtSidebarExpanded, setIsTtSidebarExpanded] = useState(false);
  const [isBookmarksExpanded, setIsBookmarksExpanded] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  // Notes state
  const [userNotes, setUserNotes] = useState<UserNote[]>(() => {
    try {
      const saved = localStorage.getItem('legal_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('legal_notes', JSON.stringify(userNotes));
  }, [userNotes]);

  const [noteDraft, setNoteDraft] = useState<{ articleId: string, text: string, noteId?: string, noteContent?: string, color?: string } | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<{ top: number, left: number, text: string, articleId: string } | null>(null);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.selection-menu-ignore')) return;

      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setSelectionMenu(null);
          return;
        }

        const text = selection.toString().trim();
        if (!text) {
          setSelectionMenu(null);
          return;
        }

        let node = selection.anchorNode;
        let articleId = '';
        while (node && node !== document.body) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const id = el.getAttribute('data-article-id');
            if (id) {
              articleId = id;
              break;
            }
          }
          if (node.parentNode) node = node.parentNode;
          else break;
        }

        if (articleId) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelectionMenu({
            top: rect.top - 50,
            left: rect.left + rect.width / 2,
            text,
            articleId
          });
        } else {
          setSelectionMenu(null);
        }
      }, 10);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const [globalTooltip, setGlobalTooltip] = useState<{ content: string; top: number; left: number; arrowOffset: number } | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-note-tooltip]');
      if (!target) {
        setGlobalTooltip(null);
        return;
      }
      
      const content = target.getAttribute('data-note-tooltip');
      if (!content) {
        setGlobalTooltip(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      const markCenter = rect.left + rect.width / 2;
      let top = rect.top - 8;
      
      const approxTooltipWidth = 320;
      const padding = 16;
      let left = markCenter;
      left = Math.max(left, padding + approxTooltipWidth / 2);
      left = Math.min(left, window.innerWidth - padding - approxTooltipWidth / 2);

      const arrowOffset = markCenter - left;

      setGlobalTooltip({ content, top, left, arrowOffset });
    };
    
    // We also want to clear tooltip on mouse out, wait actually `mouseover` on document handles clearing if target is not a tooltip.
    // But occasionally you move out of window.
    
    const handleMouseOut = (e: MouseEvent) => {
      // If moving to an element that doesn't have the tooltip or isn't inside one
      if (e.relatedTarget && !(e.relatedTarget as HTMLElement).closest('[data-note-tooltip]')) {
         setGlobalTooltip(null);
      }
    };

    const handleScroll = () => {
      setGlobalTooltip(null);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('wheel', handleScroll, { capture: true, passive: true });
    document.addEventListener('touchmove', handleScroll, { capture: true, passive: true });
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('wheel', handleScroll, { capture: true } as any);
      document.removeEventListener('touchmove', handleScroll, { capture: true } as any);
      document.removeEventListener('scroll', handleScroll, { capture: true } as any);
    };
  }, []);

  const handleSaveNote = (note: UserNote) => {
    setUserNotes(prev => {
      const idx = prev.findIndex(n => n.id === note.id);
      if (idx >= 0) {
        const newNotes = [...prev];
        newNotes[idx] = note;
        return newNotes;
      }
      return [...prev, note];
    });
  };

  const handleDeleteNote = (noteId: string) => {
    setUserNotes(prev => prev.filter(n => n.id !== noteId));
  };

  // Sidebar Resizing
  const [sidebarWidth, setSidebarWidth] = useState(230);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth >= 220 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize as any);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize as any);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize as any);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const toggleSidebarChapter = (e: any, chapterId: string) => {
    e.stopPropagation();
    setExpandedSidebarChapters(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const handleScrollTo = (e: any, docId: string, type: 'chapter' | 'section', id: string) => {
    e.stopPropagation();
    
    // Select the chapter/section if it is not already selected so it renders
    if (docId === 'luat') {
       if (!selectedLuatIds.includes(id)) handleSelectLuat(id);
    } else if (docId === 'nd214') {
       if (!selectedNdIds.includes(id)) handleSelectNd(id);
    } else if (docId === 'tt79') {
       if (!selectedTtIds.includes(id)) handleSelectTt(id);
    }

    if (!activePanes.includes(docId as any)) {
      setActivePanes(prev => [...prev, docId as any]);
    }

    // Scroll to the element
    setTimeout(() => {
      const element = document.getElementById(`${docId}-${type}-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const handleSelectLuat = (id: string | string[], articleId?: string, noteId?: string) => {
    setActivePanes(prev => prev.includes('luat') ? prev : [...prev, 'luat']);
    if (Array.isArray(id)) {
      setSelectedLuatIds(id);
    } else {
      setSelectedLuatIds(prev => {
        if (prev.includes(id)) {
          return prev.filter(i => i !== id);
        }
        
        let newIds = [...prev];
        if (id.includes('-S')) {
          const parentChapterId = id.split('-S')[0];
          newIds = newIds.filter(i => i !== parentChapterId);
        } else {
          newIds = newIds.filter(i => !i.startsWith(`${id}-S`));
        }
        return [...newIds, id];
      });
    }
    
    if (!effectiveLuatSearch) {
      setExpandedLuatArticleId(null);
    }
    if (articleId) {
      setExpandedLuatArticleId(articleId);
      setTimeout(() => {
        if (noteId) {
          const noteEl = document.getElementById(`note-${noteId}`);
          if (noteEl) {
            noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
        const el = document.getElementById(`luat-art-${articleId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
    if (window.innerWidth < 1024 && !Array.isArray(id) && !noteId) setIsSidebarOpen(false);
  };

  const handleSelectNd = (id: string | string[], articleId?: string, noteId?: string) => {
    setActivePanes(prev => prev.includes('nd214') ? prev : [...prev, 'nd214']);
    if (Array.isArray(id)) {
      setSelectedNdIds(id);
    } else {
      setSelectedNdIds(prev => {
        if (prev.includes(id)) {
          return prev.filter(i => i !== id);
        }
        
        let newIds = [...prev];
        if (id.includes('-S')) {
          const parentChapterId = id.split('-S')[0];
          newIds = newIds.filter(i => i !== parentChapterId);
        } else {
          newIds = newIds.filter(i => !i.startsWith(`${id}-S`));
        }
        return [...newIds, id];
      });
    }

    if (!effectiveNdSearch) {
      setExpandedNdArticleId(null);
    }
    if (articleId) {
      setExpandedNdArticleId(articleId);
      setTimeout(() => {
        if (noteId) {
          const noteEl = document.getElementById(`note-${noteId}`);
          if (noteEl) {
            noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
        const el = document.getElementById(`nd214-art-${articleId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
    if (window.innerWidth < 1024 && !Array.isArray(id) && !noteId) setIsSidebarOpen(false);
  };

  const handleSelectTt = (id: string | string[], articleId?: string, noteId?: string) => {
    setActivePanes(prev => prev.includes('tt79') ? prev : [...prev, 'tt79']);
    if (Array.isArray(id)) {
      setSelectedTtIds(id);
    } else {
      setSelectedTtIds(prev => {
        if (prev.includes(id)) {
          return prev.filter(i => i !== id);
        }
        
        let newIds = [...prev];
        if (id.includes('-S')) {
          const parentChapterId = id.split('-S')[0];
          newIds = newIds.filter(i => i !== parentChapterId);
        } else {
          newIds = newIds.filter(i => !i.startsWith(`${id}-S`));
        }
        return [...newIds, id];
      });
    }

    if (!effectiveTtSearch) {
      setExpandedTtArticleId(null);
    }
    if (articleId) {
      setExpandedTtArticleId(articleId);
      setTimeout(() => {
        if (noteId) {
          const noteEl = document.getElementById(`note-${noteId}`);
          if (noteEl) {
            noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
        const el = document.getElementById(`tt79-art-${articleId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
    if (window.innerWidth < 1024 && !Array.isArray(id) && !noteId) setIsSidebarOpen(false);
  };

  return (
    <div className={`flex h-screen bg-white font-sans text-ink-900 overflow-hidden ${isResizing ? 'select-none cursor-col-resize' : ''}`} id="app-container">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ marginLeft: isSidebarOpen ? 0 : -sidebarWidth }}
        transition={{ duration: isResizing ? 0 : 0.3, ease: 'easeInOut' }}
        style={{ width: sidebarWidth }}
        className={`fixed lg:relative z-50 h-full bg-cream-100 border-r border-ink-900/5 flex flex-col shadow-2xl lg:shadow-none shrink-0 overflow-visible`}
        id="sidebar"
      >
        {/* Resize Handle */}
        <div 
          onMouseDown={startResizing}
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-deep-yellow/30 active:bg-deep-yellow/50 transition-colors z-50 hidden lg:block ${isResizing ? 'bg-deep-yellow/50' : ''}`}
        />

        <div className="p-4 border-b border-ink-900/5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0 group">
              <div className="absolute inset-0 rounded-full border-2 border-red-900/20 scale-[1.10] pointer-events-none" />
              <div className="absolute inset-0 rounded-full border border-amber-500/30 scale-105 pointer-events-none" />
              
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden relative shadow-md">
                <img src={logoBase64} alt="Logo" className="w-full h-full object-cover" />
              </div>
            </div>
            
            <h1 className="font-bold text-[15px] leading-snug text-ink-900 tracking-tight flex-1 whitespace-nowrap">Luật đấu thầu</h1>
            
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-ink-900/5 rounded-full shrink-0">
              <X size={18} />
            </button>
          </div>
          
          <p className="text-[10px] text-ink-800/50 font-medium italic tracking-wide pl-1">
            Hệ thống hỗ trợ tra cứu nhanh
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-thin">
          <div className="space-y-1">
            <button
              onClick={() => setShowLegalBasis(!showLegalBasis)}
              className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all group ${
                showLegalBasis 
                  ? 'bg-white text-ink-900 shadow-xl shadow-ink-900/5 ring-1 ring-ink-900/5' 
                  : 'bg-white/50 border border-ink-900/5 hover:bg-white hover:shadow-md text-ink-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg transition-colors bg-cream-100 text-ink-900`}>
                  <Scale size={20} strokeWidth={1.5} />
                </div>
                <span className={`font-bold transition-all ${showLegalBasis ? 'text-sm' : 'text-xs'}`}>Pháp lý</span>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-300 ${showLegalBasis ? 'rotate-180 text-slate-400' : 'text-slate-300'}`} />
            </button>
            <AnimatePresence>
              {showLegalBasis && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 space-y-4 bg-white rounded-2xl mt-1 border border-ink-900/5 shadow-sm">
                    <p className="text-[10px] text-ink-800/60 font-medium leading-relaxed italic">
                      VBHN số 74/VBHN-VPQH hợp nhất các Luật:
                    </p>
                    <ul className="space-y-4">
                      {[
                        "Luật Đấu thầu số 22/2023/QH15",
                        "Luật số 57/2024/QH15",
                        "Luật số 90/2025/QH15",
                        "Luật An ninh mạng số 116/2025/QH15",
                        "Luật Công nghệ cao số 133/2025/QH15",
                        "Luật Phục hồi, phá sản số 142/2025/QH15"
                      ].map((law, idx) => (
                        <li key={idx} className="flex gap-3 items-start">
                          <div className="mt-2 w-1.5 h-1.5 rounded-full bg-deep-yellow shrink-0" />
                          <span className="text-xs text-ink-900 font-medium leading-snug italic">
                            {law}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-px bg-ink-900/5 mx-2 my-2" />

          {/* Luật Đấu Thầu Section */}
          <div className="space-y-1">
            <button
              onClick={() => setIsLuatSidebarExpanded(!isLuatSidebarExpanded)}
              className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all group ${
                isLuatSidebarExpanded 
                  ? 'bg-white text-ink-900 shadow-xl shadow-ink-900/5 ring-1 ring-ink-900/5' 
                  : 'bg-white/50 border border-ink-900/5 hover:bg-white hover:shadow-md text-ink-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg transition-colors bg-cream-100 text-ink-900`}>
                  <Gavel size={20} strokeWidth={1.5} />
                </div>
                <span className={`font-bold transition-all ${isLuatSidebarExpanded ? 'text-sm' : 'text-xs'}`}>Luật Đấu Thầu</span>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-300 ${isLuatSidebarExpanded ? 'rotate-180 text-slate-400' : 'text-slate-300'}`} />
            </button>

            <AnimatePresence>
              {isLuatSidebarExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="pl-2 pr-0 pt-2 pb-1">
                    {DOCUMENTS.filter(d => d.id === 'luat').map((doc) => {
                      const filteredChapters = effectiveLuatSearch 
                        ? doc.chapters.filter(ch => 
                            ch.title.toLowerCase().includes(effectiveLuatSearch.toLowerCase()) || 
                            (ch.sections?.some(s => s.title.toLowerCase().includes(effectiveLuatSearch.toLowerCase()))) ||
                            (ch.articles?.some(a => a.title.toLowerCase().includes(effectiveLuatSearch.toLowerCase()) || a.content.toLowerCase().includes(effectiveLuatSearch.toLowerCase()))) ||
                            (ch.sections?.some(s => s.articles.some(a => a.title.toLowerCase().includes(effectiveLuatSearch.toLowerCase()) || a.content.toLowerCase().includes(effectiveLuatSearch.toLowerCase()))))
                          )
                        : doc.chapters;

                      return (
                        <div key={doc.id} className="space-y-1">
                          <button
                            onClick={() => {
                              const allIds = doc.chapters.map(ch => ch.id);
                              const isAll = allIds.every(id => selectedLuatIds.includes(id));
                              handleSelectLuat(isAll ? [] : allIds);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest text-deep-yellow-dark hover:bg-deep-yellow/5 mb-1 flex items-center gap-2"
                          >
                            <Filter size={10} />
                            {doc.chapters.every(ch => selectedLuatIds.includes(ch.id)) ? "Bỏ chọn tất cả" : "Chọn tất cả chương"}
                          </button>

                          {filteredChapters.map((chapter) => {
                            const isSelected = selectedLuatIds.includes(chapter.id);
                            const isExpanded = expandedSidebarChapters.includes(chapter.id);
                            const hasSections = chapter.sections && chapter.sections.length > 0;

                            return (
                              <div key={chapter.id} className="mb-1.5">
                                <button
                                  onClick={() => handleSelectLuat(chapter.id)}
                                  className={`w-full text-left pr-8 pl-2 py-2 rounded-xl text-[11px] transition-all duration-300 flex items-center gap-2 group relative ${
                                    isSelected && !effectiveLuatSearch
                                      ? 'bg-yellow-400 text-slate-900 font-bold shadow-md shadow-yellow-400/40'
                                      : 'text-ink-800 hover:bg-ink-900/5 font-semibold'
                                  }`}
                                >
                                  <div 
                                     className="p-1 rounded-md shrink-0 transition-colors"
                                     onClick={hasSections ? (e) => toggleSidebarChapter(e, chapter.id) : undefined}
                                  >
                                    <ChevronRight 
                                      size={12} 
                                      className={`transition-transform duration-300 ${isSelected ? 'text-slate-900' : 'text-slate-400'} ${isExpanded ? 'rotate-90' : ''} ${!hasSections ? 'opacity-0' : ''}`} 
                                    />
                                  </div>
                                  <span className="text-[11px] tracking-tight leading-snug whitespace-normal break-words py-0.5">{chapter.title.split(':')[0] || chapter.title}</span>
                                  <div 
                                     className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-black/10 rounded-md text-slate-500 hover:text-blue-700"
                                     onClick={(e) => handleScrollTo(e, 'luat', 'chapter', chapter.id)}
                                     title="Chuyển đến"
                                  >
                                     <Target size={14} />
                                  </div>
                                </button>
                                
                                <AnimatePresence>
                                  {hasSections && isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="bg-ink-900/5 mx-2 rounded-xl overflow-hidden mt-1"
                                    >
                                      <div className="px-2 py-1.5 space-y-0.5">
                                        {chapter.sections!.map((section) => {
                                          const isSectionSelected = selectedLuatIds.includes(section.id);
                                          return (
                                            <div key={section.id} className="relative group/sec">
                                              <button
                                                onClick={() => handleSelectLuat(section.id)}
                                                className={`w-full text-left pr-6 pl-3 py-1.5 rounded-lg text-[9px] transition-all duration-200 block font-medium whitespace-normal break-words ${
                                                  isSectionSelected && !effectiveLuatSearch
                                                    ? 'text-deep-yellow-dark font-black bg-white shadow-sm'
                                                    : 'text-ink-800/60 hover:text-ink-900 hover:bg-white/50'
                                                }`}
                                              >
                                                {section.title}
                                              </button>
                                              <div 
                                                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/sec:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded-md text-slate-400 hover:text-blue-700 cursor-pointer"
                                                onClick={(e) => handleScrollTo(e, 'luat', 'section', section.id)}
                                                title="Chuyển đến"
                                              >
                                                <Target size={12} />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Nghị định 214 Section */}
          <div className="space-y-1">
            <button
              onClick={() => setIsNdSidebarExpanded(!isNdSidebarExpanded)}
              className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all group ${
                isNdSidebarExpanded 
                  ? 'bg-white text-ink-900 shadow-xl shadow-ink-900/5 ring-1 ring-ink-900/5' 
                  : 'bg-white/50 border border-ink-900/5 hover:bg-white hover:shadow-md text-ink-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg transition-colors bg-cream-100 text-ink-900`}>
                  <ClipboardCheck size={20} strokeWidth={1.5} />
                </div>
                <span className={`font-bold transition-all ${isNdSidebarExpanded ? 'text-sm' : 'text-xs'}`}>Nghị định 214</span>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-300 ${isNdSidebarExpanded ? 'rotate-180 text-slate-400' : 'text-slate-300'}`} />
            </button>

            <AnimatePresence>
              {isNdSidebarExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="pl-2 pr-0 pt-2 pb-10">
                    {(() => {
                      const allNdChapters = nghiDinh214Data.chapters.map(ch => ch.id);
                      const isAllNdSelected = allNdChapters.length > 0 && allNdChapters.every(id => selectedNdIds.includes(id));

                      const filteredNdChapters = effectiveNdSearch 
                        ? nghiDinh214Data.chapters.filter(ch => 
                            ch.title.toLowerCase().includes(effectiveNdSearch.toLowerCase()) || 
                            (ch.articles?.some(a => a.title.toLowerCase().includes(effectiveNdSearch.toLowerCase()) || a.content.toLowerCase().includes(effectiveNdSearch.toLowerCase())))
                          )
                        : nghiDinh214Data.chapters;

                      return (
                        <div className="space-y-1">
                          <button
                            onClick={() => handleSelectNd(isAllNdSelected ? [] : allNdChapters)}
                            className="w-full text-left px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest text-deep-yellow-dark hover:bg-deep-yellow/5 mb-1 flex items-center gap-2"
                          >
                            <Filter size={10} />
                            {isAllNdSelected ? "Bỏ chọn tất cả" : "Chọn tất cả chương"}
                          </button>

                          {filteredNdChapters.map((chapter) => {
                            const isSelected = selectedNdIds.includes(chapter.id);
                            
                            return (
                              <div key={chapter.id} className="mb-1.5">
                                <button
                                  onClick={() => handleSelectNd(chapter.id)}
                                  className={`w-full text-left pr-8 pl-2 py-2 rounded-xl text-[11px] transition-all duration-300 flex items-center gap-2 group relative ${
                                    isSelected && !effectiveNdSearch
                                      ? 'bg-yellow-400 text-slate-900 font-bold shadow-md shadow-yellow-400/40'
                                      : 'text-ink-800 hover:bg-ink-900/5 font-semibold'
                                  }`}
                                >
                                  <div className="p-1 rounded-md shrink-0">
                                    <ChevronRight size={12} className={`transition-transform opacity-0`} />
                                  </div>
                                  <span className="text-[11px] tracking-tight leading-snug whitespace-normal break-words py-0.5">{chapter.title}</span>
                                  <div 
                                     className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-black/10 rounded-md text-slate-500 hover:text-blue-700"
                                     onClick={(e) => handleScrollTo(e, 'nd214', 'chapter', chapter.id)}
                                     title="Chuyển đến"
                                  >
                                     <Target size={14} />
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Thông tư 79 Section */}
          <div className="space-y-1">
            <button
              onClick={() => setIsTtSidebarExpanded(!isTtSidebarExpanded)}
              className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all group ${
                isTtSidebarExpanded 
                  ? 'bg-white text-ink-900 shadow-xl shadow-ink-900/5 ring-1 ring-ink-900/5' 
                  : 'bg-white/50 border border-ink-900/5 hover:bg-white hover:shadow-md text-ink-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg transition-colors bg-cream-100 text-ink-900`}>
                  <BookOpen size={20} strokeWidth={1.5} />
                </div>
                <span className={`font-bold transition-all ${isTtSidebarExpanded ? 'text-sm' : 'text-xs'}`}>Thông tư 79</span>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-300 ${isTtSidebarExpanded ? 'rotate-180 text-slate-400' : 'text-slate-300'}`} />
            </button>

            <AnimatePresence>
              {isTtSidebarExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="pl-2 pr-0 pt-2 pb-10">
                    {(() => {
                      const allTtChapters = thongTu79Data.chapters.map(ch => ch.id);
                      const isAllTtSelected = allTtChapters.length > 0 && allTtChapters.every(id => selectedTtIds.includes(id));

                      const filteredTtChapters = effectiveTtSearch 
                        ? thongTu79Data.chapters.filter(ch => 
                            ch.title.toLowerCase().includes(effectiveTtSearch.toLowerCase()) || 
                            (ch.articles?.some(a => a.title.toLowerCase().includes(effectiveTtSearch.toLowerCase()) || a.content.toLowerCase().includes(effectiveTtSearch.toLowerCase())))
                          )
                        : thongTu79Data.chapters;

                      return (
                        <div className="space-y-1">
                          <button
                            onClick={() => handleSelectTt(isAllTtSelected ? [] : allTtChapters)}
                            className="w-full text-left px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest text-deep-yellow-dark hover:bg-deep-yellow/5 mb-1 flex items-center gap-2"
                          >
                            <Filter size={10} />
                            {isAllTtSelected ? "Bỏ chọn tất cả" : "Chọn tất cả chương"}
                          </button>

                          {filteredTtChapters.map((chapter) => {
                            const isSelected = selectedTtIds.includes(chapter.id);
                            
                            return (
                              <div key={chapter.id} className="mb-1.5">
                                <button
                                  onClick={() => handleSelectTt(chapter.id)}
                                  className={`w-full text-left pr-8 pl-2 py-2 rounded-xl text-[11px] transition-all duration-300 flex items-center gap-2 group relative ${
                                    isSelected && !effectiveTtSearch
                                      ? 'bg-yellow-400 text-slate-900 font-bold shadow-md shadow-yellow-400/40'
                                      : 'text-ink-800 hover:bg-ink-900/5 font-semibold'
                                  }`}
                                >
                                  <div className="p-1 rounded-md shrink-0">
                                    <ChevronRight size={12} className={`transition-transform opacity-0`} />
                                  </div>
                                  <span className="text-[11px] tracking-tight leading-snug whitespace-normal break-words py-0.5">{chapter.title}</span>
                                  <div 
                                     className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-black/10 rounded-md text-slate-500 hover:text-blue-700"
                                     onClick={(e) => handleScrollTo(e, 'tt79', 'chapter', chapter.id)}
                                     title="Chuyển đến"
                                  >
                                     <Target size={14} />
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="h-px bg-ink-900/5 mx-2 my-2" />

          {/* Bookmarks Section */}
          <div className="space-y-1">
            <button
              onClick={() => setIsBookmarksExpanded(!isBookmarksExpanded)}
              className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all group ${
                isBookmarksExpanded 
                  ? 'bg-white text-ink-900 shadow-xl shadow-ink-900/5 ring-1 ring-ink-900/5' 
                  : 'bg-white/50 border border-ink-900/5 hover:bg-white hover:shadow-md text-ink-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg transition-colors bg-cream-100 text-rose-500`}>
                  <Bookmark size={16} fill="currentColor" />
                </div>
                <span className={`font-bold transition-all ${isBookmarksExpanded ? 'text-sm' : 'text-xs'}`}>Đã lưu ({bookmarks.length})</span>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-300 ${isBookmarksExpanded ? 'rotate-180 text-slate-400' : 'text-slate-300'}`} />
            </button>

            <AnimatePresence>
              {isBookmarksExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="pl-4 pr-0 pt-2 pb-1 space-y-2">
                    {bookmarks.length > 0 ? (
                      bookmarks.map(b => (
                        <div key={b.articleId} className="flex items-start gap-2 group">
                          <button
                            onClick={() => {
                              if (b.docId === 'luat') {
                                setActivePanes(prev => prev.includes('luat') ? prev : [...prev, 'luat'].sort((a,b) => ['luat','nd214','tt79'].indexOf(a) - ['luat','nd214','tt79'].indexOf(b)));
                                handleSelectLuat([], b.articleId);
                              }
                              else if (b.docId === 'nd214') {
                                setActivePanes(prev => prev.includes('nd214') ? prev : [...prev, 'nd214'].sort((a,b) => ['luat','nd214','tt79'].indexOf(a) - ['luat','nd214','tt79'].indexOf(b)));
                                handleSelectNd([], b.articleId);
                              }
                              else if (b.docId === 'tt79') {
                                setActivePanes(prev => prev.includes('tt79') ? prev : [...prev, 'tt79'].sort((a,b) => ['luat','nd214','tt79'].indexOf(a) - ['luat','nd214','tt79'].indexOf(b)));
                                handleSelectTt([], b.articleId);
                              }
                            }}
                            className="flex-1 text-left py-1.5 px-2 rounded-xl hover:bg-white border border-transparent hover:border-ink-900/5 hover:shadow-sm transition-all"
                          >
                            <div className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-0.5">
                              {b.docId === 'luat' ? 'Luật ĐT' : b.docId === 'nd214' ? 'NĐ 214' : 'TT 79'}
                            </div>
                            <div className="text-[11px] font-semibold text-ink-900 line-clamp-2 leading-snug">
                              {b.title}
                            </div>
                          </button>
                          <button
                            onClick={() => handleToggleBookmark(b.articleId, b.docId, b.title)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg mt-1 transition-colors"
                            title="Xóa khỏi đã lưu"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-xs italic text-slate-400">Bạn chưa lưu điều luật nào.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-px bg-ink-900/5 mx-2 my-2" />

          {/* Notes Section */}
          <div className="space-y-1">
            <button
              onClick={() => setIsNotesExpanded(!isNotesExpanded)}
              className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all group ${
                isNotesExpanded 
                  ? 'bg-white text-ink-900 shadow-xl shadow-ink-900/5 ring-1 ring-ink-900/5' 
                  : 'bg-white/50 border border-ink-900/5 hover:bg-white hover:shadow-md text-ink-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg transition-colors bg-cream-100 text-deep-yellow`}>
                  <Pencil size={16} fill="currentColor" />
                </div>
                <span className={`font-bold transition-all ${isNotesExpanded ? 'text-sm' : 'text-xs'}`}>Ghi chú ({userNotes.length})</span>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-300 ${isNotesExpanded ? 'rotate-180 text-slate-400' : 'text-slate-300'}`} />
            </button>

            <AnimatePresence>
              {isNotesExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="pl-4 pr-0 pt-2 pb-1 space-y-2">
                    {userNotes.length > 0 ? (
                      userNotes.map(n => (
                        <div key={n.id} className="flex items-start gap-2 group">
                          <button
                            onClick={() => {
                              let docId = 'luat';
                              if (n.articleId.includes('nd214')) docId = 'nd214';
                              if (n.articleId.includes('tt79')) docId = 'tt79';
                              
                              if (docId === 'luat') {
                                setActivePanes(prev => prev.includes('luat') ? prev : [...prev, 'luat'].sort((a,b) => ['luat','nd214','tt79'].indexOf(a) - ['luat','nd214','tt79'].indexOf(b)));
                                handleSelectLuat([], n.articleId, n.id);
                              }
                              else if (docId === 'nd214') {
                                setActivePanes(prev => prev.includes('nd214') ? prev : [...prev, 'nd214'].sort((a,b) => ['luat','nd214','tt79'].indexOf(a) - ['luat','nd214','tt79'].indexOf(b)));
                                handleSelectNd([], n.articleId, n.id);
                              }
                              else if (docId === 'tt79') {
                                setActivePanes(prev => prev.includes('tt79') ? prev : [...prev, 'tt79'].sort((a,b) => ['luat','nd214','tt79'].indexOf(a) - ['luat','nd214','tt79'].indexOf(b)));
                                handleSelectTt([], n.articleId, n.id);
                              }
                            }}
                            className="flex-1 text-left py-1.5 px-2 rounded-xl hover:bg-white border border-transparent hover:border-ink-900/5 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: n.color === 'yellow' ? '#fef08a' : n.color === 'green' ? '#bbf7d0' : n.color === 'blue' ? '#bfdbfe' : n.color === 'pink' ? '#fbcfe8' : n.color === 'purple' ? '#e9d5ff' : '#fef08a' }} />
                               <div className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                                 {n.articleId.includes('luat') || n.articleId.startsWith('LDT') ? 'Luật ĐT' : n.articleId.includes('nd214') ? 'NĐ 214' : 'TT 79'}
                               </div>
                            </div>
                            <div className="text-[11px] font-semibold text-ink-900 line-clamp-2 leading-snug">
                              {n.note || `"${n.text}"`}
                            </div>
                          </button>
                          <button
                            onClick={() => handleDeleteNote(n.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg mt-1 transition-colors"
                            title="Xóa ghi chú"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-xs italic text-slate-400">Bạn chưa có ghi chú nào.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="p-4 border-t border-ink-900/5 mt-auto flex flex-col gap-3">
          <button 
            onClick={() => setShowDocumentModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-white border border-ink-900/5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-ink-800 hover:bg-cream-50 transition-all shadow-sm hover:shadow-md"
          >
            <FolderOpen size={18} fill="#facc15" stroke="currentColor" />
            Tài liệu
          </button>
          <button 
            onClick={() => setShowDisclaimer(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-white border border-ink-900/5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-ink-800 hover:bg-cream-50 transition-all shadow-sm hover:shadow-md"
          >
            <AlertCircle size={18} fill="#facc15" stroke="currentColor" />
            Miễn trừ
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header 
          className="shrink-0 bg-cream-100 backdrop-blur-xl border-b border-ink-900/5 p-4 lg:py-4 lg:px-6 flex items-center gap-4 lg:gap-6 z-30 relative"
        >
          {/* Decorative Snowflakes */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {[...Array(24)].map((_, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0.1, scale: 0.5 }}
                animate={{ 
                  opacity: [0.1, 0.3, 0.1],
                  scale: [1, 1.2, 1],
                  y: [0, 10, 0]
                }}
                transition={{
                  duration: Math.random() * 5 + 5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: Math.random() * 5
                }}
                className="absolute text-deep-yellow/20 blur-[0.5px]"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              >
                <Snowflake size={Math.random() * 15 + 10} strokeWidth={1.5} />
              </motion.div>
            ))}
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-3 bg-white border border-ink-900/5 shadow-sm hover:shadow-md hover:bg-cream-50 rounded-2xl shrink-0 transition-all z-20 text-ink-900"
          >
            <Menu size={24} />
          </button>

          <div className={`flex-1 relative flex gap-3 z-10 transition-all duration-500 w-full max-w-4xl`}>
            <AutocompleteInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Tìm kiếm chương, điều, nội dung..."
              className="w-full pl-12 pr-6 py-2.5 bg-white border border-ink-900/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-deep-yellow/10 focus:border-deep-yellow/50 transition-all text-sm shadow-sm text-ink-900 font-medium placeholder:text-slate-400"
              containerClassName="flex-1 group"
              iconSize={18}
              showClear={false}
            />
            {searchQuery && (
               <button 
                 onClick={() => setSearchQuery("")}
                 className="bg-deep-yellow hover:bg-deep-yellow-hover px-4 py-2 rounded-xl font-bold text-xs text-white transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-deep-yellow/20"
               >
                 <ArrowLeft size={14} />
                 <span className="hidden sm:inline">Xóa tìm kiếm</span>
               </button>
            )}
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-4 py-2 rounded-xl font-bold text-xs text-white transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-500/20"
                title="Tải ứng dụng về máy"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Tải App</span>
              </button>
            )}
          </div>
        </header>

        {/* View Switcher */}
        <div className="flex items-center justify-center pt-2 pb-1 lg:pt-3 lg:pb-0 shrink-0 z-20">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl shadow-lg overflow-x-auto no-scrollbar max-w-full mx-4 lg:mx-0">
             <button
                onClick={() => togglePane('luat')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border border-transparent ${activePanes.includes('luat') ? 'bg-yellow-400 text-slate-900 shadow-md shadow-yellow-400/20' : 'bg-white text-slate-400 hover:text-slate-500 border-white/10'}`}
             >
                <Gavel size={16} strokeWidth={1.5} className={activePanes.includes('luat') ? 'text-slate-900' : 'text-slate-400'} />
                Luật Đấu Thầu
             </button>
             <button
                onClick={() => togglePane('nd214')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border border-transparent ${activePanes.includes('nd214') ? 'bg-yellow-400 text-slate-900 shadow-md shadow-yellow-400/20' : 'bg-white text-slate-400 hover:text-slate-500 border-white/10'}`}
             >
                <ClipboardCheck size={16} strokeWidth={1.5} className={activePanes.includes('nd214') ? 'text-slate-900' : 'text-slate-400'} />
                Nghị định 214
             </button>
             <button
                onClick={() => togglePane('tt79')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border border-transparent ${activePanes.includes('tt79') ? 'bg-yellow-400 text-slate-900 shadow-md shadow-yellow-400/20' : 'bg-white text-slate-400 hover:text-slate-500 border-white/10'}`}
             >
                <BookOpen size={16} strokeWidth={1.5} className={activePanes.includes('tt79') ? 'text-slate-900' : 'text-slate-400'} />
                Thông tư 79
             </button>

             {(activePanes.length < 3 || activePanes.length === 0) && (
               <>
                  <div className="w-px h-4 bg-slate-700 mx-1"></div>
                  <button
                     onClick={() => setActivePanes(['luat', 'nd214', 'tt79'])}
                     className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 bg-white text-slate-400 hover:text-slate-500 border border-white/10"
                  >
                     <Menu size={12} className="text-slate-400" />
                     Quay lại mặc định
                  </button>
               </>
             )}
          </div>
        </div>

        {/* Triple Panes */}
        <div className={`flex-1 flex overflow-hidden z-10 gap-0 lg:gap-4 px-0 pb-0 ${isSidebarOpen ? 'lg:px-4 lg:pb-4 pt-2' : 'lg:px-8 lg:pb-8 pt-2 lg:pt-3'} transition-all duration-500 ease-in-out flex-col lg:flex-row relative mx-auto w-full max-w-[1920px]`}>
           
           {activePanes.length === 0 ? (
             <div className="flex-1 flex items-center justify-center bg-white/50 backdrop-blur-sm lg:rounded-2xl border border-white/20">
               <div className="text-center p-8 max-w-md">
                 <div className="w-16 h-16 bg-deep-yellow/10 text-deep-yellow-dark rounded-full flex items-center justify-center mx-auto mb-4">
                   <BookOpen size={32} strokeWidth={1.5} />
                 </div>
                 <h3 className="text-lg font-bold text-ink-900 mb-2">Chưa chọn văn bản nào</h3>
                 <p className="text-slate-500 text-sm">Vui lòng chọn ít nhất một văn bản ở thanh công cụ phía trên để xem nội dung hoặc nhập từ khóa tìm kiếm.</p>
               </div>
             </div>
           ) : (
             <>
               {/* Left Pane: Luật đấu thầu */}
               <AnimatePresence mode="wait">
                 {activePanes.includes('luat') && (
                   <motion.div 
                     layout
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     transition={{ duration: 0.3, ease: 'easeInOut' }}
                     className={`flex-1 min-w-0 h-full relative lg:rounded-2xl flex flex-col min-h-[50vh] lg:min-h-0 lg:border lg:border-white/10 lg:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] bg-slate-900 ${activePanes.length === 1 ? 'max-w-full' : ''}`}
                   >
             <div className="bg-slate-800/90 backdrop-blur py-3 px-4 lg:px-6 border-b border-white/5 font-bold text-white flex items-center justify-between gap-4 z-20 lg:rounded-t-2xl">
                 <div className="flex items-center gap-2 shrink-0">
                   <Gavel size={18} strokeWidth={1.5} className="text-amber-400" />
                   <span className="hidden sm:inline">Luật Đấu Thầu</span>
                 </div>
                 {/*  Search bar here */}
                 <AutocompleteInput
                   value={searchQueryLuat}
                   onChange={setSearchQueryLuat}
                   placeholder="Tìm trong Luật..."
                   className="w-full pl-9 pr-8 py-1.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all text-xs shadow-sm text-white font-normal placeholder:text-slate-500"
                   containerClassName="flex-1 max-w-sm group"
                   iconSize={14}
                   dark={true}
                 />
             </div>
             <div className="flex-1 overflow-hidden relative lg:rounded-b-2xl">
               <DocumentPane 
                  docData={DOCUMENTS[0]} 
                  allArticles={allLawArticles} 
                  selectedIds={selectedLuatIds}
                  expandedArticleId={expandedLuatArticleId}
                  searchQuery={effectiveLuatSearch}
                  onSelect={handleSelectLuat}
                  onToggleArticle={(id) => setExpandedLuatArticleId(prev => prev === id ? null : id)}
                  onClearSearch={() => {
                    setSearchQueryLuat("");
                    setSearchQuery("");
                  }}
                  isSidebarOpen={isSidebarOpen}
                  bookmarkedIds={bookmarks.map(b => b.articleId)}
                  onToggleBookmark={(id, title) => handleToggleBookmark(id, 'luat', title)}
                  userNotes={userNotes}
                  onNoteClick={(text, articleId, noteId) => setNoteDraft({ articleId, text, noteId, noteContent: userNotes.find(n => n.id === noteId)?.note, color: userNotes.find(n => n.id === noteId)?.color })}
               />
             </div>
           </motion.div>
             )}
           </AnimatePresence>

           {/* Right Pane: Nghị định 214 */}
           <AnimatePresence mode="wait">
             {activePanes.includes('nd214') && (
               <motion.div 
                 layout
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 transition={{ duration: 0.3, ease: 'easeInOut' }}
                 className={`flex-1 min-w-0 h-full relative lg:rounded-2xl flex flex-col min-h-[50vh] lg:min-h-0 bg-slate-900 lg:border lg:border-white/10 lg:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] ${activePanes.length === 1 ? 'max-w-full' : ''}`}
               >
                 <div className="bg-slate-800/90 backdrop-blur py-3 px-4 lg:px-6 border-b border-white/5 font-bold text-white flex items-center justify-between gap-4 z-20 lg:rounded-t-2xl">
                 <div className="flex items-center gap-2 shrink-0">
                   <ClipboardCheck size={18} strokeWidth={1.5} className="text-amber-400" />
                   <span className="hidden sm:inline">Nghị định 214</span>
                 </div>
                 {/*  Search bar here */}
                 <AutocompleteInput
                   value={searchQueryNd}
                   onChange={setSearchQueryNd}
                   placeholder="Tìm trong Nghị định..."
                   className="w-full pl-9 pr-8 py-1.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all text-xs shadow-sm text-white font-normal placeholder:text-slate-500"
                   containerClassName="flex-1 max-w-sm group"
                   iconSize={14}
                   dark={true}
                 />
             </div>
             <div className="flex-1 overflow-hidden relative lg:rounded-b-2xl">
               <DocumentPane 
                  docData={nghiDinh214Data} 
                  allArticles={allNd214Articles} 
                  selectedIds={selectedNdIds}
                  expandedArticleId={expandedNdArticleId}
                  searchQuery={effectiveNdSearch}
                  onSelect={handleSelectNd}
                  onToggleArticle={(id) => setExpandedNdArticleId(prev => prev === id ? null : id)}
                  onClearSearch={() => {
                    setSearchQueryNd("");
                    setSearchQuery("");
                  }}
                  isSidebarOpen={isSidebarOpen}
                  bookmarkedIds={bookmarks.map(b => b.articleId)}
                  onToggleBookmark={(id, title) => handleToggleBookmark(id, 'nd214', title)}
                  userNotes={userNotes}
                  onNoteClick={(text, articleId, noteId) => setNoteDraft({ articleId, text, noteId, noteContent: userNotes.find(n => n.id === noteId)?.note, color: userNotes.find(n => n.id === noteId)?.color })}
               />
             </div>
           </motion.div>
             )}
           </AnimatePresence>

           {/* Right Pane: Thông tư 79 */}
           <AnimatePresence mode="wait">
             {activePanes.includes('tt79') && (
               <motion.div 
                 layout
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 transition={{ duration: 0.3, ease: 'easeInOut' }}
                 className={`flex-1 min-w-0 h-full relative lg:rounded-2xl flex flex-col min-h-[50vh] lg:min-h-0 bg-slate-900 lg:border lg:border-white/10 lg:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] ${activePanes.length === 1 ? 'max-w-full' : ''}`}
               >
                 <div className="bg-slate-800/90 backdrop-blur py-3 px-4 lg:px-6 border-b border-white/5 font-bold text-white flex items-center justify-between gap-4 z-20 lg:rounded-t-2xl">
                 <div className="flex items-center gap-2 shrink-0">
                   <BookOpen size={18} strokeWidth={1.5} className="text-amber-400" />
                   <span className="hidden sm:inline">Thông tư 79</span>
                 </div>
                 {/*  Search bar here */}
                 <AutocompleteInput
                   value={searchQueryTt}
                   onChange={setSearchQueryTt}
                   placeholder="Tìm trong Thông tư..."
                   className="w-full pl-9 pr-8 py-1.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all text-xs shadow-sm text-white font-normal placeholder:text-slate-500"
                   containerClassName="flex-1 max-w-sm group"
                   iconSize={14}
                   dark={true}
                 />
             </div>
             <div className="flex-1 overflow-hidden relative lg:rounded-b-2xl">
               <DocumentPane 
                  docData={thongTu79Data} 
                  allArticles={allTt79Articles} 
                  selectedIds={selectedTtIds}
                  expandedArticleId={expandedTtArticleId}
                  searchQuery={effectiveTtSearch}
                  onSelect={handleSelectTt}
                  onToggleArticle={(id) => setExpandedTtArticleId(prev => prev === id ? null : id)}
                  onClearSearch={() => {
                    setSearchQueryTt("");
                    setSearchQuery("");
                  }}
                  isSidebarOpen={isSidebarOpen}
                  bookmarkedIds={bookmarks.map(b => b.articleId)}
                  onToggleBookmark={(id, title) => handleToggleBookmark(id, 'tt79', title)}
                  userNotes={userNotes}
                  onNoteClick={(text, articleId, noteId) => setNoteDraft({ articleId, text, noteId, noteContent: userNotes.find(n => n.id === noteId)?.note, color: userNotes.find(n => n.id === noteId)?.color })}
               />
             </div>
           </motion.div>
             )}
           </AnimatePresence>

         </>
           )}
        </div>
      </div>

      {/* Disclaimer Modal */}
      <AnimatePresence>
        {showDisclaimer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDisclaimer(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl mx-4"
            >
              <button 
                onClick={() => setShowDisclaimer(false)}
                className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
              <div className="w-12 h-12 mx-auto bg-amber-100 text-slate-800 rounded-2xl flex items-center justify-center mb-5">
                <AlertCircle size={24} fill="#facc15" stroke="currentColor" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 tracking-tight text-center">Miễn trừ</h2>
              <div className="text-slate-600 leading-relaxed text-[13px] text-justify italic space-y-2.5 font-medium px-1">
                <p>• Dữ liệu được trích xuất nguyên bản từ hệ thống văn bản pháp luật hiện hành. Tuy nhiên, ứng dụng chỉ mang tính chất hỗ trợ tra cứu nhanh.</p>
                <p>• Chúng tôi không chịu trách nhiệm đối với bất kỳ thiệt hại hoặc hệ quả pháp lý nào phát sinh từ việc người dùng tự ý ra quyết định dựa trên thông tin tại đây.</p>
                <p>• Để đảm bảo tính pháp lý tuyệt đối khi áp dụng vào thực tế, vui lòng đối chiếu với văn bản chính thức được ban hành bởi cơ quan Nhà nước có thẩm quyền.</p>
              </div>
              <button 
                onClick={() => setShowDisclaimer(false)}
                className="mt-6 w-full bg-slate-900 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
              >
                Tôi đã hiểu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Modal */}
      <AnimatePresence>
        {showDocumentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDocumentModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl mx-4 text-center"
            >
              <button 
                onClick={() => setShowDocumentModal(false)}
                className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
               >
                <X size={18} />
              </button>
              <div className="w-12 h-12 mx-auto bg-amber-100 text-slate-800 rounded-2xl flex items-center justify-center mb-5">
                <FolderOpen size={24} fill="#facc15" stroke="currentColor" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 tracking-tight">Tài liệu</h2>
              <div className="text-slate-600 leading-relaxed text-[14px] flex flex-col items-center space-y-4 font-medium px-1">
                <p>
                  Tải tài liệu tại: <a href="https://drive.google.com/drive/folders/1LZq_bi3N-0ymBm1veG84-wzK_TNVbXg5?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline">Google Drive</a>
                </p>
                <p>Hoặc quét mã QR bên dưới:</p>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <QRCodeSVG 
                    value="https://drive.google.com/drive/folders/1LZq_bi3N-0ymBm1veG84-wzK_TNVbXg5?usp=sharing" 
                    size={160} 
                    imageSettings={{
                      src: "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg",
                      x: undefined,
                      y: undefined,
                      height: 32,
                      width: 32,
                      excavate: true,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectionMenu && (
        <div 
          className="fixed z-[90] selection-menu-ignore shadow-2xl rounded-full px-3 py-2 bg-[#0f172a] text-white flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200 border border-white/10"
          style={{ top: selectionMenu.top, left: selectionMenu.left, transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center gap-2.5">
            {[
              { id: 'yellow', hex: '#fef08a' },
              { id: 'green', hex: '#bbf7d0' },
              { id: 'blue', hex: '#bfdbfe' },
              { id: 'pink', hex: '#fbcfe8' },
              { id: 'purple', hex: '#e9d5ff' }
            ].map((c, i) => (
              <button 
                key={c.id}
                onClick={() => {
                  handleSaveNote({
                    id: Date.now().toString(),
                    articleId: selectionMenu.articleId,
                    text: selectionMenu.text,
                    note: '',
                    color: c.id
                  });
                  setSelectionMenu(null);
                  window.getSelection()?.removeAllRanges();
                }}
                className={`w-[26px] h-[26px] rounded-full transition-all hover:scale-110 border-[3px] border-[#0f172a] ring-2 ${i === 0 ? 'ring-[#fef08a]/60' : 'ring-transparent hover:ring-white/30'}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <div className="w-[1px] h-5 bg-white/20 ml-0.5 mr-0.5"></div>
          <button
            onClick={() => {
              setNoteDraft({ articleId: selectionMenu.articleId, text: selectionMenu.text, color: 'yellow' });
              setSelectionMenu(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="flex items-center gap-2 pr-2 pl-0.5 hover:text-white/80 transition-colors text-sm font-semibold text-white whitespace-nowrap"
          >
            <Pencil size={15} />
            Ghi chú
          </button>
        </div>
      )}

      {globalTooltip && (
        <div 
          className="fixed z-[100] translate-x-[-50%] translate-y-[-100%] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ top: globalTooltip.top, left: globalTooltip.left }}
        >
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 text-pink-700 text-[13px] p-3 rounded-2xl shadow-xl shadow-pink-500/20 border-2 border-pink-200 relative px-4 font-bold flex items-center gap-2 leading-tight w-max max-w-xs">
            <MessageCircleHeart size={18} className="shrink-0 -mt-0.5 text-pink-500" />
            <span className="whitespace-pre-wrap">{globalTooltip.content}</span>
            <div className="absolute top-full -mt-[2px] border-[8px] border-transparent border-t-pink-200" style={{ left: `calc(50% + ${globalTooltip.arrowOffset}px)`, transform: 'translateX(-50%)' }} />
            <div className="absolute top-full -mt-[5px] border-[8px] border-transparent border-t-pink-100" style={{ left: `calc(50% + ${globalTooltip.arrowOffset}px)`, transform: 'translateX(-50%)' }} />
          </div>
        </div>
      )}

      <NoteModal 
        isOpen={!!noteDraft}
        onClose={() => setNoteDraft(null)}
        initialData={noteDraft}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
      />
    </div>
  );
}
