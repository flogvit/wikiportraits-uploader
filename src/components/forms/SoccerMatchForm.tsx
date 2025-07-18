'use client';

import { useFormContext } from 'react-hook-form';
import { Users, Calendar, MapPin, Trophy } from 'lucide-react';
import { WorkflowFormData } from '../workflow/providers/WorkflowFormProvider';
import TeamSelector from '../selectors/TeamSelector';
import PlayerSelector from '../selectors/PlayerSelector';

import { SoccerTeam, SoccerPlayer, SoccerMatchMetadata } from '@/types/soccer';

export type { SoccerTeam, SoccerPlayer, SoccerMatchMetadata } from '@/types/soccer';

interface SoccerMatchFormProps {
  onComplete?: () => void;
}

export default function SoccerMatchForm({ onComplete }: SoccerMatchFormProps) {
  const { watch, setValue } = useFormContext<WorkflowFormData>();
  
  // Get current data from form
  const eventDetails = watch('eventDetails') || {};
  const soccerMatchData = {
    homeTeam: eventDetails.homeTeam || null,
    awayTeam: eventDetails.awayTeam || null,
    date: eventDetails.date || '',
    venue: eventDetails.venue || '',
    competition: eventDetails.competition || '',
    matchday: eventDetails.matchday || '',
    result: eventDetails.result || ''
  };
  const selectedPlayers = watch('selectedPlayers') || [];

  const handleMatchDataChange = (field: keyof SoccerMatchMetadata, value: unknown) => {
    const updatedData = { ...eventDetails, [field]: value };
    setValue('eventDetails', updatedData);
  };

  const handleTeamSelect = (team: SoccerTeam, isHome: boolean) => {
    const field = isHome ? 'homeTeam' : 'awayTeam';
    handleMatchDataChange(field, team);
  };


  const handlePlayersUpdate = (players: SoccerPlayer[]) => {
    setValue('selectedPlayers', players);
  };

  const isMatchDataComplete = soccerMatchData.homeTeam && soccerMatchData.awayTeam && 
                             soccerMatchData.date && soccerMatchData.venue && soccerMatchData.competition;

  return (
    <div className="space-y-8">
      {/* Match Information */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center mb-4">
          <Trophy className="w-5 h-5 text-primary mr-2" />
          <h3 className="text-lg font-semibold text-card-foreground">Match Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Competition
            </label>
            <input
              type="text"
              value={soccerMatchData.competition}
              onChange={(e) => handleMatchDataChange('competition', e.target.value)}
              placeholder="Premier League, Champions League, etc."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Match Date
            </label>
            <input
              type="date"
              value={soccerMatchData.date}
              onChange={(e) => handleMatchDataChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Venue
            </label>
            <input
              type="text"
              value={soccerMatchData.venue}
              onChange={(e) => handleMatchDataChange('venue', e.target.value)}
              placeholder="Stadium name"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Matchday (Optional)
            </label>
            <input
              type="text"
              value={soccerMatchData.matchday || ''}
              onChange={(e) => handleMatchDataChange('matchday', e.target.value)}
              placeholder="Matchday 1, Round 16, etc."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Team Selection */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center mb-4">
          <Users className="w-5 h-5 text-primary mr-2" />
          <h3 className="text-lg font-semibold text-card-foreground">Teams</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-card-foreground mb-3">Home Team</h4>
            <TeamSelector
              selectedTeam={soccerMatchData.homeTeam}
              onTeamSelect={(team) => handleTeamSelect(team, true)}
              placeholder="Search for home team..."
            />
          </div>
          
          <div>
            <h4 className="font-medium text-card-foreground mb-3">Away Team</h4>
            <TeamSelector
              selectedTeam={soccerMatchData.awayTeam}
              onTeamSelect={(team) => handleTeamSelect(team, false)}
              placeholder="Search for away team..."
            />
          </div>
        </div>
      </div>

      {/* Player Selection */}
      {isMatchDataComplete && (
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center mb-4">
            <Users className="w-5 h-5 text-primary mr-2" />
            <h3 className="text-lg font-semibold text-card-foreground">Players</h3>
            <span className="ml-2 text-sm text-muted-foreground">
              ({selectedPlayers.length} selected)
            </span>
          </div>
          
          <PlayerSelector
            teams={[soccerMatchData.homeTeam, soccerMatchData.awayTeam]}
            selectedPlayers={selectedPlayers}
            onPlayersUpdate={handlePlayersUpdate}
          />
        </div>
      )}

      {/* Completion Status */}
      {isMatchDataComplete && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
            <div>
              <p className="text-success font-medium">Match Setup Complete</p>
              <p className="text-success/80 text-sm">
                Match details configured. You can now proceed to the next step.
              </p>
            </div>
          </div>
          {onComplete && (
            <button
              onClick={onComplete}
              className="mt-3 px-4 py-2 bg-success hover:bg-success/90 text-white rounded-lg text-sm transition-colors"
            >
              Continue to Next Step
            </button>
          )}
        </div>
      )}
    </div>
  );
}