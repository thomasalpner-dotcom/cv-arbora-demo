
export type Role = 'admin' | 'coach';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: Role;
  createdAt: string;
  status: 'active' | 'suspended';
  lastLogin: string;
  canUseInterview?: boolean;
  canUseMatching?: boolean; // Access to Savå AI matching
  photoUrl?: string; // Profile picture for the coach
}

export interface StockImage {
  id: string;
  url: string; // Base64 or URL
  category: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

export const LANGUAGE_LEVELS = [
  'Modersmål',
  'Flytande',
  'Mycket goda kunskaper',
  'Goda kunskaper',
  'Grundläggande kunskaper'
];

export interface FontOption {
  id: string;
  name: string;
  family: string;
  category: 'main' | 'extra';
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'inter', name: 'Modern', family: "'Inter', sans-serif", category: 'main' },
  { id: 'merriweather', name: 'Klassisk', family: "'Merriweather', serif", category: 'main' },
  { id: 'opensans', name: 'Mjuk', family: "'Open Sans', sans-serif", category: 'main' },
  { id: 'playfair', name: 'Elegant', family: "'Playfair Display', serif", category: 'main' },
  { id: 'robotomono', name: 'Kod', family: "'Roboto Mono', monospace", category: 'extra' },
  { id: 'arial', name: 'Arial', family: "Arial, Helvetica, sans-serif", category: 'extra' },
  { id: 'helvetica', name: 'Helvetica', family: "Helvetica, Arial, sans-serif", category: 'extra' },
  { id: 'georgia', name: 'Georgia', family: "Georgia, serif", category: 'extra' },
  { id: 'timesnewroman', name: 'Times New Roman', family: "'Times New Roman', Times, serif", category: 'extra' },
  { id: 'verdana', name: 'Verdana', family: "Verdana, Geneva, sans-serif", category: 'extra' },
  { id: 'garamond', name: 'Garamond', family: "Garamond, Baskerville, 'Baskerville Old Face', 'Hoefler Text', 'Times New Roman', serif", category: 'extra' }
];

export const getFontFamily = (fontId: string) => {
  return FONT_OPTIONS.find(f => f.id === fontId.toLowerCase())?.family || "'Inter', sans-serif";
};

export interface Experience {
  id: string;
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  location: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  location: string;
}

export interface Skill {
  id: string;
  name: string;
  level: number; // 1-5
}

export interface Language {
  id: string;
  name: string;
  level: string; // e.g., "Grundläggande", "Modersmål"
}

