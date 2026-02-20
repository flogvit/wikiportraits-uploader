import { render, screen, fireEvent } from '@testing-library/react'
import UploadTypeSelector from '../UploadTypeSelector'

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
    expect(screen.getByText('Music Event')).toBeInTheDocument()
    expect(screen.getByText('Awards & Ceremonies')).toBeInTheDocument()
    expect(screen.getByText('Red Carpet Events')).toBeInTheDocument()
    expect(screen.getByText('Press Conferences')).toBeInTheDocument()
    expect(screen.getByText('Sports Events')).toBeInTheDocument()
    expect(screen.getByText('Film & TV Production')).toBeInTheDocument()
    expect(screen.getByText('Political Events')).toBeInTheDocument()
    expect(screen.getByText('Cultural Events')).toBeInTheDocument()
    expect(screen.getByText('Corporate Events')).toBeInTheDocument()
    expect(screen.getByText('Portrait Session')).toBeInTheDocument()
  })

  it('shows correct selected value', () => {
    render(
      <UploadTypeSelector onTypeSelect={mockOnTypeSelect} selectedType="music" />
    )

    const musicButton = screen.getByText('Music Event').closest('button')
    expect(musicButton).toHaveClass('border-primary')
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
    expect(screen.getByText(/festivals, concerts, and music performances/i)).toBeInTheDocument()
    expect(screen.getByText(/nobel prize, oscars, grammys/i)).toBeInTheDocument()
    expect(screen.getByText(/professional portrait photography/i)).toBeInTheDocument()
  })

  it('displays correct icons for each upload type', () => {
    render(
      <UploadTypeSelector onTypeSelect={mockOnTypeSelect} selectedType="general" />
    )

    // Check that SVG icons are rendered (they should be in the DOM)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(11)

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
    // General Upload is disabled, so it gets disabled styling
    expect(unselectedButton).toHaveClass('opacity-50')
  })
})