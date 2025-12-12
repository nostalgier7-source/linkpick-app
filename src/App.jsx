import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, LayoutGrid, CheckCircle, Trash2, ExternalLink, 
  Folder, Tag, Clock, MoreHorizontal, Sparkles, BookOpen, 
  PlayCircle, Briefcase, Coffee, Archive, AlertTriangle, 
  Settings, X, Edit2, FolderPlus, RefreshCw, Loader2, 
  ChevronDown, Smartphone 
} from 'lucide-react';

// ==================================================================================
// ★ 중요: 여기에 구글 앱스 스크립트 배포 주소를 넣으세요
const GOOGLE_SCRIPT_URL = "[https://script.google.com/macros/s/AKfycbyuyJmLSOcPcWhvyVbXLSegPgss92Gt3lEZ2VgI93smVfMrB8HO0kdOYU89J40PfgwvuQ/exec](https://script.google.com/macros/s/AKfycbyuyJmLSOcPcWhvyVbXLSegPgss92Gt3lEZ2VgI93smVfMrB8HO0kdOYU89J40PfgwvuQ/exec)"; 
// ==================================================================================

const DEFAULT_CATEGORIES = [
  { id: 'all', name: '전체 보기', icon: 'LayoutGrid', isDefault: true },
  { id: 'dev', name: '개발/IT', icon: 'Briefcase', isDefault: false },
  { id: 'video', name: '영상', icon: 'PlayCircle', isDefault: false },
  { id: 'life', name: '라이프스타일', icon: 'Coffee', isDefault: false },
  { id: 'news', name: '뉴스/아티클', icon: 'BookOpen', isDefault: false },
  { id: 'archive', name: '읽은 목록', icon: 'Archive', isDefault: true },
];

const MOCK_IMAGES = {
  default: "[https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&q=80&w=800](https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&q=80&w=800)",
};

const getIcon = (iconName) => {
  const icons = { LayoutGrid, Briefcase, PlayCircle, Coffee, BookOpen, Archive, Folder };
  return icons[iconName] || Folder;
};