export interface Course {
  id: string;
  name: string;
  issuer: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Certificate {
  id: string;
  name: string;
  issuer: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Internship {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Hobby {
  id: string;
  name: string;
  description: string;
}

export interface Reference {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
}

export type PhotoPosition = 'sidebar-top' | 'sidebar-bottom' | 'header-left' | 'header-center' | 'header-right';

export interface MasterTemplateConfig {
  layout: 'sidebar-left' | 'sidebar-right' | 'header-only' | 'split-equal';
  sidebarWidth: string;
  spacing: 'compact' | 'normal' | 'relaxed';
  headerAlignment: 'left' | 'center' | 'right';
  headerStyle: 'modern' | 'classic' | 'minimal' | 'serif-elegant';
  sectionStyle: 'simple' | 'underlined' | 'boxed' | 'side-border';
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: string;
  showPhoto: boolean;
  photoShape: 'square' | 'circle' | 'soft-square';
  photoPosition: PhotoPosition;
  // New creative options
  sideStripe: 'none' | 'left' | 'right' | 'both';
  sideStripeWidth: string; // ex "8mm"
  showBorder: boolean;
  borderWidth: string;
  borderColor: string;
}

export interface CustomTemplate {
  id: string;
  name: string;
  config: MasterTemplateConfig;
  isPublished: boolean;
  createdAt: string;
  createdBy: string;
}

export interface DesignSettings {
  font: string;
  accentColor: string;
  scale: number;
  spacing: number;
  maxPages?: number;
}

export type TemplateType = 'classic-sidebar' | 'modern-header' | 'minimalist' | 'creative-profile' | 'clean-timeline' | 'executive-serif' | 'aventus-classic' | 'professional-wave' | 'modern-timeline' | string;

export type ParticipantStatus = 'active' | 'archived';

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: ParticipantStatus;
  notes?: string;
  lastActivity: string;
  tags?: string[];
  createdBy: string;
  gdprConsent?: boolean;
  gdprConsentDate?: string;
  gdprConsentBy?: string;
  isLegacy?: boolean;
}

export interface CoverLetterItem {
  id: string;
  title: string;
  content: string;
  signOff?: string;
  lastEdited: string;
}

export interface ResumeData {
  id: string;
  participantId?: string;
  title: string;
  lastEdited: string;
  createdBy: string;
  template?: TemplateType;
  customTemplateConfig?: MasterTemplateConfig;
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
    jobTitle: string;
    driversLicense: string;
    birthDate: string;
    linkedin?: string;
    website?: string;
    photoUrl?: string;
    customFieldLabel?: string;
    customFieldValue?: string;
  };
  headers?: {
    [key: string]: string;
  };
  sectionOrder: string[];
  columnSettings: {
    [sectionId: string]: 'left' | 'right';
  };
  pageBreaks: string[];
  itemPageBreaks: string[]; // New: store item IDs that should have a break after them
  design: DesignSettings;
  profile: string;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  courses: Course[];
  certificates: Certificate[];
  internships: Internship[];
  hobbies: Hobby[];
  references: Reference[];
  referencesAvailableUponRequest?: boolean;
  coverLetters?: CoverLetterItem[];
  isLegacy?: boolean;
  sourceFile?: string;
  fileUrl?: string;
}

export const DEFAULT_MASTER_CONFIG: MasterTemplateConfig = {
  layout: 'sidebar-left',
  sidebarWidth: '30%',
  spacing: 'normal',
  headerAlignment: 'left',
  headerStyle: 'modern',
  sectionStyle: 'underlined',
  accentColor: '#2563eb',
  fontHeading: 'inter',
  fontBody: 'inter',
  borderRadius: '0.75rem',
  showPhoto: true,
  photoShape: 'soft-square',
  photoPosition: 'sidebar-top',
  sideStripe: 'none',
  sideStripeWidth: '5mm',
  showBorder: false,
  borderWidth: '2px',
  borderColor: '#e2e8f0'
};

export const INITIAL_RESUME: ResumeData = {
  id: 'new',
  title: 'Mitt CV',
  createdBy: '',
  lastEdited: new Date().toISOString(),
  template: 'classic-sidebar',
  personal: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    jobTitle: '',
    driversLicense: '',
    birthDate: '',
    linkedin: '',
    website: '',
    photoUrl: '',
    customFieldLabel: '',
    customFieldValue: '',
  },
  headers: {
    personal: 'Personuppgifter',
    profile: 'Profil',
    experience: 'Arbetslivserfarenhet',
    education: 'Utbildning',
    skills: 'Färdigheter',
    languages: 'Språk',
    courses: 'Kurser',
    certificates: 'Certifikat',
    internships: 'Praktik',
    hobbies: 'Fritidsaktiviteter',
    references: 'Referenser'
  },
  sectionOrder: ['profile', 'experience', 'education', 'skills', 'languages'],
  columnSettings: {
    'personal': 'left',
    'skills': 'left',
    'languages': 'left',
    'profile': 'right',
    'experience': 'right',
    'education': 'right',
    'courses': 'right',
    'internships': 'right',
    'certificates': 'right',
    'hobbies': 'left',
    'references': 'right'
  },
  pageBreaks: [],
  itemPageBreaks: [],
  design: {
    font: 'inter',
    accentColor: '#2563eb',
    scale: 0.7,
    spacing: 1.5,
    maxPages: 0,
  },
  profile: '',
  experience: [],
  education: [],
  skills: [],
  languages: [],
  courses: [],
  certificates: [],
  internships: [],
  hobbies: [],
  references: [],
  referencesAvailableUponRequest: false,
  coverLetters: []
};

