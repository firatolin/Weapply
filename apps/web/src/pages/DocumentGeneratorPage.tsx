import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Download, Copy, Edit, Trash2, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/client';

interface Document {
  id: string;
  title: string;
  type: string;
  description?: string;
  wordCount: number;
  language: string;
  isGenerated: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  versions: {
    id: string;
    content: string;
    versionNumber: number;
    isCurrent: boolean;
    aiScore?: number;
    createdAt: string;
  }[];
}

export function DocumentGeneratorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedType, setSelectedType] = useState('SOP');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [language, setLanguage] = useState('English');
  const [generatedContent, setGeneratedContent] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);

  // Fetch user's documents
  const { data: documents, isLoading: docsLoading, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/documents');
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching documents:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Generate document mutation
  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/documents/generate', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setCurrentDocumentId(data.document.id);
      toast.success('Document generated successfully! 🎉');
      refetch();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error || 'Failed to generate document';
      toast.error(typeof errorMessage === 'string' ? errorMessage : 'Failed to generate document');
    },
  });

  // Update document mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, content, changeDescription }: any) => {
      const response = await apiClient.put(`/documents/${id}`, { content, changeDescription });
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Document updated successfully!');
      setIsEditing(false);
      refetch();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error || 'Failed to update document';
      toast.error(typeof errorMessage === 'string' ? errorMessage : 'Failed to update document');
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      toast.success('Document deleted successfully');
      refetch();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error || 'Failed to delete document';
      toast.error(typeof errorMessage === 'string' ? errorMessage : 'Failed to delete document');
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    generateMutation.mutate({
      type: selectedType,
      title,
      description,
      additionalInstructions,
      language,
    });
  };

  const handleSaveEdit = () => {
    if (!currentDocumentId) return;
    updateMutation.mutate({
      id: currentDocumentId,
      content: editingContent,
      changeDescription: 'User edited document',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDocument = (doc: Document) => {
    const latestVersion = doc.versions.find(v => v.isCurrent);
    if (latestVersion) {
      setGeneratedContent(latestVersion.content);
      setEditingContent(latestVersion.content);
      setCurrentDocumentId(doc.id);
      setIsEditing(false);
      setActiveTab('view');
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CV: 'CV/Resume',
      SOP: 'Statement of Purpose',
      MOTIVATION_LETTER: 'Motivation Letter',
      ESSAY: 'Essay',
      RECOMMENDATION_EMAIL: 'Recommendation Email',
      APPLICATION_EMAIL: 'Application Email',
      OUTREACH_EMAIL: 'Outreach Email',
      OTHER: 'Other',
    };
    return labels[type] || type;
  };

  const getDocumentTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      CV: '📄',
      SOP: '📝',
      MOTIVATION_LETTER: '✉️',
      ESSAY: '📚',
      RECOMMENDATION_EMAIL: '📧',
    };
    return icons[type] || '📄';
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold">Please log in to access document generation</h2>
        <Link to="/login">
          <Button className="mt-4">Log In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Document Generator
        </h1>
        <Button onClick={() => { setActiveTab('generate'); setGeneratedContent(''); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Document
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="my-documents">My Documents ({documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="view" disabled={!generatedContent}>View</TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Generate a New Document</CardTitle>
              <CardDescription>
                AI-powered document generation for your scholarship applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Document Type</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CV">CV/Resume</SelectItem>
                        <SelectItem value="SOP">Statement of Purpose</SelectItem>
                        <SelectItem value="MOTIVATION_LETTER">Motivation Letter</SelectItem>
                        <SelectItem value="ESSAY">Essay</SelectItem>
                        <SelectItem value="RECOMMENDATION_EMAIL">Recommendation Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                        <SelectItem value="German">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. My Statement of Purpose for MIT"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="e.g. For the Data Science program at MIT"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Any specific requirements or focus areas for the document..."
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Document
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Documents Tab */}
        <TabsContent value="my-documents">
          <Card>
            <CardHeader>
              <CardTitle>My Documents</CardTitle>
              <CardDescription>All your generated documents</CardDescription>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : !documents || documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No documents yet</p>
                  <Button onClick={() => setActiveTab('generate')} className="mt-4">
                    Generate Your First Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc: Document) => {
                    const latestVersion = doc.versions.find(v => v.isCurrent);
                    return (
                      <div
                        key={doc.id}
                        className="flex flex-wrap items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getDocumentTypeIcon(doc.type)}</span>
                            <h3 className="font-medium">{doc.title}</h3>
                            <Badge variant="outline">{getDocumentTypeLabel(doc.type)}</Badge>
                            {doc.isEdited && <Badge className="bg-yellow-100 text-yellow-800">Edited</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {doc.description || 'No description'}
                          </p>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            <span>📝 {doc.wordCount || 0} words</span>
                            <span>📅 {new Date(doc.createdAt).toLocaleDateString()}</span>
                            {latestVersion?.aiScore && (
                              <span>⭐ Score: {Math.round(latestVersion.aiScore)}%</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2 md:mt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const version = doc.versions.find(v => v.isCurrent);
                              if (version) {
                                setGeneratedContent(version.content);
                                setEditingContent(version.content);
                                setCurrentDocumentId(doc.id);
                                setIsEditing(true);
                                setActiveTab('view');
                              }
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* View Tab */}
        <TabsContent value="view">
          {generatedContent && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <CardTitle>Document Preview</CardTitle>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            'Save Changes'
                          )}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          navigator.clipboard.writeText(generatedContent);
                          toast.success('Copied to clipboard!');
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={20}
                    className="font-mono text-sm"
                  />
                ) : (
                  <div className="prose max-w-none whitespace-pre-wrap">
                    {generatedContent}
                  </div>
                )}
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground border-t pt-4">
                <span>AI-generated document • {new Date().toLocaleDateString()}</span>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}