export default function LinkPickApp() {
  const [links, setLinks] = useState([]);
  const [inputUrl, setInputUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedLink, setSelectedLink] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking'); 
  const [errorMessage, setErrorMessage] = useState("");
  const [isStyleLoaded, setIsStyleLoaded] = useState(false); 
  const [forceShow, setForceShow] = useState(false); 
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isManagingFolders, setIsManagingFolders] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setForceShow(true), 3000);
    if (window.tailwind) {
      setIsStyleLoaded(true);
      return () => clearTimeout(timer);
    }
    const script = document.createElement('script');
    script.src = "[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)";
    script.onload = () => { setIsStyleLoaded(true); clearTimeout(timer); };
    script.onerror = () => { console.error("Tailwind Load Failed"); setForceShow(true); };
    document.head.appendChild(script);
    const savedCats = localStorage.getItem('linkpick_categories');
    if (savedCats) setCategories(JSON.parse(savedCats));
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('linkpick_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (links.length > 0) localStorage.setItem('linkpick_links', JSON.stringify(links));
  }, [links]);

  useEffect(() => {
    const savedLinks = localStorage.getItem('linkpick_links');
    if (savedLinks) {
      try {
        const parsedLinks = JSON.parse(savedLinks);
        if (Array.isArray(parsedLinks) && parsedLinks.length > 0) {
          setLinks(parsedLinks);
          setConnectionStatus('local'); 
        }
      } catch (e) { console.error("Local storage error", e); }
    }

    if (!GOOGLE_SCRIPT_URL) {
        if (!savedLinks) setConnectionStatus('demo');
        return;
    }
    if (GOOGLE_SCRIPT_URL.includes("docs.google.com")) {
      setConnectionStatus('error');
      setErrorMessage("입력하신 주소는 스프레드시트 파일 주소입니다. 배포 URL을 입력해주세요.");
      return;
    }

    setIsProcessing(true);
    fetch(GOOGLE_SCRIPT_URL)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          if (data.length > 0) {
             setLinks(data);
             localStorage.setItem('linkpick_links', JSON.stringify(data));
          }
          setConnectionStatus('connected');
        } else {
           if (!savedLinks) setConnectionStatus('demo');
        }
      })
      .catch(err => {
        console.error("Server Load Failed", err);
        if (savedLinks) setConnectionStatus('local'); 
        else {
          setConnectionStatus('error');
          setErrorMessage("데이터 로드 실패. 권한 설정을 확인하세요.");
        }
      })
      .finally(() => setIsProcessing(false));
  }, []);

  const fetchUrlMetadata = async (url) => {
    let title = "새로운 링크";
    let image = MOCK_IMAGES.default;
    let description = "내용을 불러올 수 없습니다.";
    let siteName = "";

    try {
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
        const oembedUrl = `https://www.youtube.com/oembed?url=${url}&format=json`;
        const res = await fetch(oembedUrl);
        const data = await res.json();
        if (data.title) {
          return { title: data.title, image: data.thumbnail_url || image, description: `YouTube 채널 '${data.author_name}'의 영상입니다.`, siteName: "YouTube" };
        }
      }
      try {
        const noembedRes = await fetch(`https://noembed.com/embed?url=${url}`);
        const noembedData = await noembedRes.json();
        if (noembedData.title) {
           return { title: noembedData.title, image: noembedData.thumbnail_url || image, description: noembedData.title + " - 공유된 콘텐츠", siteName: noembedData.provider_name };
        }
      } catch (e) { }

      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      const data = await res.json();
      if (data.contents) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, "text/html");
        title = doc.querySelector('meta[property="og:title"]')?.content || doc.title || "제목 없음";
        image = doc.querySelector('meta[property="og:image"]')?.content || image;
        description = doc.querySelector('meta[property="og:description"]')?.content || "웹사이트 링크입니다.";
        siteName = doc.querySelector('meta[property="og:site_name"]')?.content || new URL(url).hostname;
      }
    } catch (e) {
      try { const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`); title = urlObj.hostname; } catch (err) {}
    }
    return { title, image, description, siteName };
  };

  const handleAddLink = async () => {
    if (!inputUrl) return;
    setIsProcessing(true);
    const metadata = await fetchUrlMetadata(inputUrl);
    const keywords = metadata.title.split(' ').filter(word => word.length > 2).slice(0, 3);
    const tags = keywords.length > 0 ? keywords : ["Link"];
    let category = "기타"; let categoryId = "news";
    const lowerUrl = inputUrl.toLowerCase(); const lowerTitle = metadata.title.toLowerCase();

    if (lowerUrl.includes("youtube") || lowerUrl.includes("youtu.be") || lowerTitle.includes("video")) { category = "영상"; categoryId = "video"; } 
    else if (lowerUrl.includes("dev") || lowerUrl.includes("github") || lowerTitle.includes("code")) { category = "개발"; categoryId = "dev"; }

    const customMatch = categories.find(c => !c.isDefault && (lowerTitle.includes(c.name) || lowerUrl.includes(c.name)));
    if (customMatch) { category = customMatch.name; categoryId = customMatch.id; }

    const newLink = {
      id: Date.now(), url: inputUrl, title: metadata.title, summary: metadata.description.slice(0, 100),
      category: category, categoryId: categoryId, image: metadata.image, tags: tags, isRead: false, date: new Date().toLocaleDateString()
    };

    setLinks(prev => [newLink, ...prev]);
    setInputUrl(""); setIsProcessing(false); setActiveCategory('all');

    if (GOOGLE_SCRIPT_URL && !GOOGLE_SCRIPT_URL.includes("docs.google.com")) {
      fetch(GOOGLE_SCRIPT_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", data: newLink }),
      }).catch(err => console.error("Cloud Save Failed", err));
    }
  };

  const addFolder = () => {
    if (!newFolderName.trim()) return;
    const newId = `custom-${Date.now()}`;
    const newCategory = { id: newId, name: newFolderName, icon: 'Folder', isDefault: false };
    setCategories([...categories.filter(c => c.id !== 'archive'), newCategory, categories.find(c => c.id === 'archive')]);
    setNewFolderName("");
  };

  const deleteFolder = (id) => {
    if (window.confirm("이 폴더를 삭제하시겠습니까?")) {
      setCategories(categories.filter(c => c.id !== id));
      if (activeCategory === id) setActiveCategory('all');
    }
  };

  const renameFolder = (id, currentName) => {
    const newName = window.prompt("새로운 폴더 이름을 입력하세요:", currentName);
    if (!newName || newName.trim() === "") return;
    setCategories(categories.map(c => c.id === id ? { ...c, name: newName } : c));
  };

  const changeLinkCategory = (linkId, newCategoryId) => {
    const targetCategory = categories.find(c => c.id === newCategoryId);
    if (!targetCategory) return;
    const updatedLink = { ...selectedLink, categoryId: newCategoryId, category: targetCategory.name };
    setLinks(links.map(l => l.id === linkId ? { ...l, categoryId: newCategoryId, category: targetCategory.name } : l));
    setSelectedLink(updatedLink);
    if (connectionStatus === 'connected' || connectionStatus === 'local') {
      fetch(GOOGLE_SCRIPT_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateCategory", id: linkId, categoryId: newCategoryId, category: targetCategory.name }),
      }).catch(e => console.error(e));
    }
  };

  const toggleReadStatus = (id) => {
    const targetLink = links.find(l => l.id === id);
    if (!targetLink) return;
    const updatedLink = { ...targetLink, isRead: !targetLink.isRead };
    setLinks(links.map(link => link.id === id ? updatedLink : link));
    if (selectedLink && selectedLink.id === id) setSelectedLink(updatedLink);
    if (connectionStatus === 'connected' || connectionStatus === 'local') {
      fetch(GOOGLE_SCRIPT_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleRead", id: id, isRead: updatedLink.isRead }),
      }).catch(e => console.error(e));
    }
  };

  const deleteLink = (id) => {
    setLinks(links.filter(link => link.id !== id));
    if (selectedLink && selectedLink.id === id) setSelectedLink(null);
    if (connectionStatus === 'connected' || connectionStatus === 'local') {
      fetch(GOOGLE_SCRIPT_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: id }),
      }).catch(e => console.error(e));
    }
  };

  const filteredLinks = links.filter(link => {
    if (activeCategory === 'all') return !link.isRead;
    if (activeCategory === 'archive') return link.isRead;
    const currentCat = categories.find(c => c.id === activeCategory);
    let match = false;
    if (link.categoryId === activeCategory) match = true;
    else if (currentCat && (link.category === currentCat.name || (currentCat.id === 'dev' && link.category === '개발'))) match = true;
    return match && !link.isRead;
  });

  if (!isStyleLoaded && !forceShow) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', flexDirection: 'column', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4f46e5', marginBottom: '10px' }}>LinkPick</div>
        <div style={{ color: '#64748b', fontSize: '14px' }}>앱을 켜는 중입니다...</div>
        <div style={{ marginTop: '20px', width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <aside className="w-56 bg-white border-r border-slate-200 hidden md:flex flex-col flex-shrink-0">
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${connectionStatus === 'connected' ? 'bg-green-600' : connectionStatus === 'local' ? 'bg-orange-500' : 'bg-indigo-600'}`}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">LinkPick <span className="text-xs text-indigo-500 font-normal">v2.5</span></h1>
          </div>
        </div>
        <div className="px-5 mb-4">
           {connectionStatus === 'connected' && (<div className="w-full bg-green-50 border border-green-100 text-green-700 p-2 rounded-lg text-xs flex items-center"><div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>클라우드 연결됨</div>)}
           {connectionStatus === 'local' && (<div className="w-full bg-orange-50 border border-orange-100 text-orange-700 p-2 rounded-lg text-xs flex flex-col"><div className="flex items-center mb-1 font-bold"><Smartphone className="w-3 h-3 mr-1" /> 로컬 저장 모드</div><span className="leading-tight text-[10px]">서버 연결 실패. 데이터가 기기에만 저장됩니다.</span></div>)}
           {connectionStatus === 'checking' && (<div className="w-full bg-slate-50 border border-slate-200 text-slate-500 p-2 rounded-lg text-xs flex items-center"><div className="w-2 h-2 bg-slate-400 rounded-full mr-2 animate-pulse"></div>연결 확인 중...</div>)}
           {connectionStatus === 'demo' && (<div className="w-full bg-slate-100 border border-slate-200 text-slate-500 p-2 rounded-lg text-xs flex items-center"><div className="w-2 h-2 bg-slate-400 rounded-full mr-2"></div>데모 모드 (저장 안됨)</div>)}
           {connectionStatus === 'error' && (<div className="w-full bg-red-50 border border-red-100 text-red-600 p-2 rounded-lg text-xs flex flex-col"><div className="flex items-center mb-1 font-bold"><AlertTriangle className="w-3 h-3 mr-1" /> 연결 오류</div><span className="leading-tight text-[10px]">{errorMessage || "설정을 확인해주세요."}</span></div>)}
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">내 폴더</span><button onClick={() => setIsManagingFolders(!isManagingFolders)} className="text-slate-400 hover:text-indigo-600 transition" title="폴더 관리"><Settings className={`w-3.5 h-3.5 ${isManagingFolders ? 'text-indigo-600' : ''}`} /></button></div>
          {isManagingFolders && (<div className="px-3 mb-2 animate-fade-in-down"><div className="flex items-center gap-1"><input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="새 폴더 이름" className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-indigo-500" onKeyDown={(e) => e.key === 'Enter' && addFolder()}/><button onClick={addFolder} className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700"><Plus className="w-3.5 h-3.5" /></button></div></div>)}
          {categories.map((cat) => {
            const Icon = getIcon(cat.icon); const isActive = activeCategory === cat.id;
            const count = cat.id === 'all' ? links.filter(l => !l.isRead).length : cat.id === 'archive' ? links.filter(l => l.isRead).length : links.filter(l => { if (l.categoryId === cat.id) return !l.isRead; if (l.category === cat.name) return !l.isRead; if (cat.id === 'dev' && l.category === '개발') return !l.isRead; return false; }).length;
            return (
              <div key={cat.id} className="group relative">
                <button onClick={() => setActiveCategory(cat.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                  <div className="flex items-center space-x-2.5 overflow-hidden"><Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} /><span className="truncate">{cat.name}</span></div>
                  {count > 0 && (<span className={`px-1.5 py-0.5 text-[10px] rounded-full flex-shrink-0 ${isActive ? 'bg-indigo-100' : 'bg-slate-100'}`}>{count}</span>)}
                </button>
                {isManagingFolders && !cat.isDefault && (<div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1"><button onClick={() => renameFolder(cat.id, cat.name)} className="p-1 text-slate-400 hover:text-indigo-600 bg-white shadow-sm rounded-full border border-slate-100"><Edit2 className="w-3 h-3" /></button><button onClick={() => deleteFolder(cat.id)} className="p-1 text-red-400 hover:text-red-600 bg-white shadow-sm rounded-full border border-slate-100"><X className="w-3 h-3" /></button></div>)}
              </div>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="max-w-6xl mx-auto w-full">
            <div className="relative group z-10"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Plus className="h-4 w-4 text-indigo-500" /></div><input type="text" placeholder="URL을 입력하세요 (유튜브, 블로그, 뉴스 등)" className="block w-full pl-9 pr-20 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}/><button onClick={handleAddLink} disabled={isProcessing} className="absolute inset-y-1 right-1 px-3 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:bg-slate-300 transition-colors flex items-center">{isProcessing ? (<><Loader2 className="w-3 h-3 animate-spin mr-1" />정보 가져오는 중</>) : ("추가")}</button></div>
          </div>
          <div className="md:hidden mt-3 flex overflow-x-auto space-x-2 pb-1 scrollbar-hide">{categories.map((cat) => (<button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${activeCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{cat.name}</button>))}</div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-800">{categories.find(c => c.id === activeCategory)?.name || "전체 보기"}<span className="ml-1.5 text-slate-400 text-xs font-normal">({filteredLinks.length})</span></h2></div>
            {filteredLinks.length === 0 ? (<div className="flex flex-col items-center justify-center h-64 text-slate-400"><Folder className="w-12 h-12 mb-3 text-slate-200" /><p className="text-sm">보관된 링크가 없습니다.</p>{connectionStatus === 'connected' && (<p className="text-xs mt-2 text-green-600">링크를 추가하면 자동으로 제목과 사진을 가져옵니다.</p>)}{connectionStatus === 'local' && (<p className="text-xs mt-2 text-orange-500">기기에 저장된 링크를 보여줍니다.</p>)}</div>) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredLinks.map((link) => (
                  <div key={link.id} onClick={() => setSelectedLink(link)} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer overflow-hidden flex flex-col h-full">
                    <div className="relative h-28 w-full overflow-hidden bg-slate-100"><img src={link.image} alt={link.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.src = MOCK_IMAGES.default; }} style={{ minHeight: '100px', objectFit: 'cover' }} /><div className="absolute top-1.5 right-1.5 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white font-medium">{link.category}</div>{link.isRead && (<div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><div className="text-white flex items-center text-xs font-bold"><CheckCircle className="w-4 h-4 mr-1" /> 읽음</div></div>)}</div>
                    <div className="p-3 flex flex-col flex-1"><div className="flex items-start justify-between mb-1.5"><div className="flex gap-1 flex-wrap overflow-hidden h-4">{link.tags.slice(0, 2).map(tag => (<span key={tag} className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded leading-none">#{tag}</span>))}</div></div><h3 className="font-bold text-slate-800 text-sm leading-tight mb-1.5 line-clamp-2 group-hover:text-indigo-600 transition-colors">{link.title}</h3><p className="text-xs text-slate-500 line-clamp-2 mb-2 flex-1 leading-relaxed">{link.summary}</p><div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50"><span className="text-[10px] text-slate-400">{link.date}</span><button onClick={(e) => { e.stopPropagation(); toggleReadStatus(link.id); }} className={`p-1 rounded-full hover:bg-slate-100 transition-colors ${link.isRead ? 'text-green-500' : 'text-slate-300 hover:text-green-500'}`}><CheckCircle className="w-3.5 h-3.5" /></button></div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      {selectedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="relative h-40">
              <img src={selectedLink.image} alt="Detail Cover" className="w-full h-full object-cover" onError={(e) => { e.target.src = MOCK_IMAGES.default; }} style={{ maxHeight: '200px', objectFit: 'cover' }} />
              <button onClick={() => setSelectedLink(null)} className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm transition"><Plus className="w-4 h-4 rotate-45" /></button>
              <div className="absolute bottom-3 left-3 group/select"><div className="relative"><span className="bg-indigo-600 text-white pl-3 pr-8 py-1 rounded text-xs font-semibold shadow-sm appearance-none flex items-center cursor-pointer hover:bg-indigo-700 transition">{selectedLink.category}<ChevronDown className="w-3 h-3 absolute right-2 text-white/70" /></span><select className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={selectedLink.categoryId} onChange={(e) => changeLinkCategory(selectedLink.id, e.target.value)}>{categories.filter(c => c.id !== 'all' && c.id !== 'archive').map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div></div>
            </div>
            <div className="p-5 overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedLink.title}</h2>
              <div className="flex items-center text-slate-400 text-xs mb-4 space-x-3"><span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {selectedLink.date}</span><span className="flex items-center"><Tag className="w-3 h-3 mr-1" /> {selectedLink.tags.join(', ')}</span></div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4"><div className="flex items-center mb-1.5"><Sparkles className="w-3.5 h-3.5 text-indigo-600 mr-1.5" /><h4 className="font-semibold text-indigo-900 text-xs">AI 핵심 요약</h4></div><p className="text-indigo-800 leading-relaxed text-sm">{selectedLink.summary}</p></div>
              <div className="flex gap-2"><a href={selectedLink.url} target="_blank" rel="noopener noreferrer" className="flex-1 bg-slate-900 text-white text-center py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition flex items-center justify-center"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />원문 보기</a><button onClick={() => { toggleReadStatus(selectedLink.id); setSelectedLink(null); }} className={`flex-1 border text-center py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center ${selectedLink.isRead ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'}`}><CheckCircle className="w-3.5 h-3.5 mr-1.5" />{selectedLink.isRead ? "안 읽음" : "다 읽음"}</button><button onClick={() => deleteLink(selectedLink.id)} className="p-2.5 border border-red-100 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"><Trash2 className="w-4 h-4" /></button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}