export interface SystemSettings {
  logoUrl?: string;
  agnetaAvatarUrl?: string;
  agnetaName?: string;
  savaAvatarUrl?: string;
  savaName?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  // AI Instructions
  agnetaSystemPrompt?: string;
  agnetaProfilePrompt?: string;
  agnetaExperiencePrompt?: string;
  agnetaEducationPrompt?: string;
  agnetaCoverLetterPrompt?: string;
  agnetaGreetingStandard?: string;
  agnetaGreetingJob?: string;
  savaMatchingPrompt?: string;
  importMappingPrompt?: string;
  // Branding
  companyName?: string;
  landingTitle?: string;
  landingSubtitle?: string;
  primaryColor?: string;
  allowedEmailDomains?: string; // Comma separated list like "@aventus.se, @client.com"
  // Email Templates
  emailTemplates?: {
    simple: EmailTemplate;
    withCV: EmailTemplate;
    withCoverLetter: EmailTemplate;
  };
  // Feature Toggles
  allowBulkImportForCoaches?: boolean; // Allow coaches to bulk import CVs during onboarding
  disableEmailVerification?: boolean; // Inaktivera krav på e-postverifiering (t.ex. för demos)
  allowOpenAdminRegistration?: boolean; // Demo flagga: alla får admin-konto
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
  logoUrl: '',
  agnetaAvatarUrl: '',
  agnetaName: 'Agneta',
  savaAvatarUrl: '',
  savaName: 'Savå',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  agnetaSystemPrompt: 'Du är Agneta, en professionell CV-coach. Ditt mål är att hjälpa deltagaren att skapa ett CV och personligt brev av högsta kvalitet som leder till intervju.',
  agnetaProfilePrompt: 'Skriv en slagkraftig inledning som sammanfattar personens yrkesmässiga identitet. Fokusera på värdeerbjudande och personligt varumärke. Markera nyckelkompetenser med <b>-taggar.',
  agnetaExperiencePrompt: 'Fokusera på prestationer och mätbara resultat snarare än bara arbetsuppgifter. Använd aktiva verb och markera viktiga tekniker eller prestationer med <b>. Håll punktlistorna koncisa och slagkraftiga.',
  agnetaEducationPrompt: 'Lyft fram relevanta kurser, examensarbeten eller utmärkelser. Fokusera på hur utbildningen lagt grunden för yrkesrollen och använd <b> för viktiga områden.',
  agnetaCoverLetterPrompt: 'Skapa en brygga mellan kandidatens erfarenhet och företagets behov. Brevet ska visa förståelse för rollen, förklara varför kandidaten är rätt val och matcha tonen i jobbannonsen. Använd <b> för att lyfta fram matchningar.',
  agnetaGreetingStandard: '',
  agnetaGreetingJob: '',
  savaMatchingPrompt: 'Analysera kandidatens CV mot jobbannonsens krav. Identifiera matchningar och gap. Ge ett matchningsbetyg (0-100%) och en kort motivering som lyfter fram de mest relevanta kompetenserna för just denna tjänst.',
  importMappingPrompt: 'Tolka råtexten från ett CV och mappa den till vårt JSON-format. Var noggrann med att extrahera datum, företagsnamn, roller och beskrivningar på ett strukturerat sätt. Dela upp texten i logiska sektioner för erfarenhet, utbildning och kompetenser.',
  companyName: 'Aventus',
  landingTitle: 'Aventus CV',
  landingSubtitle: 'Stärker individer och matchar talanger',
  primaryColor: '#4f46e5', // Indigo 600
  allowedEmailDomains: '@aventus.se',
  emailTemplates: {
    simple: {
      subject: 'Tips från coachen - {{PARTICIPANT_FULLNAME}}',
      body: 'Hej {{PARTICIPANT_NAME}},\n\nJag har gått igenom ditt material och har några tips att dela med mig av.\n\nVänliga hälsningar,\n{{COACH_NAME}}'
    },
    withCV: {
      subject: 'Ditt CV - {{PARTICIPANT_FULLNAME}}',
      body: 'Hej {{PARTICIPANT_NAME}},\n\nBifogat hittar du ditt CV.\n\nLycka till med jobbsökandet!\n\nVänliga hälsningar,\n{{COACH_NAME}}'
    },
    withCoverLetter: {
      subject: 'Ditt personliga brev - {{PARTICIPANT_FULLNAME}}',
      body: 'Hej {{PARTICIPANT_NAME}},\n\nBifogat hittar du ditt personliga brev.\n\nVänliga hälsningar,\n{{COACH_NAME}}'
    }
  },
  allowBulkImportForCoaches: true,
  allowOpenAdminRegistration: false
};
