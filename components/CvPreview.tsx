
import React from 'react';
import { ResumeData, TemplateType, getFontFamily } from '../types';
import { useTranslation } from '../utils/translations';
import {
  ClassicSidebar,
  ModernHeader,
  Minimalist,
  CreativeProfile,
  CleanTimeline,
  ExecutiveSerif,
  AventusClassic,
  ProfessionalWave,
  ModernTimeline,
  MasterTemplate,
  StandardCoverLetter // Import this
} from './CvTemplates';

interface Props {
  data: ResumeData;
  template: TemplateType;
  brevId?: string;
}

export const CvPreview: React.FC<Props> = ({ data, template, brevId }) => {

  // Default design if not present
  const design = data.design || {
    font: 'inter',
    accentColor: '#3b82f6',
    scale: 1,
    spacing: 1.5
  };

  // Base styles applied to the root container of the resume
  const containerStyle: React.CSSProperties = {
    fontSize: `${design.scale}rem`,
    lineHeight: design.spacing,
    fontFamily: getFontFamily(design.font)
  };

  const { t } = useTranslation();
  const headerHelper = (key: string, def: string) => {
    const customHeader = data.headers?.[key];
    const defaultSwedishHeaders = {
      profile: 'Profil',
      experience: 'Arbetslivserfarenhet',
      education: 'Utbildning',
      skills: 'Färdigheter',
      languages: 'Språk',
      internships: 'Praktik',
      courses: 'Kurser',
      certificates: 'Certifikat',
      hobbies: 'Fritidsaktiviteter',
      references: 'Referenser'
    };
    if (!customHeader) {
      return t('section_' + key) || t(key) || def;
    }
    if (defaultSwedishHeaders[key] === customHeader || customHeader === 'Profil / Sammanfattning') {
      if (key === 'experience') return t('experience');
      if (key === 'education') return t('education');
      if (key === 'skills') return t('skills');
      if (key === 'languages') return t('languages');
      return t('section_' + key) || customHeader;
    }
    return customHeader;
  };

  const templates: Record<string, React.FC<any>> = {
    'classic-sidebar': ClassicSidebar,
    'modern-header': ModernHeader,
    'minimalist': Minimalist,
    'creative-profile': CreativeProfile,
    'clean-timeline': CleanTimeline,
    'executive-serif': ExecutiveSerif,
    'aventus-classic': AventusClassic,
    'professional-wave': ProfessionalWave,
    'modern-timeline': ModernTimeline,
    'master': MasterTemplate
  };

  const safeData = {
    ...data,
    personal: data.personal || {},
    experience: data.experience || [],
    education: data.education || [],
    skills: data.skills || [],
    languages: data.languages || [],
    courses: data.courses || [],
    certificates: data.certificates || [],
    internships: data.internships || [],
    hobbies: data.hobbies || [],
    references: data.references || [],
    coverLetters: data.coverLetters || []
  };

  // Determine content type (CV or Cover Letter)
  const brevContent = brevId ? safeData.coverLetters?.find(l => l.id === brevId)?.content : undefined;
  const SelectedTemplate = templates[template] || ClassicSidebar;

  if (brevId) {
    return (
      <StandardCoverLetter
        data={safeData as ResumeData}
        fontClass=""
        containerStyle={containerStyle}
        design={design}
        headerHelper={headerHelper}
        isBrev={true}
        brevContent={brevContent}
      />
    );
  }

  return (
    <SelectedTemplate
      data={safeData as ResumeData}
      fontClass=""
      containerStyle={containerStyle}
      design={design}
      headerHelper={headerHelper}
      config={safeData.customTemplateConfig}
    />
  );
};
