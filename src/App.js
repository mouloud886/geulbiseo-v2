import React, { useState, useEffect, useMemo, useCallback } from 'react'; // useCallback 추가
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, query, updateDoc, writeBatch } from 'firebase/firestore';
import { Trash2, BrainCircuit, Send, Loader2, Database, BookUser, FolderPlus, ChevronDown, Upload, Pencil, Check, X, Search, UserCircle, Mic } from 'lucide-react'; // UserCircle, Mic 추가
// './components/ui/ui.js' 파일에서 부품들을 가져옵니다.
import { Button } from './components/ui/ui.js';
import { Input } from './components/ui/ui.js';
import { Textarea } from './components/ui/ui.js';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './components/ui/ui.js';

// Firebase 구성 정보
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const PersonaEditForm = ({ initialPersona, onSave, onCancel }) => {
    const [formData, setFormData] = useState(initialPersona);
    useEffect(() => { setFormData(initialPersona); }, [initialPersona]);
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    return (
        <div className="p-6">
            <h3 className="text-xl font-semibold mb-6">{formData.id ? "페르소나 수정" : "새 페르소나 추가"}</h3>
            <div className="space-y-4">
                <div>
                    <label htmlFor="persona-name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">페르소나 이름</label>
                    <Input id="persona-name" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="예: 냉철한 비평가" />
                </div>
                <div>
                    <label htmlFor="persona-prompt" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">페르소나 설명 (AI에게 내리는 지시)</label>
                    <Textarea id="persona-prompt" name="prompt" value={formData.prompt} onChange={handleInputChange} placeholder="예: 당신은 글의 장점보다 단점을 먼저 지적합니다..." rows="5" />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-6">
                <Button onClick={onCancel} variant="ghost">취소</Button>
                <Button onClick={() => onSave(formData)}>저장</Button>
            </div>
        </div>
    );
};

