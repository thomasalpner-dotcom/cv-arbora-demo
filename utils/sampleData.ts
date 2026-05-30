import { ResumeData } from '../types';

export const generateSampleCV = (lang: string = 'sv'): Partial<ResumeData> => {
    const dataByLang: Record<string, Partial<ResumeData>> = {
        sv: {
            personal: {
                firstName: 'Anna',
                lastName: 'Andersson',
                email: 'anna.andersson@exempel.se',
                phone: '070-123 45 67',
                city: 'Stockholm',
                zipCode: '111 22',
                address: 'Kungsgatan 10',
                jobTitle: 'Senior Projektledare',
                birthDate: '1990-05-15',
                linkedin: 'linkedin.com/in/anna-andersson',
                website: '',
                driversLicense: 'B-körkort',
                photoUrl: ''
            },
            profile: '<p>Erfaren projektledare med över 8 års erfarenhet av att leda strategiska projekt inom tech-branschen. Specialiserad på agil projektledning och digital transformation. Driven av att skapa värde genom effektiv kommunikation och samarbete mellan team.</p>',
            experience: [
                {
                    id: 'exp_' + Date.now() + '_1',
                    role: 'Senior Projektledare',
                    company: 'Tech Solutions AB',
                    location: 'Stockholm',
                    startDate: 'Januari 2020',
                    endDate: '',
                    current: true,
                    description: '<p>Leder strategiska digitaliseringsprojekt med budgetar upp till 10 MSEK. Ansvarar för projektportfölj med 3-5 parallella projekt och team på 15-20 personer.</p><p><strong>Nyckelansvar:</strong></p><ul><li>Strategisk planering och genomförande av digitala transformationsprojekt</li><li>Stakeholder management på C-level</li><li>Agil projektledning med Scrum och Kanban</li><li>Budget- och resursplanering</li></ul>'
                },
                {
                    id: 'exp_' + Date.now() + '_2',
                    role: 'Projektledare',
                    company: 'Innovation Hub Sweden',
                    location: 'Stockholm',
                    startDate: 'Mars 2017',
                    endDate: 'December 2019',
                    current: false,
                    description: '<p>Ledde produktutvecklingsprojekt inom fintech och e-handel. Samordnade tvärfunktionella team och säkerställde leverans enligt tidsplan och budget.</p><p><strong>Resultat:</strong></p><ul><li>Lanserade 5 nya digitala produkter med 95% kundnöjdhet</li><li>Minskade time-to-market med 30% genom agila metoder</li><li>Byggde och ledde team på 10 personer</li></ul>'
                },
                {
                    id: 'exp_' + Date.now() + '_3',
                    role: 'Projektkoordinator',
                    company: 'Digital Ventures',
                    location: 'Göteborg',
                    startDate: 'Juni 2015',
                    endDate: 'Februari 2017',
                    current: false,
                    description: '<p>Koordinerade IT-projekt och supporterade projektledare i planering och uppföljning. Ansvarade för projektdokumentation och rapportering till ledning.</p>'
                }
            ],
            education: [
                {
                    id: 'edu_' + Date.now() + '_1',
                    degree: 'Master of Science, Industriell Ekonomi',
                    school: 'Kungliga Tekniska Högskolan (KTH)',
                    location: 'Stockholm',
                    startDate: 'Augusti 2011',
                    endDate: 'Juni 2015',
                    current: false,
                    description: '<p>Specialisering inom projektledning och innovationsledning. Examensarbete om agila metoder i stora organisationer.</p>'
                },
                {
                    id: 'edu_' + Date.now() + '_2',
                    degree: 'Certifierad Scrum Master (CSM)',
                    school: 'Scrum Alliance',
                    location: 'Online',
                    startDate: 'Mars 2018',
                    endDate: 'Mars 2018',
                    current: false,
                    description: ''
                }
            ],
            languages: [
                {
                    id: 'lang_' + Date.now() + '_1',
                    name: 'Svenska',
                    level: 'Modersmål'
                },
                {
                    id: 'lang_' + Date.now() + '_2',
                    name: 'Engelska',
                    level: 'Flytande'
                },
                {
                    id: 'lang_' + Date.now() + '_3',
                    name: 'Spanska',
                    level: 'Grundläggande'
                }
            ],
            skills: [
                {
                    id: 'skill_' + Date.now() + '_1',
                    name: 'Agil Projektledning',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_2',
                    name: 'Stakeholder Management',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_3',
                    name: 'Scrum & Kanban',
                    level: 4
                },
                {
                    id: 'skill_' + Date.now() + '_4',
                    name: 'Budgetplanering',
                    level: 4
                },
                {
                    id: 'skill_' + Date.now() + '_5',
                    name: 'Ledarskap',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_6',
                    name: 'Kommunikation',
                    level: 5
                }
            ],
            courses: [
                {
                    id: 'course_' + Date.now() + '_1',
                    name: 'Avancerad Projektledning',
                    issuer: 'PMI',
                    startDate: '2019',
                    endDate: '2019',
                    description: ''
                }
            ],
            references: [
                {
                    id: 'ref_' + Date.now() + '_1',
                    name: 'Erik Svensson',
                    company: 'Tech Solutions AB',
                    phone: '08-123 456 78',
                    email: 'erik.svensson@techsolutions.se'
                }
            ]
        },
        en: {
            personal: {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com',
                phone: '+44 7911 123456',
                city: 'London',
                zipCode: 'EC1A 1BB',
                address: '10 High Street',
                jobTitle: 'Senior Project Manager',
                birthDate: '1990-05-15',
                linkedin: 'linkedin.com/in/jane-smith',
                website: '',
                driversLicense: 'Driver\'s License B',
                photoUrl: ''
            },
            profile: '<p>Experienced project manager with over 8 years of experience leading strategic projects in the tech industry. Specializing in agile project management and digital transformation. Driven by creating value through effective communication and collaboration between teams.</p>',
            experience: [
                {
                    id: 'exp_' + Date.now() + '_1',
                    role: 'Senior Project Manager',
                    company: 'Tech Solutions Ltd',
                    location: 'London',
                    startDate: 'January 2020',
                    endDate: '',
                    current: true,
                    description: '<p>Leads strategic digitalization projects with budgets up to £1M. Responsible for a project portfolio of 3-5 parallel projects and teams of 15-20 people.</p><p><strong>Key Responsibilities:</strong></p><ul><li>Strategic planning and execution of digital transformation projects</li><li>C-level stakeholder management</li><li>Agile project management with Scrum and Kanban</li><li>Budget and resource planning</li></ul>'
                },
                {
                    id: 'exp_' + Date.now() + '_2',
                    role: 'Project Manager',
                    company: 'Innovation Hub UK',
                    location: 'London',
                    startDate: 'March 2017',
                    endDate: 'December 2019',
                    current: false,
                    description: '<p>Led product development projects in fintech and e-commerce. Coordinated cross-functional teams and ensured delivery according to schedule and budget.</p><p><strong>Results:</strong></p><ul><li>Launched 5 new digital products with 95% customer satisfaction</li><li>Reduced time-to-market by 30% through agile methods</li><li>Built and led a team of 10 people</li></ul>'
                },
                {
                    id: 'exp_' + Date.now() + '_3',
                    role: 'Project Coordinator',
                    company: 'Digital Ventures',
                    location: 'Manchester',
                    startDate: 'June 2015',
                    endDate: 'February 2017',
                    current: false,
                    description: '<p>Coordinated IT projects and supported project managers in planning and follow-up. Responsible for project documentation and reporting to management.</p>'
                }
            ],
            education: [
                {
                    id: 'edu_' + Date.now() + '_1',
                    degree: 'Master of Science, Industrial Engineering and Management',
                    school: 'Imperial College London',
                    location: 'London',
                    startDate: 'August 2011',
                    endDate: 'June 2015',
                    current: false,
                    description: '<p>Specialization in project management and innovation management. Master\'s thesis on agile methods in large organizations.</p>'
                },
                {
                    id: 'edu_' + Date.now() + '_2',
                    degree: 'Certified Scrum Master (CSM)',
                    school: 'Scrum Alliance',
                    location: 'Online',
                    startDate: 'March 2018',
                    endDate: 'March 2018',
                    current: false,
                    description: ''
                }
            ],
            languages: [
                {
                    id: 'lang_' + Date.now() + '_1',
                    name: 'English',
                    level: 'Native'
                },
                {
                    id: 'lang_' + Date.now() + '_2',
                    name: 'Swedish',
                    level: 'Fluent'
                },
                {
                    id: 'lang_' + Date.now() + '_3',
                    name: 'Spanish',
                    level: 'Basic'
                }
            ],
            skills: [
                {
                    id: 'skill_' + Date.now() + '_1',
                    name: 'Agile Project Management',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_2',
                    name: 'Stakeholder Management',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_3',
                    name: 'Scrum & Kanban',
                    level: 4
                },
                {
                    id: 'skill_' + Date.now() + '_4',
                    name: 'Budget Planning',
                    level: 4
                },
                {
                    id: 'skill_' + Date.now() + '_5',
                    name: 'Leadership',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_6',
                    name: 'Communication',
                    level: 5
                }
            ],
            courses: [
                {
                    id: 'course_' + Date.now() + '_1',
                    name: 'Advanced Project Management',
                    issuer: 'PMI',
                    startDate: '2019',
                    endDate: '2019',
                    description: ''
                }
            ],
            references: [
                {
                    id: 'ref_' + Date.now() + '_1',
                    name: 'John Doe',
                    company: 'Tech Solutions Ltd',
                    phone: '+44 20 7946 0958',
                    email: 'john.doe@techsolutions.co.uk'
                }
            ]
        },
        de: {
            personal: {
                firstName: 'Anna',
                lastName: 'Müller',
                email: 'anna.mueller@example.de',
                phone: '+49 170 1234567',
                city: 'München',
                zipCode: '80331',
                address: 'Hauptstraße 10',
                jobTitle: 'Senior Projektleiterin',
                birthDate: '1990-05-15',
                linkedin: 'linkedin.com/in/anna-mueller',
                website: '',
                driversLicense: 'Führerschein Klasse B',
                photoUrl: ''
            },
            profile: '<p>Erfahrene Projektleiterin mit über 8 Jahren Erfahrung in der Leitung strategischer Projekte in der Technologiebranche. Spezialisiert auf agiles Projektmanagement und digitale Transformation. Motiviert durch Wertschöpfung durch effektive Kommunikation und Zusammenarbeit im Team.</p>',
            experience: [
                {
                    id: 'exp_' + Date.now() + '_1',
                    role: 'Senior Projektleiterin',
                    company: 'Tech Solutions GmbH',
                    location: 'München',
                    startDate: 'Januar 2020',
                    endDate: '',
                    current: true,
                    description: '<p>Leitung strategischer Digitalisierungsprojekte mit Budgets bis zu 1 Mio. €. Verantwortlich für ein Projektportfolio von 3-5 parallelen Projekten und Teams von 15-20 Personen.</p><p><strong>Hauptaufgaben:</strong></p><ul><li>Strategische Planung und Durchführung digitaler Transformationsprojekte</li><li>Stakeholder-Management auf C-Level-Ebene</li><li>Agiles Projektmanagement mit Scrum und Kanban</li><li>Budget- und Ressourcenplanung</li></ul>'
                },
                {
                    id: 'exp_' + Date.now() + '_2',
                    role: 'Projektleiterin',
                    company: 'Innovation Hub Germany',
                    location: 'München',
                    startDate: 'März 2017',
                    endDate: 'Dezember 2019',
                    current: false,
                    description: '<p>Leitung von Produktentwicklungsprojekten in Fintech und E-Commerce. Koordination funktionsübergreifender Teams und Sicherstellung der Lieferung im Rahmen von Zeitplan und Budget.</p><p><strong>Ergebnisse:</strong></p><ul><li>Einführung von 5 neuen digitalen Produkten mit 95% Kundenzufriedenheit</li><li>Reduzierung der Time-to-Market um 30% durch agile Methoden</li><li>Aufbau und Führung eines Teams von 10 Personen</li></ul>'
                }
            ],
            education: [
                {
                    id: 'edu_' + Date.now() + '_1',
                    degree: 'Master of Science, Wirtschaftsingenieurwesen',
                    school: 'Technische Universität München (TUM)',
                    location: 'München',
                    startDate: 'August 2011',
                    endDate: 'Juni 2015',
                    current: false,
                    description: '<p>Spezialisierung auf Projektmanagement und Innovationsmanagement. Masterarbeit über agile Methoden in Großorganisationen.</p>'
                }
            ],
            languages: [
                {
                    id: 'lang_' + Date.now() + '_1',
                    name: 'Deutsch',
                    level: 'Muttersprache'
                },
                {
                    id: 'lang_' + Date.now() + '_2',
                    name: 'Englisch',
                    level: 'Fließend'
                }
            ],
            skills: [
                {
                    id: 'skill_' + Date.now() + '_1',
                    name: 'Agiles Projektmanagement',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_2',
                    name: 'Stakeholder Management',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_3',
                    name: 'Scrum & Kanban',
                    level: 4
                },
                {
                    id: 'skill_' + Date.now() + '_4',
                    name: 'Budgetplanung',
                    level: 4
                }
            ],
            courses: [
                {
                    id: 'course_' + Date.now() + '_1',
                    name: 'Advanced Project Management',
                    issuer: 'PMI',
                    startDate: '2019',
                    endDate: '2019',
                    description: ''
                }
            ],
            references: [
                {
                    id: 'ref_' + Date.now() + '_1',
                    name: 'Hans Müller',
                    company: 'Tech Solutions GmbH',
                    phone: '+49 89 1234567',
                    email: 'hans.mueller@techsolutions.de'
                }
            ]
        },
        fi: {
            personal: {
                firstName: 'Anni',
                lastName: 'Virtanen',
                email: 'anni.virtanen@example.fi',
                phone: '+358 40 1234567',
                city: 'Helsinki',
                zipCode: '00100',
                address: 'Mannerheimintie 10',
                jobTitle: 'Senior Projektipäällikkö',
                birthDate: '1990-05-15',
                linkedin: 'linkedin.com/in/anni-virtanen',
                website: '',
                driversLicense: 'B-ajokortti',
                photoUrl: ''
            },
            profile: '<p>Kokenut projektipäällikkö, jolla on yli 8 vuoden kokemus strategisten projektien johtamisesta teknologia-alalla. Erikoistunut ketterään projektinhallintaan ja digitaaliseen transformaatioon. Pyrkii luomaan arvoa tehokkaan viestinnän ja tiimien välisen yhteistyön avulla.</p>',
            experience: [
                {
                    id: 'exp_' + Date.now() + '_1',
                    role: 'Senior Projektipäällikkö',
                    company: 'Tech Solutions Oy',
                    location: 'Helsinki',
                    startDate: 'Tammikuu 2020',
                    endDate: '',
                    current: true,
                    description: '<p>Johtaa strategisia digitalisointiprojekteja, joiden budjetit ovat jopa 1 milj. €. Vastaa 3-5 rinnakkaisen projektin salkusta ja 15-20 hengen tiimeistä.</p><p><strong>Päävastuut:</strong></p><ul><li>Digitaalisten transformaatioprojektien strateginen suunnittelu ja toteutus</li><li>Sidosryhmähallinta C-tasolla</li><li>Ketterä projektinhallinta Scrumilla ja Kanbanilla</li><li>Budjetin ja resurssien suunnittelu</li></ul>'
                }
            ],
            education: [
                {
                    id: 'edu_' + Date.now() + '_1',
                    degree: 'Diplomi-insinööri, Tuotantotalous',
                    school: 'Aalto-yliopisto',
                    location: 'Espoo',
                    startDate: 'Elokuu 2011',
                    endDate: 'Kesäkuu 2015',
                    current: false,
                    description: '<p>Erikoistuminen projektijohtamiseen ja innovaatiojohtamiseen. Diplomityö ketteristä menetelmistä suurissa organisaatioissa.</p>'
                }
            ],
            languages: [
                {
                    id: 'lang_' + Date.now() + '_1',
                    name: 'Suomi',
                    level: 'Äidinkieli'
                },
                {
                    id: 'lang_' + Date.now() + '_2',
                    name: 'Englanti',
                    level: 'Sujuva'
                }
            ],
            skills: [
                {
                    id: 'skill_' + Date.now() + '_1',
                    name: 'Ketterä projektinhallinta',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_2',
                    name: 'Sidosryhmähallinta',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_3',
                    name: 'Scrum & Kanban',
                    level: 4
                }
            ],
            references: [
                {
                    id: 'ref_' + Date.now() + '_1',
                    name: 'Matti Meikäläinen',
                    company: 'Tech Solutions Oy',
                    phone: '+358 9 123 4567',
                    email: 'matti.meikalainen@techsolutions.fi'
                }
            ]
        },
        da: {
            personal: {
                firstName: 'Aase',
                lastName: 'Nielsen',
                email: 'aase.nielsen@example.dk',
                phone: '+45 20 12 34 56',
                city: 'København',
                zipCode: '1000',
                address: 'Nørregade 10',
                jobTitle: 'Senior Projektleder',
                birthDate: '1990-05-15',
                linkedin: 'linkedin.com/in/aase-nielsen',
                website: '',
                driversLicense: 'B-kørekort',
                photoUrl: ''
            },
            profile: '<p>Erfaren projektleder med over 8 års erfaring med at lede strategiske projekter i tech-branchen. Specialiseret i agil projektledelse og digital transformation. Drevet af at skabe værdi gennem effektiv kommunikation og samarbejde mellem teams.</p>',
            experience: [
                {
                    id: 'exp_' + Date.now() + '_1',
                    role: 'Senior Projektleder',
                    company: 'Tech Solutions ApS',
                    location: 'København',
                    startDate: 'Januar 2020',
                    endDate: '',
                    current: true,
                    description: '<p>Leder strategiske digitaliseringsprojekter med budgetter op til 1 mio. €. Ansvarlig for en projektportefølje med 3-5 parallelle projekter og teams på 15-20 personer.</p><p><strong>Nøgleansvar:</strong></p><ul><li>Strategisk planlægning og eksekvering af digitale transformationsprojekter</li><li>Stakeholder management på C-level</li><li>Agil projektledelse med Scrum og Kanban</li><li>Budget- og ressourceplanlægning</li></ul>'
                }
            ],
            education: [
                {
                    id: 'edu_' + Date.now() + '_1',
                    degree: 'Master of Science, Virksomhedsteknologi',
                    school: 'Danmarks Tekniske Universitet (DTU)',
                    location: 'Kgs. Lyngby',
                    startDate: 'August 2011',
                    endDate: 'Juni 2015',
                    current: false,
                    description: '<p>Specialisering i projektledelse og innovationsledelse. Speciale om agile metoder i store organisationer.</p>'
                }
            ],
            languages: [
                {
                    id: 'lang_' + Date.now() + '_1',
                    name: 'Dansk',
                    level: 'Modersmål'
                },
                {
                    id: 'lang_' + Date.now() + '_2',
                    name: 'Engelsk',
                    level: 'Flydende'
                }
            ],
            skills: [
                {
                    id: 'skill_' + Date.now() + '_1',
                    name: 'Agil projektledelse',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_2',
                    name: 'Stakeholder management',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_3',
                    name: 'Scrum & Kanban',
                    level: 4
                }
            ],
            references: [
                {
                    id: 'ref_' + Date.now() + '_1',
                    name: 'Søren Jensen',
                    company: 'Tech Solutions ApS',
                    phone: '+45 35 12 34 56',
                    email: 'soeren.jensen@techsolutions.dk'
                }
            ]
        },
        no: {
            personal: {
                firstName: 'Anne',
                lastName: 'Olsen',
                email: 'anne.olsen@example.no',
                phone: '+47 90 12 34 56',
                city: 'Oslo',
                zipCode: '0150',
                address: 'Karl Johans gate 10',
                jobTitle: 'Senior Projektleder',
                birthDate: '1990-05-15',
                linkedin: 'linkedin.com/in/anne-olsen',
                website: '',
                driversLicense: 'B-førerkort',
                photoUrl: ''
            },
            profile: '<p>Erfaren prosjektleder med over 8 års erfaring med å lede strategiske prosjekter i tech-bransjen. Spesialisert på agil prosjektledelse og digital transformasjon. Drevet av å skabe verdi gjennom effektiv kommunikasjon og samarbeid mellom team.</p>',
            experience: [
                {
                    id: 'exp_' + Date.now() + '_1',
                    role: 'Senior Prosjektleder',
                    company: 'Tech Solutions AS',
                    location: 'Oslo',
                    startDate: 'Januar 2020',
                    endDate: '',
                    current: true,
                    description: '<p>Leder strategiske digitaliseringsprosjekter med budsjetter opp til 10 MNOK. Ansvarlig for prosjektportefølje med 3-5 parallelle prosjekter og team på 15-20 personer.</p><p><strong>Hovedansvar:</strong></p><ul><li>Strategisk planlegging og gjennomføring av digitale transformasjonsprosjekter</li><li>Stakeholder management på C-level</li><li>Agil prosjektledelse med Scrum og Kanban</li><li>Budsjett- og ressursplanlegging</li></ul>'
                }
            ],
            education: [
                {
                    id: 'edu_' + Date.now() + '_1',
                    degree: 'Master of Science, Industriell Økonomi',
                    school: 'Norges teknisk-naturvitenskapelige universitet (NTNU)',
                    location: 'Trondheim',
                    startDate: 'August 2011',
                    endDate: 'Juni 2015',
                    current: false,
                    description: '<p>Spesialisering innen prosjektledelse og innovasjonsledelse. Masteroppgave om agile metoder i store organisasjoner.</p>'
                }
            ],
            languages: [
                {
                    id: 'lang_' + Date.now() + '_1',
                    name: 'Norsk',
                    level: 'Morsmål'
                },
                {
                    id: 'lang_' + Date.now() + '_2',
                    name: 'Engelsk',
                    level: 'Flytende'
                }
            ],
            skills: [
                {
                    id: 'skill_' + Date.now() + '_1',
                    name: 'Agil prosjektledelse',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_2',
                    name: 'Stakeholder management',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_3',
                    name: 'Scrum & Kanban',
                    level: 4
                }
            ],
            references: [
                {
                    id: 'ref_' + Date.now() + '_1',
                    name: 'Morten Johansen',
                    company: 'Tech Solutions AS',
                    phone: '+47 22 12 34 56',
                    email: 'morten.johansen@techsolutions.no'
                }
            ]
        },
        fr: {
            personal: {
                firstName: 'Anne',
                lastName: 'Martin',
                email: 'anne.martin@example.fr',
                phone: '+33 6 12 34 56 78',
                city: 'Paris',
                zipCode: '75001',
                address: '10 Rue de Rivoli',
                jobTitle: 'Chef de Projet Senior',
                birthDate: '1990-05-15',
                linkedin: 'linkedin.com/in/anne-martin',
                website: '',
                driversLicense: 'Permis B',
                photoUrl: ''
            },
            profile: '<p>Chef de projet expérimentée avec plus de 8 ans d\'expérience dans la direction de projets stratégiques dans le secteur de la technologie. Spécialisée dans la gestion de projets agiles et la transformation numérique. Motivée par la création de valeur grâce à une communication efficace et à la collaboration entre les équipes.</p>',
            experience: [
                {
                    id: 'exp_' + Date.now() + '_1',
                    role: 'Chef de Projet Senior',
                    company: 'Tech Solutions SAS',
                    location: 'Paris',
                    startDate: 'Janvier 2020',
                    endDate: '',
                    current: true,
                    description: '<p>Dirige des projets stratégiques de numérisation avec des budgets allant jusqu\'à 1M€. Responsable d\'un portefeuille de 3 à 5 projets parallèles et d\'équipes de 15 à 20 personnes.</p><p><strong>Responsabilités principales :</strong></p><ul><li>Planification stratégique et exécution de projets de transformation numérique</li><li>Gestion des parties prenantes au niveau exécutif</li><li>Gestion de projet agile avec Scrum et Kanban</li><li>Planification budgétaire et des ressources</li></ul>'
                }
            ],
            education: [
                {
                    id: 'edu_' + Date.now() + '_1',
                    degree: 'Master of Science, Génie Industriel',
                    school: 'École Polytechnique',
                    location: 'Palaiseau',
                    startDate: 'Août 2011',
                    endDate: 'Juin 2015',
                    current: false,
                    description: '<p>Spécialisation en gestion de projet et gestion de l\'innovation. Thèse de master sur les méthodes agiles dans les grandes organisations.</p>'
                }
            ],
            languages: [
                {
                    id: 'lang_' + Date.now() + '_1',
                    name: 'Français',
                    level: 'Langue maternelle'
                },
                {
                    id: 'lang_' + Date.now() + '_2',
                    name: 'Anglais',
                    level: 'Courant'
                }
            ],
            skills: [
                {
                    id: 'skill_' + Date.now() + '_1',
                    name: 'Gestion de projet agile',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_2',
                    name: 'Gestion des parties prenantes',
                    level: 5
                },
                {
                    id: 'skill_' + Date.now() + '_3',
                    name: 'Scrum & Kanban',
                    level: 4
                }
            ],
            references: [
                {
                    id: 'ref_' + Date.now() + '_1',
                    name: 'Pierre Dubois',
                    company: 'Tech Solutions SAS',
                    phone: '+33 1 12 34 56 78',
                    email: 'pierre.dubois@techsolutions.fr'
                }
            ]
        }
    };

    return dataByLang[lang] || dataByLang.en;
};
