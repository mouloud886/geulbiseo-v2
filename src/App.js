import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, query, updateDoc, writeBatch } from 'firebase/firestore';
import { Trash2, BrainCircuit, Send, Loader2, Database, BookUser, FolderPlus, ChevronDown, Upload, Pencil, Check, X, Search } from 'lucide-react';
// './components/ui/ui.js' 파일에서 부품들을 가져옵니다.
import { Button } from './components/ui/ui.js';
import { Input } from './components/ui/ui.js';
import { Textarea } from './components/ui/ui.js';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './components/ui/ui.js';

// Firebase 구성 정보
const firebaseConfig = {apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID };

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
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">페르소나 이름</label>
                    <Input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="예: 냉철한 비평가" />
                </div>
                <div>
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">페르소나 설명 (AI에게 내리는 지시)</label>
                    <Textarea name="prompt" value={formData.prompt} onChange={handleInputChange} placeholder="예: 당신은 글의 장점보다 단점을 먼저 지적합니다..." rows="5" />
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
    const [finalResponse, setFinalResponse] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

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
    }, []);

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
    }, [userId, db]);

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

    const filteredKnowledgeBase = useMemo(() => {
        if (!kbSearchTerm) return knowledgeBase;
        const term = kbSearchTerm.toLowerCase();
        return knowledgeBase.filter(item => (item.title && item.title.toLowerCase().includes(term)) || item.content.toLowerCase().includes(term));
    }, [knowledgeBase, kbSearchTerm]);

    const handleAddProject = async () => { if (!newProjectName.trim() || !db || !userId) return; setIsCreatingProject(true); try { const ref = await addDoc(collection(db, `users/${userId}/projects`), { name: newProjectName, createdAt: new Date() }); setNewProjectName(''); setSelectedProject(ref.id); } catch (e) { console.error(e); } finally { setIsCreatingProject(false); } };
    const handleAddItem = async () => { if ((!newItemTitle.trim() && !newItemContent.trim()) || !selectedProject) return; setIsSaving(true); try { await addDoc(collection(db, `users/${userId}/projects/${selectedProject}/knowledge_base`), { title: newItemTitle.trim() || "제목 없음", content: newItemContent.trim(), createdAt: new Date(), type: 'manual' }); setNewItemTitle(''); setNewItemContent(''); } catch (e) { console.error(e); } finally { setIsSaving(false); } };
    const handleFileUpload = (event) => { const file = event.target.files[0]; if (!file || !selectedProject) return; const reader = new FileReader(); reader.onload = async (e) => { setIsProcessingFile(true); try { const text = e.target.result; const chunks = text.split(/\n\s*\n/).filter(p => p.trim().length > 20); if (chunks.length === 0) throw new Error("파일 내용 없음"); const batch = writeBatch(db); chunks.forEach(chunk => { const newDocRef = doc(collection(db, `users/${userId}/projects/${selectedProject}/knowledge_base`)); const title = chunk.trim().split('\n')[0].substring(0, 50); batch.set(newDocRef, { title, content: chunk, createdAt: new Date(), type: 'file_chunk', sourceFile: file.name }); }); await batch.commit(); alert(`${chunks.length}개 항목 저장 완료.`); } catch (error) { alert(`오류: ${error.message}`); } finally { setIsProcessingFile(false); } }; reader.readAsText(file); event.target.value = null; };
    const handleDeleteItem = async (id) => { try { await deleteDoc(doc(db, `users/${userId}/projects/${selectedProject}/knowledge_base`, id)); } catch (e) { console.error(e); } };
    const handleRenameProject = async () => { if (!editingProjectId || !editingProjectName.trim()) return; try { await updateDoc(doc(db, `users/${userId}/projects/${editingProjectId}`), { name: editingProjectName }); setEditingProjectId(null); setEditingProjectName(''); } catch (e) { console.error(e); } };
    const handleSavePersona = async (personaData) => { if (!personaData || !personaData.name.trim() || !personaData.prompt.trim()) { alert("이름과 설명을 모두 입력해야 합니다."); return; } try { const colPath = `users/${userId}/personas`; if (personaData.id) { await updateDoc(doc(db, colPath, personaData.id), { name: personaData.name, prompt: personaData.prompt }); } else { await addDoc(collection(db, colPath), { name: personaData.name, prompt: personaData.prompt, createdAt: new Date() }); } } catch (e) { console.error(e); } };
    const handleDeletePersona = async (personaId) => { if (selectedPersonaId === personaId) setSelectedPersonaId(''); try { await deleteDoc(doc(db, `users/${userId}/personas`, personaId)); } catch (e) { console.error(e); } };
    
    const performSearchAndGeneratePrompt = async (query) => {
        // --- 테스트용 코드 시작 ---
        console.log("질문 보내기 함수 실행! 질문 내용:", query);
        alert(`AI에게 질문을 보내는 기능은 아직 개발 중입니다.\n보내려고 한 질문: ${query}`);
        // --- 테스트용 코드 끝 ---

        /* 원래 AI 호출 로직이 들어갈 자리입니다. */
    };

    const callGenerativeAPI = async (prompt) => { /* ... */ };
    
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
                                        <select value={selectedProject || ''} onChange={(e) => setSelectedProject(e.target.value)} className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 appearance-none">
                                            <option value="" disabled>프로젝트를 선택하세요</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none h-4 w-4" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* 두 번째 열: 자료 기반 질문 - 현재 스크린샷에 보이는 내용과 유사하게 재구성 */}
                    <div className="md:col-span-1 xl:col-span-1 flex flex-col gap-8">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center text-base"><Pencil className="mr-2 h-4 w-4" /> 자료 기반 질문</CardTitle></CardHeader>
                            <CardContent>
                                {/* 기존의 자료 기반 질문 관련 UI를 여기에 배치 */}
                                {/* 예시: */}
                                <div className="flex flex-col gap-4">
                                    <Input type="text" placeholder="질문은 빨리...?" />
                                    <Button>보내기</Button> {/* 이 버튼이 '보내기' 버튼일 것으로 추측 */}
                                </div>
                                {/* 스크린샷에 보이는 "프로젝트의 지식 베이스를 바탕으로 질문에 답변드립니다." 텍스트 */}
                                <p className="text-sm text-muted-foreground mt-4">프로젝트의 지식 베이스를 바탕으로 질문에 답변드립니다.</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 세 번째 열: 페르소나 선택 - 현재 스크린샷에 보이는 내용과 유사하게 재구성 */}
                    <div className="md:col-span-1 xl:col-span-1 flex flex-col gap-8">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center text-base"><UserCircle className="mr-2 h-4 w-4" /> 페르소나 선택</CardTitle></CardHeader>
                            <CardContent>
                                {/* 기존의 페르소나 선택 관련 UI를 여기에 배치 */}
                                {/* 예시: */}
                                <div className="relative">
                                    <select value={selectedPersona || ''} onChange={(e) => setSelectedPersona(e.target.value)} className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 appearance-none">
                                        <option value="" disabled>페르소나 선택 안 됨</option>
                                        {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none h-4 w-4" />
                                </div>
                                <Button onClick={() => setIsPersonaModalOpen(true)} className="mt-4">관리</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