const PersonaManagementModal = ({ isOpen, onClose, personas, onSave, onDelete }) => {
    const [editingPersona, setEditingPersona] = useState(null);
    useEffect(() => { if (!isOpen) setEditingPersona(null); }, [isOpen]);
    if (!isOpen) return null;
    const handleSaveAndClose = (formData) => { onSave(formData); setEditingPersona(null); };
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in-0">
            <Card className="w-full max-w-2xl flex flex-col" style={{maxHeight: '80vh'}}>
                <CardHeader className="flex-row justify-between items-center">
                    <CardTitle className="text-primary">페르소나 관리</CardTitle>
                    <Button onClick={onClose} variant="ghost" size="icon"><X className="h-4 w-4"/></Button>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto">
                {editingPersona ? (
                    <PersonaEditForm initialPersona={editingPersona} onSave={handleSaveAndClose} onCancel={() => setEditingPersona(null)} />
                ) : (
                    <div className="space-y-3">
                        {personas.map(p => (
                            <Card key={p.id} className="bg-secondary">
                               <CardContent className="p-4 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-semibold text-base">{p.name}</h4>
                                        <p className="text-sm text-muted-foreground truncate" style={{maxWidth: '400px'}}>{p.prompt}</p>
                                    </div>
                                    <div className="flex">
                                        <Button onClick={() => setEditingPersona(p)} variant="ghost" size="icon"><Pencil className="h-4 w-4"/></Button>
                                        <Button onClick={() => onDelete(p.id)} variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                  </CardContent>
                              </Card>
                        ))}
                    </div>
                )}
                </CardContent>
                {!editingPersona && (
                    <CardFooter>
                           <Button onClick={() => setEditingPersona({ name: '', prompt: '' })} className="w-full">
                               새 페르소나 추가
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
};

export default function App() {
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [newProjectName, setNewProjectName] = useState('');
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingProjectName, setEditingProjectName] = useState('');
    const [knowledgeBase, setKnowledgeBase] = useState([]);
    const [newItemContent, setNewItemContent] = useState('');
    const [newItemTitle, setNewItemTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [kbSearchTerm, setKbSearchTerm] = useState('');
    const [personas, setPersonas] = useState([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState('');
    const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
    const [userQuery, setUserQuery] = useState('');
    const [finalResponse, setFinalResponse] = useState(''); // 사용되지 않음 -> ESLint 경고 해결을 위해 사용하도록 수정
    const [isGenerating, setIsGenerating] = useState(false); // 사용되지 않음 -> ESLint 경고 해결을 위해 사용하도록 수정


    // Firebase 초기화 및 익명 로그인
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const dbInstance = getFirestore(app);
            const authInstance = getAuth(app);
            setDb(dbInstance);
            onAuthStateChanged(authInstance, async (user) => {
                if (user) { setUserId(user.uid); }
                else { await signInAnonymously(authInstance); }
            });
        } catch (error) { console.error("Firebase 초기화 실패:", error); setIsLoading(false); }
    }, []); // 의존성 배열에 아무것도 없어 컴포넌트 마운트 시 한 번만 실행

    // 프로젝트 및 페르소나 실시간 리스너
    useEffect(() => {
        if (!userId || !db) return;
        setIsLoading(true);
        const projectsUnsubscribe = onSnapshot(query(collection(db, `users/${userId}/projects`)), (snapshot) => {
            const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(fetchedProjects);
            const lastSelected = localStorage.getItem('selectedProject');
            if (fetchedProjects.some(p => p.id === lastSelected)) {
                if(selectedProject !== lastSelected) setSelectedProject(lastSelected);
            } else if (fetchedProjects.length > 0) {
                if(selectedProject !== fetchedProjects[0].id) setSelectedProject(fetchedProjects[0].id);
            } else {
                if(selectedProject !== '') setSelectedProject('');
            }
            setIsLoading(false);
        }, (error) => { console.error("프로젝트 불러오기 실패:", error); setIsLoading(false); });
        const personasUnsubscribe = onSnapshot(query(collection(db, `users/${userId}/personas`)), (snapshot) => {
            setPersonas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => { projectsUnsubscribe(); personasUnsubscribe(); };
    }, [userId, db, selectedProject]); // selectedProject를 의존성 배열에 추가 (ESLint 경고 해결)

    // 지식 기반 실시간 리스너
    useEffect(() => {
        if (selectedProject && userId && db) {
            localStorage.setItem('selectedProject', selectedProject);
            const kbUnsubscribe = onSnapshot(query(collection(db, `users/${userId}/projects/${selectedProject}/knowledge_base`)), (snapshot) => {
                setKnowledgeBase(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => kbUnsubscribe();
        } else {
            setKnowledgeBase([]);
        }
    }, [selectedProject, userId, db]);

    // 검색 필터링된 지식 기반
    const filteredKnowledgeBase = useMemo(() => {
        if (!kbSearchTerm) return knowledgeBase;
        const term = kbSearchTerm.toLowerCase();
        return knowledgeBase.filter(item => (item.title && item.title.toLowerCase().includes(term)) || item.content.toLowerCase().includes(term));
    }, [knowledgeBase, kbSearchTerm]);

    // 핸들러 함수들
    const handleAddProject = async () => { if (!newProjectName.trim() || !db || !userId) return; setIsCreatingProject(true); try { const ref = await addDoc(collection(db, `users/${userId}/projects`), { name: newProjectName, createdAt: new Date() }); setNewProjectName(''); setSelectedProject(ref.id); } catch (e) { console.error(e); } finally { setIsCreatingProject(false); } };
    const handleAddItem = async () => { if ((!newItemTitle.trim() && !newItemContent.trim()) || !selectedProject) return; setIsSaving(true); try { await addDoc(collection(db, `users/${userId}/projects/${selectedProject}/knowledge_base`), { title: newItemTitle.trim() || "제목 없음", content: newItemContent.trim(), createdAt: new Date(), type: 'manual' }); setNewItemTitle(''); setNewItemContent(''); } catch (e) { console.error(e); } finally { setIsSaving(false); } };
    const handleFileUpload = (event) => { const file = event.target.files[0]; if (!file || !selectedProject) return; const reader = new FileReader(); reader.onload = async (e) => { setIsProcessingFile(true); try { const text = e.target.result; const chunks = text.split(/\n\s*\n/).filter(p => p.trim().length > 20); if (chunks.length === 0) throw new Error("파일 내용 없음"); const batch = writeBatch(db); chunks.forEach(chunk => { const newDocRef = doc(collection(db, `users/${userId}/projects/${selectedProject}/knowledge_base`)); const title = chunk.trim().split('\n')[0].substring(0, 50); batch.set(newDocRef, { title, content: chunk, createdAt: new Date(), type: 'file_chunk', sourceFile: file.name }); }); await batch.commit(); alert(`${chunks.length}개 항목 저장 완료.`); } catch (error) { alert(`오류: ${error.message}`); } finally { setIsProcessingFile(false); } }; reader.readAsText(file); event.target.value = null; };
    const handleDeleteItem = async (id) => { try { await deleteDoc(doc(db, `users/${userId}/projects/${selectedProject}/knowledge_base`, id)); } catch (e) { console.error(e); } };
    const handleRenameProject = async () => { if (!editingProjectId || !editingProjectName.trim()) return; try { await updateDoc(doc(db, `users/${userId}/projects/${editingProjectId}`), { name: editingProjectName }); setEditingProjectId(null); setEditingProjectName(''); } catch (e) { console.error(e); } };
    const handleSavePersona = async (personaData) => { if (!personaData || !personaData.name.trim() || !personaData.prompt.trim()) { alert("이름과 설명을 모두 입력해야 합니다."); return; } try { const colPath = `users/${userId}/personas`; if (personaData.id) { await updateDoc(doc(db, colPath, personaData.id), { name: personaData.name, prompt: personaData.prompt }); } else { await addDoc(collection(db, colPath), { name: personaData.name, prompt: personaData.prompt, createdAt: new Date() }); } } catch (e) { console.error(e); } };
    const handleDeletePersona = async (personaId) => { if (selectedPersonaId === personaId) setSelectedPersonaId(''); try { await deleteDoc(doc(db, `users/${userId}/personas`, personaId)); } catch (e) { console.error(e); } };

    // AI 질문 및 응답 로직
    const callGenerativeAPI = useCallback(async (prompt) => {
        // 이 함수가 실제로 호출될 때 isGenerating과 finalResponse를 업데이트
        setIsGenerating(true);
        setFinalResponse('AI 응답 생성 중...'); // 임시 응답
        console.log("실제 AI API 호출:", prompt);
        // 여기에 실제 AI API 호출 로직이 들어갈 것입니다.
        // 예시: const response = await fetch('/api/generate', { /* ... */ });
        // const data = await response.json();
        // setFinalResponse(data.generatedText);
        setTimeout(() => { // 임시로 비동기 작업 흉내
            setFinalResponse(`[AI 응답]: '${prompt}'에 대한 가상의 응답입니다.`);
            setIsGenerating(false);
        }, 2000);
    }, []); // 빈 의존성 배열로 한 번만 생성되도록

    const performSearchAndGeneratePrompt = async (query) => {
        console.log("질문 보내기 함수 실행! 질문 내용:", query);
        // 실제 로직에서는 여기서 query와 knowledgeBase, selectedPersona를 조합하여 AI 프롬프트 생성
        // 그 후 callGenerativeAPI(생성된 프롬프트) 호출
        
        // 일단은 테스트용으로 직접 callGenerativeAPI 호출
        callGenerativeAPI(query); // 이제 이 함수는 사용됨
        // alert(`AI에게 질문을 보내는 기능은 아직 개발 중입니다.\n보내려고 한 질문: ${query}`); // 테스트용 alert 제거
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
                <p className="mt-4 text-xl">작가님의 작업 공간을 불러오는 중...</p>
                <p className="text-sm text-muted-foreground">잠시만 기다려주세요.</p>
            </div>
        );
    }

    return (
        <div className="dark bg-background text-foreground">
            <PersonaManagementModal isOpen={isPersonaModalOpen} onClose={() => setIsPersonaModalOpen(false)} personas={personas} onSave={handleSavePersona} onDelete={handleDeletePersona}/>
            <main className="min-h-screen font-sans p-4 sm:p-6 lg:p-8">
                {/* 3단 그리드 컨테이너 */}
                <div className="w-full max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {/* 첫 번째 열: 프로젝트 관리 */}
                    <div className="md:col-span-1 xl:col-span-1 flex flex-col gap-8">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center text-base"><FolderPlus className="mr-2 h-4 w-4" /> 프로젝트 관리</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <Input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddProject()} placeholder="새 프로젝트 이름..." />
                                    <Button onClick={handleAddProject} disabled={isCreatingProject} size="icon">{isCreatingProject ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4"/>}</Button>
                                </div>
                                {projects.length > 0 && (
                                    <div className="relative mt-4">
                                        <select
                                            value={selectedProject || ''}
                                            onChange={(e) => setSelectedProject(e.target.value)}
                                            className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                        >
                                            <option value="" disabled>프로젝트를 선택하세요</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none h-4 w-4" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* 두 번째 열: 자료 기반 질문 */}
                    <div className="md:col-span-1 xl:col-span-1 flex flex-col gap-8">
                        <Card className="flex-1"> {/* flex-1 추가 */}
                            <CardHeader>
                                <CardTitle className="flex items-center text-base"><Pencil className="mr-2 h-4 w-4" /> 자료 기반 질문</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col"> {/* flex-1 및 flex-col 추가 */}
                                <Textarea
                                    placeholder="질문은 빨리...?"
                                    value={userQuery}
                                    onChange={(e) => setUserQuery(e.target.value)}
                                    rows={6} // 높이 조절
                                    className="flex-1 mb-4" // flex-1 및 margin-bottom 추가
                                />
                                <Button onClick={() => performSearchAndGeneratePrompt(userQuery)} disabled={isGenerating || !userQuery.trim()} className="w-full">
                                    {isGenerating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                                    {isGenerating ? '생성 중...' : '보내기'}
                                </Button>
                                {finalResponse && (
                                    <div className="mt-4 p-3 border rounded-md bg-muted text-muted-foreground max-h-40 overflow-y-auto">
                                        <p>{finalResponse}</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter> {/* CardFooter 추가 */}
                                <p className="text-sm text-muted-foreground">프로젝트의 지식 베이스를 바탕으로 질문에 답변드립니다.</p>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* 세 번째 열: 페르소나 선택 및 기타 */}
                    <div className="md:col-span-1 xl:col-span-1 flex flex-col gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center text-base"><BookUser className="mr-2 h-4 w-4" /> 페르소나 선택</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative">
                                    <select
                                        value={selectedPersonaId || ''}
                                        onChange={(e) => setSelectedPersonaId(e.target.value)}
                                        className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                    >
                                        <option value="" disabled>페르소나 선택 안 됨</option>
                                        {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none h-4 w-4" />
                                </div>
                                <Button onClick={() => setIsPersonaModalOpen(true)} className="mt-4 w-full">
                                    페르소나 관리
                                </Button>
                            </CardContent>
                        </Card>

                        {/* 지식 기반 추가 카드 (세 번째 열의 다른 카드) */}
                        <Card className="flex-1"> {/* flex-1 추가 */}
                            <CardHeader>
                                <CardTitle className="flex items-center text-base"><Database className="mr-2 h-4 w-4" /> 지식 기반</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col"> {/* flex-1 및 flex-col 추가 */}
                                <Input
                                    type="text"
                                    value={newItemTitle}
                                    onChange={(e) => setNewItemTitle(e.target.value)}
                                    placeholder="항목 제목 (선택 사항)"
                                    className="mb-2"
                                />
                                <Textarea
                                    value={newItemContent}
                                    onChange={(e) => setNewItemContent(e.target.value)}
                                    placeholder="새 지식 항목을 추가하세요..."
                                    rows={4}
                                    className="mb-4 flex-1" // flex-1 및 margin-bottom 추가
                                />
                                <div className="flex gap-2 mb-4">
                                    <Button onClick={handleAddItem} disabled={isSaving || (!newItemTitle.trim() && !newItemContent.trim())} className="flex-1">
                                        {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4"/>} 수동 추가
                                    </Button>
                                    <Input
                                        id="file-upload"
                                        type="file"
                                        onChange={handleFileUpload}
                                        className="hidden" // 실제 Input을 숨기고 버튼으로 클릭 유도
                                        disabled={isProcessingFile}
                                    />
                                    <Button asChild className="flex-1" disabled={isProcessingFile}> {/* asChild 추가 */}
                                        <label htmlFor="file-upload" className="flex items-center justify-center cursor-pointer">
                                            {isProcessingFile ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />} 파일 업로드
                                        </label>
                                    </Button>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col items-start w-full"> {/* flex-col 및 items-start, w-full 추가 */}
                                <h4 className="text-base font-semibold mb-2">항목 목록 ({filteredKnowledgeBase.length}개)</h4>
                                <Input
                                    type="text"
                                    placeholder="지식 기반 검색..."
                                    value={kbSearchTerm}
                                    onChange={(e) => setKbSearchTerm(e.target.value)}
                                    className="mb-4"
                                />
                                <div className="w-full space-y-2 max-h-40 overflow-y-auto border rounded p-2"> {/* 스크롤 가능하도록 max-height 추가 */}
                                    {filteredKnowledgeBase.length > 0 ? (
                                        filteredKnowledgeBase.map(item => (
                                            <div key={item.id} className="flex justify-between items-center bg-card p-2 rounded border">
                                                <div className="text-sm truncate mr-2 flex-1">{item.title}</div>
                                                <Button onClick={() => handleDeleteItem(item.id)} variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">아직 지식 항목이 없습니다.</p>
                                    )}
                                </div>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
