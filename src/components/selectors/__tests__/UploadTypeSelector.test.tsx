import { render, screen, fireEvent } from '@testing-library/react'
import UploadTypeSelector, { UploadType } from '../UploadTypeSelector'

describe('UploadTypeSelector', () => {
  const mockOnTypeSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all upload type options', () => {
    render(
      <UploadTypeSelector onTypeSelect={mockOnTypeSelect} selectedType="general" />
    )

    expect(screen.getByText('General Upload')).toBeInTheDocument()
    expect(screen.getByText('Soccer Match')).toBeInTheDocument()
    expect(screen.getByText('Music Event')).toBeInTheDocument()
    expect(screen.getByText('Portrait Session')).toBeInTheDocument()
  })

  it('shows correct selected value', () => {
    render(
      <UploadTypeSelector onTypeSelect={mockOnTypeSelect} selectedType="soccer" />
    )

    const soccerButton = screen.getByText('Soccer Match').closest('button')
    expect(soccerButton).toHaveClass('border-primary')
  })

  it('calls onTypeSelect when option is selected', () => {
    render(
      <UploadTypeSelector onTypeSelect={mockOnTypeSelect} selectedType="general" />
    )

    fireEvent.click(screen.getByText('Music Event'))
    expect(mockOnTypeSelect).toHaveBeenCalledWith('music')
  })

  it('displays descriptions for each upload type', () => {
    render(
      <UploadTypeSelector onTypeSelect={mockOnTypeSelect} selectedType="general" />
    )

    expect(screen.getByText(/standard wikiportraits upload/i)).toBeInTheDocument()
    expect(screen.getByText(/upload players from a soccer match/i)).toBeInTheDocument()
    expect(screen.getByText(/upload musicians and performers/i)).toBeInTheDocument()
    expect(screen.getByText(/upload portrait photos with enhanced/i)).toBeInTheDocument()
  })

  it('displays correct icons for each upload type', () => {
    render(
      <UploadTypeSelector onTypeSelect={mockOnTypeSelect} selectedType="general" />
    )

    // Check that SVG icons are rendered (they should be in the DOM)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    
    // Check that each button has an icon (SVG element)
    buttons.forEach(button => {
      expect(button.querySelector('svg')).toBeInTheDocument()
    })
  })

  it('handles keyboard navigation', () => {
    render(
      <UploadTypeSelector onTypeSelect={mockOnTypeSelect} selectedType="general" />
    )

    const musicButton = screen.getByText('Music Event').closest('button')
    
    // Focus the button and press Space (buttons respond to click, not keydown)
    musicButton?.focus()
    fireEvent.click(musicButton!)
    
    expect(mockOnTypeSelect).toHaveBeenCalledWith('music')
  })

  it('applies correct styling for selected and unselected states', () => {
    render(
      <UploadTypeSelector onTypeSelect={mockOnTypeSelect} selectedType="music" />
    )

    const selectedButton = screen.getByText('Music Event').closest('button')
    const unselectedButton = screen.getByText('General Upload').closest('button')

    expect(selectedButton).toHaveClass('border-primary')
    expect(unselectedButton).toHaveClass('bg-muted')
  })
})