import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSession, signIn, signOut } from 'next-auth/react'
import LoginButton from './LoginButton'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

describe('LoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders sign in button when user is not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<LoginButton />)
    
    expect(screen.getByText('Sign In with Personal Token')).toBeInTheDocument()
  })

  it('renders user info and sign out button when user is authenticated', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31T23:59:59.999Z',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<LoginButton />)
    
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('calls signIn when sign in button is clicked', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<LoginButton />)
    
    fireEvent.click(screen.getByText('Sign In with Personal Token'))
    
    expect(mockSignIn).toHaveBeenCalledWith('wikimedia')
  })

  it('calls signOut when sign out button is clicked', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31T23:59:59.999Z',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<LoginButton />)
    
    fireEvent.click(screen.getByText('Sign Out'))
    
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('shows loading state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    })

    render(<LoginButton />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})