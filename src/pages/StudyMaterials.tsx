import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Download, FileText, BookOpen, Calculator, Microscope, Globe, Palette, Music, Heart, Code, Briefcase, Zap, Coffee, Star, Filter } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Footer } from '@/components/layout/Footer'

interface StudyMaterial {
  id: string
  title: string
  description: string
  file_url: string
  file_type: string
  file_size: number
  subject: string
  created_at: string
}

const getSubjectIcon = (subject: string) => {
  const icons: { [key: string]: any } = {
    'ICT': Code,
    'Mathematics': Calculator,
    'Science': Microscope,
    'Biology': Heart,
    'Chemistry': Zap,
    'Physics': Coffee,
    'Geography': Globe,
    'Art': Palette,
    'Music': Music,
    'Business': Briefcase,
    'Literature': BookOpen,
    'General': Star,
  }
  return icons[subject] || FileText
}

const getFileTypeColor = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return 'bg-destructive text-destructive-foreground'
    case 'doc':
    case 'docx':
      return 'bg-primary text-primary-foreground'
    case 'ppt':
    case 'pptx':
      return 'bg-warning text-warning-foreground'
    case 'xls':
    case 'xlsx':
      return 'bg-success text-success-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function StudyMaterials() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<StudyMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const { toast } = useToast()

  useEffect(() => {
    fetchStudyMaterials()
  }, [])

  useEffect(() => {
    filterMaterials()
  }, [materials, searchTerm, selectedSubject])

  const fetchStudyMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('study_materials')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMaterials(data || [])
    } catch (error) {
      console.error('Error fetching study materials:', error)
      toast({
        title: "Error",
        description: "Failed to load study materials",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterMaterials = () => {
    let filtered = materials

    if (searchTerm) {
      filtered = filtered.filter(material =>
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(material => material.subject === selectedSubject)
    }

    setFilteredMaterials(filtered)
  }

  const downloadFile = async (material: StudyMaterial) => {
    try {
      // In a real app, you would handle the download properly
      // For now, we'll just show a toast
      toast({
        title: "Download Started",
        description: `Downloading ${material.title}`,
      })
      
      // Open the file URL in a new tab
      window.open(material.file_url, '_blank')
    } catch (error) {
      console.error('Error downloading file:', error)
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const subjects = [...new Set(materials.map(m => m.subject).filter(Boolean))]

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Study Materials</h1>
          <p className="text-muted-foreground mt-2">
            Access your academic resources and study materials
          </p>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search materials by title, description, or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Materials</p>
                  <p className="text-2xl font-bold">{materials.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Subjects</p>
                  <p className="text-2xl font-bold">{subjects.length}</p>
                </div>
                <FileText className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Search Results</p>
                  <p className="text-2xl font-bold">{filteredMaterials.length}</p>
                </div>
                <Search className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Materials Grid */}
        {filteredMaterials.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-12 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No materials found</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedSubject !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No study materials available at the moment'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => {
              const SubjectIcon = getSubjectIcon(material.subject || 'General')
              
              return (
                <Card key={material.id} className="shadow-card hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <SubjectIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-2">
                            {material.title}
                          </CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {material.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {material.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {material.subject && (
                        <Badge variant="outline">{material.subject}</Badge>
                      )}
                      <Badge className={getFileTypeColor(material.file_type)}>
                        {material.file_type.toUpperCase()}
                      </Badge>
                      {material.file_size && (
                        <Badge variant="secondary">
                          {formatFileSize(material.file_size)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(material.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => downloadFile(material)}
                        className="shadow-glow"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}