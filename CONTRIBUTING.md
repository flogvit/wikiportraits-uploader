# Contributing to WikiPortraits Bulk Uploader

Thank you for your interest in contributing to WikiPortraits Bulk Uploader! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## 📜 Code of Conduct

This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A GitHub account
- Wikimedia OAuth credentials (for testing upload functionality)

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/wikiportraits.git
   cd wikiportraits
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your OAuth credentials
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Run tests**:
   ```bash
   npm test
   ```

## 🔄 Contributing Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines
3. **Add tests** for new functionality
4. **Run the test suite** to ensure all tests pass
5. **Commit your changes** with a descriptive message
6. **Push to your fork** and create a pull request

## 🎨 Code Style

### General Guidelines

- Use TypeScript for all new code
- Follow the existing code structure and patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep components small and focused

### Code Formatting

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Trailing commas in objects and arrays
- Line length limit: 100 characters

### ESLint Configuration

The project uses ESLint with Next.js configuration. Run linting:

```bash
npm run lint          # Check for issues
npm run lint:fix      # Fix auto-fixable issues
```

### TypeScript

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use proper typing for props and state
- Avoid `any` type - use specific types or `unknown`

### Component Structure

```typescript
// Component file structure
import { useState, useEffect } from 'react'
import { ComponentProps } from '@/types/component'

interface Props {
  title: string
  onSubmit: (data: ComponentProps) => void
}

export default function ComponentName({ title, onSubmit }: Props) {
  // Component logic
  return (
    <div>
      {/* Component JSX */}
    </div>
  )
}
```

## 🧪 Testing

### Testing Requirements

- All new features must include tests
- Aim for 70%+ code coverage
- Use Jest and React Testing Library
- Write unit tests for utilities and components
- Write integration tests for API routes

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Test Structure

```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react'
import ComponentName from '../ComponentName'

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName title="Test" onSubmit={jest.fn()} />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('handles user interactions', () => {
    const mockSubmit = jest.fn()
    render(<ComponentName title="Test" onSubmit={mockSubmit} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(mockSubmit).toHaveBeenCalled()
  })
})
```

## 📝 Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(upload): add batch upload progress indicator
fix(auth): resolve OAuth token refresh issue
docs(readme): update installation instructions
test(utils): add tests for country utilities
```

## 🔍 Pull Request Process

### Before Submitting

1. **Update documentation** if you've changed APIs
2. **Run the full test suite** and ensure all tests pass
3. **Run type checking**: `npm run type-check`
4. **Run linting**: `npm run lint`
5. **Test your changes** thoroughly

### PR Description Template

```markdown
## Summary
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added and passing
```

### Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. **Code review** by project maintainers
3. **Testing** by reviewers if needed
4. **Approval** required before merging

## 🐛 Issue Reporting

### Bug Reports

Include:
- **Steps to reproduce** the issue
- **Expected behavior**
- **Actual behavior**
- **Environment details** (OS, browser, Node.js version)
- **Screenshots** if applicable

### Feature Requests

Include:
- **Clear description** of the feature
- **Use case** and motivation
- **Proposed solution** (if any)
- **Alternative solutions** considered

### Security Issues

**Do not** report security vulnerabilities through public GitHub issues. Instead, please report them privately to the maintainers.

## 🏗️ Architecture Guidelines

### File Structure

```
src/
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   └── ...
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── workflow/       # Workflow-specific components
│   └── __tests__/      # Component tests
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   └── __tests__/      # Utility tests
└── lib/                # Shared libraries
```

### API Routes

- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Implement proper error handling
- Add input validation
- Include proper TypeScript types
- Add rate limiting where appropriate

### Component Guidelines

- Keep components small and focused
- Use TypeScript interfaces for props
- Implement proper error boundaries
- Use React hooks appropriately
- Follow accessibility best practices

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Testing Library Documentation](https://testing-library.com/docs)
- [Wikimedia API Documentation](https://www.mediawiki.org/wiki/API:Main_page)

## 🤝 Community

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Pull Requests**: For code contributions

## 📞 Getting Help

If you need help with contributing:

1. Check the [documentation](./README.md)
2. Search existing [issues](https://github.com/your-username/wikiportraits/issues)
3. Create a new [discussion](https://github.com/your-username/wikiportraits/discussions)
4. Reach out to maintainers

Thank you for contributing to WikiPortraits Bulk Uploader! 🎉