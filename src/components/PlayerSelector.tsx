'use client';

import { useState, useEffect } from 'react';
import { Search, Loader, User, Plus, X } from 'lucide-react';
import { SoccerPlayer, SoccerTeam } from './SoccerMatchWorkflow';

interface PlayerSelectorProps {
  teams: (SoccerTeam | null)[];
  selectedPlayers: SoccerPlayer[];
  onPlayersUpdate: (players: SoccerPlayer[]) => void;
}

interface WikipediaPlayer {
  id: string;
  name: string;
  wikipedia_title: string;
  wikipedia_url: string;
  team: string;
  category?: string;
  source?: string;
}

interface TeamPlayersResponse {
  team: string;
  players: WikipediaPlayer[];
  total: number;
  categories_found: string[];
}

export default function PlayerSelector({ teams, selectedPlayers, onPlayersUpdate }: PlayerSelectorProps) {
  const [teamPlayers, setTeamPlayers] = useState<Record<string, WikipediaPlayer[]>>({});
  const [loadingTeams, setLoadingTeams] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState<WikipediaPlayer[]>([]);

  // Load players for each team
  useEffect(() => {
    const validTeams = teams.filter((team): team is SoccerTeam => team !== null);
    
    validTeams.forEach(async (team) => {
      if (teamPlayers[team.id]) return; // Already loaded
      
      setLoadingTeams(prev => new Set(prev).add(team.id));
      
      try {
        const response = await fetch(`/api/wikipedia/team-players?team=${encodeURIComponent(team.name)}&limit=50`);
        if (response.ok) {
          const data: TeamPlayersResponse = await response.json();
          setTeamPlayers(prev => ({
            ...prev,
            [team.id]: data.players
          }));
        }
      } catch (error) {
        console.error(`Failed to load players for ${team.name}:`, error);
      } finally {
        setLoadingTeams(prev => {
          const newSet = new Set(prev);
          newSet.delete(team.id);
          return newSet;
        });
      }
    });
  }, [teams, teamPlayers]);

  // Filter players based on search query
  useEffect(() => {
    const allPlayers = Object.values(teamPlayers).flat();
    if (!searchQuery.trim()) {
      setFilteredPlayers(allPlayers);
    } else {
      const filtered = allPlayers.filter(player =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPlayers(filtered);
    }
  }, [teamPlayers, searchQuery]);

  const handlePlayerAdd = (wikipediaPlayer: WikipediaPlayer) => {
    // Check if player is already selected
    if (selectedPlayers.some(p => p.id === wikipediaPlayer.id)) {
      return;
    }

    const team = teams.find(t => t && t.name === wikipediaPlayer.team);
    
    const player: SoccerPlayer = {
      id: wikipediaPlayer.id,
      name: wikipediaPlayer.name,
      team: wikipediaPlayer.team,
      wikipediaUrl: wikipediaPlayer.wikipedia_url
    };

    onPlayersUpdate([...selectedPlayers, player]);
  };

  const handlePlayerRemove = (playerId: string) => {
    onPlayersUpdate(selectedPlayers.filter(p => p.id !== playerId));
  };

  const validTeams = teams.filter((team): team is SoccerTeam => team !== null);
  const hasTeams = validTeams.length > 0;
  const isLoading = loadingTeams.size > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">
          Select Players ({selectedPlayers.length})
        </h4>
        
        {hasTeams && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
        )}
      </div>

      {!hasTeams ? (
        <div className="text-center py-8 text-gray-500">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Please select teams first to see available players</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-8">
          <Loader className="w-8 h-8 mx-auto mb-2 animate-spin text-green-500" />
          <p className="text-gray-600">Loading players...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Players */}
          <div className="space-y-3">
            <h5 className="font-medium text-gray-900">Available Players</h5>
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredPlayers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No players found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredPlayers.map((player) => {
                    const isSelected = selectedPlayers.some(p => p.id === player.id);
                    
                    return (
                      <div
                        key={player.id}
                        className={`p-3 flex items-center justify-between hover:bg-gray-50 ${
                          isSelected ? 'bg-green-50' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {player.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {player.team}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handlePlayerAdd(player)}
                          disabled={isSelected}
                          className={`p-1 rounded-full transition-colors ${
                            isSelected
                              ? 'bg-green-100 text-green-600 cursor-not-allowed'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Selected Players */}
          <div className="space-y-3">
            <h5 className="font-medium text-gray-900">Selected Players</h5>
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              {selectedPlayers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No players selected</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {selectedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="p-3 flex items-center justify-between bg-green-50"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {player.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {player.team}
                          {player.position && ` • ${player.position}`}
                          {player.number && ` • #${player.number}`}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handlePlayerRemove(player.id)}
                        className="p-1 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {selectedPlayers.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <div className="text-sm text-green-800">
            <strong>{selectedPlayers.length}</strong> players selected from{' '}
            <strong>{new Set(selectedPlayers.map(p => p.team)).size}</strong> teams
          </div>
        </div>
      )}
    </div>
  );
}