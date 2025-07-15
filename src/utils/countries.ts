export interface Country {
  name: string;
  code: string;
  searchTerms: string[];
  language?: string;
  wikidataId?: string; // Q-code for Wikidata
}

export const COUNTRIES: Country[] = [
  // Nordic countries
  { name: 'Norway', code: 'NO', searchTerms: ['norway', 'nor', 'norge', 'norwegian'], language: 'no', wikidataId: 'Q20' },
  { name: 'Sweden', code: 'SE', searchTerms: ['sweden', 'swe', 'sverige', 'swedish'], language: 'sv', wikidataId: 'Q34' },
  { name: 'Denmark', code: 'DK', searchTerms: ['denmark', 'den', 'danmark', 'danish'], language: 'da', wikidataId: 'Q35' },
  { name: 'Finland', code: 'FI', searchTerms: ['finland', 'fin', 'suomi', 'finnish'], language: 'fi', wikidataId: 'Q33' },
  { name: 'Iceland', code: 'IS', searchTerms: ['iceland', 'ice', 'ísland', 'icelandic'], language: 'is', wikidataId: 'Q189' },

  // Major European countries
  { name: 'Germany', code: 'DE', searchTerms: ['germany', 'ger', 'deutschland', 'german'], language: 'de', wikidataId: 'Q183' },
  { name: 'France', code: 'FR', searchTerms: ['france', 'fra', 'french'], language: 'fr', wikidataId: 'Q142' },
  { name: 'Spain', code: 'ES', searchTerms: ['spain', 'spa', 'españa', 'spanish'], language: 'es', wikidataId: 'Q29' },
  { name: 'Italy', code: 'IT', searchTerms: ['italy', 'ita', 'italia', 'italian'], language: 'it', wikidataId: 'Q38' },
  { name: 'Netherlands', code: 'NL', searchTerms: ['netherlands', 'net', 'holland', 'nederland', 'dutch'], language: 'nl', wikidataId: 'Q55' },
  { name: 'United Kingdom', code: 'GB', searchTerms: ['uk', 'united kingdom', 'britain', 'england', 'british', 'english'], language: 'en', wikidataId: 'Q145' },
  { name: 'Ireland', code: 'IE', searchTerms: ['ireland', 'ire', 'irish'], language: 'en', wikidataId: 'Q27' },
  { name: 'Austria', code: 'AT', searchTerms: ['austria', 'aut', 'österreich', 'austrian'], language: 'de', wikidataId: 'Q40' },
  { name: 'Switzerland', code: 'CH', searchTerms: ['switzerland', 'swi', 'schweiz', 'suisse', 'swiss'], language: 'de', wikidataId: 'Q39' },
  { name: 'Belgium', code: 'BE', searchTerms: ['belgium', 'bel', 'belgië', 'belgique', 'belgian'], language: 'nl', wikidataId: 'Q31' },
  { name: 'Portugal', code: 'PT', searchTerms: ['portugal', 'por', 'portuguese'], language: 'pt', wikidataId: 'Q45' },
  { name: 'Poland', code: 'PL', searchTerms: ['poland', 'pol', 'polska', 'polish'], language: 'pl', wikidataId: 'Q36' },
  { name: 'Czech Republic', code: 'CZ', searchTerms: ['czech', 'czechia', 'czech republic', 'česká'], language: 'cs', wikidataId: 'Q213' },
  { name: 'Russia', code: 'RU', searchTerms: ['russia', 'rus', 'россия', 'russian'], language: 'ru', wikidataId: 'Q159' },

  // North America
  { name: 'United States', code: 'US', searchTerms: ['usa', 'us', 'united states', 'america', 'american'], language: 'en', wikidataId: 'Q30' },
  { name: 'Canada', code: 'CA', searchTerms: ['canada', 'can', 'canadian'], language: 'en', wikidataId: 'Q16' },
  { name: 'Mexico', code: 'MX', searchTerms: ['mexico', 'mex', 'méxico', 'mexican'], language: 'es', wikidataId: 'Q96' },

  // South America
  { name: 'Brazil', code: 'BR', searchTerms: ['brazil', 'bra', 'brasil', 'brazilian'], language: 'pt', wikidataId: 'Q155' },
  { name: 'Argentina', code: 'AR', searchTerms: ['argentina', 'arg', 'argentinian'], language: 'es', wikidataId: 'Q414' },
  { name: 'Chile', code: 'CL', searchTerms: ['chile', 'chi', 'chilean'], language: 'es', wikidataId: 'Q298' },
  { name: 'Colombia', code: 'CO', searchTerms: ['colombia', 'col', 'colombian'], language: 'es', wikidataId: 'Q739' },

  // Asia
  { name: 'Japan', code: 'JP', searchTerms: ['japan', 'jpn', '日本', 'japanese'], language: 'ja', wikidataId: 'Q17' },
  { name: 'China', code: 'CN', searchTerms: ['china', 'chn', '中国', 'chinese'], language: 'zh', wikidataId: 'Q148' },
  { name: 'South Korea', code: 'KR', searchTerms: ['korea', 'south korea', 'kor', '한국', 'korean'], language: 'ko', wikidataId: 'Q884' },
  { name: 'India', code: 'IN', searchTerms: ['india', 'ind', 'indian'], language: 'en', wikidataId: 'Q668' },
  { name: 'Thailand', code: 'TH', searchTerms: ['thailand', 'tha', 'thai'], language: 'th', wikidataId: 'Q869' },
  { name: 'Singapore', code: 'SG', searchTerms: ['singapore', 'sgp', 'singaporean'], language: 'en', wikidataId: 'Q334' },

  // Oceania
  { name: 'Australia', code: 'AU', searchTerms: ['australia', 'aus', 'australian'], language: 'en', wikidataId: 'Q408' },
  { name: 'New Zealand', code: 'NZ', searchTerms: ['new zealand', 'nzl', 'nz', 'kiwi'], language: 'en', wikidataId: 'Q664' },

  // Africa
  { name: 'South Africa', code: 'ZA', searchTerms: ['south africa', 'zaf', 'sa', 'south african'], language: 'en', wikidataId: 'Q258' },
  { name: 'Nigeria', code: 'NG', searchTerms: ['nigeria', 'nga', 'nigerian'], language: 'en', wikidataId: 'Q1033' },
  { name: 'Egypt', code: 'EG', searchTerms: ['egypt', 'egy', 'egyptian'], language: 'ar', wikidataId: 'Q79' },

  // Additional European countries
  { name: 'Greece', code: 'GR', searchTerms: ['greece', 'grc', 'greek'], language: 'el', wikidataId: 'Q41' },
  { name: 'Turkey', code: 'TR', searchTerms: ['turkey', 'tur', 'turkish'], language: 'tr', wikidataId: 'Q43' },
  { name: 'Croatia', code: 'HR', searchTerms: ['croatia', 'hrv', 'croatian'], language: 'hr', wikidataId: 'Q224' },
  { name: 'Serbia', code: 'RS', searchTerms: ['serbia', 'srb', 'serbian'], language: 'sr', wikidataId: 'Q403' },
  { name: 'Hungary', code: 'HU', searchTerms: ['hungary', 'hun', 'hungarian'], language: 'hu', wikidataId: 'Q28' },
  { name: 'Romania', code: 'RO', searchTerms: ['romania', 'rou', 'romanian'], language: 'ro', wikidataId: 'Q218' },
  { name: 'Bulgaria', code: 'BG', searchTerms: ['bulgaria', 'bgr', 'bulgarian'], language: 'bg', wikidataId: 'Q219' },
  { name: 'Slovakia', code: 'SK', searchTerms: ['slovakia', 'svk', 'slovak'], language: 'sk', wikidataId: 'Q214' },
  { name: 'Slovenia', code: 'SI', searchTerms: ['slovenia', 'svn', 'slovenian'], language: 'sl', wikidataId: 'Q215' },
  { name: 'Estonia', code: 'EE', searchTerms: ['estonia', 'est', 'estonian'], language: 'et', wikidataId: 'Q191' },
  { name: 'Latvia', code: 'LV', searchTerms: ['latvia', 'lva', 'latvian'], language: 'lv', wikidataId: 'Q211' },
  { name: 'Lithuania', code: 'LT', searchTerms: ['lithuania', 'ltu', 'lithuanian'], language: 'lt', wikidataId: 'Q37' },
  { name: 'Belarus', code: 'BY', searchTerms: ['belarus', 'blr', 'belarusian'], language: 'be', wikidataId: 'Q184' },
  { name: 'Ukraine', code: 'UA', searchTerms: ['ukraine', 'ukr', 'ukrainian'], language: 'uk', wikidataId: 'Q212' },
  { name: 'Moldova', code: 'MD', searchTerms: ['moldova', 'mda', 'moldovan'], language: 'ro', wikidataId: 'Q217' },
  { name: 'Albania', code: 'AL', searchTerms: ['albania', 'alb', 'albanian'], language: 'sq', wikidataId: 'Q222' },
  { name: 'Bosnia and Herzegovina', code: 'BA', searchTerms: ['bosnia', 'bih', 'bosnian'], language: 'bs', wikidataId: 'Q225' },
  { name: 'Montenegro', code: 'ME', searchTerms: ['montenegro', 'mne', 'montenegrin'], language: 'sr', wikidataId: 'Q236' },
  { name: 'North Macedonia', code: 'MK', searchTerms: ['macedonia', 'mkd', 'macedonian'], language: 'mk', wikidataId: 'Q221' },
  { name: 'Kosovo', code: 'XK', searchTerms: ['kosovo', 'xkx', 'kosovar'], language: 'sq', wikidataId: 'Q1246' },
  { name: 'Malta', code: 'MT', searchTerms: ['malta', 'mlt', 'maltese'], language: 'mt', wikidataId: 'Q233' },
  { name: 'Cyprus', code: 'CY', searchTerms: ['cyprus', 'cyp', 'cypriot'], language: 'el', wikidataId: 'Q229' },
  { name: 'Luxembourg', code: 'LU', searchTerms: ['luxembourg', 'lux', 'luxembourgish'], language: 'lb', wikidataId: 'Q32' },
  { name: 'San Marino', code: 'SM', searchTerms: ['san marino', 'smr', 'sammarinese'], language: 'it', wikidataId: 'Q238' },
  { name: 'Monaco', code: 'MC', searchTerms: ['monaco', 'mco', 'monégasque'], language: 'fr', wikidataId: 'Q235' },
  { name: 'Liechtenstein', code: 'LI', searchTerms: ['liechtenstein', 'lie'], language: 'de', wikidataId: 'Q347' },
  { name: 'Andorra', code: 'AD', searchTerms: ['andorra', 'and', 'andorran'], language: 'ca', wikidataId: 'Q228' },
  { name: 'Vatican City', code: 'VA', searchTerms: ['vatican', 'vat', 'vatican city'], language: 'la', wikidataId: 'Q237' },

  // More Asian countries
  { name: 'Indonesia', code: 'ID', searchTerms: ['indonesia', 'idn', 'indonesian'], language: 'id', wikidataId: 'Q252' },
  { name: 'Malaysia', code: 'MY', searchTerms: ['malaysia', 'mys', 'malaysian'], language: 'ms', wikidataId: 'Q833' },
  { name: 'Philippines', code: 'PH', searchTerms: ['philippines', 'phl', 'filipino'], language: 'tl', wikidataId: 'Q928' },
  { name: 'Vietnam', code: 'VN', searchTerms: ['vietnam', 'vnm', 'vietnamese'], language: 'vi', wikidataId: 'Q881' },
  { name: 'Taiwan', code: 'TW', searchTerms: ['taiwan', 'twn', 'taiwanese'], language: 'zh', wikidataId: 'Q865' },
  { name: 'Hong Kong', code: 'HK', searchTerms: ['hong kong', 'hkg'], language: 'zh', wikidataId: 'Q8646' },
  { name: 'North Korea', code: 'KP', searchTerms: ['north korea', 'prk', 'dprk'], language: 'ko', wikidataId: 'Q423' },
  { name: 'Mongolia', code: 'MN', searchTerms: ['mongolia', 'mng', 'mongolian'], language: 'mn', wikidataId: 'Q711' },
  { name: 'Myanmar', code: 'MM', searchTerms: ['myanmar', 'mmr', 'burmese', 'burma'], language: 'my', wikidataId: 'Q836' },
  { name: 'Cambodia', code: 'KH', searchTerms: ['cambodia', 'khm', 'cambodian'], language: 'km', wikidataId: 'Q424' },
  { name: 'Laos', code: 'LA', searchTerms: ['laos', 'lao', 'laotian'], language: 'lo', wikidataId: 'Q819' },
  { name: 'Bangladesh', code: 'BD', searchTerms: ['bangladesh', 'bgd', 'bangladeshi'], language: 'bn', wikidataId: 'Q902' },
  { name: 'Sri Lanka', code: 'LK', searchTerms: ['sri lanka', 'lka', 'sri lankan'], language: 'si', wikidataId: 'Q854' },
  { name: 'Nepal', code: 'NP', searchTerms: ['nepal', 'npl', 'nepalese'], language: 'ne', wikidataId: 'Q837' },
  { name: 'Bhutan', code: 'BT', searchTerms: ['bhutan', 'btn', 'bhutanese'], language: 'dz', wikidataId: 'Q917' },
  { name: 'Maldives', code: 'MV', searchTerms: ['maldives', 'mdv', 'maldivian'], language: 'dv', wikidataId: 'Q826' },
  { name: 'Pakistan', code: 'PK', searchTerms: ['pakistan', 'pak', 'pakistani'], language: 'ur', wikidataId: 'Q843' },
  { name: 'Afghanistan', code: 'AF', searchTerms: ['afghanistan', 'afg', 'afghan'], language: 'ps', wikidataId: 'Q889' },
  { name: 'Iran', code: 'IR', searchTerms: ['iran', 'irn', 'iranian', 'persia'], language: 'fa', wikidataId: 'Q794' },
  { name: 'Iraq', code: 'IQ', searchTerms: ['iraq', 'irq', 'iraqi'], language: 'ar', wikidataId: 'Q796' },
  { name: 'Israel', code: 'IL', searchTerms: ['israel', 'isr', 'israeli'], language: 'he', wikidataId: 'Q801' },
  { name: 'Palestine', code: 'PS', searchTerms: ['palestine', 'pse', 'palestinian'], language: 'ar', wikidataId: 'Q219060' },
  { name: 'Jordan', code: 'JO', searchTerms: ['jordan', 'jor', 'jordanian'], language: 'ar', wikidataId: 'Q810' },
  { name: 'Lebanon', code: 'LB', searchTerms: ['lebanon', 'lbn', 'lebanese'], language: 'ar', wikidataId: 'Q822' },
  { name: 'Syria', code: 'SY', searchTerms: ['syria', 'syr', 'syrian'], language: 'ar', wikidataId: 'Q858' },
  { name: 'Saudi Arabia', code: 'SA', searchTerms: ['saudi arabia', 'sau', 'saudi'], language: 'ar', wikidataId: 'Q851' },
  { name: 'United Arab Emirates', code: 'AE', searchTerms: ['uae', 'are', 'emirates'], language: 'ar', wikidataId: 'Q878' },
  { name: 'Qatar', code: 'QA', searchTerms: ['qatar', 'qat', 'qatari'], language: 'ar', wikidataId: 'Q846' },
  { name: 'Kuwait', code: 'KW', searchTerms: ['kuwait', 'kwt', 'kuwaiti'], language: 'ar', wikidataId: 'Q817' },
  { name: 'Bahrain', code: 'BH', searchTerms: ['bahrain', 'bhr', 'bahraini'], language: 'ar', wikidataId: 'Q398' },
  { name: 'Oman', code: 'OM', searchTerms: ['oman', 'omn', 'omani'], language: 'ar', wikidataId: 'Q842' },
  { name: 'Yemen', code: 'YE', searchTerms: ['yemen', 'yem', 'yemeni'], language: 'ar', wikidataId: 'Q805' },
  { name: 'Kazakhstan', code: 'KZ', searchTerms: ['kazakhstan', 'kaz', 'kazakh'], language: 'kk', wikidataId: 'Q232' },
  { name: 'Uzbekistan', code: 'UZ', searchTerms: ['uzbekistan', 'uzb', 'uzbek'], language: 'uz', wikidataId: 'Q265' },
  { name: 'Kyrgyzstan', code: 'KG', searchTerms: ['kyrgyzstan', 'kgz', 'kyrgyz'], language: 'ky', wikidataId: 'Q813' },
  { name: 'Tajikistan', code: 'TJ', searchTerms: ['tajikistan', 'tjk', 'tajik'], language: 'tg', wikidataId: 'Q863' },
  { name: 'Turkmenistan', code: 'TM', searchTerms: ['turkmenistan', 'tkm', 'turkmen'], language: 'tk', wikidataId: 'Q874' },
  { name: 'Armenia', code: 'AM', searchTerms: ['armenia', 'arm', 'armenian'], language: 'hy', wikidataId: 'Q399' },
  { name: 'Azerbaijan', code: 'AZ', searchTerms: ['azerbaijan', 'aze', 'azerbaijani'], language: 'az', wikidataId: 'Q227' },
  { name: 'Georgia', code: 'GE', searchTerms: ['georgia', 'geo', 'georgian'], language: 'ka', wikidataId: 'Q230' },

  // More African countries
  { name: 'Morocco', code: 'MA', searchTerms: ['morocco', 'mar', 'moroccan'], language: 'ar', wikidataId: 'Q1028' },
  { name: 'Algeria', code: 'DZ', searchTerms: ['algeria', 'dza', 'algerian'], language: 'ar', wikidataId: 'Q262' },
  { name: 'Tunisia', code: 'TN', searchTerms: ['tunisia', 'tun', 'tunisian'], language: 'ar', wikidataId: 'Q948' },
  { name: 'Libya', code: 'LY', searchTerms: ['libya', 'lby', 'libyan'], language: 'ar', wikidataId: 'Q1016' },
  { name: 'Sudan', code: 'SD', searchTerms: ['sudan', 'sdn', 'sudanese'], language: 'ar', wikidataId: 'Q1049' },
  { name: 'Ethiopia', code: 'ET', searchTerms: ['ethiopia', 'eth', 'ethiopian'], language: 'am', wikidataId: 'Q115' },
  { name: 'Kenya', code: 'KE', searchTerms: ['kenya', 'ken', 'kenyan'], language: 'sw', wikidataId: 'Q114' },
  { name: 'Tanzania', code: 'TZ', searchTerms: ['tanzania', 'tza', 'tanzanian'], language: 'sw', wikidataId: 'Q924' },
  { name: 'Uganda', code: 'UG', searchTerms: ['uganda', 'uga', 'ugandan'], language: 'en', wikidataId: 'Q1036' },
  { name: 'Rwanda', code: 'RW', searchTerms: ['rwanda', 'rwa', 'rwandan'], language: 'rw', wikidataId: 'Q1037' },
  { name: 'Burundi', code: 'BI', searchTerms: ['burundi', 'bdi', 'burundian'], language: 'rn', wikidataId: 'Q967' },
  { name: 'Democratic Republic of the Congo', code: 'CD', searchTerms: ['drc', 'congo', 'zaire'], language: 'fr', wikidataId: 'Q974' },
  { name: 'Republic of the Congo', code: 'CG', searchTerms: ['congo', 'cog', 'congolese'], language: 'fr', wikidataId: 'Q971' },
  { name: 'Central African Republic', code: 'CF', searchTerms: ['car', 'caf', 'central african'], language: 'fr', wikidataId: 'Q929' },
  { name: 'Cameroon', code: 'CM', searchTerms: ['cameroon', 'cmr', 'cameroonian'], language: 'fr', wikidataId: 'Q1009' },
  { name: 'Chad', code: 'TD', searchTerms: ['chad', 'tcd', 'chadian'], language: 'fr', wikidataId: 'Q657' },
  { name: 'Niger', code: 'NE', searchTerms: ['niger', 'ner', 'nigerien'], language: 'fr', wikidataId: 'Q1032' },
  { name: 'Mali', code: 'ML', searchTerms: ['mali', 'mli', 'malian'], language: 'fr', wikidataId: 'Q912' },
  { name: 'Burkina Faso', code: 'BF', searchTerms: ['burkina faso', 'bfa', 'burkinabé'], language: 'fr', wikidataId: 'Q965' },
  { name: 'Senegal', code: 'SN', searchTerms: ['senegal', 'sen', 'senegalese'], language: 'fr', wikidataId: 'Q1041' },
  { name: 'Mauritania', code: 'MR', searchTerms: ['mauritania', 'mrt', 'mauritanian'], language: 'ar', wikidataId: 'Q1025' },
  { name: 'Gambia', code: 'GM', searchTerms: ['gambia', 'gmb', 'gambian'], language: 'en', wikidataId: 'Q1005' },
  { name: 'Guinea-Bissau', code: 'GW', searchTerms: ['guinea bissau', 'gnb'], language: 'pt', wikidataId: 'Q1007' },
  { name: 'Guinea', code: 'GN', searchTerms: ['guinea', 'gin', 'guinean'], language: 'fr', wikidataId: 'Q1006' },
  { name: 'Sierra Leone', code: 'SL', searchTerms: ['sierra leone', 'sle'], language: 'en', wikidataId: 'Q1044' },
  { name: 'Liberia', code: 'LR', searchTerms: ['liberia', 'lbr', 'liberian'], language: 'en', wikidataId: 'Q1014' },
  { name: 'Ivory Coast', code: 'CI', searchTerms: ['ivory coast', 'civ', 'ivorian'], language: 'fr', wikidataId: 'Q1008' },
  { name: 'Ghana', code: 'GH', searchTerms: ['ghana', 'gha', 'ghanaian'], language: 'en', wikidataId: 'Q117' },
  { name: 'Togo', code: 'TG', searchTerms: ['togo', 'tgo', 'togolese'], language: 'fr', wikidataId: 'Q945' },
  { name: 'Benin', code: 'BJ', searchTerms: ['benin', 'ben', 'beninese'], language: 'fr', wikidataId: 'Q962' },
  { name: 'Gabon', code: 'GA', searchTerms: ['gabon', 'gab', 'gabonese'], language: 'fr', wikidataId: 'Q1000' },
  { name: 'Equatorial Guinea', code: 'GQ', searchTerms: ['equatorial guinea', 'gnq'], language: 'es', wikidataId: 'Q983' },
  { name: 'São Tomé and Príncipe', code: 'ST', searchTerms: ['sao tome', 'stp'], language: 'pt', wikidataId: 'Q1039' },
  { name: 'Cape Verde', code: 'CV', searchTerms: ['cape verde', 'cpv'], language: 'pt', wikidataId: 'Q1011' },
  { name: 'Angola', code: 'AO', searchTerms: ['angola', 'ago', 'angolan'], language: 'pt', wikidataId: 'Q916' },
  { name: 'Namibia', code: 'NA', searchTerms: ['namibia', 'nam', 'namibian'], language: 'en', wikidataId: 'Q1030' },
  { name: 'Botswana', code: 'BW', searchTerms: ['botswana', 'bwa', 'batswana'], language: 'en', wikidataId: 'Q963' },
  { name: 'Zimbabwe', code: 'ZW', searchTerms: ['zimbabwe', 'zwe', 'zimbabwean'], language: 'en', wikidataId: 'Q954' },
  { name: 'Zambia', code: 'ZM', searchTerms: ['zambia', 'zmb', 'zambian'], language: 'en', wikidataId: 'Q953' },
  { name: 'Malawi', code: 'MW', searchTerms: ['malawi', 'mwi', 'malawian'], language: 'en', wikidataId: 'Q1020' },
  { name: 'Mozambique', code: 'MZ', searchTerms: ['mozambique', 'moz', 'mozambican'], language: 'pt', wikidataId: 'Q1029' },
  { name: 'Madagascar', code: 'MG', searchTerms: ['madagascar', 'mdg', 'malagasy'], language: 'mg', wikidataId: 'Q1019' },
  { name: 'Mauritius', code: 'MU', searchTerms: ['mauritius', 'mus', 'mauritian'], language: 'en', wikidataId: 'Q1027' },
  { name: 'Seychelles', code: 'SC', searchTerms: ['seychelles', 'syc', 'seychellois'], language: 'en', wikidataId: 'Q1042' },
  { name: 'Comoros', code: 'KM', searchTerms: ['comoros', 'com', 'comorian'], language: 'ar', wikidataId: 'Q970' },
  { name: 'Djibouti', code: 'DJ', searchTerms: ['djibouti', 'dji', 'djiboutian'], language: 'fr', wikidataId: 'Q977' },
  { name: 'Eritrea', code: 'ER', searchTerms: ['eritrea', 'eri', 'eritrean'], language: 'ti', wikidataId: 'Q986' },
  { name: 'Somalia', code: 'SO', searchTerms: ['somalia', 'som', 'somali'], language: 'so', wikidataId: 'Q1045' },
  { name: 'South Sudan', code: 'SS', searchTerms: ['south sudan', 'ssd'], language: 'en', wikidataId: 'Q958' },
  { name: 'Lesotho', code: 'LS', searchTerms: ['lesotho', 'lso', 'basotho'], language: 'st', wikidataId: 'Q1013' },
  { name: 'Eswatini', code: 'SZ', searchTerms: ['eswatini', 'swz', 'swaziland'], language: 'en', wikidataId: 'Q1050' },

  // More American countries
  { name: 'Guatemala', code: 'GT', searchTerms: ['guatemala', 'gtm', 'guatemalan'], language: 'es', wikidataId: 'Q774' },
  { name: 'Belize', code: 'BZ', searchTerms: ['belize', 'blz', 'belizean'], language: 'en', wikidataId: 'Q242' },
  { name: 'El Salvador', code: 'SV', searchTerms: ['el salvador', 'slv', 'salvadoran'], language: 'es', wikidataId: 'Q792' },
  { name: 'Honduras', code: 'HN', searchTerms: ['honduras', 'hnd', 'honduran'], language: 'es', wikidataId: 'Q783' },
  { name: 'Nicaragua', code: 'NI', searchTerms: ['nicaragua', 'nic', 'nicaraguan'], language: 'es', wikidataId: 'Q811' },
  { name: 'Costa Rica', code: 'CR', searchTerms: ['costa rica', 'cri', 'costa rican'], language: 'es', wikidataId: 'Q800' },
  { name: 'Panama', code: 'PA', searchTerms: ['panama', 'pan', 'panamanian'], language: 'es', wikidataId: 'Q804' },
  { name: 'Cuba', code: 'CU', searchTerms: ['cuba', 'cub', 'cuban'], language: 'es', wikidataId: 'Q241' },
  { name: 'Jamaica', code: 'JM', searchTerms: ['jamaica', 'jam', 'jamaican'], language: 'en', wikidataId: 'Q766' },
  { name: 'Haiti', code: 'HT', searchTerms: ['haiti', 'hti', 'haitian'], language: 'fr', wikidataId: 'Q790' },
  { name: 'Dominican Republic', code: 'DO', searchTerms: ['dominican republic', 'dom', 'dominican'], language: 'es', wikidataId: 'Q786' },
  { name: 'Puerto Rico', code: 'PR', searchTerms: ['puerto rico', 'pri', 'puerto rican'], language: 'es', wikidataId: 'Q1183' },
  { name: 'Trinidad and Tobago', code: 'TT', searchTerms: ['trinidad', 'tto', 'trinidadian'], language: 'en', wikidataId: 'Q754' },
  { name: 'Barbados', code: 'BB', searchTerms: ['barbados', 'brb', 'barbadian'], language: 'en', wikidataId: 'Q244' },
  { name: 'Grenada', code: 'GD', searchTerms: ['grenada', 'grd', 'grenadian'], language: 'en', wikidataId: 'Q769' },
  { name: 'Saint Lucia', code: 'LC', searchTerms: ['saint lucia', 'lca', 'st lucia'], language: 'en', wikidataId: 'Q760' },
  { name: 'Saint Vincent and the Grenadines', code: 'VC', searchTerms: ['saint vincent', 'vct', 'st vincent'], language: 'en', wikidataId: 'Q757' },
  { name: 'Antigua and Barbuda', code: 'AG', searchTerms: ['antigua', 'atg', 'antiguan'], language: 'en', wikidataId: 'Q781' },
  { name: 'Dominica', code: 'DM', searchTerms: ['dominica', 'dma', 'dominican'], language: 'en', wikidataId: 'Q784' },
  { name: 'Saint Kitts and Nevis', code: 'KN', searchTerms: ['saint kitts', 'kna', 'st kitts'], language: 'en', wikidataId: 'Q763' },
  { name: 'Bahamas', code: 'BS', searchTerms: ['bahamas', 'bhs', 'bahamian'], language: 'en', wikidataId: 'Q778' },
  { name: 'Suriname', code: 'SR', searchTerms: ['suriname', 'sur', 'surinamese'], language: 'nl', wikidataId: 'Q730' },
  { name: 'Guyana', code: 'GY', searchTerms: ['guyana', 'guy', 'guyanese'], language: 'en', wikidataId: 'Q734' },
  { name: 'French Guiana', code: 'GF', searchTerms: ['french guiana', 'guf'], language: 'fr', wikidataId: 'Q3769' },
  { name: 'Venezuela', code: 'VE', searchTerms: ['venezuela', 'ven', 'venezuelan'], language: 'es', wikidataId: 'Q717' },
  { name: 'Ecuador', code: 'EC', searchTerms: ['ecuador', 'ecu', 'ecuadorian'], language: 'es', wikidataId: 'Q736' },
  { name: 'Peru', code: 'PE', searchTerms: ['peru', 'per', 'peruvian'], language: 'es', wikidataId: 'Q419' },
  { name: 'Bolivia', code: 'BO', searchTerms: ['bolivia', 'bol', 'bolivian'], language: 'es', wikidataId: 'Q750' },
  { name: 'Paraguay', code: 'PY', searchTerms: ['paraguay', 'pry', 'paraguayan'], language: 'es', wikidataId: 'Q733' },
  { name: 'Uruguay', code: 'UY', searchTerms: ['uruguay', 'ury', 'uruguayan'], language: 'es', wikidataId: 'Q77' },

  // Oceania
  { name: 'Papua New Guinea', code: 'PG', searchTerms: ['papua new guinea', 'png', 'papua'], language: 'en', wikidataId: 'Q691' },
  { name: 'Fiji', code: 'FJ', searchTerms: ['fiji', 'fji', 'fijian'], language: 'en', wikidataId: 'Q712' },
  { name: 'Solomon Islands', code: 'SB', searchTerms: ['solomon islands', 'slb', 'solomon'], language: 'en', wikidataId: 'Q685' },
  { name: 'Vanuatu', code: 'VU', searchTerms: ['vanuatu', 'vut', 'ni-vanuatu'], language: 'en', wikidataId: 'Q686' },
  { name: 'New Caledonia', code: 'NC', searchTerms: ['new caledonia', 'ncl'], language: 'fr', wikidataId: 'Q33788' },
  { name: 'French Polynesia', code: 'PF', searchTerms: ['french polynesia', 'pyf', 'tahiti'], language: 'fr', wikidataId: 'Q30971' },
  { name: 'Samoa', code: 'WS', searchTerms: ['samoa', 'wsm', 'samoan'], language: 'sm', wikidataId: 'Q683' },
  { name: 'Tonga', code: 'TO', searchTerms: ['tonga', 'ton', 'tongan'], language: 'to', wikidataId: 'Q678' },
  { name: 'Kiribati', code: 'KI', searchTerms: ['kiribati', 'kir', 'i-kiribati'], language: 'en', wikidataId: 'Q710' },
  { name: 'Tuvalu', code: 'TV', searchTerms: ['tuvalu', 'tuv', 'tuvaluan'], language: 'tvl', wikidataId: 'Q672' },
  { name: 'Nauru', code: 'NR', searchTerms: ['nauru', 'nru', 'nauruan'], language: 'na', wikidataId: 'Q697' },
  { name: 'Palau', code: 'PW', searchTerms: ['palau', 'plw', 'palauan'], language: 'pau', wikidataId: 'Q695' },
  { name: 'Marshall Islands', code: 'MH', searchTerms: ['marshall islands', 'mhl', 'marshallese'], language: 'mh', wikidataId: 'Q709' },
  { name: 'Micronesia', code: 'FM', searchTerms: ['micronesia', 'fsm', 'micronesian'], language: 'en', wikidataId: 'Q702' }
];

