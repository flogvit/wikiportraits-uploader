import { UploadType } from '@/components/selectors/UploadTypeSelector';
import { SoccerMatchMetadata } from '@/components/forms/SoccerMatchForm';
import { MusicEventMetadata } from '@/types/music';

export function generateTemplateName(
  uploadType: UploadType,
  musicEventData?: MusicEventMetadata | null,
  soccerMatchData?: SoccerMatchMetadata | null
): string {
  if (uploadType === 'music' && musicEventData) {
    if (musicEventData.eventType === 'festival' && musicEventData.festivalData?.festival) {
      const festival = musicEventData.festivalData.festival;
      return `WikiPortraits at ${festival.name} ${festival.year}`;
    } else if (musicEventData.eventType === 'concert' && musicEventData.concertData?.concert) {
      const concert = musicEventData.concertData.concert;
      return `WikiPortraits at ${concert.artist?.name} ${concert.date}`;
    }
  } else if (uploadType === 'soccer' && soccerMatchData) {
    return `WikiPortraits at ${soccerMatchData.homeTeam} vs ${soccerMatchData.awayTeam} ${soccerMatchData.date}`;
  }
  return 'WikiPortraits at Event';
}

export function generateTemplateTitle(
  uploadType: UploadType,
  musicEventData?: MusicEventMetadata | null,
  soccerMatchData?: SoccerMatchMetadata | null,
  language: string = 'en'
): string {
  if (uploadType === 'music' && musicEventData) {
    if (musicEventData.eventType === 'festival' && musicEventData.festivalData?.festival) {
      const festival = musicEventData.festivalData.festival;
      return `[[${language}:${festival.name}|${festival.name} ${festival.year}]]`;
    } else if (musicEventData.eventType === 'concert' && musicEventData.concertData?.concert) {
      const concert = musicEventData.concertData.concert;
      return `${concert.artist?.name} concert ${concert.date}`;
    }
  } else if (uploadType === 'soccer' && soccerMatchData) {
    return `${soccerMatchData.homeTeam} vs ${soccerMatchData.awayTeam} ${soccerMatchData.date}`;
  }
  return 'Event';
}

export function generateCategoryName(
  uploadType: UploadType,
  musicEventData?: MusicEventMetadata | null,
  soccerMatchData?: SoccerMatchMetadata | null
): string {
  if (uploadType === 'music' && musicEventData) {
    if (musicEventData.eventType === 'festival' && musicEventData.festivalData?.festival) {
      const festival = musicEventData.festivalData.festival;
      return `WikiPortraits at ${festival.year} ${festival.name}`;
    } else if (musicEventData.eventType === 'concert' && musicEventData.concertData?.concert) {
      const concert = musicEventData.concertData.concert;
      return `WikiPortraits at ${concert.artist?.name} ${concert.date}`;
    }
  } else if (uploadType === 'soccer' && soccerMatchData) {
    return `WikiPortraits at ${soccerMatchData.homeTeam} vs ${soccerMatchData.awayTeam} ${soccerMatchData.date}`;
  }
  return 'WikiPortraits at Event';
}

export function generateAccentColor(uploadType: UploadType): string {
  if (uploadType === 'music') return '#00a9b5';
  if (uploadType === 'soccer') return '#4CAF50';
  return '#6B73FF';
}

export function generateTemplate(
  uploadType: UploadType,
  musicEventData?: MusicEventMetadata | null,
  soccerMatchData?: SoccerMatchMetadata | null,
  language: string = 'en'
): string {
  const _templateName = generateTemplateName(uploadType, musicEventData, soccerMatchData);
  const title = generateTemplateTitle(uploadType, musicEventData, soccerMatchData, language);
  const categoryName = generateCategoryName(uploadType, musicEventData, soccerMatchData);
  const accentColor = generateAccentColor(uploadType);

  return `{{WikiPortraits
|title = ${title}
|photocat = ${categoryName}
|accent = ${accentColor}
}}<includeonly>{{#ifeq: {{NAMESPACENUMBER}} | 6 | [[Category:${categoryName}]]}}</includeonly><noinclude>{{Documentation}}</noinclude>`;
}