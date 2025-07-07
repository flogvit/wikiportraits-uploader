'use client';

import { useState } from 'react';
import { Search, Users, Calendar, MapPin, Trophy } from 'lucide-react';
import TeamSelector from './TeamSelector';
import PlayerSelector from './PlayerSelector';

export interface SoccerTeam {
  id: string;
  name: string;
  country?: string;
  league?: string;
  wikipediaUrl?: string;
}

export interface SoccerPlayer {
  id: string;
  name: string;
  position?: string;
  number?: string;
  team: string;
  wikipediaUrl?: string;
}

export interface SoccerMatchMetadata {
  homeTeam: SoccerTeam | null;
  awayTeam: SoccerTeam | null;
  date: string;
  venue: string;
  competition: string;
  matchday?: string;
  result?: string;
}

interface SoccerMatchWorkflowProps {
  onMatchDataUpdate: (matchData: SoccerMatchMetadata) => void;
  onPlayersUpdate: (players: SoccerPlayer[]) => void;
}

export default function SoccerMatchWorkflow({ onMatchDataUpdate, onPlayersUpdate }: SoccerMatchWorkflowProps) {
  const [matchData, setMatchData] = useState<SoccerMatchMetadata>({
    homeTeam: null,
    awayTeam: null,
    date: '',
    venue: '',
    competition: '',
    matchday: '',
    result: ''
  });
  
  const [selectedPlayers, setSelectedPlayers] = useState<SoccerPlayer[]>([]);
  const [currentStep, setCurrentStep] = useState<'match' | 'teams' | 'players'>('match');

  const handleMatchDataChange = (field: keyof SoccerMatchMetadata, value: any) => {
    const updatedData = { ...matchData, [field]: value };
    setMatchData(updatedData);
    onMatchDataUpdate(updatedData);
  };

  const handlePlayerSelect = (player: SoccerPlayer) => {
    const updatedPlayers = [...selectedPlayers, player];
    setSelectedPlayers(updatedPlayers);
    onPlayersUpdate(updatedPlayers);
  };

  const handlePlayerRemove = (playerId: string) => {
    const updatedPlayers = selectedPlayers.filter(p => p.id !== playerId);
    setSelectedPlayers(updatedPlayers);
    onPlayersUpdate(updatedPlayers);
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
      <h3 className="text-xl font-semibold text-card-foreground mb-6 flex items-center">
        <Trophy className="w-6 h-6 mr-2 text-success" />
        Soccer Match Setup
      </h3>

      {/* Step Navigation */}
      <div className="flex mb-8 border-b border-border">
        {[
          { key: 'match', label: 'Match Info', icon: Calendar },
          { key: 'teams', label: 'Teams', icon: Users },
          { key: 'players', label: 'Players', icon: Users }
        ].map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isCompleted = (step.key === 'match' && matchData.date && matchData.venue) ||
                             (step.key === 'teams' && matchData.homeTeam && matchData.awayTeam) ||
                             (step.key === 'players' && selectedPlayers.length > 0);
          
          return (
            <button
              key={step.key}
              onClick={() => setCurrentStep(step.key as any)}
              className={`flex items-center px-4 py-3 border-b-2 transition-colors ${
                isActive
                  ? 'border-success text-success'
                  : isCompleted
                  ? 'border-success/60 text-success/80 hover:text-success'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {step.label}
            </button>
          );
        })}
      </div>

      {/* Match Information Step */}
      {currentStep === 'match' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Match Date
              </label>
              <input
                type="date"
                value={matchData.date}
                onChange={(e) => handleMatchDataChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-success"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Venue
              </label>
              <input
                type="text"
                value={matchData.venue}
                onChange={(e) => handleMatchDataChange('venue', e.target.value)}
                placeholder="Stadium name"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-success"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                <Trophy className="w-4 h-4 inline mr-1" />
                Competition
              </label>
              <input
                type="text"
                value={matchData.competition}
                onChange={(e) => handleMatchDataChange('competition', e.target.value)}
                placeholder="e.g., Premier League, Champions League"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-success"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Result (optional)
              </label>
              <input
                type="text"
                value={matchData.result || ''}
                onChange={(e) => handleMatchDataChange('result', e.target.value)}
                placeholder="e.g., 2-1"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-success"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setCurrentStep('teams')}
              disabled={!matchData.date || !matchData.venue}
              className="px-4 py-2 bg-success text-success-foreground rounded-md hover:bg-success/90 disabled:bg-muted disabled:cursor-not-allowed"
            >
              Next: Select Teams
            </button>
          </div>
        </div>
      )}

      {/* Teams Step */}
      {currentStep === 'teams' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <TeamSelector
                onTeamSelect={(team) => handleMatchDataChange('homeTeam', team)}
                selectedTeam={matchData.homeTeam}
                placeholder="Search for home team..."
                label="Home Team"
              />
            </div>

            <div className="space-y-4">
              <TeamSelector
                onTeamSelect={(team) => handleMatchDataChange('awayTeam', team)}
                selectedTeam={matchData.awayTeam}
                placeholder="Search for away team..."
                label="Away Team"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep('match')}
              className="px-4 py-2 border border-border text-muted-foreground rounded-md hover:bg-muted"
            >
              Back: Match Info
            </button>
            <button
              onClick={() => setCurrentStep('players')}
              disabled={!matchData.homeTeam || !matchData.awayTeam}
              className="px-4 py-2 bg-success text-success-foreground rounded-md hover:bg-success/90 disabled:bg-muted disabled:cursor-not-allowed"
            >
              Next: Select Players
            </button>
          </div>
        </div>
      )}

      {/* Players Step */}
      {currentStep === 'players' && (
        <div className="space-y-6">
          <PlayerSelector
            teams={[matchData.homeTeam, matchData.awayTeam]}
            selectedPlayers={selectedPlayers}
            onPlayersUpdate={(players) => {
              setSelectedPlayers(players);
              onPlayersUpdate(players);
            }}
          />

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep('teams')}
              className="px-4 py-2 border border-border text-muted-foreground rounded-md hover:bg-muted"
            >
              Back: Teams
            </button>
            <button
              onClick={() => {/* Complete setup */}}
              className="px-4 py-2 bg-success text-success-foreground rounded-md hover:bg-success/90"
            >
              Complete Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}