/**
 * Search countries by partial name match
 * @param query - Search query (e.g., "nor", "ger", "fra")
 * @returns Array of matching countries
 */
export function searchCountries(query: string): Country[] {
  if (!query || query.length < 1) return COUNTRIES; // Show all countries by default
  
  const searchTerm = query.toLowerCase().trim();
  
  return COUNTRIES.filter(country => 
    country.searchTerms.some(term => term.includes(searchTerm))
  ).sort((a, b) => {
    // Prioritize exact matches at the beginning
    const aExact = a.searchTerms.some(term => term.startsWith(searchTerm));
    const bExact = b.searchTerms.some(term => term.startsWith(searchTerm));
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    // Then sort by name length (shorter names first)
    return a.name.length - b.name.length;
  });
}

/**
 * Get country by exact code match
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(country => 
    country.code === code.toUpperCase()
  );
}

/**
 * Get country by exact name match
 */
export function getCountryByName(name: string): Country | undefined {
  return COUNTRIES.find(country => 
    country.name.toLowerCase() === name.toLowerCase() ||
    country.searchTerms.includes(name.toLowerCase())
  );
}

/**
 * Get Wikidata Q-code for a country by name
 */
export function getCountryWikidataId(name: string): string | undefined {
  const country = getCountryByName(name);
  return country?.wikidataId;
}

// Export the countries array for backward compatibility
export const countries = COUNTRIES;